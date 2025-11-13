import { generateSecurityCompliancePlaybook } from './securityPipelineGenerator';
import { generateTerraformIntegration, generateMultiClusterDeployment } from './multiCloudGenerator';
import { generateKubernetesRole } from './kubernetesGenerator';
import { generateCompleteCICDPlaybook } from './completeCICDGenerator';
import { injectVersionsIntoPlaybook, getVersionForTool, generateVersionComment, type VersionSpec } from './versionManager';
import { generateCISPlaybookSection, generateCISDocumentation } from './cisHardeningLevels';
import { ensureAnsibleLintCompliance, generateAnsibleCfg, generateAnsibleLintConfig, generateYamlLintConfig, injectHandlers } from './ansibleLintCompliance';
import { generateProjectStructure, generateStructureVisualization, generateReadme, type ProjectStructure } from './projectStructureGenerator';

export interface GeneratorConfig {
  appName: string;
  environment: 'staging' | 'production';
  clusterName?: string;
  regions?: string[];
  providers?: ('aws' | 'azure' | 'gcp')[];
}

export function generateEKSClusterPlaybook(config: GeneratorConfig): string {
  const { appName, environment, clusterName = 'production-cluster' } = config;

  return `---
# Création de cluster EKS sur AWS avec autoscaling et monitoring
# Infrastructure as Code complète pour Kubernetes

- name: Provisionner cluster EKS complet avec autoscaling
  hosts: localhost
  connection: local
  gather_facts: yes

  vars:
    cluster_name: ${clusterName}
    region: eu-west-1
    environment: ${environment}
    app_name: ${appName}

    k8s_version: "1.28"
    node_instance_type: t3.large
    min_nodes: 2
    max_nodes: 10
    desired_nodes: 3

    vpc_cidr: "10.0.0.0/16"
    availability_zones:
      - eu-west-1a
      - eu-west-1b
      - eu-west-1c

    monitoring_enabled: true
    autoscaling_enabled: true
    logs_retention_days: 30

  tasks:
    - name: Récupérer credentials AWS depuis Vault
      set_fact:
        aws_access_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/aws:access_key') }}"
        aws_secret_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/aws:secret_key') }}"
      when: use_vault | default(true)
      no_log: true

    - name: Installer AWS CLI
      pip:
        name:
          - boto3
          - botocore
          - awscli
        state: present

    - name: Créer VPC pour le cluster EKS
      amazon.aws.ec2_vpc_net:
        name: "{{ cluster_name }}-vpc"
        cidr_block: "{{ vpc_cidr }}"
        region: "{{ region }}"
        tags:
          Name: "{{ cluster_name }}-vpc"
          Environment: "{{ environment }}"
          ManagedBy: Ansible
      register: vpc_result

    - name: Créer Internet Gateway
      amazon.aws.ec2_vpc_igw:
        vpc_id: "{{ vpc_result.vpc.id }}"
        region: "{{ region }}"
        tags:
          Name: "{{ cluster_name }}-igw"
      register: igw_result

    - name: Créer subnets publics
      amazon.aws.ec2_vpc_subnet:
        vpc_id: "{{ vpc_result.vpc.id }}"
        cidr: "10.0.{{ index }}.0/24"
        az: "{{ item }}"
        region: "{{ region }}"
        tags:
          Name: "{{ cluster_name }}-public-{{ item }}"
          kubernetes.io/role/elb: "1"
          kubernetes.io/cluster/{{ cluster_name }}: shared
      loop: "{{ availability_zones }}"
      loop_control:
        index_var: index
      register: public_subnets

    - name: Créer subnets privés
      amazon.aws.ec2_vpc_subnet:
        vpc_id: "{{ vpc_result.vpc.id }}"
        cidr: "10.0.{{ 10 + index }}.0/24"
        az: "{{ item }}"
        region: "{{ region }}"
        tags:
          Name: "{{ cluster_name }}-private-{{ item }}"
          kubernetes.io/role/internal-elb: "1"
          kubernetes.io/cluster/{{ cluster_name }}: shared
      loop: "{{ availability_zones }}"
      loop_control:
        index_var: index
      register: private_subnets

    - name: Créer NAT Gateway pour subnets privés
      amazon.aws.ec2_vpc_nat_gateway:
        subnet_id: "{{ public_subnets.results[0].subnet.id }}"
        region: "{{ region }}"
        if_exist_do_not_create: true
        wait: yes
      register: nat_gateway

    - name: Créer IAM role pour EKS cluster
      community.aws.iam_role:
        name: "{{ cluster_name }}-eks-cluster-role"
        assume_role_policy_document: |
          {
            "Version": "2012-10-17",
            "Statement": [{
              "Effect": "Allow",
              "Principal": {"Service": "eks.amazonaws.com"},
              "Action": "sts:AssumeRole"
            }]
          }
        managed_policy:
          - arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
          - arn:aws:iam::aws:policy/AmazonEKSVPCResourceController
      register: cluster_role

    - name: Créer IAM role pour EKS nodes
      community.aws.iam_role:
        name: "{{ cluster_name }}-eks-node-role"
        assume_role_policy_document: |
          {
            "Version": "2012-10-17",
            "Statement": [{
              "Effect": "Allow",
              "Principal": {"Service": "ec2.amazonaws.com"},
              "Action": "sts:AssumeRole"
            }]
          }
        managed_policy:
          - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
          - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
          - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
      register: node_role

    - name: Créer Security Group pour le cluster
      amazon.aws.ec2_security_group:
        name: "{{ cluster_name }}-cluster-sg"
        description: Security group for EKS cluster
        vpc_id: "{{ vpc_result.vpc.id }}"
        region: "{{ region }}"
        rules:
          - proto: tcp
            ports: 443
            cidr_ip: 0.0.0.0/0
            rule_desc: HTTPS access
      register: cluster_sg

    - name: Créer le cluster EKS
      community.aws.eks_cluster:
        name: "{{ cluster_name }}"
        role_arn: "{{ cluster_role.arn }}"
        version: "{{ k8s_version }}"
        region: "{{ region }}"
        subnets: "{{ (public_subnets.results + private_subnets.results) | map(attribute='subnet.id') | list }}"
        security_groups:
          - "{{ cluster_sg.group_id }}"
        wait: yes
        wait_timeout: 1800
      register: eks_cluster

    - name: Activer les logs CloudWatch pour EKS
      shell: |
        aws eks update-cluster-config \\
          --name {{ cluster_name }} \\
          --region {{ region }} \\
          --logging '{"clusterLogging":[{"types":["api","audit","authenticator","controllerManager","scheduler"],"enabled":true}]}'
      when: monitoring_enabled
      register: logs_config

    - name: Créer node group avec autoscaling
      community.aws.eks_nodegroup:
        cluster_name: "{{ cluster_name }}"
        nodegroup_name: "{{ cluster_name }}-nodegroup"
        node_role: "{{ node_role.arn }}"
        subnets: "{{ private_subnets.results | map(attribute='subnet.id') | list }}"
        region: "{{ region }}"
        scaling_config:
          min_size: "{{ min_nodes }}"
          max_size: "{{ max_nodes }}"
          desired_size: "{{ desired_nodes }}"
        instance_types:
          - "{{ node_instance_type }}"
        disk_size: 100
        ami_type: AL2_x86_64
        wait: yes
      register: node_group

    - name: Installer kubectl
      get_url:
        url: https://dl.k8s.io/release/v1.28.0/bin/linux/amd64/kubectl
        dest: /usr/local/bin/kubectl
        mode: '0755'

    - name: Configurer kubeconfig pour EKS
      shell: |
        aws eks update-kubeconfig \\
          --name {{ cluster_name }} \\
          --region {{ region }} \\
          --kubeconfig ~/.kube/config
      environment:
        AWS_ACCESS_KEY_ID: "{{ aws_access_key }}"
        AWS_SECRET_ACCESS_KEY: "{{ aws_secret_key }}"

    - name: Installer Cluster Autoscaler
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: cluster-autoscaler
            namespace: kube-system
          spec:
            replicas: 1
            selector:
              matchLabels:
                app: cluster-autoscaler
            template:
              metadata:
                labels:
                  app: cluster-autoscaler
              spec:
                serviceAccountName: cluster-autoscaler
                containers:
                - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.0
                  name: cluster-autoscaler
                  command:
                    - ./cluster-autoscaler
                    - --v=4
                    - --cloud-provider=aws
                    - --skip-nodes-with-local-storage=false
                    - --expander=least-waste
                    - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/{{ cluster_name }}
      when: autoscaling_enabled

    - name: Installer AWS Load Balancer Controller
      shell: |
        helm repo add eks https://aws.github.io/eks-charts
        helm repo update
        helm install aws-load-balancer-controller eks/aws-load-balancer-controller \\
          -n kube-system \\
          --set clusterName={{ cluster_name }} \\
          --set serviceAccount.create=true \\
          --set region={{ region }}

    - name: Installer Metrics Server
      kubernetes.core.k8s:
        state: present
        src: https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

    - name: Créer namespace pour l'application
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ app_name }}"
            labels:
              environment: "{{ environment }}"

    - name: Générer rapport de déploiement
      copy:
        content: |
          Cluster EKS déployé avec succès
          ================================

          Cluster: {{ cluster_name }}
          Région: {{ region }}
          Version K8s: {{ k8s_version }}

          Endpoints:
          - API Server: {{ eks_cluster.endpoint }}

          Networking:
          - VPC ID: {{ vpc_result.vpc.id }}
          - Subnets: {{ (public_subnets.results + private_subnets.results) | length }}

          Compute:
          - Node Group: {{ node_group.nodegroup_name }}
          - Instance Type: {{ node_instance_type }}
          - Autoscaling: {{ min_nodes }}-{{ max_nodes }} nodes

          Features:
          - Autoscaling: {{ autoscaling_enabled }}
          - Monitoring: {{ monitoring_enabled }}
          - Load Balancer: AWS ALB Controller
          - Metrics: Metrics Server

          Commande de connexion:
          aws eks update-kubeconfig --name {{ cluster_name }} --region {{ region }}

          Date: {{ ansible_date_time.iso8601 }}
        dest: "/tmp/eks-cluster-{{ cluster_name }}-report.txt"

    - name: Afficher résumé du déploiement
      debug:
        msg:
          - "✅ Cluster EKS créé avec succès"
          - "📍 Cluster: {{ cluster_name }}"
          - "🌍 Région: {{ region }}"
          - "🔗 Endpoint: {{ eks_cluster.endpoint }}"
          - "📊 Nodes: {{ desired_nodes }} ({{ min_nodes }}-{{ max_nodes }})"
          - "💾 Rapport: /tmp/eks-cluster-{{ cluster_name }}-report.txt"
`;
}

export function generateJenkinsCICDPlaybook(config: GeneratorConfig): string {
  const { appName, environment } = config;

  return `---
# Pipeline CI/CD Jenkins complet avec tests et déploiement K8s
# Automatisation complète du workflow DevOps

- name: Pipeline CI/CD Jenkins avec déploiement Kubernetes
  hosts: localhost
  connection: local
  gather_facts: yes

  vars:
    app_name: ${appName}
    environment: ${environment}
    jenkins_url: https://jenkins.example.com
    git_repo: https://github.com/company/{{ app_name }}.git
    git_branch: main

    docker_registry: registry.example.com
    docker_image: "{{ docker_registry }}/{{ app_name }}"
    docker_tag: "{{ environment }}-{{ ansible_date_time.epoch }}"

    k8s_namespace: "{{ app_name }}-{{ environment }}"
    k8s_replicas: ${environment === 'production' ? '3' : '2'}

    test_framework: pytest
    coverage_threshold: 80

    slack_webhook: "{{ lookup('env', 'SLACK_WEBHOOK_URL') }}"
    notify_on_success: true
    notify_on_failure: true

  tasks:
    - name: Vérifier les prérequis
      block:
        - name: Vérifier Git
          command: git --version
          register: git_version

        - name: Vérifier Docker
          command: docker --version
          register: docker_version

        - name: Vérifier kubectl
          command: kubectl version --client
          register: kubectl_version

        - name: Afficher versions
          debug:
            msg:
              - "Git: {{ git_version.stdout }}"
              - "Docker: {{ docker_version.stdout }}"
              - "kubectl: {{ kubectl_version.stdout }}"
      rescue:
        - name: Installer les outils manquants
          apt:
            name:
              - git
              - docker.io
            state: present
          become: yes

    - name: Clone du repository Git
      git:
        repo: "{{ git_repo }}"
        dest: "/tmp/{{ app_name }}"
        version: "{{ git_branch }}"
        force: yes
      register: git_clone

    - name: Afficher commit info
      debug:
        msg:
          - "📦 Repository cloné"
          - "🌿 Branch: {{ git_branch }}"
          - "📝 Commit: {{ git_clone.after }}"

    - name: Installer dépendances de test
      pip:
        requirements: "/tmp/{{ app_name }}/requirements-test.txt"
        virtualenv: "/tmp/{{ app_name }}/venv"
      when: test_framework == 'pytest'

    - name: Exécuter tests unitaires
      shell: |
        cd /tmp/{{ app_name }}
        source venv/bin/activate
        pytest tests/ --cov={{ app_name }} --cov-report=xml --cov-report=html --junitxml=test-results.xml
      register: tests_result
      failed_when: tests_result.rc != 0

    - name: Vérifier couverture de code
      shell: |
        cd /tmp/{{ app_name }}
        source venv/bin/activate
        coverage report | grep TOTAL | awk '{print $NF}' | sed 's/%//'
      register: coverage_result

    - name: Valider couverture minimale
      assert:
        that:
          - coverage_result.stdout | int >= coverage_threshold
        fail_msg: "Couverture insuffisante: {{ coverage_result.stdout }}% < {{ coverage_threshold }}%"
        success_msg: "✅ Couverture: {{ coverage_result.stdout }}%"

    - name: Linter le code Python
      shell: |
        cd /tmp/{{ app_name }}
        source venv/bin/activate
        pylint {{ app_name }} --exit-zero
      register: lint_result

    - name: Scanner sécurité avec Bandit
      shell: |
        cd /tmp/{{ app_name }}
        source venv/bin/activate
        bandit -r {{ app_name }} -f json -o bandit-report.json
      register: security_scan
      ignore_errors: yes

    - name: Build Docker image
      docker_image:
        name: "{{ docker_image }}"
        tag: "{{ docker_tag }}"
        path: "/tmp/{{ app_name }}"
        dockerfile: Dockerfile
        push: no
        build:
          args:
            APP_ENV: "{{ environment }}"
      register: docker_build

    - name: Scanner image Docker avec Trivy
      shell: |
        trivy image --severity HIGH,CRITICAL --format json \\
          --output /tmp/trivy-report.json \\
          {{ docker_image }}:{{ docker_tag }}
      register: trivy_scan
      ignore_errors: yes

    - name: Tag latest pour environnement
      docker_image:
        name: "{{ docker_image }}"
        tag: "{{ docker_tag }}"
        repository: "{{ docker_image }}:{{ environment }}-latest"
        push: no

    - name: Login Docker registry
      docker_login:
        registry_url: "{{ docker_registry }}"
        username: "{{ lookup('env', 'DOCKER_USERNAME') }}"
        password: "{{ lookup('env', 'DOCKER_PASSWORD') }}"

    - name: Push image vers registry
      docker_image:
        name: "{{ docker_image }}"
        tag: "{{ docker_tag }}"
        push: yes

    - name: Push tag latest
      docker_image:
        name: "{{ docker_image }}"
        tag: "{{ environment }}-latest"
        push: yes

    - name: Créer namespace Kubernetes
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ k8s_namespace }}"
            labels:
              environment: "{{ environment }}"
              app: "{{ app_name }}"

    - name: Créer ConfigMap
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: "{{ app_name }}-config"
            namespace: "{{ k8s_namespace }}"
          data:
            APP_ENV: "{{ environment }}"
            LOG_LEVEL: "${environment === 'production' ? 'info' : 'debug'}"

    - name: Créer Secret
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: "{{ app_name }}-secret"
            namespace: "{{ k8s_namespace }}"
          type: Opaque
          stringData:
            DB_PASSWORD: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/db:password') }}"
            API_KEY: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/api:key') }}"

    - name: Déployer application sur Kubernetes
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ k8s_namespace }}"
            labels:
              app: "{{ app_name }}"
              version: "{{ docker_tag }}"
          spec:
            replicas: "{{ k8s_replicas }}"
            strategy:
              type: RollingUpdate
              rollingUpdate:
                maxSurge: 1
                maxUnavailable: 0
            selector:
              matchLabels:
                app: "{{ app_name }}"
            template:
              metadata:
                labels:
                  app: "{{ app_name }}"
                  version: "{{ docker_tag }}"
              spec:
                containers:
                - name: "{{ app_name }}"
                  image: "{{ docker_image }}:{{ docker_tag }}"
                  ports:
                  - containerPort: 8080
                  envFrom:
                  - configMapRef:
                      name: "{{ app_name }}-config"
                  - secretRef:
                      name: "{{ app_name }}-secret"
                  resources:
                    requests:
                      memory: "256Mi"
                      cpu: "250m"
                    limits:
                      memory: "512Mi"
                      cpu: "500m"
                  livenessProbe:
                    httpGet:
                      path: /health
                      port: 8080
                    initialDelaySeconds: 30
                    periodSeconds: 10
                  readinessProbe:
                    httpGet:
                      path: /ready
                      port: 8080
                    initialDelaySeconds: 10
                    periodSeconds: 5

    - name: Créer Service
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Service
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ k8s_namespace }}"
          spec:
            type: ClusterIP
            ports:
            - port: 80
              targetPort: 8080
            selector:
              app: "{{ app_name }}"

    - name: Attendre déploiement
      kubernetes.core.k8s_info:
        kind: Deployment
        namespace: "{{ k8s_namespace }}"
        name: "{{ app_name }}"
      register: deployment
      until: deployment.resources[0].status.readyReplicas == k8s_replicas | int
      retries: 30
      delay: 10

    - name: Smoke test
      uri:
        url: "http://{{ app_name }}.{{ k8s_namespace }}.svc.cluster.local/health"
        status_code: 200
      register: smoke_test
      retries: 5
      delay: 10

    - name: Générer rapport de déploiement
      copy:
        content: |
          Pipeline CI/CD terminé avec succès
          ==================================

          Application: {{ app_name }}
          Environment: {{ environment }}

          Git:
          - Repository: {{ git_repo }}
          - Branch: {{ git_branch }}
          - Commit: {{ git_clone.after }}

          Tests:
          - Framework: {{ test_framework }}
          - Couverture: {{ coverage_result.stdout }}%
          - Seuil: {{ coverage_threshold }}%

          Docker:
          - Image: {{ docker_image }}:{{ docker_tag }}
          - Registry: {{ docker_registry }}

          Kubernetes:
          - Namespace: {{ k8s_namespace }}
          - Replicas: {{ k8s_replicas }}
          - Status: {{ deployment.resources[0].status.readyReplicas }}/{{ k8s_replicas }} ready

          Sécurité:
          - Linter: {{ lint_result.rc == 0 }}
          - Bandit scan: Completed
          - Trivy scan: Completed

          Date: {{ ansible_date_time.iso8601 }}
        dest: "/tmp/pipeline-{{ app_name }}-{{ docker_tag }}.txt"

    - name: Notifier Slack en cas de succès
      uri:
        url: "{{ slack_webhook }}"
        method: POST
        body_format: json
        body:
          text: |
            ✅ Déploiement réussi: {{ app_name }}
            Environment: {{ environment }}
            Version: {{ docker_tag }}
            Commit: {{ git_clone.after[:8] }}
      when: notify_on_success and slack_webhook != ""

    - name: Résumé du pipeline
      debug:
        msg:
          - "✅ Pipeline CI/CD terminé"
          - "📦 App: {{ app_name }}"
          - "🏷️  Tag: {{ docker_tag }}"
          - "☸️  K8s: {{ k8s_namespace }}"
          - "📊 Coverage: {{ coverage_result.stdout }}%"
          - "🚀 Status: {{ deployment.resources[0].status.readyReplicas }}/{{ k8s_replicas }} pods"

  rescue:
    - name: Notifier Slack en cas d'échec
      uri:
        url: "{{ slack_webhook }}"
        method: POST
        body_format: json
        body:
          text: |
            ❌ Échec du déploiement: {{ app_name }}
            Environment: {{ environment }}
            Erreur: {{ ansible_failed_result.msg }}
      when: notify_on_failure and slack_webhook != ""

    - name: Rollback déploiement
      kubernetes.core.k8s:
        state: absent
        kind: Deployment
        namespace: "{{ k8s_namespace }}"
        name: "{{ app_name }}"
      ignore_errors: yes

    - fail:
        msg: "Pipeline échoué - Rollback effectué"
`;
}

export function generatePrometheusGrafanaPlaybook(config: GeneratorConfig): string {
  const { environment, clusterName = 'monitoring-cluster' } = config;

  return `---
# Déploiement stack monitoring Prometheus, Grafana, Loki sur Kubernetes
# Solution complète d'observabilité

- name: Déployer stack monitoring complète sur K8s
  hosts: localhost
  connection: local
  gather_facts: yes

  vars:
    environment: ${environment}
    cluster_name: ${clusterName}
    namespace: monitoring

    prometheus_version: "v2.48.0"
    grafana_version: "10.2.0"
    loki_version: "2.9.0"
    promtail_version: "2.9.0"
    alertmanager_version: "v0.26.0"

    storage_class: gp3
    prometheus_storage: 50Gi
    grafana_storage: 10Gi
    loki_storage: 100Gi

    retention_days: 30

    grafana_admin_password: "{{ lookup('password', '/tmp/grafana-password chars=ascii_letters,digits length=20') }}"

    alert_receivers:
      - name: slack
        webhook_url: "{{ lookup('env', 'SLACK_WEBHOOK_URL') }}"
      - name: email
        to: ops@example.com

  tasks:
    - name: Créer namespace monitoring
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ namespace }}"
            labels:
              name: monitoring
              environment: "{{ environment }}"

    - name: Ajouter Helm repo Prometheus Community
      kubernetes.core.helm_repository:
        name: prometheus-community
        repo_url: https://prometheus-community.github.io/helm-charts

    - name: Ajouter Helm repo Grafana
      kubernetes.core.helm_repository:
        name: grafana
        repo_url: https://grafana.github.io/helm-charts

    - name: Mettre à jour repos Helm
      command: helm repo update

    - name: Créer valeurs Prometheus
      copy:
        content: |
          prometheus:
            prometheusSpec:
              retention: {{ retention_days }}d
              storageSpec:
                volumeClaimTemplate:
                  spec:
                    storageClassName: {{ storage_class }}
                    accessModes: ["ReadWriteOnce"]
                    resources:
                      requests:
                        storage: {{ prometheus_storage }}

              resources:
                requests:
                  cpu: 500m
                  memory: 2Gi
                limits:
                  cpu: 2
                  memory: 4Gi

              additionalScrapeConfigs:
                - job_name: 'kubernetes-pods'
                  kubernetes_sd_configs:
                    - role: pod
                  relabel_configs:
                    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
                      action: keep
                      regex: true
                    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
                      action: replace
                      target_label: __metrics_path__
                      regex: (.+)
                    - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
                      action: replace
                      regex: ([^:]+)(?::\d+)?;(\d+)
                      replacement: $1:$2
                      target_label: __address__

          alertmanager:
            alertmanagerSpec:
              storage:
                volumeClaimTemplate:
                  spec:
                    storageClassName: {{ storage_class }}
                    accessModes: ["ReadWriteOnce"]
                    resources:
                      requests:
                        storage: 10Gi

          grafana:
            enabled: true
            adminPassword: {{ grafana_admin_password }}
            persistence:
              enabled: true
              storageClassName: {{ storage_class }}
              size: {{ grafana_storage }}

            datasources:
              datasources.yaml:
                apiVersion: 1
                datasources:
                  - name: Prometheus
                    type: prometheus
                    url: http://prometheus-operated:9090
                    isDefault: true
                  - name: Loki
                    type: loki
                    url: http://loki:3100

            dashboardProviders:
              dashboardproviders.yaml:
                apiVersion: 1
                providers:
                  - name: 'default'
                    orgId: 1
                    folder: ''
                    type: file
                    disableDeletion: false
                    editable: true
                    options:
                      path: /var/lib/grafana/dashboards/default

            dashboards:
              default:
                kubernetes-cluster:
                  gnetId: 7249
                  revision: 1
                  datasource: Prometheus
                kubernetes-pods:
                  gnetId: 6417
                  revision: 1
                  datasource: Prometheus
                node-exporter:
                  gnetId: 1860
                  revision: 27
                  datasource: Prometheus
        dest: /tmp/prometheus-values.yaml

    - name: Installer Prometheus Stack
      kubernetes.core.helm:
        name: prometheus
        chart_ref: prometheus-community/kube-prometheus-stack
        release_namespace: "{{ namespace }}"
        values_files:
          - /tmp/prometheus-values.yaml
        wait: yes
        timeout: 10m

    - name: Créer valeurs Loki
      copy:
        content: |
          loki:
            auth_enabled: false
            commonConfig:
              replication_factor: 1
            storage:
              type: 'filesystem'
            persistence:
              enabled: true
              storageClassName: {{ storage_class }}
              size: {{ loki_storage }}

          monitoring:
            selfMonitoring:
              enabled: true
              grafanaAgent:
                installOperator: false

          test:
            enabled: false
        dest: /tmp/loki-values.yaml

    - name: Installer Loki
      kubernetes.core.helm:
        name: loki
        chart_ref: grafana/loki
        release_namespace: "{{ namespace }}"
        values_files:
          - /tmp/loki-values.yaml
        wait: yes

    - name: Créer valeurs Promtail
      copy:
        content: |
          config:
            lokiAddress: http://loki:3100/loki/api/v1/push
            snippets:
              extraScrapeConfigs: |
                - job_name: kubernetes-pods
                  kubernetes_sd_configs:
                    - role: pod
                  relabel_configs:
                    - source_labels: [__meta_kubernetes_pod_controller_name]
                      regex: ([0-9a-z-.]+?)(-[0-9a-f]{8,10})?
                      action: replace
                      target_label: __tmp_controller_name
                    - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
                      action: replace
                      target_label: app
                    - source_labels: [__meta_kubernetes_pod_node_name]
                      action: replace
                      target_label: node
                    - source_labels: [__meta_kubernetes_namespace]
                      action: replace
                      target_label: namespace
                    - source_labels: [__meta_kubernetes_pod_name]
                      action: replace
                      target_label: pod
        dest: /tmp/promtail-values.yaml

    - name: Installer Promtail
      kubernetes.core.helm:
        name: promtail
        chart_ref: grafana/promtail
        release_namespace: "{{ namespace }}"
        values_files:
          - /tmp/promtail-values.yaml
        wait: yes

    - name: Créer AlertManager config
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: alertmanager-config
            namespace: "{{ namespace }}"
          stringData:
            alertmanager.yml: |
              global:
                resolve_timeout: 5m

              route:
                group_by: ['alertname', 'cluster', 'service']
                group_wait: 10s
                group_interval: 10s
                repeat_interval: 12h
                receiver: 'slack'
                routes:
                  - match:
                      severity: critical
                    receiver: slack
                    continue: true
                  - match:
                      severity: warning
                    receiver: email

              receivers:
                - name: 'slack'
                  slack_configs:
                    - api_url: "{{ alert_receivers[0].webhook_url }}"
                      channel: '#alerts'
                      title: 'Alert: {{ '{{' }} .GroupLabels.alertname {{ '}}' }}'
                      text: '{{ '{{' }} range .Alerts {{ '}}' }}{{ '{{' }} .Annotations.summary {{ '}}' }}\n{{ '{{' }} end {{ '}}' }}'

                - name: 'email'
                  email_configs:
                    - to: "{{ alert_receivers[1].to }}"
                      from: 'alertmanager@example.com'
                      smarthost: 'smtp.example.com:587'

    - name: Créer règles d'alerte Prometheus
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: monitoring.coreos.com/v1
          kind: PrometheusRule
          metadata:
            name: custom-alerts
            namespace: "{{ namespace }}"
          spec:
            groups:
              - name: kubernetes-apps
                interval: 30s
                rules:
                  - alert: PodCrashLooping
                    expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
                    for: 5m
                    labels:
                      severity: critical
                    annotations:
                      summary: "Pod is crash looping"
                      description: "Pod {{ '{{' }} $labels.namespace {{ '}}' }}/{{ '{{' }} $labels.pod {{ '}}' }} is restarting frequently"

                  - alert: HighMemoryUsage
                    expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.9
                    for: 5m
                    labels:
                      severity: warning
                    annotations:
                      summary: "High memory usage"
                      description: "Container {{ '{{' }} $labels.container {{ '}}' }} memory usage is above 90%"

                  - alert: HighCPUUsage
                    expr: (rate(container_cpu_usage_seconds_total[5m])) > 0.8
                    for: 5m
                    labels:
                      severity: warning
                    annotations:
                      summary: "High CPU usage"
                      description: "Container {{ '{{' }} $labels.container {{ '}}' }} CPU usage is above 80%"

    - name: Exposer Grafana via Ingress
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: Ingress
          metadata:
            name: grafana
            namespace: "{{ namespace }}"
            annotations:
              cert-manager.io/cluster-issuer: letsencrypt-prod
              nginx.ingress.kubernetes.io/ssl-redirect: "true"
          spec:
            ingressClassName: nginx
            tls:
              - hosts:
                  - grafana.{{ cluster_name }}.example.com
                secretName: grafana-tls
            rules:
              - host: grafana.{{ cluster_name }}.example.com
                http:
                  paths:
                    - path: /
                      pathType: Prefix
                      backend:
                        service:
                          name: prometheus-grafana
                          port:
                            number: 80

    - name: Attendre déploiement Prometheus
      kubernetes.core.k8s_info:
        kind: StatefulSet
        namespace: "{{ namespace }}"
        name: prometheus-prometheus-kube-prometheus-prometheus
      register: prometheus_deploy
      until: prometheus_deploy.resources[0].status.readyReplicas is defined and prometheus_deploy.resources[0].status.readyReplicas >= 1
      retries: 30
      delay: 10

    - name: Attendre déploiement Grafana
      kubernetes.core.k8s_info:
        kind: Deployment
        namespace: "{{ namespace }}"
        name: prometheus-grafana
      register: grafana_deploy
      until: grafana_deploy.resources[0].status.readyReplicas is defined and grafana_deploy.resources[0].status.readyReplicas >= 1
      retries: 30
      delay: 10

    - name: Sauvegarder mot de passe Grafana
      copy:
        content: |
          Grafana Credentials
          ==================

          URL: https://grafana.{{ cluster_name }}.example.com
          Username: admin
          Password: {{ grafana_admin_password }}

          IMPORTANT: Changez ce mot de passe immédiatement après la première connexion
        dest: "/tmp/grafana-credentials-{{ environment }}.txt"
        mode: '0600'

    - name: Générer rapport de déploiement
      copy:
        content: |
          Stack Monitoring déployée avec succès
          =====================================

          Cluster: {{ cluster_name }}
          Namespace: {{ namespace }}
          Environment: {{ environment }}

          Composants installés:
          - Prometheus: {{ prometheus_version }}
          - Grafana: {{ grafana_version }}
          - Loki: {{ loki_version }}
          - Promtail: {{ promtail_version }}
          - AlertManager: {{ alertmanager_version }}

          Storage:
          - Prometheus: {{ prometheus_storage }}
          - Grafana: {{ grafana_storage }}
          - Loki: {{ loki_storage }}

          Rétention: {{ retention_days }} jours

          Accès:
          - Grafana: https://grafana.{{ cluster_name }}.example.com
          - Prometheus: Port-forward avec kubectl port-forward -n {{ namespace }} svc/prometheus-operated 9090:9090

          Dashboards Grafana pré-configurés:
          - Kubernetes Cluster Monitoring
          - Kubernetes Pods Monitoring
          - Node Exporter Full

          Alertes configurées:
          - Pod Crash Looping
          - High Memory Usage (>90%)
          - High CPU Usage (>80%)

          Credentials: /tmp/grafana-credentials-{{ environment }}.txt

          Date: {{ ansible_date_time.iso8601 }}
        dest: "/tmp/monitoring-stack-{{ environment }}-report.txt"

    - name: Résumé du déploiement
      debug:
        msg:
          - "✅ Stack monitoring déployée"
          - "📊 Prometheus: Ready"
          - "📈 Grafana: https://grafana.{{ cluster_name }}.example.com"
          - "📝 Loki: Ready for logs"
          - "🔔 AlertManager: Configured"
          - "🔐 Credentials: /tmp/grafana-credentials-{{ environment }}.txt"
          - "📄 Rapport: /tmp/monitoring-stack-{{ environment }}-report.txt"
`;
}

export function generateSecurityHardeningPlaybook(config: GeneratorConfig): string {
  const { environment } = config;

  const ubuntuVersion = getVersionForTool('ubuntu', '22.04');
  const versionHeader = generateVersionComment([ubuntuVersion]);

  const structure = generateProjectStructure('roles', 'security-hardening');
  const structureVis = generateStructureVisualization(structure);

  let playbook = `---
${versionHeader}
#
${structureVis}
# Hardening serveurs Linux selon standards CIS
# Sécurisation complète avec firewall UFW

- name: Hardening serveurs Linux selon CIS Benchmarks
  hosts: all
  become: yes
  gather_facts: yes

  vars:
    environment: ${environment}
    cis_level: 2

    allowed_ssh_users:
      - admin
      - deploy

    ssh_port: 22
    ssh_max_auth_tries: 3
    ssh_client_alive_interval: 300
    ssh_client_alive_count_max: 2

    firewall_rules:
      - { port: 22, proto: tcp, rule: allow, comment: 'SSH' }
      - { port: 80, proto: tcp, rule: allow, comment: 'HTTP' }
      - { port: 443, proto: tcp, rule: allow, comment: 'HTTPS' }

    failed_login_attempts: 5
    password_min_length: 14
    password_max_age: 90

    audit_log_retention: 30

    disable_services:
      - avahi-daemon
      - cups
      - isc-dhcp-server
      - isc-dhcp-server6
      - slapd
      - nfs-server
      - rpcbind
      - rsync
      - snmpd

  tasks:
    - name: 🔒 SECTION 1 - Système de fichiers et partitions
      block:
        - name: Désactiver montage automatique
          copy:
            content: |
              install cramfs /bin/true
              install freevxfs /bin/true
              install jffs2 /bin/true
              install hfs /bin/true
              install hfsplus /bin/true
              install udf /bin/true
            dest: /etc/modprobe.d/CIS.conf
            mode: '0644'

        - name: Configurer /tmp avec options sécurisées
          mount:
            path: /tmp
            src: tmpfs
            fstype: tmpfs
            opts: nodev,nosuid,noexec
            state: mounted

        - name: Vérifier permissions /etc
          file:
            path: "{{ item }}"
            mode: '0644'
            owner: root
            group: root
          loop:
            - /etc/passwd
            - /etc/group

        - name: Sécuriser /etc/shadow
          file:
            path: /etc/shadow
            mode: '0000'
            owner: root
            group: root

    - name: 🛡️ SECTION 2 - Configuration SSH
      block:
        - name: Créer backup SSH config
          copy:
            src: /etc/ssh/sshd_config
            dest: /etc/ssh/sshd_config.backup
            remote_src: yes

        - name: Hardening SSH - Désactiver root login
          lineinfile:
            path: /etc/ssh/sshd_config
            regexp: '^#?PermitRootLogin'
            line: 'PermitRootLogin no'
            state: present
          notify: restart sshd

        - name: Hardening SSH - Protocole 2 seulement
          lineinfile:
            path: /etc/ssh/sshd_config
            regexp: '^#?Protocol'
            line: 'Protocol 2'
            state: present
          notify: restart sshd

        - name: Hardening SSH - Désactiver X11 forwarding
          lineinfile:
            path: /etc/ssh/sshd_config
            regexp: '^#?X11Forwarding'
            line: 'X11Forwarding no'
            state: present
          notify: restart sshd

        - name: Hardening SSH - Max auth tries
          lineinfile:
            path: /etc/ssh/sshd_config
            regexp: '^#?MaxAuthTries'
            line: 'MaxAuthTries {{ ssh_max_auth_tries }}'
            state: present
          notify: restart sshd

        - name: Hardening SSH - Client alive interval
          lineinfile:
            path: /etc/ssh/sshd_config
            regexp: '^#?ClientAliveInterval'
            line: 'ClientAliveInterval {{ ssh_client_alive_interval }}'
            state: present
          notify: restart sshd

        - name: Hardening SSH - Désactiver empty passwords
          lineinfile:
            path: /etc/ssh/sshd_config
            regexp: '^#?PermitEmptyPasswords'
            line: 'PermitEmptyPasswords no'
            state: present
          notify: restart sshd

        - name: Hardening SSH - Allow users
          lineinfile:
            path: /etc/ssh/sshd_config
            regexp: '^#?AllowUsers'
            line: 'AllowUsers {{ allowed_ssh_users | join(" ") }}'
            state: present
          notify: restart sshd

    - name: 🔥 SECTION 3 - Configuration Firewall UFW
      block:
        - name: Installer UFW
          apt:
            name: ufw
            state: present
            update_cache: yes

        - name: Reset UFW
          ufw:
            state: reset

        - name: Configurer UFW - Default deny incoming
          ufw:
            default: deny
            direction: incoming

        - name: Configurer UFW - Default allow outgoing
          ufw:
            default: allow
            direction: outgoing

        - name: Configurer règles UFW
          ufw:
            rule: "{{ item.rule }}"
            port: "{{ item.port }}"
            proto: "{{ item.proto }}"
            comment: "{{ item.comment }}"
          loop: "{{ firewall_rules }}"

        - name: Activer UFW
          ufw:
            state: enabled
            logging: 'on'

    - name: 🔐 SECTION 4 - Politiques de mots de passe
      block:
        - name: Installer libpam-pwquality
          apt:
            name: libpam-pwquality
            state: present

        - name: Configurer complexité mot de passe
          lineinfile:
            path: /etc/security/pwquality.conf
            regexp: "^{{ item.key }}"
            line: "{{ item.key }} = {{ item.value }}"
            state: present
          loop:
            - { key: 'minlen', value: '{{ password_min_length }}' }
            - { key: 'dcredit', value: '-1' }
            - { key: 'ucredit', value: '-1' }
            - { key: 'lcredit', value: '-1' }
            - { key: 'ocredit', value: '-1' }

        - name: Configurer expiration mot de passe
          lineinfile:
            path: /etc/login.defs
            regexp: '^PASS_MAX_DAYS'
            line: 'PASS_MAX_DAYS {{ password_max_age }}'
            state: present

        - name: Verrouillage après échecs de connexion
          copy:
            content: |
              auth required pam_tally2.so onerr=fail audit silent deny={{ failed_login_attempts }} unlock_time=900
            dest: /etc/pam.d/common-auth-local
            mode: '0644'

    - name: 📊 SECTION 5 - Audit et Logging
      block:
        - name: Installer auditd
          apt:
            name: auditd
            state: present

        - name: Configurer règles audit
          copy:
            content: |
              -w /etc/passwd -p wa -k passwd_changes
              -w /etc/group -p wa -k group_changes
              -w /etc/shadow -p wa -k shadow_changes
              -w /etc/sudoers -p wa -k sudoers_changes
              -w /var/log/auth.log -p wa -k auth_log
              -w /var/log/faillog -p wa -k login_failures
              -a always,exit -F arch=b64 -S adjtimex,settimeofday -k time_change
              -a always,exit -F arch=b64 -S mount -F auid>=1000 -F auid!=4294967295 -k mounts
              -a always,exit -F arch=b64 -S unlink,unlinkat,rename,renameat -F auid>=1000 -F auid!=4294967295 -k delete
            dest: /etc/audit/rules.d/cis.rules
            mode: '0640'
          notify: restart auditd

        - name: Configurer rotation logs
          copy:
            content: |
              /var/log/auth.log
              /var/log/syslog
              {
                rotate {{ audit_log_retention }}
                daily
                missingok
                notifempty
                compress
                delaycompress
                sharedscripts
                postrotate
                  /usr/lib/rsyslog/rsyslog-rotate
                endscript
              }
            dest: /etc/logrotate.d/rsyslog-cis
            mode: '0644'

    - name: 🚫 SECTION 6 - Désactiver services inutiles
      systemd:
        name: "{{ item }}"
        state: stopped
        enabled: no
      loop: "{{ disable_services }}"
      ignore_errors: yes

    - name: 🛠️ SECTION 7 - Configuration noyau sécurisée
      sysctl:
        name: "{{ item.name }}"
        value: "{{ item.value }}"
        state: present
        reload: yes
      loop:
        - { name: 'net.ipv4.ip_forward', value: '0' }
        - { name: 'net.ipv4.conf.all.send_redirects', value: '0' }
        - { name: 'net.ipv4.conf.default.send_redirects', value: '0' }
        - { name: 'net.ipv4.conf.all.accept_source_route', value: '0' }
        - { name: 'net.ipv4.conf.default.accept_source_route', value: '0' }
        - { name: 'net.ipv4.conf.all.accept_redirects', value: '0' }
        - { name: 'net.ipv4.conf.default.accept_redirects', value: '0' }
        - { name: 'net.ipv4.conf.all.secure_redirects', value: '0' }
        - { name: 'net.ipv4.conf.default.secure_redirects', value: '0' }
        - { name: 'net.ipv4.conf.all.log_martians', value: '1' }
        - { name: 'net.ipv4.conf.default.log_martians', value: '1' }
        - { name: 'net.ipv4.icmp_echo_ignore_broadcasts', value: '1' }
        - { name: 'net.ipv4.icmp_ignore_bogus_error_responses', value: '1' }
        - { name: 'net.ipv4.conf.all.rp_filter', value: '1' }
        - { name: 'net.ipv4.conf.default.rp_filter', value: '1' }
        - { name: 'net.ipv4.tcp_syncookies', value: '1' }
        - { name: 'kernel.randomize_va_space', value: '2' }

    - name: 📋 SECTION 8 - Audit de conformité
      block:
        - name: Installer Lynis
          apt:
            name: lynis
            state: present

        - name: Exécuter audit Lynis
          shell: lynis audit system --quick --quiet
          register: lynis_audit
          changed_when: false

        - name: Sauvegarder rapport Lynis
          copy:
            content: "{{ lynis_audit.stdout }}"
            dest: "/var/log/lynis-report-{{ ansible_date_time.date }}.txt"
            mode: '0600'

    - name: Générer rapport de hardening
      copy:
        content: |
          Hardening CIS Benchmark terminé
          ================================

          Niveau CIS: {{ cis_level }}
          Environment: {{ environment }}
          Hostname: {{ ansible_hostname }}
          OS: {{ ansible_distribution }} {{ ansible_distribution_version }}

          Sections appliquées:
          1. ✅ Système de fichiers sécurisé
          2. ✅ SSH hardenée (port {{ ssh_port }})
          3. ✅ Firewall UFW configuré
          4. ✅ Politiques mots de passe renforcées
          5. ✅ Audit et logging activés
          6. ✅ Services inutiles désactivés
          7. ✅ Paramètres noyau sécurisés
          8. ✅ Audit Lynis exécuté

          SSH:
          - Root login: Disabled
          - Max auth tries: {{ ssh_max_auth_tries }}
          - Allowed users: {{ allowed_ssh_users | join(', ') }}

          Firewall:
          - Default: Deny incoming
          - Rules: {{ firewall_rules | length }} configured

          Mots de passe:
          - Longueur min: {{ password_min_length }}
          - Expiration: {{ password_max_age }} jours
          - Verrouillage: {{ failed_login_attempts }} tentatives

          Audit:
          - Logs: auditd actif
          - Rétention: {{ audit_log_retention }} jours
          - Rapport Lynis: /var/log/lynis-report-{{ ansible_date_time.date }}.txt

          Date: {{ ansible_date_time.iso8601 }}
        dest: "/var/log/hardening-report-{{ ansible_date_time.date }}.txt"
        mode: '0600'

    - name: Résumé du hardening
      debug:
        msg:
          - "✅ Hardening CIS terminé"
          - "🔒 Niveau: {{ cis_level }}"
          - "🛡️ SSH sécurisée"
          - "🔥 Firewall UFW activé"
          - "🔐 Mots de passe renforcés"
          - "📊 Audit activé"
          - "📄 Rapport: /var/log/hardening-report-{{ ansible_date_time.date }}.txt"

  handlers:
    - name: restart sshd
      service:
        name: sshd
        state: restarted

    - name: restart auditd
      service:
        name: auditd
        state: restarted
`;
}
