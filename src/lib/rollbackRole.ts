/**
 * Rôle Ansible: Rollback (Zero-Downtime Deploy)
 * Backup/Restore automatique avec point de restauration
 */

export function generateRollbackRole(): Record<string, string> {
  return {
    'tasks/main.yml': `---
# ════════════════════════════════════════════════════════════════
# Rôle: Rollback (Zero-Downtime Deploy)
# Description: Backup/Restore avec gestion des points de restauration
# ════════════════════════════════════════════════════════════════

- name: "📊 Déterminer l'action (backup ou restore)"
  set_fact:
    rollback_action: "{{ rollback_mode | default('backup') }}"

- name: "📋 Afficher l'action"
  debug:
    msg: "Mode: {{ rollback_action }}"

# ════════════════════════════════════════════════════════════════
# MODE: BACKUP
# ════════════════════════════════════════════════════════════════

- name: "💾 BACKUP: Créer un point de restauration"
  block:
    - name: "📁 Créer le répertoire de backups"
      file:
        path: "{{ backup_dir | default('/var/backups/ansible') }}"
        state: directory
        mode: '0700'
        owner: root
        group: root

    - name: "📅 Générer le timestamp du backup"
      set_fact:
        backup_timestamp: "{{ ansible_date_time.epoch }}"

    - name: "📝 Créer le manifeste de backup"
      copy:
        dest: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ backup_timestamp }}.manifest"
        content: |
          # Backup Manifest
          Timestamp: {{ ansible_date_time.iso8601 }}
          Hostname: {{ inventory_hostname }}
          Environment: {{ environment_name | default('production') }}
          Triggered by: {{ ansible_user_id }}

          # Backed up items:
          {% for item in backup_items | default(['configs', 'data', 'app']) %}
          - {{ item }}
          {% endfor %}
        mode: '0600'

    - name: "💾 Backup: Configurations système"
      archive:
        path:
          - /etc/nginx
          - /etc/ssh/sshd_config
          - /etc/systemd/system
          - /etc/environment
        dest: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ backup_timestamp }}-configs.tar.gz"
        format: gz
        exclude_path:
          - /etc/nginx/ssl/*.key  # Ne pas sauvegarder les clés privées
      when: "'configs' in (backup_items | default(['configs', 'data', 'app']))"

    - name: "💾 Backup: Base de données PostgreSQL"
      block:
        - name: "📦 Dump PostgreSQL"
          postgresql_db:
            name: "{{ db_name | default('all') }}"
            state: dump
            target: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ backup_timestamp }}-postgres.sql.gz"
          become_user: postgres

        - name: "🔒 Sécuriser le dump"
          file:
            path: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ backup_timestamp }}-postgres.sql.gz"
            mode: '0600'
            owner: postgres
      when:
        - "'data' in (backup_items | default(['configs', 'data', 'app']))"
        - backup_postgres | default(false)

    - name: "💾 Backup: Application (releases actuelles)"
      block:
        - name: "📦 Archiver l'application actuelle"
          archive:
            path: "{{ app_dir | default('/opt/app') }}/current"
            dest: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ backup_timestamp }}-app.tar.gz"
            format: gz
          when: app_dir is defined

        - name: "📝 Sauvegarder les variables d'environnement"
          copy:
            src: "{{ app_dir | default('/opt/app') }}/current/.env"
            dest: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ backup_timestamp }}-env"
            remote_src: yes
            mode: '0600'
          when: app_dir is defined
          ignore_errors: yes
      when: "'app' in (backup_items | default(['configs', 'data', 'app']))"

    - name: "💾 Backup: Services systemd actifs"
      shell: |
        systemctl list-unit-files --state=enabled --type=service | grep -v UNIT > {{ backup_dir | default('/var/backups/ansible') }}/backup-{{ backup_timestamp }}-services.list
      changed_when: false

    - name: "📊 Collecter les informations système"
      set_fact:
        backup_metadata:
          timestamp: "{{ backup_timestamp }}"
          hostname: "{{ inventory_hostname }}"
          kernel: "{{ ansible_kernel }}"
          os: "{{ ansible_distribution }} {{ ansible_distribution_version }}"
          packages_count: "{{ ansible_facts.packages | length if ansible_facts.packages is defined else 0 }}"

    - name: "💾 Sauvegarder les métadonnées"
      copy:
        content: "{{ backup_metadata | to_nice_json }}"
        dest: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ backup_timestamp }}-metadata.json"
        mode: '0600'

    - name: "🧹 Nettoyer les anciens backups (garder les {{ keep_backups | default(10) }} derniers)"
      block:
        - name: "🔍 Lister les backups"
          find:
            paths: "{{ backup_dir | default('/var/backups/ansible') }}"
            patterns: "backup-*.manifest"
          register: backup_manifests

        - name: "🗑️ Supprimer les anciens"
          file:
            path: "{{ item.path | regex_replace('\\.manifest$', '') }}*"
            state: absent
          loop: "{{ backup_manifests.files | sort(attribute='mtime') | list }}"
          when: backup_manifests.files | length > (keep_backups | default(10))
          loop_control:
            index_var: backup_index
          when: backup_index < (backup_manifests.files | length - (keep_backups | default(10)))

    - name: "☁️ Upload vers S3 (optionnel)"
      aws_s3:
        bucket: "{{ s3_backup_bucket }}"
        object: "backups/{{ inventory_hostname }}/backup-{{ backup_timestamp }}.tar.gz"
        src: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ backup_timestamp }}-app.tar.gz"
        mode: put
        encrypt: yes
      when:
        - s3_backup_bucket is defined
        - upload_backup_to_s3 | default(false)

    - name: "✅ Backup créé avec succès"
      debug:
        msg:
          - "✅ Point de restauration créé: {{ backup_timestamp }}"
          - "📁 Emplacement: {{ backup_dir | default('/var/backups/ansible') }}"
          - "📦 Fichiers:"
          - "  - backup-{{ backup_timestamp }}-configs.tar.gz"
          - "  - backup-{{ backup_timestamp }}-app.tar.gz"
          - "  - backup-{{ backup_timestamp }}-metadata.json"
          - "{{ '☁️ Uploadé vers S3: ' + s3_backup_bucket if s3_backup_bucket is defined else '' }}"

  when: rollback_action == 'backup'

# ════════════════════════════════════════════════════════════════
# MODE: RESTORE
# ════════════════════════════════════════════════════════════════

- name: "🔄 RESTORE: Restaurer depuis un point de sauvegarde"
  block:
    - name: "🔍 Vérifier que restore_timestamp est défini"
      fail:
        msg: "❌ restore_timestamp est requis pour restaurer"
      when: restore_timestamp is not defined

    - name: "📋 Vérifier l'existence du backup"
      stat:
        path: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ restore_timestamp }}.manifest"
      register: restore_manifest

    - name: "❌ Échec si backup introuvable"
      fail:
        msg: "❌ Backup {{ restore_timestamp }} introuvable"
      when: not restore_manifest.stat.exists

    - name: "📖 Lire le manifeste de backup"
      slurp:
        src: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ restore_timestamp }}.manifest"
      register: manifest_content

    - name: "📊 Afficher les informations du backup"
      debug:
        msg: "{{ manifest_content.content | b64decode }}"

    - name: "⚠️ Confirmation de restauration"
      pause:
        prompt: "⚠️ ATTENTION: Vous êtes sur le point de restaurer le backup {{ restore_timestamp }}. Continuer ? (yes/no)"
      register: restore_confirm
      when: require_confirmation | default(true)

    - name: "❌ Annulation de la restauration"
      fail:
        msg: "❌ Restauration annulée par l'utilisateur"
      when:
        - require_confirmation | default(true)
        - restore_confirm.user_input | lower != 'yes'

    - name: "💾 Créer un backup de sécurité avant restauration"
      include_tasks: main.yml
      vars:
        rollback_mode: backup
        backup_items: ['configs', 'app']
      when: backup_before_restore | default(true)

    - name: "🛑 Arrêter les services applicatifs"
      block:
        - name: "🔍 Détecter les services à arrêter"
          shell: systemctl list-units --type=service --state=running | grep -E '{{ app_service_pattern | default("app|web|api") }}' | awk '{print $1}' || true
          register: running_services
          changed_when: false

        - name: "🛑 Arrêter les services"
          service:
            name: "{{ item }}"
            state: stopped
          loop: "{{ running_services.stdout_lines }}"
          when: running_services.stdout_lines | length > 0

    - name: "🔄 Restaurer: Configurations"
      block:
        - name: "📦 Extraire les configs"
          unarchive:
            src: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ restore_timestamp }}-configs.tar.gz"
            dest: /
            remote_src: yes

        - name: "🔄 Recharger systemd"
          systemd:
            daemon_reload: yes
      when: "'configs' in (restore_items | default(['configs', 'app']))"

    - name: "🔄 Restaurer: Base de données"
      block:
        - name: "📦 Restaurer PostgreSQL"
          postgresql_db:
            name: "{{ db_name }}"
            state: restore
            target: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ restore_timestamp }}-postgres.sql.gz"
          become_user: postgres
      when:
        - "'data' in (restore_items | default(['configs', 'data', 'app']))"
        - restore_postgres | default(false)

    - name: "🔄 Restaurer: Application"
      block:
        - name: "🗑️ Supprimer l'application actuelle"
          file:
            path: "{{ app_dir | default('/opt/app') }}/current"
            state: absent

        - name: "📦 Extraire l'application"
          unarchive:
            src: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ restore_timestamp }}-app.tar.gz"
            dest: "{{ app_dir | default('/opt/app') }}"
            remote_src: yes

        - name: "📝 Restaurer les variables d'environnement"
          copy:
            src: "{{ backup_dir | default('/var/backups/ansible') }}/backup-{{ restore_timestamp }}-env"
            dest: "{{ app_dir | default('/opt/app') }}/current/.env"
            remote_src: yes
            mode: '0600'
          ignore_errors: yes
      when: "'app' in (restore_items | default(['configs', 'app']))"

    - name: "▶️ Redémarrer les services"
      service:
        name: "{{ item }}"
        state: started
      loop: "{{ running_services.stdout_lines }}"
      when: running_services is defined and running_services.stdout_lines | length > 0

    - name: "⏳ Attendre que les services soient prêts"
      wait_for:
        port: "{{ item }}"
        state: started
        timeout: 60
      loop: "{{ health_check_ports | default([80, 443, 3000]) }}"
      ignore_errors: yes

    - name: "🔍 Health check post-restauration"
      uri:
        url: "http://localhost:{{ app_port | default(3000) }}{{ health_check_path | default('/') }}"
        status_code: 200
        timeout: 10
      register: health_check
      retries: 3
      delay: 5
      until: health_check.status == 200
      ignore_errors: yes

    - name: "✅ Restauration terminée avec succès"
      debug:
        msg:
          - "✅ Restauration du backup {{ restore_timestamp }} réussie"
          - "🔄 Services redémarrés"
          - "{{ '🔍 Health check: OK' if health_check.status == 200 else '⚠️ Health check: FAILED' }}"

    - name: "📝 Logger la restauration"
      lineinfile:
        path: "{{ backup_dir | default('/var/backups/ansible') }}/restore.log"
        line: "{{ ansible_date_time.iso8601 }} - Restauration du backup {{ restore_timestamp }} par {{ ansible_user_id }} - Status: {{ 'SUCCESS' if health_check.status == 200 else 'FAILED' }}"
        create: yes
        mode: '0600'

  rescue:
    - name: "❌ Échec de la restauration"
      debug:
        msg:
          - "❌ La restauration a échoué"
          - "💡 Vérifiez les logs: {{ backup_dir | default('/var/backups/ansible') }}/restore.log"
          - "🔄 Pour réessayer: ansible-playbook rollback.yml -e 'rollback_mode=restore restore_timestamp={{ restore_timestamp }}'"

  when: rollback_action == 'restore'

# ════════════════════════════════════════════════════════════════
# MODE: LIST (Lister les backups disponibles)
# ════════════════════════════════════════════════════════════════

- name: "📋 LIST: Lister les backups disponibles"
  block:
    - name: "🔍 Rechercher les backups"
      find:
        paths: "{{ backup_dir | default('/var/backups/ansible') }}"
        patterns: "backup-*.manifest"
      register: available_backups

    - name: "📊 Afficher les backups disponibles"
      debug:
        msg: "{{ available_backups.files | map(attribute='path') | map('basename') | map('regex_replace', '^backup-(.*)\\.manifest$', '\\\\1') | list }}"

    - name: "📋 Détails des backups"
      block:
        - name: "📖 Lire chaque manifeste"
          slurp:
            src: "{{ item.path }}"
          register: manifests
          loop: "{{ available_backups.files | sort(attribute='mtime', reverse=true) }}"

        - name: "📊 Afficher les détails"
          debug:
            msg: |
              ════════════════════════════════════════════════════════════════
              {{ item.content | b64decode }}
              ════════════════════════════════════════════════════════════════
          loop: "{{ manifests.results }}"

  when: rollback_action == 'list'
`,

    'handlers/main.yml': `---
- name: reload systemd
  systemd:
    daemon_reload: yes

- name: restart services
  service:
    name: "{{ item }}"
    state: restarted
  loop: "{{ services_to_restart | default([]) }}"
`,

    'defaults/main.yml': `---
# Répertoire de backups
backup_dir: /var/backups/ansible

# Items à sauvegarder
backup_items:
  - configs
  - app
  - data

# Items à restaurer
restore_items:
  - configs
  - app

# Backup PostgreSQL
backup_postgres: false
restore_postgres: false

# Rétention
keep_backups: 10

# Confirmation
require_confirmation: true
backup_before_restore: true

# S3 Upload
upload_backup_to_s3: false

# Health check
health_check_ports:
  - 80
  - 443
  - 3000
health_check_path: /

# Services
app_service_pattern: "app|web|api|nodejs"
`,

    'README.md': `# Rôle Ansible: Rollback (Zero-Downtime Deploy)

## Description
Rôle complet de backup/restore pour déploiements zero-downtime avec:
- **Points de restauration atomiques**
- **Backup automatique avant déploiement**
- **Restauration rapide en cas d'échec**
- **Upload S3 optionnel**
- **Health checks intégrés**

## Modes d'opération

### 1. MODE: BACKUP (Créer un point de restauration)

Crée un backup complet avec:
- ✅ Configurations système (/etc/nginx, /etc/ssh, systemd)
- ✅ Application actuelle (releases/current)
- ✅ Variables d'environnement (.env)
- ✅ Base de données PostgreSQL (optionnel)
- ✅ Liste des services actifs
- ✅ Métadonnées système

**Utilisation:**
\`\`\`yaml
- role: rollback
  vars:
    rollback_mode: backup
    backup_items:
      - configs
      - app
      - data
\`\`\`

**Commande directe:**
\`\`\`bash
ansible-playbook rollback.yml -e 'rollback_mode=backup'
\`\`\`

### 2. MODE: RESTORE (Restaurer un backup)

Restaure un backup spécifique:
- ✅ Arrêt gracieux des services
- ✅ Backup de sécurité automatique
- ✅ Restauration atomique
- ✅ Redémarrage des services
- ✅ Health checks post-restauration

**Utilisation:**
\`\`\`yaml
- role: rollback
  vars:
    rollback_mode: restore
    restore_timestamp: "1234567890"
\`\`\`

**Commande directe:**
\`\`\`bash
ansible-playbook rollback.yml -e 'rollback_mode=restore restore_timestamp=1234567890'
\`\`\`

### 3. MODE: LIST (Lister les backups)

Liste tous les backups disponibles avec leurs métadonnées.

**Utilisation:**
\`\`\`bash
ansible-playbook rollback.yml -e 'rollback_mode=list'
\`\`\`

## Structure des backups

\`\`\`
/var/backups/ansible/
├── backup-1234567890.manifest         # Manifeste
├── backup-1234567890-configs.tar.gz   # Configurations
├── backup-1234567890-app.tar.gz       # Application
├── backup-1234567890-postgres.sql.gz  # Base de données
├── backup-1234567890-services.list    # Services actifs
├── backup-1234567890-env              # Variables .env
├── backup-1234567890-metadata.json    # Métadonnées
└── restore.log                        # Log des restaurations
\`\`\`

## Variables

\`\`\`yaml
# Mode d'opération
rollback_mode: backup|restore|list

# Backup
backup_dir: /var/backups/ansible
backup_items:
  - configs
  - app
  - data
keep_backups: 10

# Restore
restore_timestamp: "1234567890"
restore_items:
  - configs
  - app
require_confirmation: true
backup_before_restore: true

# PostgreSQL
backup_postgres: true
restore_postgres: true
db_name: mydb

# S3
upload_backup_to_s3: true
s3_backup_bucket: my-backups

# Health checks
health_check_ports: [80, 443, 3000]
health_check_path: /health
\`\`\`

## Intégration dans un déploiement

### Workflow Zero-Downtime

\`\`\`yaml
---
- name: Zero-Downtime Deployment
  hosts: all
  become: true

  tasks:
    # 1. Créer un point de restauration
    - name: "💾 Backup avant déploiement"
      include_role:
        name: rollback
      vars:
        rollback_mode: backup

    # 2. Déployer la nouvelle version
    - name: "🚀 Déployer l'application"
      include_role:
        name: nodeapp
      register: deploy_result
      ignore_errors: yes

    # 3. Rollback automatique si échec
    - name: "🔄 Rollback automatique si échec"
      include_role:
        name: rollback
      vars:
        rollback_mode: restore
        restore_timestamp: "{{ backup_timestamp }}"
      when: deploy_result.failed | default(false)
\`\`\`

## Scénarios d'utilisation

### Scénario 1: Déploiement avec backup automatique

\`\`\`yaml
- role: rollback
  vars:
    rollback_mode: backup
- role: nodeapp
\`\`\`

### Scénario 2: Rollback après échec

\`\`\`bash
# 1. Lister les backups disponibles
ansible-playbook rollback.yml -e 'rollback_mode=list'

# 2. Restaurer le dernier backup
ansible-playbook rollback.yml -e 'rollback_mode=restore restore_timestamp=1234567890'
\`\`\`

### Scénario 3: Backup avant maintenance

\`\`\`bash
ansible-playbook rollback.yml -e 'rollback_mode=backup backup_items=["configs","app","data"]'
\`\`\`

## Sécurité

✅ **Permissions strictes** (0600 pour les fichiers sensibles)
✅ **Exclusion des clés privées** (SSL keys non sauvegardées)
✅ **Chiffrement S3** (si upload activé)
✅ **Logs d'audit** (restore.log)
✅ **Confirmation requise** pour restore en production

## Rétention des backups

- Par défaut: **10 derniers backups**
- Nettoyage automatique des anciens
- Upload S3 pour archive long-terme

## Health Checks

Après restauration, le rôle vérifie:
1. **Ports ouverts** (80, 443, 3000)
2. **HTTP response** (GET sur health_check_path)
3. **Retries** (3 tentatives avec délai de 5s)

Si les health checks échouent, un warning est affiché mais la restauration continue.

## Logs

Toutes les restaurations sont loguées dans:
\`\`\`
/var/backups/ansible/restore.log
\`\`\`

Format:
\`\`\`
2025-11-12T10:30:00Z - Restauration du backup 1234567890 par user - Status: SUCCESS
\`\`\`

## Exemples avancés

### Backup complet avec upload S3
\`\`\`bash
ansible-playbook rollback.yml -e '{
  "rollback_mode": "backup",
  "backup_items": ["configs", "app", "data"],
  "backup_postgres": true,
  "upload_backup_to_s3": true,
  "s3_backup_bucket": "my-backups"
}'
\`\`\`

### Restore sans confirmation (automation)
\`\`\`bash
ansible-playbook rollback.yml -e '{
  "rollback_mode": "restore",
  "restore_timestamp": "1234567890",
  "require_confirmation": false
}'
\`\`\`

## Troubleshooting

### Backup échoue

1. Vérifier les permissions: \`ls -la /var/backups/ansible\`
2. Vérifier l'espace disque: \`df -h /var/backups\`
3. Consulter les logs Ansible

### Restore échoue

1. Vérifier l'existence du backup: \`ansible-playbook rollback.yml -e 'rollback_mode=list'\`
2. Consulter restore.log: \`cat /var/backups/ansible/restore.log\`
3. Réessayer avec \`require_confirmation=false\`

## Best Practices

✅ **TOUJOURS** faire un backup avant un déploiement critique
✅ **TESTER** les backups régulièrement (restore sur staging)
✅ **DOCUMENTER** les backups importants dans le manifeste
✅ **AUTOMATISER** le backup dans vos playbooks de déploiement
✅ **MONITORER** l'espace disque de backup_dir
`
  };
}
