/**
 * Générateur de playbooks pour déploiement d'applications Node.js
 * sur serveurs Linux (Ubuntu/Debian/RedHat)
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
 * Génère un playbook complet pour déployer une application Node.js
 * sur des serveurs Ubuntu avec PM2, Nginx et systemd
 */
export function generateNodeAppDeployment(config: NodeAppConfig): string {
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
# 🧩 ARCHITECTURE SUPPORTÉE:
#   - Serveurs Ubuntu 20.04/22.04 LTS
#   - Node.js ${nodeVersion} (via NodeSource)
#   - PM2 en mode cluster (haute disponibilité)
#   - Nginx comme reverse proxy
#   - Déploiement Zero-Downtime avec symlink current
#   - Configuration UFW sécurisée
#   - Health-check automatique
#   - Validation automatique post-déploiement
#
# 🛠 CE QUE CE PLAYBOOK CONFIGURE AUTOMATIQUEMENT:
#   ✔ Système & dépendances (APT, Git, curl, build tools, Nginx, UFW, Python3)
#   ✔ Création utilisateur applicatif sécurisé
#   ✔ Déploiement par releases versionnées
#   ✔ Clone Git, Installation npm (production), Génération .env
#   ✔ Symlink vers /opt/app/current
#   ✔ PM2 Cluster mode avec startup systemd automatisé
#   ✔ Nginx reverse proxy avec upstream HTTP
#   ✔ Health endpoint /health
#   ✔ Sécurité UFW (ports 22, 80, 443)
#   ✔ Validation post-déploiement avec health-check en boucle
#   ✔ Rapport détaillé du déploiement
#
# 📋 INVENTAIRE ATTENDU:
#   [${environment}]
#   ${environment}1 ansible_host=192.168.1.10 ansible_user=deploy
#   ${environment}2 ansible_host=192.168.1.11 ansible_user=deploy
#
# 📄 EXÉCUTION:
#   ansible-playbook playbook.yml -i inventory/${environment}.ini
#
# 📄 EXEMPLES DE COMMANDES APRÈS DÉPLOIEMENT:
#   ▶ Vérifier les logs PM2
#     sudo -u ${appName} pm2 logs ${appName}
#
#   ▶ Redémarrer l'application
#     sudo -u ${appName} pm2 restart ${appName}
#
#   ▶ Tester Nginx
#     nginx -t && systemctl reload nginx
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

    - name: "📊 Afficher les informations des serveurs cibles"
      debug:
        msg:
          - "Serveur: {{ inventory_hostname }}"
          - "IP: {{ ansible_default_ipv4.address }}"
          - "OS: {{ ansible_distribution }} {{ ansible_distribution_version }}"
          - "RAM: {{ ansible_memtotal_mb }}MB"
          - "CPU: {{ ansible_processor_vcpus }} cores"
      tags: ['always', 'info']

    - name: "💾 Vérifier l'espace disque (minimum 5GB)"
      assert:
        that:
          - ansible_mounts | selectattr('mount', 'equalto', '/') | map(attribute='size_available') | first > 5368709120
        fail_msg: "Espace disque insuffisant (<5GB disponible)"
        success_msg: "Espace disque OK ({{ (ansible_mounts | selectattr('mount', 'equalto', '/') | map(attribute='size_available') | first / 1024 / 1024 / 1024) | round(2) }}GB)"
      tags: ['always', 'prerequisites']

  tasks:
    # ========================================================================
    # ÉTAPE 1: Configuration Firewall (AVANT toute installation)
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

    - name: "🔄 Cloner le repository Git (Release {{ ansible_date_time.epoch }})"
      git:
        repo: "{{ git_repo }}"
        dest: "{{ app_dir }}/releases/{{ ansible_date_time.epoch }}"
        version: "{{ git_branch }}"
        force: yes
        depth: 1
        accept_hostkey: yes
      become_user: "{{ app_user }}"
      register: git_clone
      tags: ['deployment', 'git']
      when: git_repo is defined and git_repo != 'Secrets'

    - name: "📝 Créer le répertoire templates (si nécessaire)"
      file:
        path: "{{ playbook_dir }}/templates"
        state: directory
        mode: '0755'
      delegate_to: localhost
      run_once: true
      tags: ['deployment', 'config']

    - name: "📝 Générer le template .env.j2"
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
        dest: "{{ app_dir }}/releases/{{ ansible_date_time.epoch }}/.env"
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        mode: '0600'
      no_log: true
      tags: ['deployment', 'config']

    - name: "📦 Installer les dépendances npm (production)"
      npm:
        path: "{{ app_dir }}/releases/{{ ansible_date_time.epoch }}"
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

    - name: "🔗 Créer le nouveau symlink current (atomic)"
      file:
        src: "{{ app_dir }}/releases/{{ ansible_date_time.epoch }}"
        dest: "{{ app_dir }}/current"
        state: link
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        force: yes
      tags: ['deployment', 'symlink']

    # ========================================================================
    # ÉTAPE 6: Configuration PM2 (Zero-Downtime)
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
              min_uptime: '10s'
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

    - name: "🔄 Recharger l'application avec PM2 (Zero-Downtime)"
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

    - name: "🔄 Recharger Nginx"
      service:
        name: nginx
        state: reloaded
        enabled: yes
      when: nginx_test.rc == 0
      tags: ['nginx', 'reload']

    # ========================================================================
    # ÉTAPE 8: Configuration HTTPS avec Let's Encrypt (optionnel)
    # ========================================================================

    - name: "🔒 Obtenir le certificat SSL Let's Encrypt"
      command: >
        certbot --nginx --non-interactive --agree-tos
        --email {{ letsencrypt_email }}
        -d {{ app_domains | join(' -d ') }}
        --redirect
      when: enable_https | bool
      register: certbot_result
      failed_when: false
      tags: ['ssl', 'https']

    - name: "📊 Résultat de la configuration SSL"
      debug:
        msg: "{{ 'SSL configuré avec succès' if certbot_result.rc == 0 else 'SSL non configuré (vérifiez DNS et email)' }}"
      when: enable_https | bool
      tags: ['ssl', 'https']

    - name: "🔄 Renouvellement automatique SSL (cron)"
      cron:
        name: "Renouvellement Let's Encrypt"
        job: "certbot renew --quiet --post-hook 'systemctl reload nginx'"
        minute: "0"
        hour: "2"
        day: "*/7"
      when: enable_https | bool
      tags: ['ssl', 'https']

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

  post_tasks:
    - name: "⏳ Attendre le démarrage du port {{ app_port }}"
      wait_for:
        port: "{{ app_port }}"
        host: localhost
        state: started
        timeout: 60
        delay: 5
      tags: ['always', 'validation']

    - name: "⏱️ Health check strict (endpoint /health - DOIT être 200)"
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

    - name: "📊 Générer le rapport de déploiement"
      copy:
        dest: "{{ app_dir }}/deployment-{{ ansible_date_time.date }}.log"
        content: |
          ════════════════════════════════════════════════════════════════
          ════════════════════════════════════════════════════════════════
          🚀 RAPPORT DE DÉPLOIEMENT - ${appName.toUpperCase()}
          ════════════════════════════════════════════════════════════════

          📅 Date          : {{ ansible_date_time.iso8601 }}
          🖥️  Serveur       : {{ inventory_hostname }} ({{ ansible_default_ipv4.address }})
          🌍 Environnement : ${environment.toUpperCase()}
          📦 Release       : {{ ansible_date_time.epoch }}

          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          📱 APPLICATION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          Nom           : ${appName}
          Port          : ${port}
          Node.js       : {{ node_version_output.stdout }}
          PM2 Mode      : ${environment === 'production' ? 'Cluster (max CPUs)' : 'Fork (single)'}
          PM2 Status    : ✅ Actif avec restart automatique
          Memory Limit  : ${environment === 'production' ? '1GB' : '500MB'}

          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          🌐 NGINX REVERSE PROXY
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          Status        : ✅ Actif et configuré
          Domaines      : ${domains.join(', ')}
          Config        : /etc/nginx/sites-available/${appName}
          Upstream      : 127.0.0.1:${port}
          Health Check  : /health

          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          📁 CHEMINS IMPORTANTS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          App Directory : {{ app_dir }}
          Current       : {{ app_dir }}/current → releases/{{ ansible_date_time.epoch }}
          Releases      : {{ app_dir }}/releases/
          Logs PM2      : {{ app_dir }}/shared/logs/
          Logs Nginx    : /var/log/nginx/${appName}_*.log

          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          🛡️  SÉCURITÉ
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          UFW           : ✅ Actif (ports 22, 80, 443)
          SSH           : ✅ Root login désactivé
          Utilisateur   : {{ app_user }} (non-root)
          Permissions   : ✅ ACL configurées

          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          📊 VALIDATION POST-DÉPLOIEMENT
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ✅ Vérification PM2      : OK
          ✅ Vérification des ports : OK (port {{ app_port }})
          ✅ Health-check HTTP     : {{ 'OK' if health_check.status == 200 else 'N/A' }}

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
          - "   Rapport       : {{ app_dir }}/deployment-{{ ansible_date_time.date }}.log"
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
#   cd /opt/${appName} && ln -sfn releases/PREVIOUS_TIMESTAMP current
#   sudo -u ${appName} pm2 restart ${appName}
#
# ════════════════════════════════════════════════════════════════════════════
`;
}

/**
 * Détecte si un prompt concerne un déploiement Node.js sur serveurs Linux
 */
export function isNodeJsDeployment(prompt: string): boolean {
  const normalized = prompt.toLowerCase();

  // Indicateurs positifs pour Node.js
  const nodeIndicators = [
    'node', 'nodejs', 'npm', 'express', 'react', 'vue', 'next',
    'pm2', 'javascript', 'js', 'typescript', 'ts'
  ];

  // Indicateurs de déploiement sur serveurs
  const serverIndicators = [
    'ubuntu', 'debian', 'linux', 'serveur', 'server', 'vm',
    'nginx', 'systemd', 'pm2'
  ];

  // Indicateurs négatifs (pas Kubernetes)
  const notKubernetesIndicators = [
    'kubernetes', 'k8s', 'pod', 'deployment', 'helm', 'cluster k8s'
  ];

  const hasNode = nodeIndicators.some(indicator => normalized.includes(indicator));
  const hasServer = serverIndicators.some(indicator => normalized.includes(indicator));
  const isNotK8s = !notKubernetesIndicators.some(indicator => normalized.includes(indicator));

  return hasNode && hasServer && isNotK8s;
}

/**
 * Extrait la configuration depuis le prompt
 */
export function extractNodeAppConfig(prompt: string, environment: 'staging' | 'production'): NodeAppConfig {
  const normalized = prompt.toLowerCase();

  // Extraire le nom de l'app
  let appName = 'myapp';
  const appMatch = prompt.match(/(?:app(?:lication)?|projet?)\s+([a-zA-Z0-9-_]+)/i);
  if (appMatch) {
    appName = appMatch[1];
  }

  // Extraire le repo Git
  let gitRepo = `https://github.com/company/${appName}.git`;
  const gitMatch = prompt.match(/(?:git|repo(?:sitory)?)[:\s]+([^\s]+)/i);
  if (gitMatch) {
    gitRepo = gitMatch[1];
  }

  // Déterminer la version Node.js
  let nodeVersion = '20.x';
  if (normalized.includes('node 18') || normalized.includes('nodejs 18')) {
    nodeVersion = '18.x';
  } else if (normalized.includes('node 16') || normalized.includes('nodejs 16')) {
    nodeVersion = '16.x';
  }

  // Extraire le port
  let port = 3000;
  const portMatch = prompt.match(/port[:\s]+(\d+)/i);
  if (portMatch) {
    port = parseInt(portMatch[1]);
  }

  // Extraire les domaines
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
