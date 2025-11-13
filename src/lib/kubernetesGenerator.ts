export interface K8sResource {
  name: string;
  type: 'deployment' | 'service' | 'ingress' | 'configmap' | 'secret' | 'helm';
  manifest: string;
}

export function generateKubernetesRole(appName: string, environment: 'staging' | 'production' = 'production'): {
  tasks: string;
  handlers: string;
  defaults: string;
  templates: Record<string, string>;
} {
  const replicas = environment === 'production' ? 3 : 1;

  return {
    tasks: `---
- name: Installer les dépendances Kubernetes
  pip:
    name:
      - kubernetes
      - openshift
      - pyyaml
    state: present

- name: Créer le namespace {{ k8s_namespace }}
  kubernetes.core.k8s:
    name: "{{ k8s_namespace }}"
    api_version: v1
    kind: Namespace
    state: present
    kubeconfig: "{{ kubeconfig_path }}"

- name: Récupérer les secrets depuis Vault
  set_fact:
    db_password: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/{{ app_name }}:db_password token={{ vault_token }} url={{ vault_addr }}') }}"
    api_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/{{ app_name }}:api_key token={{ vault_token }} url={{ vault_addr }}') }}"
  when: use_vault | default(true)
  no_log: true

- name: Créer le Secret Kubernetes pour DB
  kubernetes.core.k8s:
    state: present
    kubeconfig: "{{ kubeconfig_path }}"
    definition:
      apiVersion: v1
      kind: Secret
      metadata:
        name: "{{ app_name }}-secrets"
        namespace: "{{ k8s_namespace }}"
      type: Opaque
      stringData:
        DB_PASSWORD: "{{ db_password }}"
        API_KEY: "{{ api_key }}"

- name: Créer le ConfigMap
  kubernetes.core.k8s:
    state: present
    kubeconfig: "{{ kubeconfig_path }}"
    definition:
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: "{{ app_name }}-config"
        namespace: "{{ k8s_namespace }}"
      data:
        APP_ENV: "{{ environment }}"
        APP_NAME: "{{ app_name }}"
        LOG_LEVEL: "{{ log_level }}"

- name: Déployer l'application via Deployment
  kubernetes.core.k8s:
    state: present
    kubeconfig: "{{ kubeconfig_path }}"
    definition:
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: "{{ app_name }}"
        namespace: "{{ k8s_namespace }}"
        labels:
          app: "{{ app_name }}"
          environment: "{{ environment }}"
      spec:
        replicas: {{ k8s_replicas }}
        selector:
          matchLabels:
            app: "{{ app_name }}"
        template:
          metadata:
            labels:
              app: "{{ app_name }}"
              environment: "{{ environment }}"
          spec:
            containers:
            - name: "{{ app_name }}"
              image: "{{ docker_image }}:{{ docker_tag }}"
              ports:
              - containerPort: {{ app_port }}
                name: http
              env:
              - name: APP_ENV
                valueFrom:
                  configMapKeyRef:
                    name: "{{ app_name }}-config"
                    key: APP_ENV
              - name: DB_PASSWORD
                valueFrom:
                  secretKeyRef:
                    name: "{{ app_name }}-secrets"
                    key: DB_PASSWORD
              - name: API_KEY
                valueFrom:
                  secretKeyRef:
                    name: "{{ app_name }}-secrets"
                    key: API_KEY
              resources:
                requests:
                  memory: "{{ memory_request }}"
                  cpu: "{{ cpu_request }}"
                limits:
                  memory: "{{ memory_limit }}"
                  cpu: "{{ cpu_limit }}"
              livenessProbe:
                httpGet:
                  path: /health
                  port: {{ app_port }}
                initialDelaySeconds: 30
                periodSeconds: 10
              readinessProbe:
                httpGet:
                  path: /ready
                  port: {{ app_port }}
                initialDelaySeconds: 5
                periodSeconds: 5

- name: Créer le Service
  kubernetes.core.k8s:
    state: present
    kubeconfig: "{{ kubeconfig_path }}"
    definition:
      apiVersion: v1
      kind: Service
      metadata:
        name: "{{ app_name }}-service"
        namespace: "{{ k8s_namespace }}"
        labels:
          app: "{{ app_name }}"
      spec:
        type: "{{ service_type }}"
        selector:
          app: "{{ app_name }}"
        ports:
        - port: 80
          targetPort: {{ app_port }}
          protocol: TCP
          name: http

- name: Déployer l'Ingress
  kubernetes.core.k8s:
    state: present
    kubeconfig: "{{ kubeconfig_path }}"
    definition:
      apiVersion: networking.k8s.io/v1
      kind: Ingress
      metadata:
        name: "{{ app_name }}-ingress"
        namespace: "{{ k8s_namespace }}"
        annotations:
          kubernetes.io/ingress.class: nginx
          cert-manager.io/cluster-issuer: letsencrypt-prod
      spec:
        tls:
        - hosts:
          - "{{ app_domain }}"
          secretName: "{{ app_name }}-tls"
        rules:
        - host: "{{ app_domain }}"
          http:
            paths:
            - path: /
              pathType: Prefix
              backend:
                service:
                  name: "{{ app_name }}-service"
                  port:
                    number: 80

- name: Attendre que le déploiement soit prêt
  kubernetes.core.k8s_info:
    kind: Deployment
    namespace: "{{ k8s_namespace }}"
    name: "{{ app_name }}"
    kubeconfig: "{{ kubeconfig_path }}"
  register: deployment_status
  until: deployment_status.resources[0].status.availableReplicas == k8s_replicas
  retries: 30
  delay: 10`,
    handlers: `---
- name: rollout restart
  kubernetes.core.k8s:
    kind: Deployment
    namespace: "{{ k8s_namespace }}"
    name: "{{ app_name }}"
    kubeconfig: "{{ kubeconfig_path }}"
    state: patched
    definition:
      spec:
        template:
          metadata:
            annotations:
              kubectl.kubernetes.io/restartedAt: "{{ ansible_date_time.iso8601 }}"`,
    defaults: `---
app_name: ${appName}
environment: ${environment}
k8s_namespace: ${appName}-${environment}
k8s_replicas: ${replicas}
docker_image: ${appName}
docker_tag: latest
app_port: 8080
service_type: ClusterIP
app_domain: ${appName}.${environment}.example.com
kubeconfig_path: ~/.kube/config

# Resources
memory_request: "256Mi"
memory_limit: "512Mi"
cpu_request: "100m"
cpu_limit: "200m"

# Vault
use_vault: true
vault_addr: https://vault.example.com:8200

# Logging
log_level: info`,
    templates: {}
  };
}

export function generateHelmRole(chartName: string, environment: 'staging' | 'production' = 'production'): {
  tasks: string;
  defaults: string;
  templates: Record<string, string>;
} {
  return {
    tasks: `---
- name: Ajouter le dépôt Helm
  kubernetes.core.helm_repository:
    name: "{{ helm_repo_name }}"
    repo_url: "{{ helm_repo_url }}"

- name: Mettre à jour les dépôts Helm
  kubernetes.core.helm_repository:
    name: "{{ helm_repo_name }}"
    repo_url: "{{ helm_repo_url }}"
    state: present

- name: Créer le namespace pour Helm
  kubernetes.core.k8s:
    name: "{{ helm_namespace }}"
    api_version: v1
    kind: Namespace
    state: present
    kubeconfig: "{{ kubeconfig_path }}"

- name: Récupérer les valeurs depuis Vault
  set_fact:
    helm_values: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/helm/{{ chart_name }}:values token={{ vault_token }} url={{ vault_addr }}') }}"
  when: use_vault | default(false)
  no_log: true

- name: Déployer le chart Helm depuis le template
  kubernetes.core.helm:
    name: "{{ release_name }}"
    chart_ref: "{{ helm_repo_name }}/{{ chart_name }}"
    chart_version: "{{ chart_version }}"
    release_namespace: "{{ helm_namespace }}"
    kubeconfig: "{{ kubeconfig_path }}"
    values: "{{ helm_values_override }}"
    wait: yes
    timeout: "{{ helm_timeout }}"
    create_namespace: yes

- name: Vérifier le statut du déploiement Helm
  command: helm status {{ release_name }} -n {{ helm_namespace }}
  register: helm_status
  changed_when: false

- name: Afficher le statut
  debug:
    var: helm_status.stdout_lines`,
    defaults: `---
chart_name: ${chartName}
release_name: ${chartName}-${environment}
helm_namespace: ${chartName}
chart_version: latest
kubeconfig_path: ~/.kube/config
helm_timeout: 10m
environment: ${environment}

# Repository configuration
helm_repo_name: stable
helm_repo_url: https://charts.helm.sh/stable

# Values override
helm_values_override:
  replicaCount: ${environment === 'production' ? 3 : 1}
  image:
    tag: "${environment}"
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "200m"`,
    templates: {
      'values.yaml.j2': `replicaCount: {{ helm_values_override.replicaCount }}

image:
  repository: {{ docker_registry }}/{{ chart_name }}
  tag: "{{ helm_values_override.image.tag }}"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: {{ app_domain }}
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: {{ chart_name }}-tls
      hosts:
        - {{ app_domain }}

resources: {{ helm_values_override.resources | to_json }}

autoscaling:
  enabled: {{ 'true' if environment == 'production' else 'false' }}
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80`
    }
  };
}

export function generatePrometheusHelmRole(environment: 'staging' | 'production' = 'production'): {
  tasks: string;
  defaults: string;
} {
  return {
    tasks: `---
- name: Ajouter le dépôt Prometheus Community
  kubernetes.core.helm_repository:
    name: prometheus-community
    repo_url: https://prometheus-community.github.io/helm-charts

- name: Ajouter le dépôt Grafana
  kubernetes.core.helm_repository:
    name: grafana
    repo_url: https://grafana.github.io/helm-charts

- name: Mettre à jour les dépôts Helm
  command: helm repo update
  changed_when: false

- name: Créer le namespace monitoring
  kubernetes.core.k8s:
    name: monitoring
    api_version: v1
    kind: Namespace
    state: present
    kubeconfig: "{{ kubeconfig_path }}"

- name: Récupérer le mot de passe Grafana depuis Vault
  set_fact:
    grafana_admin_password: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/monitoring:grafana_password token={{ vault_token }} url={{ vault_addr }}') }}"
  when: use_vault | default(true)
  no_log: true

- name: Déployer kube-prometheus-stack
  kubernetes.core.helm:
    name: prometheus
    chart_ref: prometheus-community/kube-prometheus-stack
    chart_version: "{{ prometheus_chart_version }}"
    release_namespace: monitoring
    kubeconfig: "{{ kubeconfig_path }}"
    values:
      prometheus:
        prometheusSpec:
          retention: "{{ prometheus_retention }}"
          storageSpec:
            volumeClaimTemplate:
              spec:
                accessModes: ["ReadWriteOnce"]
                resources:
                  requests:
                    storage: "{{ prometheus_storage }}"
      grafana:
        adminPassword: "{{ grafana_admin_password }}"
        ingress:
          enabled: true
          annotations:
            kubernetes.io/ingress.class: nginx
            cert-manager.io/cluster-issuer: letsencrypt-prod
          hosts:
            - "{{ grafana_domain }}"
          tls:
            - secretName: grafana-tls
              hosts:
                - "{{ grafana_domain }}"
        persistence:
          enabled: true
          size: "{{ grafana_storage }}"
      alertmanager:
        enabled: true
        alertmanagerSpec:
          storage:
            volumeClaimTemplate:
              spec:
                accessModes: ["ReadWriteOnce"]
                resources:
                  requests:
                    storage: "{{ alertmanager_storage }}"
    wait: yes
    timeout: 15m
    create_namespace: yes

- name: Attendre que Prometheus soit prêt
  kubernetes.core.k8s_info:
    kind: Pod
    namespace: monitoring
    label_selectors:
      - app.kubernetes.io/name=prometheus
    kubeconfig: "{{ kubeconfig_path }}"
  register: prometheus_pods
  until: prometheus_pods.resources | length > 0 and prometheus_pods.resources[0].status.phase == "Running"
  retries: 30
  delay: 10

- name: Attendre que Grafana soit prêt
  kubernetes.core.k8s_info:
    kind: Pod
    namespace: monitoring
    label_selectors:
      - app.kubernetes.io/name=grafana
    kubeconfig: "{{ kubeconfig_path }}"
  register: grafana_pods
  until: grafana_pods.resources | length > 0 and grafana_pods.resources[0].status.phase == "Running"
  retries: 30
  delay: 10

- name: Afficher les informations d'accès
  debug:
    msg:
      - "Prometheus accessible via port-forward: kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090"
      - "Grafana accessible à: https://{{ grafana_domain }}"
      - "Username: admin"
      - "Password: (stocké dans Vault)"`,
    defaults: `---
environment: ${environment}
kubeconfig_path: ~/.kube/config
use_vault: true
vault_addr: https://vault.example.com:8200

# Chart versions
prometheus_chart_version: "54.0.0"

# Prometheus configuration
prometheus_retention: ${environment === 'production' ? '30d' : '7d'}
prometheus_storage: ${environment === 'production' ? '50Gi' : '10Gi'}

# Grafana configuration
grafana_domain: grafana.${environment}.example.com
grafana_storage: ${environment === 'production' ? '10Gi' : '5Gi'}

# Alertmanager configuration
alertmanager_storage: ${environment === 'production' ? '10Gi' : '2Gi'}`
  };
}

export function generateEKSRole(environment: 'staging' | 'production' = 'production'): {
  tasks: string;
  defaults: string;
} {
  const nodeCount = environment === 'production' ? 3 : 1;

  return {
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
  when: use_vault | default(true)
  no_log: true

- name: Créer le VPC pour EKS
  amazon.aws.ec2_vpc_net:
    name: "{{ eks_cluster_name }}-vpc"
    cidr_block: "{{ vpc_cidr }}"
    region: "{{ aws_region }}"
    aws_access_key: "{{ aws_access_key }}"
    aws_secret_key: "{{ aws_secret_key }}"
    tags:
      Name: "{{ eks_cluster_name }}-vpc"
      Environment: "{{ environment }}"
  register: vpc

- name: Créer les subnets
  amazon.aws.ec2_vpc_subnet:
    vpc_id: "{{ vpc.vpc.id }}"
    cidr: "{{ item.cidr }}"
    az: "{{ item.az }}"
    region: "{{ aws_region }}"
    aws_access_key: "{{ aws_access_key }}"
    aws_secret_key: "{{ aws_secret_key }}"
    tags:
      Name: "{{ eks_cluster_name }}-subnet-{{ item.name }}"
      Environment: "{{ environment }}"
  loop: "{{ eks_subnets }}"
  register: subnets

- name: Créer le rôle IAM pour EKS
  community.aws.iam_role:
    name: "{{ eks_cluster_name }}-role"
    assume_role_policy_document: "{{ lookup('file', 'eks-trust-policy.json') }}"
    managed_policies:
      - arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
      - arn:aws:iam::aws:policy/AmazonEKSVPCResourceController
    aws_access_key: "{{ aws_access_key }}"
    aws_secret_key: "{{ aws_secret_key }}"
  register: eks_role

- name: Créer le cluster EKS
  community.aws.eks_cluster:
    name: "{{ eks_cluster_name }}"
    version: "{{ eks_version }}"
    role_arn: "{{ eks_role.arn }}"
    subnets: "{{ subnets.results | map(attribute='subnet.id') | list }}"
    region: "{{ aws_region }}"
    aws_access_key: "{{ aws_access_key }}"
    aws_secret_key: "{{ aws_secret_key }}"
    wait: yes
    tags:
      Environment: "{{ environment }}"
      ManagedBy: Ansible
  register: eks_cluster

- name: Créer le groupe de nœuds
  community.aws.eks_nodegroup:
    cluster_name: "{{ eks_cluster_name }}"
    nodegroup_name: "{{ eks_cluster_name }}-nodes"
    node_role: "{{ node_role_arn }}"
    subnets: "{{ subnets.results | map(attribute='subnet.id') | list }}"
    region: "{{ aws_region }}"
    aws_access_key: "{{ aws_access_key }}"
    aws_secret_key: "{{ aws_secret_key }}"
    scaling_config:
      min_size: "{{ node_min_size }}"
      max_size: "{{ node_max_size }}"
      desired_size: "{{ node_desired_size }}"
    instance_types:
      - "{{ node_instance_type }}"
    wait: yes

- name: Configurer kubectl
  command: aws eks update-kubeconfig --region {{ aws_region }} --name {{ eks_cluster_name }}
  environment:
    AWS_ACCESS_KEY_ID: "{{ aws_access_key }}"
    AWS_SECRET_ACCESS_KEY: "{{ aws_secret_key }}"
  changed_when: false

- name: Vérifier la connectivité au cluster
  kubernetes.core.k8s_info:
    kind: Node
  register: cluster_nodes

- name: Afficher les informations du cluster
  debug:
    msg:
      - "Cluster EKS créé: {{ eks_cluster_name }}"
      - "Région: {{ aws_region }}"
      - "Version: {{ eks_version }}"
      - "Nœuds: {{ cluster_nodes.resources | length }}"
      - "Endpoint: {{ eks_cluster.endpoint }}"`,
    defaults: `---
eks_cluster_name: my-cluster-${environment}
eks_version: "1.28"
aws_region: us-east-1
environment: ${environment}

# VPC Configuration
vpc_cidr: "10.0.0.0/16"
eks_subnets:
  - { name: "subnet-1", cidr: "10.0.1.0/24", az: "{{ aws_region }}a" }
  - { name: "subnet-2", cidr: "10.0.2.0/24", az: "{{ aws_region }}b" }
  - { name: "subnet-3", cidr: "10.0.3.0/24", az: "{{ aws_region }}c" }

# Node Group Configuration
node_instance_type: ${environment === 'production' ? 't3.medium' : 't3.small'}
node_min_size: ${nodeCount}
node_max_size: ${environment === 'production' ? 10 : 3}
node_desired_size: ${nodeCount}

# Vault
use_vault: true
vault_addr: https://vault.example.com:8200`
  };
}

export function generateCICDRole(environment: 'staging' | 'production' = 'production'): {
  tasks: string;
  defaults: string;
  templates: Record<string, string>;
} {
  return {
    tasks: `---
- name: Récupérer le token GitLab depuis Vault
  set_fact:
    gitlab_token: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/gitlab:token token={{ vault_token }} url={{ vault_addr }}') }}"
  when: use_vault | default(true)
  no_log: true

- name: Déclencher le pipeline GitLab
  uri:
    url: "{{ gitlab_api_url }}/projects/{{ gitlab_project_id }}/trigger/pipeline"
    method: POST
    headers:
      PRIVATE-TOKEN: "{{ gitlab_token }}"
    body_format: json
    body:
      token: "{{ gitlab_trigger_token }}"
      ref: "{{ git_branch }}"
      variables:
        ENVIRONMENT: "{{ environment }}"
        DEPLOY_VERSION: "{{ deploy_version }}"
    status_code: 201
  register: pipeline_trigger

- name: Attendre que le pipeline démarre
  uri:
    url: "{{ gitlab_api_url }}/projects/{{ gitlab_project_id }}/pipelines/{{ pipeline_trigger.json.id }}"
    method: GET
    headers:
      PRIVATE-TOKEN: "{{ gitlab_token }}"
  register: pipeline_status
  until: pipeline_status.json.status != "pending"
  retries: 30
  delay: 10

- name: Suivre le pipeline
  uri:
    url: "{{ gitlab_api_url }}/projects/{{ gitlab_project_id }}/pipelines/{{ pipeline_trigger.json.id }}"
    method: GET
    headers:
      PRIVATE-TOKEN: "{{ gitlab_token }}"
  register: pipeline_status
  until: pipeline_status.json.status in ["success", "failed", "canceled"]
  retries: 60
  delay: 30

- name: Vérifier le statut du pipeline
  fail:
    msg: "Pipeline échoué! Status: {{ pipeline_status.json.status }}"
  when: pipeline_status.json.status != "success"

- name: Envoyer notification Slack
  uri:
    url: "{{ slack_webhook_url }}"
    method: POST
    body_format: json
    body:
      text: "✅ Déploiement {{ environment }} réussi!"
      attachments:
        - color: "good"
          title: "Pipeline #{{ pipeline_trigger.json.id }}"
          fields:
            - title: "Environnement"
              value: "{{ environment }}"
              short: true
            - title: "Version"
              value: "{{ deploy_version }}"
              short: true
            - title: "Branch"
              value: "{{ git_branch }}"
              short: true
            - title: "Durée"
              value: "{{ pipeline_status.json.duration }}s"
              short: true
  when: slack_notifications_enabled

- name: Créer un tag Git de rollback
  uri:
    url: "{{ gitlab_api_url }}/projects/{{ gitlab_project_id }}/repository/tags"
    method: POST
    headers:
      PRIVATE-TOKEN: "{{ gitlab_token }}"
    body_format: json
    body:
      tag_name: "rollback-{{ environment }}-{{ ansible_date_time.epoch }}"
      ref: "{{ git_branch }}"
      message: "Rollback point for {{ environment }} deployment"
  register: rollback_tag

- name: Sauvegarder les informations de déploiement
  copy:
    content: |
      Déploiement {{ environment }}
      Date: {{ ansible_date_time.iso8601 }}
      Pipeline ID: {{ pipeline_trigger.json.id }}
      Version: {{ deploy_version }}
      Branch: {{ git_branch }}
      Rollback tag: {{ rollback_tag.json.name }}
      Status: {{ pipeline_status.json.status }}
    dest: "/var/log/deployments/{{ environment }}-{{ ansible_date_time.date }}.log"
    mode: '0644'
  delegate_to: localhost`,
    defaults: `---
environment: ${environment}
gitlab_api_url: https://gitlab.com/api/v4
gitlab_project_id: "12345"
git_branch: ${environment === 'production' ? 'main' : 'develop'}
deploy_version: latest

# Notifications
slack_notifications_enabled: true
slack_webhook_url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Vault
use_vault: true
vault_addr: https://vault.example.com:8200`,
    templates: {
      '.gitlab-ci.yml.j2': `stages:
  - build
  - test
  - deploy

variables:
  DOCKER_REGISTRY: registry.gitlab.com
  ENVIRONMENT: $ENVIRONMENT

build:
  stage: build
  script:
    - docker build -t $DOCKER_REGISTRY/$CI_PROJECT_PATH:$CI_COMMIT_SHA .
    - docker push $DOCKER_REGISTRY/$CI_PROJECT_PATH:$CI_COMMIT_SHA

test:
  stage: test
  script:
    - npm test
    - npm run lint

deploy_${environment}:
  stage: deploy
  script:
    - ansible-playbook -i inventories/$ENVIRONMENT/hosts.yml site.yml
  only:
    - ${environment === 'production' ? 'main' : 'develop'}
  when: manual
  environment:
    name: ${environment}
    url: https://app.${environment}.example.com`
    }
  };
}

export function generateReportingTasks(): string {
  return `---
- name: Collecter les facts du système
  setup:
  register: system_facts

- name: Collecter les informations Kubernetes
  kubernetes.core.k8s_info:
    kind: Pod
    namespace: "{{ k8s_namespace }}"
    kubeconfig: "{{ kubeconfig_path }}"
  register: k8s_pods
  when: k8s_deployment | default(false)

- name: Générer le rapport de déploiement
  template:
    src: deployment-report.html.j2
    dest: "/var/log/ansible-reports/{{ environment }}-{{ ansible_date_time.date }}-{{ ansible_date_time.time }}.html"
    mode: '0644'
  delegate_to: localhost

- name: Créer le rapport JSON
  copy:
    content: |
      {
        "deployment_id": "{{ ansible_date_time.epoch }}",
        "environment": "{{ environment }}",
        "timestamp": "{{ ansible_date_time.iso8601 }}",
        "executor": "{{ ansible_user_id }}",
        "hosts": {{ groups['all'] | to_json }},
        "roles_applied": {{ ansible_play_role_names | default([]) | to_json }},
        "duration_seconds": {{ ansible_play_duration | default(0) }},
        "success": {{ ansible_failed_result is not defined }},
        "kubernetes": {
          "namespace": "{{ k8s_namespace | default('N/A') }}",
          "pods": {{ k8s_pods.resources | default([]) | length }},
          "deployments": {{ k8s_deployments | default([]) | length }}
        },
        "facts": {
          "os": "{{ ansible_distribution }} {{ ansible_distribution_version }}",
          "kernel": "{{ ansible_kernel }}",
          "python": "{{ ansible_python_version }}",
          "memory_total": "{{ ansible_memtotal_mb }}",
          "cpu_cores": "{{ ansible_processor_vcpus }}"
        }
      }
    dest: "/var/log/ansible-reports/{{ environment }}-{{ ansible_date_time.date }}.json"
    mode: '0644'
  delegate_to: localhost

- name: Envoyer le rapport par email
  mail:
    host: "{{ smtp_host }}"
    port: "{{ smtp_port }}"
    username: "{{ smtp_username }}"
    password: "{{ smtp_password }}"
    to: "{{ report_email }}"
    subject: "Rapport de déploiement {{ environment }} - {{ ansible_date_time.date }}"
    body: "Veuillez trouver ci-joint le rapport de déploiement."
    attach: "/var/log/ansible-reports/{{ environment }}-{{ ansible_date_time.date }}-{{ ansible_date_time.time }}.html"
  when: send_email_report | default(false)
  delegate_to: localhost

- name: Afficher le résumé du déploiement
  debug:
    msg:
      - "============================================"
      - "RÉSUMÉ DU DÉPLOIEMENT"
      - "============================================"
      - "Environnement: {{ environment }}"
      - "Date: {{ ansible_date_time.iso8601 }}"
      - "Hôtes déployés: {{ groups['all'] | length }}"
      - "Rôles appliqués: {{ ansible_play_role_names | default([]) | join(', ') }}"
      - "Statut: {{ 'SUCCÈS' if ansible_failed_result is not defined else 'ÉCHEC' }}"
      - "============================================"`;
}
