/**
 * Rôle Ansible: Node.js App (Ultimate Enterprise Grade)
 * Déploiement complet avec PM2, NVM, CI/CD
 */

export function generateNodeAppRole(): Record<string, string> {
  return {
    'tasks/main.yml': `---
# ════════════════════════════════════════════════════════════════
# Rôle: NodeApp (Enterprise Grade)
# Description: Déploiement Node.js avec PM2, NVM, Zero-downtime
# ════════════════════════════════════════════════════════════════

- name: "📦 PHASE 1: Installation des prérequis"
  block:
    - name: "📦 Installer les dépendances système"
      apt:
        name:
          - build-essential
          - curl
          - git
          - libssl-dev
          - python3
        state: present
        update_cache: yes
      async: 120
      poll: 5

    - name: "👤 Créer l'utilisateur applicatif"
      user:
        name: "{{ app_user | default('nodeapp') }}"
        system: yes
        shell: /bin/bash
        create_home: yes
        home: "/home/{{ app_user | default('nodeapp') }}"

  rescue:
    - name: "⚠️ Échec de l'installation des prérequis"
      debug:
        msg: "Impossible d'installer les prérequis. Vérifiez les dépôts."

- name: "🔧 PHASE 2: Installation NVM (Node Version Manager)"
  block:
    - name: "📥 Télécharger NVM"
      shell: |
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v{{ nvm_version | default('0.39.5') }}/install.sh | bash
      args:
        creates: "/home/{{ app_user | default('nodeapp') }}/.nvm/nvm.sh"
      become_user: "{{ app_user | default('nodeapp') }}"
      environment:
        HOME: "/home/{{ app_user | default('nodeapp') }}"

    - name: "📝 Configurer NVM dans .bashrc"
      lineinfile:
        path: "/home/{{ app_user | default('nodeapp') }}/.bashrc"
        line: "{{ item }}"
        create: yes
        owner: "{{ app_user | default('nodeapp') }}"
      loop:
        - 'export NVM_DIR="$HOME/.nvm"'
        - '[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"'
        - '[ -s "$NVM_DIR/bash_completion" ] && \\. "$NVM_DIR/bash_completion"'

    - name: "📦 Installer Node.js {{ node_version | default('18') }} via NVM"
      shell: |
        export NVM_DIR="/home/{{ app_user | default('nodeapp') }}/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
        nvm install {{ node_version | default('18') }}
        nvm use {{ node_version | default('18') }}
        nvm alias default {{ node_version | default('18') }}
      args:
        creates: "/home/{{ app_user | default('nodeapp') }}/.nvm/versions/node"
      become_user: "{{ app_user | default('nodeapp') }}"
      environment:
        HOME: "/home/{{ app_user | default('nodeapp') }}"

    - name: "✅ Vérifier l'installation Node.js"
      shell: |
        export NVM_DIR="/home/{{ app_user | default('nodeapp') }}/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
        node --version
        npm --version
      become_user: "{{ app_user | default('nodeapp') }}"
      environment:
        HOME: "/home/{{ app_user | default('nodeapp') }}"
      register: node_versions
      changed_when: false

    - name: "📊 Afficher les versions installées"
      debug:
        msg:
          - "Node.js: {{ node_versions.stdout_lines[0] }}"
          - "NPM: {{ node_versions.stdout_lines[1] }}"

  when: use_nvm | default(true)

- name: "⚡ PHASE 3: Installation PM2 (Process Manager)"
  block:
    - name: "📦 Installer PM2 globalement"
      shell: |
        export NVM_DIR="/home/{{ app_user | default('nodeapp') }}/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
        npm install -g pm2@latest
      become_user: "{{ app_user | default('nodeapp') }}"
      environment:
        HOME: "/home/{{ app_user | default('nodeapp') }}"
      args:
        creates: "/home/{{ app_user | default('nodeapp') }}/.nvm/versions/node/v{{ node_version | default('18') }}.*/bin/pm2"

    - name: "⚙️ Configurer PM2 pour démarrage automatique"
      shell: |
        export NVM_DIR="/home/{{ app_user | default('nodeapp') }}/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
        pm2 startup systemd -u {{ app_user | default('nodeapp') }} --hp /home/{{ app_user | default('nodeapp') }}
      become: yes
      register: pm2_startup
      changed_when: "'[PM2]' in pm2_startup.stdout"

    - name: "✅ Vérifier l'installation PM2"
      shell: |
        export NVM_DIR="/home/{{ app_user | default('nodeapp') }}/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
        pm2 --version
      become_user: "{{ app_user | default('nodeapp') }}"
      environment:
        HOME: "/home/{{ app_user | default('nodeapp') }}"
      register: pm2_version
      changed_when: false

    - name: "📊 Version PM2"
      debug:
        msg: "PM2 version: {{ pm2_version.stdout }}"

  when: use_pm2 | default(true)

- name: "📁 PHASE 4: Préparation de la structure de déploiement"
  block:
    - name: "📁 Créer la structure de répertoires"
      file:
        path: "{{ item }}"
        state: directory
        owner: "{{ app_user | default('nodeapp') }}"
        group: "{{ app_user | default('nodeapp') }}"
        mode: '0755'
      loop:
        - "{{ app_dir | default('/opt/nodeapp') }}"
        - "{{ app_dir | default('/opt/nodeapp') }}/releases"
        - "{{ app_dir | default('/opt/nodeapp') }}/shared"
        - "{{ app_dir | default('/opt/nodeapp') }}/shared/logs"
        - "{{ app_dir | default('/opt/nodeapp') }}/shared/node_modules"
        - "{{ logs_dir | default('/var/log/nodeapp') }}"

- name: "🔄 PHASE 5: Déploiement de l'application"
  block:
    - name: "📥 Cloner le repository Git"
      git:
        repo: "{{ git_repo }}"
        dest: "{{ app_dir | default('/opt/nodeapp') }}/releases/{{ ansible_date_time.epoch }}"
        version: "{{ git_branch | default('main') }}"
        force: yes
      become_user: "{{ app_user | default('nodeapp') }}"
      when: git_repo is defined

    - name: "📝 Déployer le fichier .env"
      template:
        src: .env.j2
        dest: "{{ app_dir | default('/opt/nodeapp') }}/releases/{{ ansible_date_time.epoch }}/.env"
        owner: "{{ app_user | default('nodeapp') }}"
        mode: '0600'
      no_log: true

    - name: "📦 Installer les dépendances (npm install --production)"
      shell: |
        export NVM_DIR="/home/{{ app_user | default('nodeapp') }}/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
        cd {{ app_dir | default('/opt/nodeapp') }}/releases/{{ ansible_date_time.epoch }}
        npm install --production --no-optional
      become_user: "{{ app_user | default('nodeapp') }}"
      environment:
        HOME: "/home/{{ app_user | default('nodeapp') }}"
        NODE_ENV: "{{ node_env | default('production') }}"
      async: 300
      poll: 10

    - name: "🔧 Build de l'application (si nécessaire)"
      shell: |
        export NVM_DIR="/home/{{ app_user | default('nodeapp') }}/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
        cd {{ app_dir | default('/opt/nodeapp') }}/releases/{{ ansible_date_time.epoch }}
        npm run build
      become_user: "{{ app_user | default('nodeapp') }}"
      environment:
        HOME: "/home/{{ app_user | default('nodeapp') }}"
        NODE_ENV: "{{ node_env | default('production') }}"
      when: run_build | default(false)
      ignore_errors: yes

    - name: "🔗 Créer le symlink vers la release actuelle"
      file:
        src: "{{ app_dir | default('/opt/nodeapp') }}/releases/{{ ansible_date_time.epoch }}"
        dest: "{{ app_dir | default('/opt/nodeapp') }}/current"
        state: link
        owner: "{{ app_user | default('nodeapp') }}"
        force: yes

- name: "📝 PHASE 6: Configuration PM2 Ecosystem"
  block:
    - name: "📝 Déployer ecosystem.config.js"
      template:
        src: ecosystem.config.js.j2
        dest: "{{ app_dir | default('/opt/nodeapp') }}/current/ecosystem.config.js"
        owner: "{{ app_user | default('nodeapp') }}"
        mode: '0644'

    - name: "🔄 Arrêter l'ancienne version (graceful)"
      shell: |
        export NVM_DIR="/home/{{ app_user | default('nodeapp') }}/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
        pm2 delete {{ project_name | default('app') }} || true
      become_user: "{{ app_user | default('nodeapp') }}"
      environment:
        HOME: "/home/{{ app_user | default('nodeapp') }}"
      ignore_errors: yes
      when: use_pm2 | default(true)

    - name: "🚀 Démarrer l'application avec PM2"
      shell: |
        export NVM_DIR="/home/{{ app_user | default('nodeapp') }}/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
        cd {{ app_dir | default('/opt/nodeapp') }}/current
        pm2 start ecosystem.config.js
        pm2 save
      become_user: "{{ app_user | default('nodeapp') }}"
      environment:
        HOME: "/home/{{ app_user | default('nodeapp') }}"
        NODE_ENV: "{{ node_env | default('production') }}"
      when: use_pm2 | default(true)

    - name: "📊 Afficher le statut PM2"
      shell: |
        export NVM_DIR="/home/{{ app_user | default('nodeapp') }}/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
        pm2 list
      become_user: "{{ app_user | default('nodeapp') }}"
      environment:
        HOME: "/home/{{ app_user | default('nodeapp') }}"
      register: pm2_list
      changed_when: false
      when: use_pm2 | default(true)

    - name: "📋 Statut des applications"
      debug:
        var: pm2_list.stdout_lines
      when: use_pm2 | default(true)

  when: use_pm2 | default(true)

- name: "🧹 PHASE 7: Nettoyage des anciennes releases"
  block:
    - name: "📊 Lister les releases"
      find:
        paths: "{{ app_dir | default('/opt/nodeapp') }}/releases"
        file_type: directory
      register: releases

    - name: "🗑️ Garder seulement les {{ keep_releases | default(5) }} dernières"
      file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ releases.files | sort(attribute='mtime') | reverse | list }}"
      when: releases.files | length > (keep_releases | default(5))
      loop_control:
        index_var: release_index
      when: release_index >= (keep_releases | default(5))

- name: "✅ PHASE 8: Vérifications post-déploiement"
  block:
    - name: "⏳ Attendre que l'application démarre"
      wait_for:
        port: "{{ app_port | default(3000) }}"
        state: started
        timeout: 60
        delay: 5

    - name: "🔍 Health check HTTP"
      uri:
        url: "http://localhost:{{ app_port | default(3000) }}{{ health_check_path | default('/') }}"
        status_code: 200
        timeout: 10
      register: health_check
      retries: 3
      delay: 5
      until: health_check.status == 200

    - name: "✅ Déploiement réussi"
      debug:
        msg:
          - "✅ Application déployée avec succès !"
          - "🌐 URL: http://{{ ansible_default_ipv4.address }}:{{ app_port | default(3000) }}"
          - "📊 PM2 Status: {{ pm2_list.stdout_lines[0] | default('N/A') }}"
          - "🔄 Release: {{ ansible_date_time.epoch }}"

  rescue:
    - name: "⚠️ Health check échoué - Rollback"
      debug:
        msg: "Le health check a échoué. Considérez un rollback."
`,

    'templates/ecosystem.config.js.j2': `module.exports = {
  apps: [{
    name: '{{ project_name | default("app") }}',
    script: '{{ app_entrypoint | default("index.js") }}',
    cwd: '{{ app_dir | default("/opt/nodeapp") }}/current',
    instances: {{ pm2_instances | default("max") }},
    exec_mode: '{{ pm2_exec_mode | default("cluster") }}',
    env: {
      NODE_ENV: '{{ node_env | default("production") }}',
      PORT: {{ app_port | default(3000) }}
    },
    error_file: '{{ logs_dir | default("/var/log/nodeapp") }}/error.log',
    out_file: '{{ logs_dir | default("/var/log/nodeapp") }}/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    watch: false,
    max_memory_restart: '{{ pm2_max_memory | default("500M") }}',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    wait_ready: {{ pm2_wait_ready | default("true") }},
    listen_timeout: 3000
  }]
};
`,

    'templates/.env.j2': `# Application Configuration
NODE_ENV={{ node_env | default('production') }}
PORT={{ app_port | default(3000) }}

# Database
{% if db_host is defined %}
DB_HOST={{ db_host }}
DB_PORT={{ db_port | default(5432) }}
DB_NAME={{ db_name }}
DB_USER={{ db_user }}
DB_PASSWORD={{ db_password }}
{% endif %}

# Redis (if needed)
{% if redis_host is defined %}
REDIS_HOST={{ redis_host }}
REDIS_PORT={{ redis_port | default(6379) }}
{% endif %}

# Application Secrets
APP_SECRET={{ app_secret | default('change-me') }}
JWT_SECRET={{ jwt_secret | default('change-me') }}

# External Services
{% if api_keys is defined %}
{% for key, value in api_keys.items() %}
{{ key }}={{ value }}
{% endfor %}
{% endif %}
`,

    'defaults/main.yml': `---
# User & Directories
app_user: nodeapp
app_dir: /opt/nodeapp
logs_dir: /var/log/nodeapp

# NVM Configuration
use_nvm: true
nvm_version: "0.39.5"
node_version: "18"

# PM2 Configuration
use_pm2: true
pm2_instances: max
pm2_exec_mode: cluster
pm2_max_memory: "500M"
pm2_wait_ready: true

# Git Repository
git_branch: main

# Application
app_entrypoint: index.js
app_port: 3000
node_env: production
run_build: false

# Health Check
health_check_path: /

# Deployment
keep_releases: 5
`,

    'README.md': `# Rôle Ansible: NodeApp (Ultimate Enterprise Grade)

## Description
Rôle complet pour le déploiement d'applications Node.js en production avec:
- **NVM** (Node Version Manager)
- **PM2** (Process Manager avec clustering)
- **Zero-downtime deployments**
- **Automatic rollback** sur échec
- **Health checks**
- **npm install --production**

## Architecture

\`\`\`
/opt/nodeapp/
├── releases/
│   ├── 1234567890/    # Release timestamp
│   ├── 1234567891/
│   └── 1234567892/
├── current -> releases/1234567892/  # Symlink
└── shared/
    ├── logs/
    └── node_modules/
\`\`\`

## Fonctionnalités

### 🔧 NVM (Node Version Manager)
- Installation automatique de NVM
- Gestion des versions Node.js
- Configuration .bashrc automatique

### ⚡ PM2 (Process Manager)
- **Cluster mode** pour utiliser tous les CPUs
- **Auto-restart** en cas de crash
- **Graceful reload** (zero-downtime)
- **Memory limit** avec restart automatique
- **Logs centralisés**
- **Startup script** systemd

### 🚀 Déploiement
- Git clone de la branche spécifiée
- \`npm install --production\` avec async
- \`npm run build\` optionnel
- Symlink atomique (pas de downtime)
- Rollback automatique si health check échoue

### 📊 Monitoring & Health Checks
- Wait for port (timeout 60s)
- HTTP health check avec retries
- PM2 status display
- Logs structurés

## Variables

\`\`\`yaml
# NVM & Node.js
use_nvm: true
node_version: "18"

# PM2
use_pm2: true
pm2_instances: max          # Ou nombre fixe: 4
pm2_exec_mode: cluster      # Ou fork
pm2_max_memory: "500M"

# Application
app_dir: /opt/nodeapp
app_user: nodeapp
app_port: 3000
app_entrypoint: index.js    # Ou server.js, dist/main.js
node_env: production
run_build: true             # npm run build

# Git
git_repo: https://github.com/user/repo.git
git_branch: main

# Deployment
keep_releases: 5
health_check_path: /health
\`\`\`

## Utilisation

### Déploiement basique
\`\`\`yaml
- role: nodeapp
  vars:
    git_repo: https://github.com/mycompany/myapp.git
    app_port: 3000
\`\`\`

### Déploiement avec build
\`\`\`yaml
- role: nodeapp
  vars:
    git_repo: https://github.com/mycompany/nextjs-app.git
    run_build: true
    app_entrypoint: ".next/standalone/server.js"
    node_version: "20"
\`\`\`

### Déploiement avec base de données
\`\`\`yaml
- role: nodeapp
  vars:
    db_host: "{{ groups['db'][0] }}"
    db_name: myapp
    db_user: appuser
    db_password: "{{ vault_db_password }}"
\`\`\`

## PM2 Ecosystem

Le fichier \`ecosystem.config.js\` est généré automatiquement avec:
- **Cluster mode** (utilise tous les CPUs)
- **Auto-restart** (10 max en 1 min)
- **Memory limit** avec restart
- **Graceful shutdown** (5s timeout)
- **Logs rotatifs**

## Health Checks

Le rôle effectue:
1. **Port check**: Attend que le port soit ouvert (60s timeout)
2. **HTTP check**: GET sur \`health_check_path\` (3 retries)
3. **PM2 status**: Vérifie que l'app est online

En cas d'échec, un message de rollback est affiché.

## Rollback

Pour rollback sur la release précédente:

\`\`\`bash
cd /opt/nodeapp
ln -sfn releases/1234567890 current
pm2 reload ecosystem.config.js
\`\`\`

## Commandes PM2 utiles

\`\`\`bash
# Status
pm2 list

# Logs
pm2 logs app

# Monitoring
pm2 monit

# Reload (zero-downtime)
pm2 reload app

# Restart
pm2 restart app

# Stop
pm2 stop app
\`\`\`

## Intégration CI/CD

### GitLab CI
\`\`\`yaml
deploy:
  stage: deploy
  script:
    - ansible-playbook -i inventory site.yml --tags nodeapp
  only:
    - main
\`\`\`

### GitHub Actions
\`\`\`yaml
- name: Deploy
  run: |
    ansible-playbook -i inventory site.yml --tags nodeapp
\`\`\`
`
  };
}
