export interface GitOpsConfig {
  appName: string;
  environment: 'staging' | 'production';
  gitRepo: string;
  branch: string;
}

export interface DatabaseConfig {
  dbType: 'postgresql' | 'mysql' | 'mongodb';
  clusterName: string;
  environment: 'staging' | 'production';
}

export function generateArgoCDGitOpsPlaybook(config: GitOpsConfig): string {
  const { appName, environment, gitRepo, branch = 'main' } = config;

  return `---
# Pipeline GitOps avec ArgoCD et synchronisation Git automatique
# Déploiement continu déclaratif

- name: Déployer pipeline GitOps avec ArgoCD
  hosts: localhost
  connection: local
  gather_facts: yes

  vars:
    app_name: ${appName}
    environment: ${environment}
    git_repo: ${gitRepo}
    git_branch: ${branch}

    argocd_version: "v2.9.0"
    argocd_namespace: argocd
    argocd_admin_password: "{{ lookup('password', '/tmp/argocd-password chars=ascii_letters,digits length=20') }}"

    sync_policy: automated
    auto_prune: true
    self_heal: true
    sync_interval: 3m

    notification_slack: true
    slack_token: "{{ lookup('env', 'SLACK_TOKEN') }}"
    slack_channel: '#gitops-alerts'

  tasks:
    - name: Créer namespace ArgoCD
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ argocd_namespace }}"
            labels:
              name: argocd

    - name: Installer ArgoCD
      kubernetes.core.k8s:
        state: present
        src: https://raw.githubusercontent.com/argoproj/argo-cd/{{ argocd_version }}/manifests/install.yaml
        namespace: "{{ argocd_namespace }}"

    - name: Attendre déploiement ArgoCD
      kubernetes.core.k8s_info:
        kind: Deployment
        namespace: "{{ argocd_namespace }}"
        name: argocd-server
      register: argocd_deploy
      until: argocd_deploy.resources[0].status.readyReplicas is defined and argocd_deploy.resources[0].status.readyReplicas >= 1
      retries: 30
      delay: 10

    - name: Récupérer mot de passe admin initial
      kubernetes.core.k8s_info:
        kind: Secret
        namespace: "{{ argocd_namespace }}"
        name: argocd-initial-admin-secret
      register: argocd_secret

    - name: Décoder mot de passe admin
      set_fact:
        argocd_initial_password: "{{ argocd_secret.resources[0].data.password | b64decode }}"

    - name: Installer ArgoCD CLI
      get_url:
        url: "https://github.com/argoproj/argo-cd/releases/download/{{ argocd_version }}/argocd-linux-amd64"
        dest: /usr/local/bin/argocd
        mode: '0755'

    - name: Port-forward ArgoCD server
      shell: |
        kubectl port-forward svc/argocd-server -n {{ argocd_namespace }} 8080:443 &
      async: 600
      poll: 0

    - name: Attendre ArgoCD API
      wait_for:
        host: localhost
        port: 8080
        delay: 5
        timeout: 60

    - name: Login ArgoCD CLI
      shell: |
        argocd login localhost:8080 \\
          --username admin \\
          --password {{ argocd_initial_password }} \\
          --insecure
      no_log: true

    - name: Changer mot de passe admin
      shell: |
        argocd account update-password \\
          --current-password {{ argocd_initial_password }} \\
          --new-password {{ argocd_admin_password }} \\
          --insecure
      no_log: true

    - name: Ajouter repository Git privé
      shell: |
        argocd repo add {{ git_repo }} \\
          --username {{ lookup('env', 'GIT_USERNAME') }} \\
          --password {{ lookup('env', 'GIT_TOKEN') }} \\
          --insecure
      when: git_repo is match('https://.*')

    - name: Créer projet ArgoCD
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: argoproj.io/v1alpha1
          kind: AppProject
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ argocd_namespace }}"
          spec:
            description: "Project for {{ app_name }}"
            sourceRepos:
              - "{{ git_repo }}"
            destinations:
              - namespace: '*'
                server: https://kubernetes.default.svc
            clusterResourceWhitelist:
              - group: '*'
                kind: '*'

    - name: Créer application ArgoCD
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: argoproj.io/v1alpha1
          kind: Application
          metadata:
            name: "{{ app_name }}-{{ environment }}"
            namespace: "{{ argocd_namespace }}"
            finalizers:
              - resources-finalizer.argocd.argoproj.io
          spec:
            project: "{{ app_name }}"
            source:
              repoURL: "{{ git_repo }}"
              targetRevision: "{{ git_branch }}"
              path: k8s/{{ environment }}
            destination:
              server: https://kubernetes.default.svc
              namespace: "{{ app_name }}-{{ environment }}"
            syncPolicy:
              automated:
                prune: {{ auto_prune }}
                selfHeal: {{ self_heal }}
                allowEmpty: false
              syncOptions:
                - CreateNamespace=true
                - PrunePropagationPolicy=foreground
              retry:
                limit: 5
                backoff:
                  duration: 5s
                  factor: 2
                  maxDuration: 3m
            ignoreDifferences:
              - group: apps
                kind: Deployment
                jsonPointers:
                  - /spec/replicas

    - name: Configurer webhook Git pour sync automatique
      uri:
        url: "{{ git_repo | regex_replace('.git$', '') }}/settings/hooks"
        method: POST
        body_format: json
        headers:
          Authorization: "token {{ lookup('env', 'GIT_TOKEN') }}"
        body:
          name: web
          active: true
          events:
            - push
            - pull_request
          config:
            url: "https://argocd.example.com/api/webhook"
            content_type: json
            insecure_ssl: "0"
      when: git_repo is match('https://github.com/.*')

    - name: Créer RBAC policy pour équipe
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: argocd-rbac-cm
            namespace: "{{ argocd_namespace }}"
          data:
            policy.csv: |
              p, role:developer, applications, get, {{ app_name }}/*, allow
              p, role:developer, applications, sync, {{ app_name }}/*, allow
              p, role:operator, applications, *, {{ app_name }}/*, allow
              p, role:operator, projects, get, {{ app_name }}, allow
              g, dev-team, role:developer
              g, ops-team, role:operator

    - name: Configurer notifications Slack
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: argocd-notifications-cm
            namespace: "{{ argocd_namespace }}"
          data:
            service.slack: |
              token: {{ slack_token }}
            template.app-deployed: |
              message: |
                Application {{ '{{' }}.app.metadata.name{{ '}}' }} déployée !
                Sync Status: {{ '{{' }}.app.status.sync.status{{ '}}' }}
                Health Status: {{ '{{' }}.app.status.health.status{{ '}}' }}
                Revision: {{ '{{' }}.app.status.sync.revision{{ '}}' }}
            template.app-health-degraded: |
              message: |
                ⚠️ Application {{ '{{' }}.app.metadata.name{{ '}}' }} dégradée !
                Health: {{ '{{' }}.app.status.health.status{{ '}}' }}
            trigger.on-deployed: |
              - when: app.status.sync.status == 'Synced'
                send: [app-deployed]
            trigger.on-health-degraded: |
              - when: app.status.health.status == 'Degraded'
                send: [app-health-degraded]
      when: notification_slack

    - name: Créer subscription notifications
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: argoproj.io/v1alpha1
          kind: Application
          metadata:
            name: "{{ app_name }}-{{ environment }}"
            namespace: "{{ argocd_namespace }}"
            annotations:
              notifications.argoproj.io/subscribe.on-deployed.slack: "{{ slack_channel }}"
              notifications.argoproj.io/subscribe.on-health-degraded.slack: "{{ slack_channel }}"
      when: notification_slack

    - name: Exposer ArgoCD via Ingress
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: Ingress
          metadata:
            name: argocd-server
            namespace: "{{ argocd_namespace }}"
            annotations:
              cert-manager.io/cluster-issuer: letsencrypt-prod
              nginx.ingress.kubernetes.io/ssl-redirect: "true"
              nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
          spec:
            ingressClassName: nginx
            tls:
              - hosts:
                  - argocd.example.com
                secretName: argocd-tls
            rules:
              - host: argocd.example.com
                http:
                  paths:
                    - path: /
                      pathType: Prefix
                      backend:
                        service:
                          name: argocd-server
                          port:
                            number: 443

    - name: Créer ApplicationSet pour multi-env
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: argoproj.io/v1alpha1
          kind: ApplicationSet
          metadata:
            name: "{{ app_name }}-multienv"
            namespace: "{{ argocd_namespace }}"
          spec:
            generators:
              - list:
                  elements:
                    - env: staging
                      replicas: "2"
                    - env: production
                      replicas: "3"
            template:
              metadata:
                name: "{{ app_name }}-{{ '{{' }}env{{ '}}' }}"
              spec:
                project: "{{ app_name }}"
                source:
                  repoURL: "{{ git_repo }}"
                  targetRevision: "{{ git_branch }}"
                  path: k8s/{{ '{{' }}env{{ '}}' }}
                destination:
                  server: https://kubernetes.default.svc
                  namespace: "{{ app_name }}-{{ '{{' }}env{{ '}}' }}"
                syncPolicy:
                  automated:
                    prune: true
                    selfHeal: true

    - name: Déclencher première synchronisation
      shell: |
        argocd app sync {{ app_name }}-{{ environment }} --insecure
      register: initial_sync

    - name: Attendre synchronisation complète
      shell: |
        argocd app wait {{ app_name }}-{{ environment }} --health --insecure
      register: sync_wait
      until: sync_wait.rc == 0
      retries: 30
      delay: 10

    - name: Récupérer status application
      shell: |
        argocd app get {{ app_name }}-{{ environment }} --insecure --output json
      register: app_status

    - name: Créer structure Git si inexistante
      file:
        path: "/tmp/gitops-{{ app_name }}"
        state: directory

    - name: Créer exemple manifeste K8s
      copy:
        content: |
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: {{ app_name }}
            namespace: {{ app_name }}-{{ environment }}
          spec:
            replicas: ${environment === 'production' ? '3' : '2'}
            selector:
              matchLabels:
                app: {{ app_name }}
            template:
              metadata:
                labels:
                  app: {{ app_name }}
              spec:
                containers:
                - name: {{ app_name }}
                  image: registry.example.com/{{ app_name }}:latest
                  ports:
                  - containerPort: 8080
          ---
          apiVersion: v1
          kind: Service
          metadata:
            name: {{ app_name }}
            namespace: {{ app_name }}-{{ environment }}
          spec:
            selector:
              app: {{ app_name }}
            ports:
            - port: 80
              targetPort: 8080
        dest: "/tmp/gitops-{{ app_name }}/deployment.yaml"

    - name: Sauvegarder credentials ArgoCD
      copy:
        content: |
          ArgoCD Credentials
          ==================

          URL: https://argocd.example.com
          Username: admin
          Password: {{ argocd_admin_password }}

          CLI Login:
          argocd login argocd.example.com --username admin --password {{ argocd_admin_password }}

          IMPORTANT: Changez ce mot de passe immédiatement
        dest: "/tmp/argocd-credentials-{{ environment }}.txt"
        mode: '0600'

    - name: Générer rapport GitOps
      copy:
        content: |
          Pipeline GitOps déployé avec ArgoCD
          ====================================

          Application: {{ app_name }}
          Environment: {{ environment }}

          ArgoCD:
          - Version: {{ argocd_version }}
          - URL: https://argocd.example.com
          - Namespace: {{ argocd_namespace }}

          Git Repository:
          - URL: {{ git_repo }}
          - Branch: {{ git_branch }}
          - Path: k8s/{{ environment }}

          Sync Policy:
          - Mode: {{ sync_policy }}
          - Auto Prune: {{ auto_prune }}
          - Self Heal: {{ self_heal }}
          - Interval: {{ sync_interval }}

          Features:
          - ✅ Automated sync from Git
          - ✅ Self-healing deployments
          - ✅ Multi-environment support
          - ✅ RBAC configured
          - ✅ Slack notifications
          - ✅ Webhook integration

          Example manifests: /tmp/gitops-{{ app_name }}/
          Credentials: /tmp/argocd-credentials-{{ environment }}.txt

          Next steps:
          1. Push manifests to {{ git_repo }}
          2. ArgoCD will automatically deploy
          3. Monitor: https://argocd.example.com

          Date: {{ ansible_date_time.iso8601 }}
        dest: "/tmp/gitops-{{ app_name }}-report.txt"

    - name: Résumé GitOps
      debug:
        msg:
          - "✅ ArgoCD déployé"
          - "🔗 URL: https://argocd.example.com"
          - "📁 Repo: {{ git_repo }}"
          - "🌿 Branch: {{ git_branch }}"
          - "🔄 Sync: {{ sync_policy }}"
          - "📊 App: {{ app_name }}-{{ environment }}"
          - "🔐 Credentials: /tmp/argocd-credentials-{{ environment }}.txt"
`;
}

export function generatePostgreSQLHAPlaybook(config: DatabaseConfig): string {
  const { clusterName, environment } = config;

  return `---
# Déploiement PostgreSQL cluster haute-disponibilité avec replication
# Production-ready avec backup automatique

- name: Déployer cluster PostgreSQL HA avec Patroni
  hosts: postgresql_cluster
  become: yes
  gather_facts: yes

  vars:
    cluster_name: ${clusterName}
    environment: ${environment}

    postgres_version: 15
    patroni_version: "3.2.0"
    pgbouncer_version: "1.21.0"

    postgres_port: 5432
    patroni_api_port: 8008

    postgres_data_dir: /var/lib/postgresql/{{ postgres_version }}/main
    postgres_wal_dir: /var/lib/postgresql/{{ postgres_version }}/wal

    replication_user: replicator
    replication_password: "{{ lookup('password', '/tmp/pg-repl-password chars=ascii_letters,digits length=32') }}"

    postgres_databases:
      - name: app_db
        owner: app_user
      - name: analytics_db
        owner: analytics_user

    backup_enabled: true
    backup_retention_days: 30
    backup_schedule: "0 2 * * *"

    monitoring_enabled: true
    postgres_exporter_port: 9187

    max_connections: 200
    shared_buffers: 4GB
    effective_cache_size: 12GB
    work_mem: 64MB
    maintenance_work_mem: 512MB

  tasks:
    - name: Installer PostgreSQL et dépendances
      apt:
        name:
          - postgresql-{{ postgres_version }}
          - postgresql-contrib-{{ postgres_version }}
          - postgresql-server-dev-{{ postgres_version }}
          - python3-psycopg2
          - python3-pip
        state: present
        update_cache: yes

    - name: Arrêter PostgreSQL par défaut
      systemd:
        name: postgresql
        state: stopped
        enabled: no

    - name: Installer Patroni
      pip:
        name:
          - patroni[etcd]=={{ patroni_version }}
          - python-etcd
        state: present

    - name: Créer répertoires PostgreSQL
      file:
        path: "{{ item }}"
        state: directory
        owner: postgres
        group: postgres
        mode: '0700'
      loop:
        - "{{ postgres_data_dir }}"
        - "{{ postgres_wal_dir }}"
        - /etc/patroni

    - name: Configurer Patroni
      template:
        src: patroni.yml.j2
        dest: /etc/patroni/patroni.yml
        owner: postgres
        group: postgres
        mode: '0600'
      notify: restart patroni

    - name: Créer service Patroni
      copy:
        content: |
          [Unit]
          Description=Patroni PostgreSQL Cluster
          After=network.target

          [Service]
          Type=simple
          User=postgres
          Group=postgres
          ExecStart=/usr/local/bin/patroni /etc/patroni/patroni.yml
          ExecReload=/bin/kill -HUP $MAINPID
          KillMode=process
          TimeoutSec=30
          Restart=always

          [Install]
          WantedBy=multi-user.target
        dest: /etc/systemd/system/patroni.service
        mode: '0644'

    - name: Configuration Patroni
      copy:
        content: |
          scope: {{ cluster_name }}
          namespace: /db/
          name: {{ ansible_hostname }}

          restapi:
            listen: 0.0.0.0:{{ patroni_api_port }}
            connect_address: {{ ansible_default_ipv4.address }}:{{ patroni_api_port }}

          etcd:
            hosts:
              {% for host in groups['etcd_cluster'] %}
              - {{ hostvars[host]['ansible_default_ipv4']['address'] }}:2379
              {% endfor %}

          bootstrap:
            dcs:
              ttl: 30
              loop_wait: 10
              retry_timeout: 10
              maximum_lag_on_failover: 1048576
              postgresql:
                use_pg_rewind: true
                parameters:
                  max_connections: {{ max_connections }}
                  shared_buffers: {{ shared_buffers }}
                  effective_cache_size: {{ effective_cache_size }}
                  maintenance_work_mem: {{ maintenance_work_mem }}
                  work_mem: {{ work_mem }}
                  wal_level: replica
                  hot_standby: "on"
                  max_wal_senders: 10
                  max_replication_slots: 10
                  wal_keep_size: 1GB
                  logging_collector: "on"
                  log_destination: csvlog
                  log_directory: pg_log
                  log_filename: postgresql-%Y-%m-%d_%H%M%S.log

            initdb:
              - encoding: UTF8
              - data-checksums

            pg_hba:
              - host replication {{ replication_user }} 0.0.0.0/0 md5
              - host all all 0.0.0.0/0 md5

            users:
              {{ replication_user }}:
                password: {{ replication_password }}
                options:
                  - replication

          postgresql:
            listen: 0.0.0.0:{{ postgres_port }}
            connect_address: {{ ansible_default_ipv4.address }}:{{ postgres_port }}
            data_dir: {{ postgres_data_dir }}
            bin_dir: /usr/lib/postgresql/{{ postgres_version }}/bin
            pgpass: /tmp/pgpass
            authentication:
              replication:
                username: {{ replication_user }}
                password: {{ replication_password }}
              superuser:
                username: postgres
                password: "{{ lookup('password', '/tmp/pg-superuser-password chars=ascii_letters,digits length=32') }}"
            parameters:
              unix_socket_directories: '/var/run/postgresql'

          tags:
            nofailover: false
            noloadbalance: false
            clonefrom: false
            nosync: false
        dest: /etc/patroni/patroni.yml
        owner: postgres
        group: postgres
        mode: '0600'

    - name: Démarrer Patroni
      systemd:
        name: patroni
        state: started
        enabled: yes
        daemon_reload: yes

    - name: Attendre initialisation cluster
      wait_for:
        host: "{{ ansible_default_ipv4.address }}"
        port: "{{ patroni_api_port }}"
        delay: 5
        timeout: 120

    - name: Vérifier statut cluster
      uri:
        url: "http://{{ ansible_default_ipv4.address }}:{{ patroni_api_port }}/cluster"
        method: GET
      register: cluster_status

    - name: Installer PgBouncer pour connection pooling
      apt:
        name: pgbouncer
        state: present

    - name: Configurer PgBouncer
      copy:
        content: |
          [databases]
          * = host={{ ansible_default_ipv4.address }} port={{ postgres_port }}

          [pgbouncer]
          listen_addr = *
          listen_port = 6432
          auth_type = md5
          auth_file = /etc/pgbouncer/userlist.txt
          pool_mode = transaction
          max_client_conn = 1000
          default_pool_size = 25
          reserve_pool_size = 5
          reserve_pool_timeout = 3
          server_lifetime = 3600
          server_idle_timeout = 600
          log_connections = 1
          log_disconnections = 1
          stats_period = 60
        dest: /etc/pgbouncer/pgbouncer.ini
        mode: '0644'
      notify: restart pgbouncer

    - name: Démarrer PgBouncer
      systemd:
        name: pgbouncer
        state: started
        enabled: yes

- name: Configuration bases de données (sur master seulement)
  hosts: postgresql_cluster[0]
  become: yes
  become_user: postgres

  tasks:
    - name: Créer databases
      postgresql_db:
        name: "{{ item.name }}"
        encoding: UTF8
        lc_collate: en_US.UTF-8
        lc_ctype: en_US.UTF-8
        template: template0
      loop: "{{ postgres_databases }}"

    - name: Créer users
      postgresql_user:
        name: "{{ item.owner }}"
        password: "{{ lookup('password', '/tmp/pg-' + item.owner + '-password chars=ascii_letters,digits length=32') }}"
        role_attr_flags: CREATEDB,NOSUPERUSER
      loop: "{{ postgres_databases }}"

    - name: Donner privilèges
      postgresql_privs:
        database: "{{ item.name }}"
        privs: ALL
        type: database
        role: "{{ item.owner }}"
      loop: "{{ postgres_databases }}"

- name: Configuration backup et monitoring
  hosts: postgresql_cluster
  become: yes

  tasks:
    - name: Installer pgBackRest
      apt:
        name: pgbackrest
        state: present
      when: backup_enabled

    - name: Configurer pgBackRest
      copy:
        content: |
          [global]
          repo1-path=/var/lib/pgbackrest
          repo1-retention-full={{ backup_retention_days }}
          repo1-retention-diff=4
          start-fast=y
          stop-auto=y
          log-level-console=info
          log-level-file=debug

          [{{ cluster_name }}]
          pg1-path={{ postgres_data_dir }}
          pg1-port={{ postgres_port }}
          pg1-user=postgres
        dest: /etc/pgbackrest/pgbackrest.conf
        mode: '0640'
        owner: postgres
      when: backup_enabled

    - name: Créer cron backup complet
      cron:
        name: "PostgreSQL full backup"
        minute: "0"
        hour: "2"
        job: "pgbackrest --stanza={{ cluster_name }} --type=full backup"
        user: postgres
      when: backup_enabled

    - name: Créer cron backup différentiel
      cron:
        name: "PostgreSQL diff backup"
        minute: "0"
        hour: "*/6"
        job: "pgbackrest --stanza={{ cluster_name }} --type=diff backup"
        user: postgres
      when: backup_enabled

    - name: Installer postgres_exporter
      get_url:
        url: https://github.com/prometheus-community/postgres_exporter/releases/download/v0.15.0/postgres_exporter-0.15.0.linux-amd64.tar.gz
        dest: /tmp/postgres_exporter.tar.gz
      when: monitoring_enabled

    - name: Extraire postgres_exporter
      unarchive:
        src: /tmp/postgres_exporter.tar.gz
        dest: /usr/local/bin/
        remote_src: yes
      when: monitoring_enabled

    - name: Créer service postgres_exporter
      copy:
        content: |
          [Unit]
          Description=Prometheus PostgreSQL Exporter
          After=network.target

          [Service]
          Type=simple
          User=postgres
          Environment="DATA_SOURCE_NAME=postgresql://postgres@localhost:{{ postgres_port }}/postgres?sslmode=disable"
          ExecStart=/usr/local/bin/postgres_exporter --web.listen-address=:{{ postgres_exporter_port }}
          Restart=always

          [Install]
          WantedBy=multi-user.target
        dest: /etc/systemd/system/postgres_exporter.service
      when: monitoring_enabled

    - name: Démarrer postgres_exporter
      systemd:
        name: postgres_exporter
        state: started
        enabled: yes
        daemon_reload: yes
      when: monitoring_enabled

    - name: Générer rapport cluster PostgreSQL
      copy:
        content: |
          Cluster PostgreSQL HA déployé
          ==============================

          Cluster: {{ cluster_name }}
          Environment: {{ environment }}

          Configuration:
          - PostgreSQL: {{ postgres_version }}
          - Patroni: {{ patroni_version }}
          - PgBouncer: {{ pgbouncer_version }}

          Haute disponibilité:
          - Nodes: {{ groups['postgresql_cluster'] | length }}
          - Replication: Streaming + Patroni
          - Failover: Automatique
          - API Patroni: Port {{ patroni_api_port }}

          Performance:
          - Max Connections: {{ max_connections }}
          - Shared Buffers: {{ shared_buffers }}
          - Effective Cache: {{ effective_cache_size }}

          Databases: {{ postgres_databases | length }}
          {% for db in postgres_databases %}
          - {{ db.name }} (owner: {{ db.owner }})
          {% endfor %}

          Backup:
          - Tool: pgBackRest
          - Schedule: {{ backup_schedule }}
          - Retention: {{ backup_retention_days }} days
          - Types: Full daily, Diff every 6h

          Monitoring:
          - postgres_exporter: Port {{ postgres_exporter_port }}
          - Metrics: Prometheus compatible

          Connection:
          - Direct: {{ ansible_default_ipv4.address }}:{{ postgres_port }}
          - Pooling: {{ ansible_default_ipv4.address }}:6432 (PgBouncer)

          Passwords stored in:
          - /tmp/pg-repl-password
          - /tmp/pg-superuser-password
          {% for db in postgres_databases %}
          - /tmp/pg-{{ db.owner }}-password
          {% endfor %}

          Date: {{ ansible_date_time.iso8601 }}
        dest: "/tmp/postgresql-ha-{{ cluster_name }}-report.txt"
      delegate_to: localhost

  handlers:
    - name: restart patroni
      systemd:
        name: patroni
        state: restarted

    - name: restart pgbouncer
      systemd:
        name: pgbouncer
        state: restarted
`;
}
