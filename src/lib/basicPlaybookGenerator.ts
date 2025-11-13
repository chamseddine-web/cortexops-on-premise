/**
 * Générateur de Playbook Simple (Mode Basic)
 * Pour les besoins simples : un service, une tâche directe
 */

export interface BasicPlaybookConfig {
  projectName: string;
  service: string;
  target: string;
  additionalTasks?: string[];
  variables?: Record<string, any>;
}

/**
 * Génère un playbook Ansible simple et direct
 * Idéal pour : "Installe Nginx avec SSL sur Ubuntu"
 */
export function generateBasicPlaybook(config: BasicPlaybookConfig): string {
  const { projectName, service, target, additionalTasks = [], variables = {} } = config;

  const taskGenerators: Record<string, () => { tasks: string; handlers?: string }> = {
    nginx: () => generateNginxTasks(variables),
    'nginx+ssl': () => generateNginxSSLTasks(variables),
    postgresql: () => generatePostgreSQLTasks(variables),
    docker: () => generateDockerTasks(variables),
    nodejs: () => generateNodeJSTasks(variables),
    python: () => generatePythonTasks(variables)
  };

  const result = taskGenerators[service] ? taskGenerators[service]() : generateGenericTasks(service);

  let playbook = `---
# ${projectName} - Playbook Simple
# Service: ${service}
# Target: ${target}

- name: "Configuration ${service}"
  hosts: all
  become: yes
  ${service === 'nginx+ssl' ? `
  vars:
    domain_name: ${variables.domain || 'example.com'}
    ssl_path: /etc/nginx/ssl
    cert_file: "{{ ssl_path }}/{{ domain_name }}.crt"
    key_file: "{{ ssl_path }}/{{ domain_name }}.key"` : ''}

  tasks:
${result.tasks}
`;

  // Ajouter les handlers s'ils existent
  if (result.handlers) {
    playbook += `\n${result.handlers}`;
  }

  return playbook;
}

/**
 * Génère les tâches pour Nginx
 */
function generateNginxTasks(vars: Record<string, any>): { tasks: string; handlers?: string } {
  const domain = vars.domain || 'example.com';
  const port = vars.port || 80;

  const tasks = `    - name: "Installation et configuration de Nginx"
      block:
        - name: "Installer Nginx"
          apt:
            name: nginx
            state: present
            update_cache: yes

        - name: "Démarrer et activer Nginx"
          service:
            name: nginx
            state: started
            enabled: yes

        - name: "Configurer le virtual host"
          template:
            dest: /etc/nginx/sites-available/default
            content: |
              server {
                listen ${port};
                server_name ${domain};

                location / {
                  root /var/www/html;
                  index index.html;
                }
              }
          notify: restart nginx

        - name: "Vérifier la configuration Nginx"
          command: nginx -t
          changed_when: false

        - name: "Vérifier que Nginx écoute sur le port ${port}"
          wait_for:
            port: ${port}
            state: started
            timeout: 10

        - name: "Tracer le déploiement"
          copy:
            content: "Déploiement Nginx effectué sur {{ inventory_hostname }} le {{ ansible_date_time.iso8601 }}"
            dest: /var/log/ansible_nginx.log
            mode: '0644'

      rescue:
        - name: "⚠️ Échec de l'installation de Nginx"
          debug:
            msg: "Impossible d'installer Nginx. Vérifiez les dépôts APT."`;

  const handlers = `  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted`;

  return { tasks, handlers };
}

/**
 * Génère les tâches pour Nginx avec SSL
 */
function generateNginxSSLTasks(vars: Record<string, any>): { tasks: string; handlers?: string } {
  const domain = vars.domain || 'example.com';

  const tasks = `    - name: "Installation et configuration de Nginx avec SSL"
      block:
        - name: "Installer Nginx"
          apt:
            name: nginx
            state: present
            update_cache: yes

        - name: "Installer les dépendances SSL"
          apt:
            name:
              - openssl
              - python3-cryptography
            state: present

        - name: "Créer le répertoire SSL"
          file:
            path: "{{ ssl_path }}"
            state: directory
            mode: '0755'

        - name: "Générer la clé privée"
          community.crypto.openssl_privatekey:
            path: "{{ key_file }}"
            size: 2048
            mode: '0600'

        - name: "Générer un certificat auto-signé (idempotent)"
          community.crypto.x509_certificate:
            path: "{{ cert_file }}"
            privatekey_path: "{{ key_file }}"
            provider: selfsigned
            selfsigned_not_after: "+365d"
            subject:
              CN: "{{ domain_name }}"
              C: FR
              ST: IDF
              L: Paris
              O: Organization
            mode: '0644'

        - name: "Configurer Nginx avec SSL"
          template:
            dest: /etc/nginx/sites-available/default
            content: |
              server {
                listen 80;
                server_name {{ domain_name }};
                return 301 https://\$host\$request_uri;
              }

              server {
                listen 443 ssl;
                server_name {{ domain_name }};

                ssl_certificate {{ cert_file }};
                ssl_certificate_key {{ key_file }};
                ssl_protocols TLSv1.2 TLSv1.3;
                ssl_ciphers HIGH:!aNULL:!MD5;

                location / {
                  root /var/www/html;
                  index index.html;
                }
              }
          notify: restart nginx

        - name: "Vérifier la configuration Nginx"
          command: nginx -t
          changed_when: false

        - name: "Démarrer et activer Nginx"
          service:
            name: nginx
            state: started
            enabled: yes

        - name: "Vérifier que Nginx écoute sur le port 443"
          wait_for:
            port: 443
            state: started
            timeout: 10

        - name: "🔐 Vérifier la validité du certificat SSL"
          command: openssl x509 -in {{ cert_file }} -noout -checkend 2592000
          register: ssl_validity
          failed_when: false
          changed_when: false

        - name: "⚠️ Avertir si le certificat expire dans moins de 30 jours"
          debug:
            msg: "ATTENTION: Le certificat SSL expire dans moins de 30 jours !"
          when: ssl_validity.rc != 0

        - name: "✅ Vérifier le CN (Common Name) du certificat"
          shell: openssl x509 -in {{ cert_file }} -noout -subject | grep -oP 'CN\\s*=\\s*\\K[^,]+'
          register: cert_cn
          changed_when: false

        - name: "📋 Afficher les détails du certificat"
          debug:
            msg:
              - "Certificat CN: {{ cert_cn.stdout }}"
              - "Domaine configuré: {{ domain_name }}"
              - "Expiration: Valide pour 365 jours"

        - name: "Tracer le déploiement"
          copy:
            content: "Déploiement Nginx+SSL effectué sur {{ inventory_hostname }} le {{ ansible_date_time.iso8601 }}"
            dest: /var/log/ansible_nginx_ssl.log
            mode: '0644'

      rescue:
        - name: "⚠️ Échec de l'installation de Nginx"
          debug:
            msg: "Impossible d'installer ou configurer Nginx. Vérifiez les dépôts APT et les permissions."

        - name: "Annuler les changements (rollback)"
          service:
            name: nginx
            state: stopped
          ignore_errors: yes`;

  const handlers = `  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted`;

  return { tasks, handlers };
}

/**
 * Génère les tâches pour PostgreSQL
 */
function generatePostgreSQLTasks(vars: Record<string, any>): { tasks: string; handlers?: string } {
  const dbName = vars.db_name || 'mydb';
  const dbUser = vars.db_user || 'dbuser';

  const tasks = `    - name: "Installation et configuration de PostgreSQL"
      block:
        - name: "Installer PostgreSQL"
          apt:
            name:
              - postgresql
              - postgresql-contrib
              - python3-psycopg2
            state: present
            update_cache: yes

        - name: "Démarrer et activer PostgreSQL"
          service:
            name: postgresql
            state: started
            enabled: yes

        - name: "Vérifier que PostgreSQL écoute sur le port 5432"
          wait_for:
            port: 5432
            state: started
            timeout: 30

        - name: "Créer la base de données"
          postgresql_db:
            name: ${dbName}
            state: present
          become_user: postgres

        - name: "Créer l'utilisateur"
          postgresql_user:
            name: ${dbUser}
            password: "{{ db_password }}"
            db: ${dbName}
            priv: ALL
            state: present
          become_user: postgres

        - name: "Tracer le déploiement"
          copy:
            content: "Déploiement PostgreSQL effectué sur {{ inventory_hostname }} le {{ ansible_date_time.iso8601 }}"
            dest: /var/log/ansible_postgresql.log
            mode: '0644'

      rescue:
        - name: "⚠️ Échec de l'installation de PostgreSQL"
          debug:
            msg: "Impossible d'installer PostgreSQL. Vérifiez les dépôts et les permissions."

        - name: "Annuler les changements (rollback)"
          service:
            name: postgresql
            state: stopped
          ignore_errors: yes`;

  return { tasks };
}

/**
 * Génère les tâches pour Docker
 */
function generateDockerTasks(vars: Record<string, any>): { tasks: string; handlers?: string } {
  const tasks = `    - name: "Installer les dépendances Docker"
      apt:
        name:
          - apt-transport-https
          - ca-certificates
          - curl
          - gnupg
          - lsb-release
        state: present
        update_cache: yes

    - name: "Ajouter la clé GPG Docker"
      apt_key:
        url: https://download.docker.com/linux/ubuntu/gpg
        state: present

    - name: "Ajouter le dépôt Docker"
      apt_repository:
        repo: "deb [arch=amd64] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable"
        state: present

    - name: "Installer Docker"
      apt:
        name:
          - docker-ce
          - docker-ce-cli
          - containerd.io
        state: present
        update_cache: yes

    - name: "Démarrer et activer Docker"
      service:
        name: docker
        state: started
        enabled: yes

    - name: "Ajouter l'utilisateur au groupe docker"
      user:
        name: "{{ ansible_user }}"
        groups: docker
        append: yes`;

  return { tasks };
}

/**
 * Génère les tâches pour Node.js
 */
function generateNodeJSTasks(vars: Record<string, any>): { tasks: string; handlers?: string } {
  const nodeVersion = vars.node_version || '18';

  const tasks = `    - name: "Installer curl"
      apt:
        name: curl
        state: present
        update_cache: yes

    - name: "Ajouter le dépôt NodeSource"
      shell: curl -fsSL https://deb.nodesource.com/setup_${nodeVersion}.x | bash -
      args:
        creates: /etc/apt/sources.list.d/nodesource.list

    - name: "Installer Node.js"
      apt:
        name: nodejs
        state: present
        update_cache: yes

    - name: "Vérifier l'installation"
      command: node --version
      register: node_version
      changed_when: false

    - name: "Afficher la version"
      debug:
        msg: "Node.js {{ node_version.stdout }} installé avec succès"`;

  return { tasks };
}

/**
 * Génère les tâches pour Python
 */
function generatePythonTasks(vars: Record<string, any>): { tasks: string; handlers?: string } {
  const pythonVersion = vars.python_version || '3.11';

  const tasks = `    - name: "Installer Python et pip"
      apt:
        name:
          - python${pythonVersion}
          - python3-pip
          - python${pythonVersion}-venv
        state: present
        update_cache: yes

    - name: "Créer un environnement virtuel"
      command: python3 -m venv /opt/venv
      args:
        creates: /opt/venv

    - name: "Vérifier l'installation"
      command: python3 --version
      register: python_version
      changed_when: false

    - name: "Afficher la version"
      debug:
        msg: "Python {{ python_version.stdout }} installé avec succès"`;

  return { tasks };
}

/**
 * Génère des tâches génériques pour un service inconnu
 */
function generateGenericTasks(service: string): { tasks: string; handlers?: string } {
  const tasks = `    - name: "Installer ${service}"
      apt:
        name: ${service}
        state: present
        update_cache: yes

    - name: "Démarrer et activer ${service}"
      service:
        name: ${service}
        state: started
        enabled: yes`;

  return { tasks };
}

/**
 * Génère un fichier d'inventaire simple
 */
export function generateBasicInventory(target: string): string {
  return `# Inventaire simple
[webservers]
${target} ansible_user=ubuntu

[all:vars]
ansible_python_interpreter=/usr/bin/python3
`;
}

/**
 * Génère un README simple
 */
export function generateBasicReadme(config: BasicPlaybookConfig): string {
  const { projectName, service, target } = config;

  return `# ${projectName}

Playbook Ansible simple pour installer **${service}** sur ${target}.

## Utilisation

\`\`\`bash
# Exécuter le playbook
ansible-playbook playbook.yml -i inventory.ini

# Vérifier avant d'exécuter (dry-run)
ansible-playbook playbook.yml -i inventory.ini --check
\`\`\`

## Ce que fait ce playbook

1. Installe ${service}
2. Configure le service
3. Démarre et active le service au démarrage

## Variables

Vous pouvez personnaliser en ajoutant des variables :

\`\`\`bash
ansible-playbook playbook.yml -i inventory.ini -e "domain=mysite.com"
\`\`\`

## Prérequis

- Ansible >= 2.10
- Accès SSH au serveur cible
- Utilisateur avec privilèges sudo
`;
}

/**
 * Génère tous les fichiers pour un projet simple
 */
export function generateBasicProject(config: BasicPlaybookConfig): Record<string, string> {
  return {
    'playbook.yml': generateBasicPlaybook(config),
    'inventory.ini': generateBasicInventory(config.target),
    'README.md': generateBasicReadme(config)
  };
}
