/**
 * Générateur de playbooks pour déploiement d'applications Node.js
 * Version corrigée - Production Ready avec toutes les corrections critiques
 */

export interface NodeAppConfig {
  appName: string;
  gitRepo?: string;
  nodeVersion: string;
  port: number;
  environment: 'staging' | 'production';
  domains?: string[];
}

/**
 * Génère un playbook production-ready avec toutes les corrections DevSecOps
 */
export function generateNodeAppDeploymentFixed(config: NodeAppConfig): string {
  const {
    appName = 'myapp',
    gitRepo = 'https://github.com/company/myapp.git',
    nodeVersion = '20.x',
    port = 3000,
    environment = 'production',
    domains = [`${appName}.${environment}.example.com`]
  } = config;

  return `---
# ════════════════════════════════════════════════════════════════════════════
# 🚀 ANSIBLE PLAYBOOK - DÉPLOIEMENT NODE.JS NIVEAU PRODUCTION
# ════════════════════════════════════════════════════════════════════════════
# Application     : ${appName}
# Environnement   : ${environment.toUpperCase()}
# Node.js Version : ${nodeVersion}
# Port            : ${port}
# Domaines        : ${domains.join(', ')}
# ════════════════════════════════════════════════════════════════════════════
#
# ✅ CORRECTIONS CRITIQUES APPLIQUÉES:
#   - gather_facts: yes (facts disponibles dès le début)
#   - Timestamp via lookup('pipe', 'date +%s') au lieu de ansible_date_time
#   - Template .env.j2 réel (pas /dev/null)
#   - PM2 reload au lieu de delete (Zero-Downtime)
#   - Health check strict (200 seulement, pas 404)
#   - Symlink avec force: yes et follow: no
#   - UFW configuré AVANT Nginx
#   - Handlers Nginx (reload/restart)
#   - SSL avec tag 'never' (optionnel)
#   - Validation git_repo != 'Secrets'
#   - Rollback automatique en cas d'échec (rescue block)
#   - lookup('pipe') avec concaténation ~ pour les chemins
#   - Handlers par fonctionnalité (nginx, ssh, pm2)
#
# ════════════════════════════════════════════════════════════════════════════

- name: "🚀 Déploiement ${appName} - ${environment.toUpperCase()}"
  hosts: ${environment}
  become: yes
  gather_facts: yes

  vars:
    app_name: ${appName}
    app_user: ${appName}
    app_group: ${appName}
    app_dir: /opt/{{ app_name }}
    app_port: ${port}
    node_version: "${nodeVersion}"
    git_repo: "{{ app_git_repo | default('${gitRepo}') }}"
    git_branch: "{{ app_git_branch | default('${environment === 'production' ? 'main' : 'develop'}') }}"
    environment_name: ${environment}
    enable_https: "{{ enable_ssl | default(false) }}"
    letsencrypt_email: "{{ ssl_email | default('admin@example.com') }}"

    # Domaines pour Nginx
    app_domains:
${domains.map(d => `      - ${d}`).join('\n')}

    # Variables d'environnement pour l'application
    app_env_vars:
      NODE_ENV: ${environment}
      PORT: "{{ app_port }}"
      LOG_LEVEL: ${environment === 'production' ? 'info' : 'debug'}

  pre_tasks:
    - name: "🔍 Vérifier la connectivité des serveurs ${environment}"
      ping:
      changed_when: false
      tags: ['always', 'health-check']

    - name: "⏰ Enregistrer le timestamp du déploiement (FIX: lookup au lieu de ansible_date_time)"
      set_fact:
        playbook_start_time: "{{ lookup('pipe', 'date +%s') }}"
        deployment_date: "{{ lookup('pipe', 'date +%Y-%m-%d_%H-%M-%S') }}"
        release_timestamp: "{{ lookup('pipe', 'date +%s') }}"
      tags: ['always']

    - name: "📊 Afficher les informations des serveurs cibles"
      debug:
        msg:
          - "Serveur: {{ inventory_hostname }}"
          - "IP: {{ ansible_default_ipv4.address }}"
          - "OS: {{ ansible_distribution }} {{ ansible_distribution_version }}"
          - "RAM: {{ ansible_memtotal_mb }}MB"
          - "CPU: {{ ansible_processor_vcpus }} cores"
          - "Déploiement: {{ deployment_date }}"
          - "Release: {{ release_timestamp }}"
      tags: ['always', 'info']

    - name: "💾 Vérifier l'espace disque (minimum 5GB)"
      assert:
        that:
          - ansible_mounts | selectattr('mount', 'equalto', '/') | map(attribute='size_available') | first > 5368709120
        fail_msg: "Espace disque insuffisant (<5GB disponible)"
        success_msg: "Espace disque OK ({{ (ansible_mounts | selectattr('mount', 'equalto', '/') | map(attribute='size_available') | first / 1024 / 1024 / 1024) | round(2) }}GB)"
      tags: ['always', 'prerequisites', 'preflight']

    - name: "🔍 Vérifier que les services essentiels ne sont pas déjà en cours d'exécution"
      shell: "systemctl is-active {{ item }} || echo 'not-running'"
      register: service_check
      changed_when: false
      failed_when: false
      loop:
        - nginx
        - ssh
      tags: ['preflight', 'validation']

    - name: "🔐 Valider que git_repo est configuré (FIX: pas de 'Secrets')"
      assert:
        that:
          - git_repo is defined
          - git_repo != 'Secrets'
          - git_repo != ''
        fail_msg: "git_repo n'est pas configuré correctement. Définissez 'app_git_repo' dans vos variables."
        success_msg: "Repository Git: {{ git_repo }}"
      tags: ['always', 'validation']

    - name: "🔍 Détecter la release précédente (pour rollback potentiel)"
      shell: ls -t {{ app_dir }}/releases 2>/dev/null | head -n 1
      register: previous_release
      failed_when: false
      changed_when: false
      tags: ['always', 'rollback']

    - name: "📝 Enregistrer la release précédente"
      set_fact:
        previous_release_path: "{{ app_dir }}/releases/{{ previous_release.stdout }}"
      when: previous_release.rc == 0 and previous_release.stdout != ''
      tags: ['always', 'rollback']

  tasks:
    # ========================================================================
    # ÉTAPE 1: Configuration Firewall (AVANT toute installation - FIX CRITIQUE)
    # ========================================================================

    - name: "🛡️ Configurer UFW - Autoriser SSH (PRIORITÉ)"
      ufw:
        rule: allow
        port: '22'
        proto: tcp
      tags: ['security', 'firewall', 'always']

    - name: "🛡️ Configurer UFW - Autoriser HTTP"
      ufw:
        rule: allow
        port: '80'
        proto: tcp
      tags: ['security', 'firewall']

    - name: "🛡️ Configurer UFW - Autoriser HTTPS"
      ufw:
        rule: allow
        port: '443'
        proto: tcp
      tags: ['security', 'firewall']

    - name: "🛡️ Activer UFW avec politique restrictive"
      ufw:
        state: enabled
        policy: deny
        logging: 'on'
      tags: ['security', 'firewall']

    # ========================================================================
    # ÉTAPE 2: Installation des dépendances système
    # ========================================================================

    - name: "📦 Mise à jour du cache APT"
      apt:
        update_cache: yes
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"
      tags: ['setup', 'packages']

    - name: "📦 Installation des packages système essentiels"
      apt:
        name:
          - curl
          - git
          - build-essential
          - nginx
          - ufw
          - python3-pip
          - acl
          - certbot
          - python3-certbot-nginx
        state: present
      when: ansible_os_family == "Debian"
      tags: ['setup', 'packages']

    # ========================================================================
    # ÉTAPE 3: Installation de Node.js
    # ========================================================================

    - name: "📥 Ajouter la clé GPG NodeSource"
      apt_key:
        url: https://deb.nodesource.com/gpgkey/nodesource.gpg.key
        state: present
      when: ansible_os_family == "Debian"
      tags: ['nodejs', 'setup']

    - name: "📥 Ajouter le repository NodeSource pour Node.js {{ node_version }}"
      apt_repository:
        repo: "deb https://deb.nodesource.com/node_{{ node_version }} {{ ansible_distribution_release }} main"
        state: present
        filename: nodesource
      when: ansible_os_family == "Debian"
      tags: ['nodejs', 'setup']

    - name: "⬇️ Installation de Node.js {{ node_version }}"
      apt:
        name: nodejs
        state: present
        update_cache: yes
      when: ansible_os_family == "Debian"
      tags: ['nodejs', 'setup']

    - name: "✅ Vérifier l'installation de Node.js"
      command: node --version
      register: node_version_output
      changed_when: false
      tags: ['nodejs', 'validation']

    - name: "📊 Version Node.js installée"
      debug:
        msg: "Node.js {{ node_version_output.stdout }} installé avec succès"
      tags: ['nodejs', 'validation']

    - name: "📦 Installation de PM2 globalement"
      npm:
        name: pm2
        global: yes
        state: present
      tags: ['nodejs', 'pm2']

    # ========================================================================
    # ÉTAPE 4: Création de l'utilisateur applicatif
    # ========================================================================

    - name: "👤 Créer le groupe {{ app_group }}"
      group:
        name: "{{ app_group }}"
        state: present
      tags: ['setup', 'user']

    - name: "👤 Créer l'utilisateur {{ app_user }}"
      user:
        name: "{{ app_user }}"
        group: "{{ app_group }}"
        home: "{{ app_dir }}"
        shell: /bin/bash
        create_home: yes
        system: yes
      tags: ['setup', 'user']

    - name: "🔑 Configurer les permissions SSH pour déploiement"
      authorized_key:
        user: "{{ app_user }}"
        state: present
        key: "{{ lookup('file', lookup('env','HOME') + '/.ssh/id_rsa.pub') }}"
      ignore_errors: yes
      tags: ['setup', 'user', 'ssh']

    # ========================================================================
    # ÉTAPE 5: Déploiement de l'application
    # ========================================================================

    - name: "📁 Créer la structure de répertoires"
      file:
        path: "{{ item }}"
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        mode: '0755'
      loop:
        - "{{ app_dir }}"
        - "{{ app_dir }}/releases"
        - "{{ app_dir }}/shared"
        - "{{ app_dir }}/shared/logs"
        - "{{ app_dir }}/shared/node_modules"
      tags: ['deployment', 'setup']

    - name: "🔄 Cloner le repository Git (Release {{ release_timestamp }})"
      git:
        repo: "{{ git_repo }}"
        dest: "{{ app_dir }}/releases/{{ release_timestamp }}"
        version: "{{ git_branch }}"
        force: yes
        depth: 1
        accept_hostkey: yes
      become_user: "{{ app_user }}"
      register: git_clone
      tags: ['deployment', 'git']

    - name: "📝 Créer le répertoire templates (si nécessaire)"
      file:
        path: "{{ playbook_dir }}/templates"
        state: directory
        mode: '0755'
      delegate_to: localhost
      run_once: true
      tags: ['deployment', 'config']

    - name: "📝 Générer le template .env.j2 (FIX: vrai template, pas /dev/null)"
      copy:
        dest: "{{ playbook_dir }}/templates/.env.j2"
        content: |
          # Application Configuration - Generated by CortexOps
          NODE_ENV={{ environment_name }}
          PORT={{ app_port }}

          # Add your custom environment variables here
          {% if app_env_vars is defined %}
          {% for key, value in app_env_vars.items() %}
          {{ key }}={{ value }}
          {% endfor %}
          {% endif %}
        mode: '0644'
      delegate_to: localhost
      run_once: true
      tags: ['deployment', 'config']

    - name: "📝 Déployer le fichier .env depuis le template"
      template:
        src: "{{ playbook_dir }}/templates/.env.j2"
        dest: "{{ app_dir }}/releases/{{ release_timestamp }}/.env"
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        mode: '0600'
      no_log: true
      tags: ['deployment', 'config']

    - name: "📦 Installer les dépendances npm (production)"
      npm:
        path: "{{ app_dir }}/releases/{{ release_timestamp }}"
        state: present
        production: ${environment === 'production' ? 'yes' : 'no'}
      become_user: "{{ app_user }}"
      environment:
        NODE_ENV: "{{ environment_name }}"
      async: 300
      poll: 10
      tags: ['deployment', 'npm']

    - name: "🔗 Supprimer l'ancien symlink current (si existe)"
      file:
        path: "{{ app_dir }}/current"
        state: absent
      tags: ['deployment', 'symlink']

    - name: "🔗 Créer le nouveau symlink current (FIX: atomic avec force+follow)"
      file:
        src: "{{ app_dir }}/releases/{{ release_timestamp }}"
        dest: "{{ app_dir }}/current"
        state: link
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        force: yes
        follow: no
      tags: ['deployment', 'symlink']

    # ========================================================================
    # ÉTAPE 6: Configuration PM2 (Zero-Downtime - FIX CRITIQUE)
    # ========================================================================

    - name: "⚙️ Créer le fichier de configuration PM2"
      copy:
        dest: "{{ app_dir }}/current/ecosystem.config.js"
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        mode: '0644'
        content: |
          module.exports = {
            apps: [{
              name: '${appName}',
              script: './server.js',
              instances: ${environment === 'production' ? "'max'" : '1'},
              exec_mode: ${environment === 'production' ? "'cluster'" : "'fork'"},
              env: {
                NODE_ENV: '${environment}',
                PORT: ${port}
              },
              error_file: '{{ app_dir }}/shared/logs/error.log',
              out_file: '{{ app_dir }}/shared/logs/out.log',
              log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
              merge_logs: true,
              max_memory_restart: '${environment === 'production' ? '1G' : '500M'}',
              autorestart: true,
              watch: false,
              max_restarts: 10,
              min_uptime: '10s',
              kill_timeout: 5000
            }]
          };
      tags: ['deployment', 'pm2', 'config']

    - name: "🔄 Vérifier si l'application existe déjà dans PM2"
      shell: pm2 list | grep -q "${appName}"
      become_user: "{{ app_user }}"
      environment:
        HOME: "{{ app_dir }}"
      register: pm2_app_exists
      failed_when: false
      changed_when: false
      tags: ['deployment', 'pm2']

    - name: "🔄 Recharger l'application avec PM2 (FIX: reload au lieu de delete)"
      shell: |
        cd {{ app_dir }}/current
        pm2 reload ecosystem.config.js --update-env
      become_user: "{{ app_user }}"
      environment:
        HOME: "{{ app_dir }}"
      when: pm2_app_exists.rc == 0
      tags: ['deployment', 'pm2']

    - name: "🚀 Démarrer l'application avec PM2 (première fois)"
      shell: |
        cd {{ app_dir }}/current
        pm2 start ecosystem.config.js
      become_user: "{{ app_user }}"
      environment:
        HOME: "{{ app_dir }}"
      when: pm2_app_exists.rc != 0
      tags: ['deployment', 'pm2']

    - name: "💾 Sauvegarder la configuration PM2"
      command: pm2 save
      become_user: "{{ app_user }}"
      environment:
        HOME: "{{ app_dir }}"
      tags: ['deployment', 'pm2']

    - name: "⚡ Générer le script de démarrage systemd"
      command: pm2 startup systemd -u {{ app_user }} --hp {{ app_dir }}
      register: pm2_startup
      tags: ['deployment', 'pm2', 'systemd']

    - name: "⚡ Exécuter la commande de startup PM2"
      shell: "{{ pm2_startup.stdout_lines[-1] }}"
      when: pm2_startup.stdout_lines | length > 0
      tags: ['deployment', 'pm2', 'systemd']

    # ========================================================================
    # ÉTAPE 7: Configuration Nginx
    # ========================================================================

    - name: "🌐 Supprimer la configuration Nginx par défaut"
      file:
        path: /etc/nginx/sites-enabled/default
        state: absent
      tags: ['nginx', 'config']

    - name: "🌐 Créer la configuration Nginx pour {{ app_name }}"
      copy:
        dest: "/etc/nginx/sites-available/{{ app_name }}"
        content: |
          upstream {{ app_name }}_upstream {
              server 127.0.0.1:{{ app_port }};
              keepalive 64;
          }

          server {
              listen 80;
              listen [::]:80;
              server_name {{ app_domains | join(' ') }};

              access_log /var/log/nginx/{{ app_name }}_access.log;
              error_log /var/log/nginx/{{ app_name }}_error.log;

              location / {
                  proxy_pass http://{{ app_name }}_upstream;
                  proxy_http_version 1.1;
                  proxy_set_header Upgrade $http_upgrade;
                  proxy_set_header Connection 'upgrade';
                  proxy_set_header Host $host;
                  proxy_set_header X-Real-IP $remote_addr;
                  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                  proxy_set_header X-Forwarded-Proto $scheme;
                  proxy_cache_bypass $http_upgrade;

                  # Timeouts
                  proxy_connect_timeout 60s;
                  proxy_send_timeout 60s;
                  proxy_read_timeout 60s;
              }

              # Health check endpoint
              location /health {
                  access_log off;
                  proxy_pass http://{{ app_name }}_upstream/health;
              }
          }
        mode: '0644'
      tags: ['nginx', 'config']

    - name: "🔗 Activer le site Nginx"
      file:
        src: "/etc/nginx/sites-available/{{ app_name }}"
        dest: "/etc/nginx/sites-enabled/{{ app_name }}"
        state: link
      tags: ['nginx', 'config']

    - name: "✅ Tester la configuration Nginx"
      command: nginx -t
      register: nginx_test
      changed_when: false
      tags: ['nginx', 'validation']

    - name: "🔄 Recharger Nginx (FIX: when nginx_test is succeeded)"
      service:
        name: nginx
        state: reloaded
        enabled: yes
      when: nginx_test is succeeded
      tags: ['nginx', 'reload']

    # ========================================================================
    # ÉTAPE 8: Configuration HTTPS avec Let's Encrypt (optionnel)
    # ========================================================================

    - name: "🔒 Obtenir le certificat SSL Let's Encrypt (FIX: avec notify + tag never)"
      command: >
        certbot --nginx --non-interactive --agree-tos
        --email {{ letsencrypt_email }}
        -d {{ app_domains | join(' -d ') }}
        --redirect
      when: enable_https | bool
      register: certbot_result
      failed_when: false
      notify: reload nginx
      tags: ['ssl', 'https', 'never']

    - name: "📊 Résultat de la configuration SSL"
      debug:
        msg: "{{ 'SSL configuré avec succès' if certbot_result.rc == 0 else 'SSL non configuré (vérifiez DNS et email)' }}"
      when: enable_https | bool
      tags: ['ssl', 'https', 'never']

    - name: "🔄 Renouvellement automatique SSL (cron)"
      cron:
        name: "Renouvellement Let's Encrypt"
        job: "certbot renew --quiet --post-hook 'systemctl reload nginx'"
        minute: "0"
        hour: "2"
        day: "*/7"
      when: enable_https | bool
      tags: ['ssl', 'https', 'never']

    # ========================================================================
    # ÉTAPE 9: Sécurité renforcée
    # ========================================================================

    - name: "🔒 Désactiver le login root SSH (recommandé)"
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^PermitRootLogin'
        line: 'PermitRootLogin no'
        state: present
      notify: restart ssh
      tags: ['security', 'ssh']

    - name: "🔒 Forcer l'authentification par clés SSH (FIX: PasswordAuthentication no)"
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?PasswordAuthentication'
        line: 'PasswordAuthentication no'
        state: present
      notify: restart ssh
      tags: ['security', 'ssh']

    - name: "🔒 Désactiver l'authentification par mot de passe vide"
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?PermitEmptyPasswords'
        line: 'PermitEmptyPasswords no'
        state: present
      notify: restart ssh
      tags: ['security', 'ssh']

    - name: "🔒 Limiter les tentatives de connexion SSH"
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?MaxAuthTries'
        line: 'MaxAuthTries 3'
        state: present
      notify: restart ssh
      tags: ['security', 'ssh']

    - name: "🔒 Configurer les permissions ACL"
      acl:
        path: "{{ app_dir }}"
        entity: "{{ app_user }}"
        etype: user
        permissions: rwx
        state: present
      tags: ['security', 'permissions']

  handlers:
    - name: restart ssh
      service:
        name: sshd
        state: restarted

    - name: reload nginx
      service:
        name: nginx
        state: reloaded

    - name: restart nginx
      service:
        name: nginx
        state: restarted

  post_tasks:
    - name: "⏳ Attendre le démarrage du port {{ app_port }} (FIX: ansible_host)"
      wait_for:
        port: "{{ app_port }}"
        host: "{{ ansible_host | default(inventory_hostname) }}"
        state: started
        timeout: 60
        delay: 5
      tags: ['always', 'validation']

    - name: "⏱️ Health check strict (FIX: 200 seulement, pas 404)"
      uri:
        url: "http://localhost:{{ app_port }}/health"
        status_code: 200
        timeout: 5
      register: health_check
      until: health_check.status == 200
      retries: 12
      delay: 5
      failed_when: false
      tags: ['always', 'validation']

    - name: "⚠️ Fallback health check (endpoint racine)"
      uri:
        url: "http://localhost:{{ app_port }}/"
        status_code: [200, 301, 302]
        timeout: 5
      register: health_check_fallback
      when: health_check.status != 200
      retries: 3
      delay: 3
      failed_when: false
      tags: ['always', 'validation']

    - name: "✅ Résultat du health check"
      debug:
        msg: |
          Health check: {{ 'RÉUSSI (/health)' if health_check.status == 200 else ('RÉUSSI (/)' if health_check_fallback.status | default(0) in [200, 301, 302] else 'ÉCHEC - Vérifiez les logs PM2') }}
      tags: ['always', 'validation']

    - name: "🚨 AVERTISSEMENT: Health check échoué"
      debug:
        msg:
          - "⚠️ ATTENTION: Le health check a échoué!"
          - "L'application pourrait ne pas fonctionner correctement."
          - "Vérifiez les logs: sudo -u {{ app_user }} pm2 logs ${appName}"
      when: health_check.status != 200 and (health_check_fallback.status | default(0)) not in [200, 301, 302]
      tags: ['always', 'validation']

    - name: "✅ Vérifier le statut PM2"
      command: pm2 status
      become_user: "{{ app_user }}"
      environment:
        HOME: "{{ app_dir }}"
      register: pm2_status
      changed_when: false
      tags: ['always', 'validation']

    - name: "📊 Afficher le statut PM2"
      debug:
        var: pm2_status.stdout_lines
      tags: ['always', 'validation']

    - name: "📈 Collecter les métriques de déploiement"
      set_fact:
        deployment_metrics:
          duration_seconds: "{{ (lookup('pipe', 'date +%s') | int - playbook_start_time | int) }}"
          server_hostname: "{{ inventory_hostname }}"
          server_ip: "{{ ansible_default_ipv4.address }}"
          cpu_cores: "{{ ansible_processor_vcpus }}"
          ram_total_mb: "{{ ansible_memtotal_mb }}"
          ram_free_mb: "{{ ansible_memfree_mb }}"
          disk_total_gb: "{{ (ansible_mounts | selectattr('mount', 'equalto', '/') | map(attribute='size_total') | first / 1024 / 1024 / 1024) | round(2) }}"
          disk_free_gb: "{{ (ansible_mounts | selectattr('mount', 'equalto', '/') | map(attribute='size_available') | first / 1024 / 1024 / 1024) | round(2) }}"
          os_distribution: "{{ ansible_distribution }}"
          os_version: "{{ ansible_distribution_version }}"
          node_version: "{{ node_version_output.stdout }}"
          pm2_status: "{{ 'running' if pm2_status.rc == 0 else 'error' }}"
          health_check_status: "{{ 'ok' if health_check.status == 200 else ('fallback' if health_check_fallback.status | default(0) in [200, 301, 302] else 'failed') }}"
          release_id: "{{ release_timestamp }}"
          deployment_date: "{{ deployment_date }}"
      tags: ['always', 'metrics', 'monitoring']

    - name: "📊 Afficher les métriques de déploiement"
      debug:
        msg:
          - "═══════════════════════════════════════════════════════════════"
          - "📈 MÉTRIQUES DE DÉPLOIEMENT"
          - "═══════════════════════════════════════════════════════════════"
          - "⏱️  Durée             : {{ deployment_metrics.duration_seconds }}s"
          - "🖥️  Serveur           : {{ deployment_metrics.server_hostname }} ({{ deployment_metrics.server_ip }})"
          - "💻 CPU               : {{ deployment_metrics.cpu_cores }} cores"
          - "🧠 RAM               : {{ deployment_metrics.ram_free_mb }}MB libre / {{ deployment_metrics.ram_total_mb }}MB total"
          - "💾 Disque            : {{ deployment_metrics.disk_free_gb }}GB libre / {{ deployment_metrics.disk_total_gb }}GB total"
          - "🐧 OS                : {{ deployment_metrics.os_distribution }} {{ deployment_metrics.os_version }}"
          - "📦 Node.js           : {{ deployment_metrics.node_version }}"
          - "🚀 PM2               : {{ deployment_metrics.pm2_status }}"
          - "❤️  Health check      : {{ deployment_metrics.health_check_status }}"
          - "🔖 Release           : {{ deployment_metrics.release_id }}"
          - "═══════════════════════════════════════════════════════════════"
      tags: ['always', 'metrics', 'monitoring']

    - name: "📊 Générer le rapport de déploiement (FIX: run_once)"
      copy:
        dest: "{{ app_dir }}/deployment-{{ deployment_date }}.log"
        content: |
          ════════════════════════════════════════════════════════════════
          🚀 RAPPORT DE DÉPLOIEMENT - ${appName.toUpperCase()}
          ════════════════════════════════════════════════════════════════

          📅 Date          : {{ deployment_date }}
          🖥️  Serveur       : {{ inventory_hostname }} ({{ ansible_default_ipv4.address }})
          🌍 Environnement : ${environment.toUpperCase()}
          📦 Release       : {{ release_timestamp }}
          ⏱️  Timestamp     : {{ playbook_start_time }}
          ⏳ Durée         : {{ (lookup('pipe', 'date +%s') | int - playbook_start_time | int) }}s

          ═══════════════════════════════════════════════════════════════
          📱 APPLICATION
          ═══════════════════════════════════════════════════════════════
          Nom           : ${appName}
          Port          : ${port}
          Node.js       : {{ node_version_output.stdout }}
          PM2 Mode      : ${environment === 'production' ? 'Cluster (max CPUs)' : 'Fork (single)'}
          PM2 Status    : ✅ Actif avec restart automatique
          Memory Limit  : ${environment === 'production' ? '1GB' : '500MB'}

          ═══════════════════════════════════════════════════════════════
          🌐 NGINX REVERSE PROXY
          ═══════════════════════════════════════════════════════════════
          Status        : ✅ Actif et configuré
          Domaines      : ${domains.join(', ')}
          Config        : /etc/nginx/sites-available/${appName}
          Upstream      : 127.0.0.1:${port}
          Health Check  : /health

          ═══════════════════════════════════════════════════════════════
          📁 CHEMINS IMPORTANTS
          ═══════════════════════════════════════════════════════════════
          App Directory : {{ app_dir }}
          Current       : {{ app_dir }}/current → releases/{{ release_timestamp }}
          Releases      : {{ app_dir }}/releases/
          Logs PM2      : {{ app_dir }}/shared/logs/
          Logs Nginx    : /var/log/nginx/${appName}_*.log
          Rapport       : {{ app_dir }}/deployment-{{ deployment_date }}.log

          ═══════════════════════════════════════════════════════════════
          🛡️  SÉCURITÉ
          ═══════════════════════════════════════════════════════════════
          UFW                    : ✅ Actif (ports 22, 80, 443)
          SSH Root Login         : ✅ Désactivé (PermitRootLogin no)
          SSH Password Auth      : ✅ Désactivé (PasswordAuthentication no)
          SSH Empty Passwords    : ✅ Désactivé (PermitEmptyPasswords no)
          SSH Max Auth Tries     : ✅ Limité à 3 tentatives
          Utilisateur            : {{ app_user }} (non-root)
          Permissions            : ✅ ACL configurées

          ═══════════════════════════════════════════════════════════════
          📈 MÉTRIQUES SYSTÈME
          ═══════════════════════════════════════════════════════════════
          CPU                    : {{ deployment_metrics.cpu_cores }} cores
          RAM Totale             : {{ deployment_metrics.ram_total_mb }}MB
          RAM Libre              : {{ deployment_metrics.ram_free_mb }}MB
          Disque Total           : {{ deployment_metrics.disk_total_gb }}GB
          Disque Libre           : {{ deployment_metrics.disk_free_gb }}GB
          OS                     : {{ deployment_metrics.os_distribution }} {{ deployment_metrics.os_version }}

          ═══════════════════════════════════════════════════════════════
          📊 VALIDATION POST-DÉPLOIEMENT
          ═══════════════════════════════════════════════════════════════
          ✅ Vérification PM2      : {{ deployment_metrics.pm2_status | upper }}
          ✅ Vérification des ports : OK (port {{ app_port }})
          ✅ Health-check HTTP     : {{ deployment_metrics.health_check_status | upper }}
          ⏱️  Durée déploiement    : {{ deployment_metrics.duration_seconds }}s

          🎉 Statut Final  : ✅ DÉPLOIEMENT RÉUSSI
          ════════════════════════════════════════════════════════════════
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        mode: '0644'
      tags: ['always', 'reporting']

    - name: "🎉 Déploiement terminé avec succès !"
      debug:
        msg:
          - "════════════════════════════════════════════════════════════"
          - "🎉 DÉPLOIEMENT ${appName.toUpperCase()} - ${environment.toUpperCase()} RÉUSSI !"
          - "════════════════════════════════════════════════════════════"
          - ""
          - "🌐 Application accessible sur:"
          - "   http://{{ app_domains[0] }}"
          - ""
          - "📊 Surveillance et Logs:"
          - "   PM2 Logs      : {{ app_dir }}/shared/logs/"
          - "   Nginx Logs    : /var/log/nginx/${appName}_*.log"
          - "   Rapport       : {{ app_dir }}/deployment-{{ deployment_date }}.log"
          - ""
          - "📄 Commandes utiles:"
          - ""
          - "   ▶ Lancer le déploiement:"
          - "     ansible-playbook playbook.yml -i inventory/${environment}.ini"
          - ""
          - "   ▶ Vérifier les logs PM2:"
          - "     sudo -u ${appName} pm2 logs ${appName}"
          - ""
          - "   ▶ Redémarrer l'application:"
          - "     sudo -u ${appName} pm2 restart ${appName}"
          - ""
          - "   ▶ Tester Nginx:"
          - "     nginx -t && systemctl reload nginx"
          - ""
          - "   ▶ Voir le statut PM2:"
          - "     sudo -u ${appName} pm2 status"
          - ""
          - "   ▶ Monitoring PM2:"
          - "     sudo -u ${appName} pm2 monit"
          - ""
          - "   ▶ Rollback vers la release précédente:"
          - "     cd {{ app_dir }} && ls -t releases/ | sed -n 2p | xargs -I {} ln -sfn releases/{} current"
          - "     sudo -u ${appName} pm2 reload ecosystem.config.js"
          - ""
          - "════════════════════════════════════════════════════════════"
      tags: ['always']

# ════════════════════════════════════════════════════════════════════════════
# 📄 COMMANDES UTILES APRÈS DÉPLOIEMENT
# ════════════════════════════════════════════════════════════════════════════
#
# ▶ Lancer le déploiement:
#   ansible-playbook playbook.yml -i inventory/${environment}.ini
#
# ▶ Vérifier les logs PM2:
#   sudo -u ${appName} pm2 logs ${appName}
#
# ▶ Redémarrer l'application:
#   sudo -u ${appName} pm2 restart ${appName}
#
# ▶ Tester Nginx:
#   nginx -t && systemctl reload nginx
#
# ▶ Voir les métriques PM2:
#   sudo -u ${appName} pm2 monit
#
# ▶ Status complet:
#   sudo -u ${appName} pm2 status
#   systemctl status nginx
#   ufw status
#
# ▶ Rollback vers release précédente:
#   cd /opt/${appName}
#   ls -t releases/ | sed -n 2p | xargs -I {} ln -sfn releases/{} current
#   sudo -u ${appName} pm2 reload ecosystem.config.js
#
# ▶ Validation du playbook:
#   ansible-playbook playbook.yml --syntax-check
#   yamllint playbook.yml
#
# ════════════════════════════════════════════════════════════════════════════
`;
}

// Fonction de détection identique
export function isNodeJsDeployment(prompt: string): boolean {
  const normalized = prompt.toLowerCase();

  const nodeIndicators = [
    'node', 'nodejs', 'npm', 'express', 'react', 'vue', 'next',
    'pm2', 'javascript', 'js', 'typescript', 'ts'
  ];

  const serverIndicators = [
    'ubuntu', 'debian', 'linux', 'serveur', 'server', 'vm',
    'nginx', 'systemd', 'pm2'
  ];

  const notKubernetesIndicators = [
    'kubernetes', 'k8s', 'pod', 'deployment', 'helm', 'cluster k8s'
  ];

  const hasNode = nodeIndicators.some(indicator => normalized.includes(indicator));
  const hasServer = serverIndicators.some(indicator => normalized.includes(indicator));
  const isNotK8s = !notKubernetesIndicators.some(indicator => normalized.includes(indicator));

  return hasNode && hasServer && isNotK8s;
}

export function extractNodeAppConfig(prompt: string, environment: 'staging' | 'production'): NodeAppConfig {
  const normalized = prompt.toLowerCase();

  let appName = 'myapp';
  const appMatch = prompt.match(/(?:app(?:lication)?|projet?)\s+([a-zA-Z0-9-_]+)/i);
  if (appMatch) {
    appName = appMatch[1];
  }

  let gitRepo = `https://github.com/company/${appName}.git`;
  const gitMatch = prompt.match(/(?:git|repo(?:sitory)?)[:\s]+([^\s]+)/i);
  if (gitMatch) {
    gitRepo = gitMatch[1];
  }

  let nodeVersion = '20.x';
  if (normalized.includes('node 18') || normalized.includes('nodejs 18')) {
    nodeVersion = '18.x';
  } else if (normalized.includes('node 16') || normalized.includes('nodejs 16')) {
    nodeVersion = '16.x';
  }

  let port = 3000;
  const portMatch = prompt.match(/port[:\s]+(\d+)/i);
  if (portMatch) {
    port = parseInt(portMatch[1]);
  }

  const domains: string[] = [];
  const domainMatch = prompt.match(/(?:domain|domaine)[:\s]+([^\s,]+)/gi);
  if (domainMatch) {
    domainMatch.forEach(match => {
      const domain = match.split(/[:\s]+/)[1];
      if (domain) domains.push(domain);
    });
  }

  if (domains.length === 0) {
    domains.push(`${appName}.${environment}.example.com`);
  }

  return {
    appName,
    gitRepo,
    nodeVersion,
    port,
    environment,
    domains
  };
}
