import { generateKubernetesRole, generateHelmRole, generatePrometheusHelmRole, generateEKSRole, generateCICDRole } from './kubernetesGenerator';

export interface RoleStructure {
  name: string;
  tasks: string;
  handlers?: string;
  defaults?: string;
  vars?: string;
  templates?: Record<string, string>;
  files?: Record<string, string>;
}

export function generateRoleStructure(roleName: string, environment: 'staging' | 'production' = 'production'): RoleStructure {
  // Roles Kubernetes avancés
  if (roleName === 'kubernetes') {
    const k8sRole = generateKubernetesRole('myapp', environment);
    return {
      name: 'kubernetes',
      tasks: k8sRole.tasks,
      handlers: k8sRole.handlers,
      defaults: k8sRole.defaults,
      templates: k8sRole.templates
    };
  }

  if (roleName === 'helm') {
    const helmRole = generateHelmRole('myapp', environment);
    return {
      name: 'helm',
      tasks: helmRole.tasks,
      defaults: helmRole.defaults,
      templates: helmRole.templates
    };
  }

  if (roleName === 'prometheus-helm') {
    const promRole = generatePrometheusHelmRole(environment);
    return {
      name: 'prometheus-helm',
      tasks: promRole.tasks,
      defaults: promRole.defaults
    };
  }

  if (roleName === 'eks') {
    const eksRole = generateEKSRole(environment);
    return {
      name: 'eks',
      tasks: eksRole.tasks,
      defaults: eksRole.defaults
    };
  }

  if (roleName === 'cicd') {
    const cicdRole = generateCICDRole(environment);
    return {
      name: 'cicd',
      tasks: cicdRole.tasks,
      defaults: cicdRole.defaults,
      templates: cicdRole.templates
    };
  }

  const roles: Record<string, RoleStructure> = {
    security: {
      name: 'security',
      tasks: `---
- name: Installer fail2ban
  apt:
    name: fail2ban
    state: present
  when: ansible_os_family == "Debian"

- name: Configurer fail2ban pour SSH
  template:
    src: jail.local.j2
    dest: /etc/fail2ban/jail.local
    mode: '0644'
  notify: restart fail2ban

- name: Démarrer et activer fail2ban
  service:
    name: fail2ban
    state: started
    enabled: yes

- name: Configurer le banner SSH
  copy:
    content: |
      *******************************************
      ACCÈS AUTORISÉ UNIQUEMENT - {{ environment | upper }}
      Toute connexion non autorisée est interdite
      *******************************************
    dest: /etc/ssh/banner
    mode: '0644'

- name: Durcissement SSH
  lineinfile:
    path: /etc/ssh/sshd_config
    regexp: "{{ item.regexp }}"
    line: "{{ item.line }}"
    state: present
    backup: yes
  loop:
    - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
    - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
    - { regexp: '^#?Banner', line: 'Banner /etc/ssh/banner' }
    - { regexp: '^#?X11Forwarding', line: 'X11Forwarding no' }
  notify: restart ssh

- name: Configurer le firewall UFW
  ufw:
    rule: "{{ item.rule }}"
    port: "{{ item.port }}"
    proto: "{{ item.proto | default('tcp') }}"
  loop: "{{ firewall_rules }}"
  when: ansible_os_family == "Debian"

- name: Activer UFW
  ufw:
    state: enabled
  when: ansible_os_family == "Debian"`,
      handlers: `---
- name: restart fail2ban
  service:
    name: fail2ban
    state: restarted

- name: restart ssh
  service:
    name: ssh
    state: restarted`,
      defaults: `---
environment: ${environment}
firewall_rules:
  - { rule: 'allow', port: '22', proto: 'tcp' }
  - { rule: 'allow', port: '80', proto: 'tcp' }
  - { rule: 'allow', port: '443', proto: 'tcp' }`,
      templates: {
        'jail.local.j2': `[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log`
      }
    },

    web: {
      name: 'web',
      tasks: `---
- name: Installer Nginx
  apt:
    name: nginx
    state: present
    update_cache: yes
  when: ansible_os_family == "Debian"

- name: Créer le répertoire du site
  file:
    path: "/var/www/{{ domain_name }}"
    state: directory
    owner: www-data
    group: www-data
    mode: '0755'

- name: Déployer la configuration Nginx
  template:
    src: nginx-site.conf.j2
    dest: "/etc/nginx/sites-available/{{ domain_name }}"
    owner: root
    group: root
    mode: '0644'
  notify: restart nginx

- name: Activer le site
  file:
    src: "/etc/nginx/sites-available/{{ domain_name }}"
    dest: "/etc/nginx/sites-enabled/{{ domain_name }}"
    state: link
  notify: restart nginx

- name: Supprimer le site par défaut
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: restart nginx

- name: Démarrer et activer Nginx
  service:
    name: nginx
    state: started
    enabled: yes`,
      handlers: `---
- name: restart nginx
  service:
    name: nginx
    state: restarted

- name: reload nginx
  service:
    name: nginx
    state: reloaded`,
      defaults: `---
domain_name: example.com
web_root: /var/www
ssl_certificate: /etc/ssl/certs/cert.pem
ssl_certificate_key: /etc/ssl/private/key.pem`,
      templates: {
        'nginx-site.conf.j2': `server {
    listen 80;
    server_name {{ domain_name }};

    root {{ web_root }}/{{ domain_name }};
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }

    access_log /var/log/nginx/{{ domain_name }}_access.log;
    error_log /var/log/nginx/{{ domain_name }}_error.log;
}`
      }
    },

    db: {
      name: 'db',
      tasks: `---
- name: Récupérer le mot de passe DB depuis Vault
  set_fact:
    db_password: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/db:password token={{ vault_token }} url={{ vault_addr }}') }}"
  when: use_vault | default(false)
  no_log: true

- name: Installer PostgreSQL
  apt:
    name:
      - postgresql
      - postgresql-contrib
      - python3-psycopg2
    state: present
    update_cache: yes
  when: ansible_os_family == "Debian"

- name: Démarrer PostgreSQL
  service:
    name: postgresql
    state: started
    enabled: yes

- name: Configurer PostgreSQL
  template:
    src: postgresql.conf.j2
    dest: /etc/postgresql/*/main/postgresql.conf
    owner: postgres
    group: postgres
    mode: '0644'
    backup: yes
  notify: restart postgresql

- name: Créer la base de données
  postgresql_db:
    name: "{{ db_name }}"
    state: present
  become_user: postgres

- name: Créer l'utilisateur de base de données
  postgresql_user:
    name: "{{ db_user }}"
    password: "{{ db_password }}"
    db: "{{ db_name }}"
    priv: ALL
    state: present
  become_user: postgres
  no_log: true

- name: Configurer la sauvegarde automatique
  cron:
    name: "Backup PostgreSQL"
    minute: "0"
    hour: "2"
    job: "pg_dump {{ db_name }} | gzip > /backup/{{ db_name }}_$(date +\\%Y\\%m\\%d).sql.gz"
    user: postgres`,
      handlers: `---
- name: restart postgresql
  service:
    name: postgresql
    state: restarted`,
      defaults: `---
db_name: mydb
db_user: myuser
db_password: changeme
use_vault: false
vault_addr: http://vault.example.com:8200
backup_retention_days: 7
environment: ${environment}`,
      templates: {
        'postgresql.conf.j2': `listen_addresses = 'localhost'
max_connections = 100
shared_buffers = 128MB
effective_cache_size = 512MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 4.0
effective_io_concurrency = 2
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB`
      }
    },

    backup: {
      name: 'backup',
      tasks: `---
- name: Créer le répertoire de sauvegarde
  file:
    path: "{{ backup_dir }}"
    state: directory
    mode: '0700'
    owner: root
    group: root

- name: Installer rsync et compression
  apt:
    name:
      - rsync
      - gzip
      - pigz
    state: present

- name: Déployer le script de sauvegarde
  template:
    src: backup-script.sh.j2
    dest: /usr/local/bin/backup.sh
    mode: '0750'
    owner: root
    group: root

- name: Configurer la sauvegarde automatique
  cron:
    name: "Sauvegarde quotidienne"
    minute: "0"
    hour: "{{ backup_hour }}"
    job: "/usr/local/bin/backup.sh >> /var/log/backup.log 2>&1"
    user: root

- name: Configurer la rotation des sauvegardes
  cron:
    name: "Rotation des sauvegardes"
    minute: "0"
    hour: "3"
    job: "find {{ backup_dir }} -name 'backup-*.tar.gz' -mtime +{{ backup_retention_days }} -delete"
    user: root`,
      defaults: `---
backup_dir: /backup
backup_hour: 2
backup_retention_days: 7
backup_sources:
  - /var/www
  - /etc
  - /home`,
      templates: {
        'backup-script.sh.j2': `#!/bin/bash
set -e

BACKUP_DIR="{{ backup_dir }}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-$DATE.tar.gz"

echo "[$(date)] Début de la sauvegarde"

{% for source in backup_sources %}
tar czf "$BACKUP_FILE" {{ source }} || echo "Erreur sur {{ source }}"
{% endfor %}

echo "[$(date)] Sauvegarde terminée: $BACKUP_FILE"

# Vérifier l'espace disque
df -h "$BACKUP_DIR"`
      }
    },

    monitoring: {
      name: 'monitoring',
      tasks: `---
- name: Créer l'utilisateur prometheus
  user:
    name: prometheus
    system: yes
    shell: /bin/false
    createhome: no

- name: Créer les répertoires Prometheus
  file:
    path: "{{ item }}"
    state: directory
    owner: prometheus
    group: prometheus
    mode: '0755'
  loop:
    - /etc/prometheus
    - /var/lib/prometheus

- name: Télécharger Prometheus
  get_url:
    url: "https://github.com/prometheus/prometheus/releases/download/v{{ prometheus_version }}/prometheus-{{ prometheus_version }}.linux-amd64.tar.gz"
    dest: /tmp/prometheus.tar.gz
    mode: '0644'

- name: Extraire Prometheus
  unarchive:
    src: /tmp/prometheus.tar.gz
    dest: /tmp/
    remote_src: yes
    creates: /tmp/prometheus-{{ prometheus_version }}.linux-amd64

- name: Copier les binaires Prometheus
  copy:
    src: "/tmp/prometheus-{{ prometheus_version }}.linux-amd64/{{ item }}"
    dest: "/usr/local/bin/{{ item }}"
    mode: '0755'
    owner: prometheus
    group: prometheus
    remote_src: yes
  loop:
    - prometheus
    - promtool

- name: Déployer la configuration Prometheus
  template:
    src: prometheus.yml.j2
    dest: /etc/prometheus/prometheus.yml
    owner: prometheus
    group: prometheus
    mode: '0644'
  notify: restart prometheus

- name: Créer le service systemd Prometheus
  template:
    src: prometheus.service.j2
    dest: /etc/systemd/system/prometheus.service
    mode: '0644'
  notify: reload systemd

- name: Démarrer et activer Prometheus
  service:
    name: prometheus
    state: started
    enabled: yes

- name: Installer Grafana
  apt:
    deb: "https://dl.grafana.com/oss/release/grafana_{{ grafana_version }}_amd64.deb"
  when: install_grafana | default(true)

- name: Démarrer et activer Grafana
  service:
    name: grafana-server
    state: started
    enabled: yes
  when: install_grafana | default(true)

- name: "📊 Attendre que Grafana soit disponible"
  wait_for:
    port: 3000
    state: started
    timeout: 60
  when: install_grafana | default(true)

- name: "📈 Créer le datasource Prometheus dans Grafana"
  uri:
    url: "http://localhost:3000/api/datasources"
    method: POST
    user: admin
    password: admin
    force_basic_auth: yes
    body_format: json
    body:
      name: "Prometheus"
      type: "prometheus"
      url: "http://localhost:9090"
      access: "proxy"
      isDefault: true
    status_code: [200, 201, 409]
  when: install_grafana | default(true)

- name: "📊 Exporter le dashboard Grafana (Node Exporter Full)"
  copy:
    content: |
      {
        "dashboard": {
          "title": "Node Exporter Full",
          "tags": ["generated", "prometheus"],
          "timezone": "browser",
          "panels": [
            {
              "title": "CPU Usage",
              "type": "graph",
              "datasource": "Prometheus",
              "targets": [{"expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\\"idle\\"}[5m])) * 100)"}]
            },
            {
              "title": "Memory Usage",
              "type": "graph",
              "datasource": "Prometheus",
              "targets": [{"expr": "100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))"}]
            },
            {
              "title": "Disk Usage",
              "type": "graph",
              "datasource": "Prometheus",
              "targets": [{"expr": "100 - ((node_filesystem_avail_bytes{mountpoint=\\"/\\"} * 100) / node_filesystem_size_bytes{mountpoint=\\"/\\"})"}]
            }
          ]
        }
      }
    dest: /var/lib/grafana/dashboards/node-exporter.json
    owner: grafana
    group: grafana
    mode: '0644'
  when: install_grafana | default(true)
  notify: restart grafana`,
      handlers: `---
- name: restart prometheus
  service:
    name: prometheus
    state: restarted

- name: restart grafana
  service:
    name: grafana-server
    state: restarted

- name: reload systemd
  service:
    daemon_reload: yes`,
      defaults: `---
prometheus_version: "2.47.0"
grafana_version: "10.2.0"
install_grafana: true
prometheus_retention_time: 15d
prometheus_scrape_interval: 15s`,
      templates: {
        'prometheus.yml.j2': `global:
  scrape_interval: {{ prometheus_scrape_interval }}
  evaluation_interval: {{ prometheus_scrape_interval }}

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: {{ monitoring_targets | to_json }}`,
        'prometheus.service.j2': `[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \\
  --config.file=/etc/prometheus/prometheus.yml \\
  --storage.tsdb.path=/var/lib/prometheus/ \\
  --storage.tsdb.retention.time={{ prometheus_retention_time }} \\
  --web.console.templates=/etc/prometheus/consoles \\
  --web.console.libraries=/etc/prometheus/console_libraries

[Install]
WantedBy=multi-user.target`
      }
    },

    vault: {
      name: 'vault',
      tasks: `---
- name: Installer les dépendances
  apt:
    name:
      - curl
      - unzip
    state: present

- name: Télécharger HashiCorp Vault
  get_url:
    url: "https://releases.hashicorp.com/vault/{{ vault_version }}/vault_{{ vault_version }}_linux_amd64.zip"
    dest: /tmp/vault.zip
    mode: '0644'

- name: Extraire Vault
  unarchive:
    src: /tmp/vault.zip
    dest: /usr/local/bin/
    remote_src: yes
    creates: /usr/local/bin/vault

- name: Créer l'utilisateur vault
  user:
    name: vault
    system: yes
    shell: /bin/false
    createhome: no

- name: Créer les répertoires Vault
  file:
    path: "{{ item }}"
    state: directory
    owner: vault
    group: vault
    mode: '0755'
  loop:
    - /etc/vault
    - /var/lib/vault

- name: Déployer la configuration Vault
  template:
    src: vault.hcl.j2
    dest: /etc/vault/vault.hcl
    owner: vault
    group: vault
    mode: '0644'
  notify: restart vault

- name: Créer le service systemd Vault
  template:
    src: vault.service.j2
    dest: /etc/systemd/system/vault.service
    mode: '0644'
  notify: reload systemd

- name: Démarrer et activer Vault
  service:
    name: vault
    state: started
    enabled: yes`,
      handlers: `---
- name: restart vault
  service:
    name: vault
    state: restarted

- name: reload systemd
  service:
    daemon_reload: yes`,
      defaults: `---
vault_version: "1.15.0"
vault_address: "0.0.0.0"
vault_port: 8200
vault_storage_path: /var/lib/vault`,
      templates: {
        'vault.hcl.j2': `storage "file" {
  path = "{{ vault_storage_path }}"
}

listener "tcp" {
  address     = "{{ vault_address }}:{{ vault_port }}"
  tls_disable = 1
}

ui = true
api_addr = "http://{{ ansible_default_ipv4.address }}:{{ vault_port }}"
cluster_addr = "http://{{ ansible_default_ipv4.address }}:8201"`,
        'vault.service.j2': `[Unit]
Description=HashiCorp Vault
Documentation=https://www.vault.io/docs/
Requires=network-online.target
After=network-online.target

[Service]
User=vault
Group=vault
ExecStart=/usr/local/bin/vault server -config=/etc/vault/vault.hcl
ExecReload=/bin/kill -HUP $MAINPID
KillMode=process
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target`
      }
    },

    aws: {
      name: 'aws',
      tasks: `---
- name: Installer les dépendances AWS
  pip:
    name:
      - boto3
      - botocore
    state: present

- name: Récupérer les credentials AWS depuis Vault
  set_fact:
    aws_access_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/aws:access_key token={{ vault_token }} url={{ vault_addr }}') }}"
    aws_secret_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/aws:secret_key token={{ vault_token }} url={{ vault_addr }}') }}"
  when: use_vault | default(false)
  no_log: true

- name: Créer le groupe de sécurité
  amazon.aws.ec2_security_group:
    name: "{{ security_group_name }}"
    description: "Security group for {{ environment }}"
    region: "{{ aws_region }}"
    aws_access_key: "{{ aws_access_key }}"
    aws_secret_key: "{{ aws_secret_key }}"
    rules:
      - proto: tcp
        from_port: 22
        to_port: 22
        cidr_ip: 0.0.0.0/0
      - proto: tcp
        from_port: 80
        to_port: 80
        cidr_ip: 0.0.0.0/0
      - proto: tcp
        from_port: 443
        to_port: 443
        cidr_ip: 0.0.0.0/0
  register: security_group

- name: Provisionner instances AWS EC2
  amazon.aws.ec2_instance:
    key_name: "{{ key_name }}"
    instance_type: "{{ instance_type }}"
    image_id: "{{ ami_id }}"
    region: "{{ aws_region }}"
    aws_access_key: "{{ aws_access_key }}"
    aws_secret_key: "{{ aws_secret_key }}"
    count: "{{ instance_count }}"
    security_group: "{{ security_group_name }}"
    vpc_subnet_id: "{{ subnet_id }}"
    network:
      assign_public_ip: yes
    wait: yes
    tags:
      Name: "{{ instance_name_prefix }}-{{ item }}"
      Environment: "{{ environment }}"
      ManagedBy: Ansible
  loop: "{{ range(1, instance_count + 1) | list }}"
  register: ec2_instances

- name: Attendre que les instances soient prêtes
  wait_for:
    host: "{{ item.public_ip_address }}"
    port: 22
    delay: 10
    timeout: 300
  loop: "{{ ec2_instances.results | map(attribute='instances') | flatten }}"

- name: Ajouter les instances à l'inventaire dynamique
  add_host:
    name: "{{ item.public_ip_address }}"
    groups: "{{ instance_groups }}"
    ansible_user: ubuntu
  loop: "{{ ec2_instances.results | map(attribute='instances') | flatten }}"`,
      defaults: `---
aws_region: us-east-1
instance_type: t3.micro
instance_count: 2
key_name: ansible-key
security_group_name: ansible-sg
instance_name_prefix: web-server
instance_groups: webservers
use_vault: true
vault_addr: http://vault.example.com:8200
environment: ${environment}
ami_id: ami-0c55b159cbfafe1f0`,
    }
  };

  return roles[roleName] || roles['web'];
}

export function generateInventoryStructure(environment: 'staging' | 'production'): Record<string, string> {
  const inventories: Record<string, Record<string, string>> = {
    staging: {
      'hosts.yml': `all:
  children:
    webservers:
      hosts:
        web01-staging:
          ansible_host: 10.0.1.10
          ansible_user: ubuntu
        web02-staging:
          ansible_host: 10.0.1.11
          ansible_user: ubuntu

    databases:
      hosts:
        db01-staging:
          ansible_host: 10.0.2.10
          ansible_user: ubuntu

    monitoring:
      hosts:
        monitor-staging:
          ansible_host: 10.0.3.10
          ansible_user: ubuntu

    loadbalancers:
      hosts:
        lb01-staging:
          ansible_host: 10.0.4.10
          ansible_user: ubuntu

  vars:
    environment: staging
    domain_name: staging.example.com
    db_name: mydb_staging
    backup_retention_days: 3`,
      'group_vars/all.yml': `---
environment: staging
ansible_python_interpreter: /usr/bin/python3
vault_addr: http://vault-staging.example.com:8200
use_vault: true`,
      'group_vars/webservers.yml': `---
domain_name: staging.example.com
ssl_enabled: false`,
      'group_vars/databases.yml': `---
db_name: mydb_staging
db_user: dbuser
backup_retention_days: 3`
    },
    production: {
      'hosts.yml': `all:
  children:
    webservers:
      hosts:
        web01-prod:
          ansible_host: 172.16.1.10
          ansible_user: ubuntu
        web02-prod:
          ansible_host: 172.16.1.11
          ansible_user: ubuntu
        web03-prod:
          ansible_host: 172.16.1.12
          ansible_user: ubuntu

    databases:
      hosts:
        db01-prod:
          ansible_host: 172.16.2.10
          ansible_user: ubuntu
        db02-prod:
          ansible_host: 172.16.2.11
          ansible_user: ubuntu

    monitoring:
      hosts:
        monitor-prod:
          ansible_host: 172.16.3.10
          ansible_user: ubuntu

    loadbalancers:
      hosts:
        lb01-prod:
          ansible_host: 172.16.4.10
          ansible_user: ubuntu
        lb02-prod:
          ansible_host: 172.16.4.11
          ansible_user: ubuntu

  vars:
    environment: production
    domain_name: example.com
    db_name: mydb_production
    backup_retention_days: 30`,
      'group_vars/all.yml': `---
environment: production
ansible_python_interpreter: /usr/bin/python3
vault_addr: https://vault.example.com:8200
use_vault: true`,
      'group_vars/webservers.yml': `---
domain_name: example.com
ssl_enabled: true
ssl_certificate: /etc/ssl/certs/prod-cert.pem
ssl_certificate_key: /etc/ssl/private/prod-key.pem`,
      'group_vars/databases.yml': `---
db_name: mydb_production
db_user: dbuser_prod
backup_retention_days: 30
backup_hour: 1`
    }
  };

  return inventories[environment];
}

/**
 * Generate automated role generation options
 */
export interface AutoRoleGenerationOptions {
  roleName: string;
  description: string;
  includeHandlers?: boolean;
  includeTemplates?: boolean;
  includeTests?: boolean;
  dependencies?: string[];
}

/**
 * Generate complete role with all files
 */
export function generateCompleteRole(options: AutoRoleGenerationOptions): RoleStructure {
  const { roleName, description, includeHandlers = true, includeTemplates = true, dependencies = [] } = options;

  return {
    name: roleName,
    tasks: generateAutoTasks(roleName),
    handlers: includeHandlers ? generateAutoHandlers(roleName) : undefined,
    templates: includeTemplates ? generateAutoTemplates(roleName) : undefined,
    vars: generateAutoVars(roleName),
    defaults: generateAutoDefaults(roleName)
  };
}

function generateAutoTasks(roleName: string): string {
  return `---
# Automated tasks for ${roleName} role

- name: Include OS-specific variables
  include_vars: "{{ ansible_os_family }}.yml"
  tags: ['${roleName}', 'config']

- name: Ensure required packages are installed
  package:
    name: "{{ ${roleName}_packages }}"
    state: present
  tags: ['${roleName}', 'packages']

- name: Create ${roleName} configuration directory
  file:
    path: "{{ ${roleName}_config_dir }}"
    state: directory
    owner: "{{ ${roleName}_user }}"
    group: "{{ ${roleName}_group }}"
    mode: '0755'
  tags: ['${roleName}', 'config']

- name: Deploy ${roleName} configuration
  template:
    src: ${roleName}.conf.j2
    dest: "{{ ${roleName}_config_dir }}/${roleName}.conf"
    owner: "{{ ${roleName}_user }}"
    group: "{{ ${roleName}_group }}"
    mode: '0644'
    backup: yes
  notify: restart ${roleName}
  tags: ['${roleName}', 'config']

- name: Ensure ${roleName} service is started and enabled
  service:
    name: "{{ ${roleName}_service_name }}"
    state: started
    enabled: yes
  tags: ['${roleName}', 'service']

- name: Verify ${roleName} is running
  uri:
    url: "{{ ${roleName}_health_check_url }}"
    status_code: 200
  register: health_check
  retries: 3
  delay: 5
  until: health_check.status == 200
  when: ${roleName}_health_check_enabled
  tags: ['${roleName}', 'verify']
`;
}

function generateAutoHandlers(roleName: string): string {
  return `---
# Automated handlers for ${roleName} role

- name: restart ${roleName}
  service:
    name: "{{ ${roleName}_service_name }}"
    state: restarted
  listen: restart ${roleName}

- name: reload ${roleName}
  service:
    name: "{{ ${roleName}_service_name }}"
    state: reloaded
  listen: reload ${roleName}

- name: validate ${roleName} config
  command: "{{ ${roleName}_validate_command }}"
  listen: validate ${roleName} config
  changed_when: false
`;
}

function generateAutoTemplates(roleName: string): Record<string, string> {
  return {
    [`${roleName}.conf.j2`]: `# {{ ansible_managed }}
# ${roleName} Configuration File

# Basic Settings
listen_address = {{ ${roleName}_listen_address | default('0.0.0.0') }}
listen_port = {{ ${roleName}_listen_port | default('8080') }}

# Performance Settings
worker_processes = {{ ${roleName}_worker_processes | default(ansible_processor_vcpus) }}
max_connections = {{ ${roleName}_max_connections | default('1000') }}

# Security Settings
{% if ${roleName}_enable_tls %}
tls_enabled = true
tls_cert_file = {{ ${roleName}_tls_cert_file }}
tls_key_file = {{ ${roleName}_tls_key_file }}
{% endif %}

# Logging
log_level = {{ ${roleName}_log_level | default('info') }}
log_file = {{ ${roleName}_log_file | default('/var/log/${roleName}/${roleName}.log') }}

# Custom Settings
{% for key, value in ${roleName}_custom_settings.items() %}
{{ key }} = {{ value }}
{% endfor %}
`
  };
}

function generateAutoVars(roleName: string): string {
  return `---
# Automated variables for ${roleName} role

${roleName}_user: ${roleName}
${roleName}_group: ${roleName}
${roleName}_config_dir: /etc/${roleName}
${roleName}_data_dir: /var/lib/${roleName}
${roleName}_log_dir: /var/log/${roleName}
${roleName}_service_name: ${roleName}

# Health check settings
${roleName}_health_check_enabled: true
${roleName}_health_check_url: "http://localhost:8080/health"

# Validation command
${roleName}_validate_command: "${roleName} --validate-config"
`;
}

function generateAutoDefaults(roleName: string): string {
  return `---
# Automated default variables for ${roleName} role

# Package management
${roleName}_packages:
  - ${roleName}

# Service configuration
${roleName}_listen_address: "0.0.0.0"
${roleName}_listen_port: 8080
${roleName}_worker_processes: "{{ ansible_processor_vcpus }}"
${roleName}_max_connections: 1000

# TLS/SSL configuration
${roleName}_enable_tls: false
${roleName}_tls_cert_file: "/etc/ssl/certs/${roleName}.crt"
${roleName}_tls_key_file: "/etc/ssl/private/${roleName}.key"

# Logging configuration
${roleName}_log_level: info
${roleName}_log_file: "/var/log/${roleName}/${roleName}.log"

# Custom settings (dictionary)
${roleName}_custom_settings: {}

# Backup configuration
${roleName}_backup_enabled: false
${roleName}_backup_dir: "/var/backups/${roleName}"
${roleName}_backup_retention_days: 7
`;
}

export function generateMainPlaybook(roles: string[], environment: 'staging' | 'production' = 'production'): string {
  return `---
# Playbook principal pour l'environnement ${environment}
# Généré automatiquement par Ansible Learning Platform

- name: Configuration globale
  hosts: all
  become: yes
  gather_facts: yes

  pre_tasks:
    - name: Vérifier la connectivité
      ping:
      changed_when: false

    - name: Vérifier l'espace disque disponible
      shell: df -h / | tail -1 | awk '{print $5}' | sed 's/%//'
      register: disk_usage
      changed_when: false

    - name: Échouer si l'espace disque est insuffisant
      fail:
        msg: "Espace disque insuffisant ({{ disk_usage.stdout }}% utilisé)"
      when: disk_usage.stdout | int > 90

  tasks:
    - name: Mettre à jour le cache des packages
      apt:
        update_cache: yes
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"

${roles.map(role => `
- name: Application du rôle ${role}
  hosts: ${getRoleHostGroup(role)}
  become: yes
  roles:
    - ${role}`).join('\n')}

- name: Vérifications post-déploiement
  hosts: all
  become: yes

  post_tasks:
    - name: Nettoyer les packages inutilisés
      apt:
        autoremove: yes
        autoclean: yes
      when: ansible_os_family == "Debian"
      ignore_errors: yes

    - name: Vérifier les services critiques
      service_facts:
      register: services_state

    - name: Créer un rapport de déploiement
      copy:
        content: |
          ========================================
          RAPPORT DE DÉPLOIEMENT
          ========================================
          Date: {{ ansible_date_time.iso8601 }}
          Environnement: ${environment}
          Exécuté par: {{ ansible_user_id }}
          Hôte: {{ ansible_hostname }}
          Distribution: {{ ansible_distribution }} {{ ansible_distribution_version }}
          Rôles appliqués: ${roles.join(', ')}
          ========================================
        dest: /var/log/ansible-deploy-{{ ansible_date_time.date }}.log
        mode: '0644'
      ignore_errors: yes`;
}

function getRoleHostGroup(role: string): string {
  const mapping: Record<string, string> = {
    'web': 'webservers',
    'db': 'databases',
    'monitoring': 'monitoring',
    'backup': 'all',
    'security': 'all',
    'vault': 'monitoring',
    'aws': 'localhost'
  };

  return mapping[role] || 'all';
}
