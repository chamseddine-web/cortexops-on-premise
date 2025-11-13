export interface EnterpriseBlueprint {
  projectName: string;
  environment: 'staging' | 'production';
  clouds: ('aws' | 'azure' | 'gcp')[];
  features: {
    terraform: boolean;
    kubernetes: boolean;
    vault: boolean;
    observability: boolean;
    cicd: boolean;
    dr: boolean;
  };
  structure: Record<string, any>;
}

export function generateEnterpriseBlueprintStructure(projectName: string, environment: 'staging' | 'production' = 'production'): string {
  return `# ${projectName} - Structure Blueprint Enterprise

${projectName}/
├── inventories/
│   ├── staging/
│   │   ├── hosts.ini
│   │   └── group_vars/
│   │       └── all.yml
│   └── production/
│       ├── hosts.ini
│       └── group_vars/
│           └── all.yml
│
├── playbooks/
│   ├── 00_init_tf.yml
│   ├── 10_network_tf_apply.yml
│   ├── 20_k8s_manage.yml
│   ├── 30_platform_basics.yml
│   ├── 40_app_delivery.yml
│   └── 50_dr_failover.yml
│
├── roles/
│   ├── terraform/
│   │   ├── tasks/
│   │   │   └── main.yml
│   │   ├── handlers/
│   │   │   └── main.yml
│   │   └── templates/
│   │       └── backend.tf.j2
│   │
│   ├── network/
│   │   ├── tasks/
│   │   │   ├── main.yml
│   │   │   ├── aws.yml
│   │   │   ├── azure.yml
│   │   │   └── gcp.yml
│   │   └── templates/
│   │       └── vpc_vars.tf.j2
│   │
│   ├── k8s/
│   │   ├── tasks/
│   │   │   ├── main.yml
│   │   │   ├── eks.yml
│   │   │   ├── aks.yml
│   │   │   ├── gke.yml
│   │   │   └── namespaces.yml
│   │   ├── handlers/
│   │   │   └── main.yml
│   │   └── templates/
│   │       └── values-nginx.yml.j2
│   │
│   ├── vault/
│   │   ├── tasks/
│   │   │   ├── main.yml
│   │   │   ├── install.yml
│   │   │   ├── init.yml
│   │   │   └── policies.yml
│   │   ├── handlers/
│   │   │   └── main.yml
│   │   └── templates/
│   │       └── vault.hcl.j2
│   │
│   ├── observability/
│   │   ├── tasks/
│   │   │   ├── main.yml
│   │   │   ├── prometheus.yml
│   │   │   └── grafana.yml
│   │   └── templates/
│   │       └── grafana-values.yml.j2
│   │
│   ├── app_deploy/
│   │   ├── tasks/
│   │   │   ├── main.yml
│   │   │   ├── helm_install.yml
│   │   │   ├── blue_green.yml
│   │   │   └── rollback.yml
│   │   └── templates/
│   │       └── values-app.yml.j2
│   │
│   ├── cicd/
│   │   ├── tasks/
│   │   │   ├── main.yml
│   │   │   ├── trigger_pipeline.yml
│   │   │   ├── check_status.yml
│   │   │   └── notify.yml
│   │   └── templates/
│   │       └── gitlab-ci.json.j2
│   │
│   └── dr_failover/
│       ├── tasks/
│       │   ├── main.yml
│       │   ├── switch_dns.yml
│       │   ├── promote_secondary.yml
│       │   └── verify.yml
│       └── templates/
│           └── dr_report.html.j2
│
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── backend.tf
│   └── modules/
│       ├── network_aws/
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   └── outputs.tf
│       ├── network_azure/
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   └── outputs.tf
│       ├── network_gcp/
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   └── outputs.tf
│       ├── eks/
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   └── outputs.tf
│       ├── aks/
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   └── outputs.tf
│       └── gke/
│           ├── main.tf
│           ├── variables.tf
│           └── outputs.tf
│
└── README.md
`;
}

export function generatePlaybook00InitTf(projectName: string, environment: 'staging' | 'production'): string {
  return `---
# Playbook 00: Initialisation Terraform
# Projet: ${projectName}
# Environnement: ${environment}

- name: Initialiser Terraform et workspaces multi-cloud
  hosts: localhost
  connection: local
  gather_facts: no

  vars:
    project_name: ${projectName}
    environment: ${environment}
    terraform_version: "1.6.0"
    tf_workspace: ${environment}
    vault_addr: https://vault.example.com:8200

  tasks:
    - name: Récupérer les credentials depuis Vault
      set_fact:
        aws_access_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/aws:access_key token={{ vault_token }} url={{ vault_addr }}') }}"
        aws_secret_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/aws:secret_key token={{ vault_token }} url={{ vault_addr }}') }}"
      no_log: true

    - name: Vérifier l'installation de Terraform
      command: terraform version
      register: tf_version
      changed_when: false
      ignore_errors: yes

    - name: Installer Terraform si nécessaire
      get_url:
        url: "https://releases.hashicorp.com/terraform/{{ terraform_version }}/terraform_{{ terraform_version }}_linux_amd64.zip"
        dest: /tmp/terraform.zip
      when: tf_version.rc != 0

    - name: Créer le répertoire Terraform
      file:
        path: ./terraform
        state: directory
        mode: '0755'

    - name: Initialiser Terraform avec backend S3
      community.general.terraform:
        project_path: ./terraform
        force_init: yes
        backend_config:
          bucket: "${projectName}-tfstate-${environment}"
          key: "{{ environment }}/terraform.tfstate"
          region: "eu-west-1"
          encrypt: "true"
          dynamodb_table: "terraform-locks-${environment}"
      environment:
        AWS_ACCESS_KEY_ID: "{{ aws_access_key }}"
        AWS_SECRET_ACCESS_KEY: "{{ aws_secret_key }}"
      register: tf_init_result

    - name: Sélectionner ou créer le workspace
      community.general.terraform:
        project_path: ./terraform
        workspace: "{{ tf_workspace }}"
        state: present
      register: workspace_result

    - name: Afficher le statut de l'initialisation
      debug:
        msg:
          - "==================================="
          - "TERRAFORM INITIALISÉ"
          - "==================================="
          - "Projet: ${projectName}"
          - "Environnement: ${environment}"
          - "Workspace: {{ tf_workspace }}"
          - "Backend: S3"
          - "==================================="
`;
}

export function generatePlaybook10NetworkTfApply(projectName: string, environment: 'staging' | 'production'): string {
  return `---
# Playbook 10: Application réseau Terraform
# Projet: ${projectName}

- name: Appliquer la configuration réseau multi-cloud avec Terraform
  hosts: localhost
  connection: local
  gather_facts: no

  vars:
    environment: ${environment}
    terraform_path: ./terraform
    vault_addr: https://vault.example.com:8200

  tasks:
    - name: Récupérer les credentials cloud depuis Vault
      set_fact:
        aws_access_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/aws:access_key token={{ vault_token }} url={{ vault_addr }}') }}"
        aws_secret_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/aws:secret_key token={{ vault_token }} url={{ vault_addr }}') }}"
        azure_client_id: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/azure:client_id token={{ vault_token }} url={{ vault_addr }}') }}"
        azure_client_secret: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/azure:client_secret token={{ vault_token }} url={{ vault_addr }}') }}"
        gcp_credentials: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/gcp:credentials token={{ vault_token }} url={{ vault_addr }}') }}"
      no_log: true

    - name: Planifier le déploiement réseau
      community.general.terraform:
        project_path: "{{ terraform_path }}"
        state: planned
        workspace: "{{ environment }}"
        plan_file: /tmp/tfplan-network-{{ environment }}
        var_files:
          - vars/{{ environment }}.tfvars
          - vars/global.tfvars
        variables:
          environment: "{{ environment }}"
          project_name: ${projectName}
          aws_region: "eu-west-1"
          azure_location: "westeurope"
          gcp_region: "europe-west1"
      environment:
        AWS_ACCESS_KEY_ID: "{{ aws_access_key }}"
        AWS_SECRET_ACCESS_KEY: "{{ aws_secret_key }}"
        ARM_CLIENT_ID: "{{ azure_client_id }}"
        ARM_CLIENT_SECRET: "{{ azure_client_secret }}"
        GOOGLE_CREDENTIALS: "{{ gcp_credentials }}"
      register: tf_plan

    - name: Afficher le résumé du plan
      debug:
        msg:
          - "Ressources à créer: {{ tf_plan.outputs.to_add | default(0) }}"
          - "Ressources à modifier: {{ tf_plan.outputs.to_change | default(0) }}"
          - "Ressources à détruire: {{ tf_plan.outputs.to_destroy | default(0) }}"

    - name: Appliquer le plan réseau
      community.general.terraform:
        project_path: "{{ terraform_path }}"
        state: present
        workspace: "{{ environment }}"
        plan_file: /tmp/tfplan-network-{{ environment }}
      environment:
        AWS_ACCESS_KEY_ID: "{{ aws_access_key }}"
        AWS_SECRET_ACCESS_KEY: "{{ aws_secret_key }}"
        ARM_CLIENT_ID: "{{ azure_client_id }}"
        ARM_CLIENT_SECRET: "{{ azure_client_secret }}"
        GOOGLE_CREDENTIALS: "{{ gcp_credentials }}"
      register: tf_output

    - name: Enregistrer les outputs réseau Terraform
      set_fact:
        vpc_aws_id: "{{ tf_output.outputs.vpc_aws_id.value }}"
        vpc_aws_cidr: "{{ tf_output.outputs.vpc_aws_cidr.value }}"
        vnet_azure_id: "{{ tf_output.outputs.vnet_azure_id.value }}"
        vnet_azure_cidr: "{{ tf_output.outputs.vnet_azure_cidr.value }}"
        vpc_gcp_id: "{{ tf_output.outputs.vpc_gcp_id.value }}"
        vpc_gcp_cidr: "{{ tf_output.outputs.vpc_gcp_cidr.value }}"

    - name: Sauvegarder les outputs dans un fichier
      copy:
        content: |
          # Outputs Terraform Réseau - ${environment}
          # Généré: {{ ansible_date_time.iso8601 }}

          vpc_aws_id: {{ vpc_aws_id }}
          vpc_aws_cidr: {{ vpc_aws_cidr }}
          vnet_azure_id: {{ vnet_azure_id }}
          vnet_azure_cidr: {{ vnet_azure_cidr }}
          vpc_gcp_id: {{ vpc_gcp_id }}
          vpc_gcp_cidr: {{ vpc_gcp_cidr }}
        dest: "./outputs/network-{{ environment }}.yml"
        mode: '0644'

    - name: Afficher les réseaux créés
      debug:
        msg:
          - "==================================="
          - "RÉSEAUX MULTI-CLOUD CRÉÉS"
          - "==================================="
          - "AWS VPC: {{ vpc_aws_id }} ({{ vpc_aws_cidr }})"
          - "Azure VNet: {{ vnet_azure_id }} ({{ vnet_azure_cidr }})"
          - "GCP VPC: {{ vpc_gcp_id }} ({{ vpc_gcp_cidr }})"
          - "==================================="
`;
}

export function generatePlaybook20K8sManage(projectName: string, environment: 'staging' | 'production'): string {
  return `---
# Playbook 20: Gestion des clusters Kubernetes
# Projet: ${projectName}

- name: Déploiement et configuration des clusters Kubernetes multi-cloud
  hosts: localhost
  connection: local
  gather_facts: no

  vars:
    environment: ${environment}
    project_name: ${projectName}
    k8s_version: "1.29"

  pre_tasks:
    - name: Charger les outputs réseau
      include_vars:
        file: "./outputs/network-{{ environment }}.yml"

  tasks:
    - name: Déployer cluster EKS sur AWS
      include_role:
        name: k8s
        tasks_from: eks.yml
      vars:
        cluster_name: "${projectName}-eks-${environment}"
        vpc_id: "{{ vpc_aws_id }}"
        cloud_priority: aws

    - name: Déployer cluster AKS sur Azure
      include_role:
        name: k8s
        tasks_from: aks.yml
      vars:
        cluster_name: "${projectName}-aks-${environment}"
        vnet_id: "{{ vnet_azure_id }}"
        cloud_priority: azure

    - name: Déployer cluster GKE sur GCP
      include_role:
        name: k8s
        tasks_from: gke.yml
      vars:
        cluster_name: "${projectName}-gke-${environment}"
        vpc_id: "{{ vpc_gcp_id }}"
        cloud_priority: gcp

    - name: Créer les namespaces communs sur tous les clusters
      include_role:
        name: k8s
        tasks_from: namespaces.yml
      vars:
        namespaces:
          - ${projectName}-app
          - monitoring
          - ingress-nginx
          - cert-manager

  post_tasks:
    - name: Vérifier la santé des clusters
      kubernetes.core.k8s_info:
        kind: Node
        kubeconfig: "{{ item }}"
      loop:
        - ~/.kube/config-eks
        - ~/.kube/config-aks
        - ~/.kube/config-gke
      register: cluster_health

    - name: Afficher le statut des clusters
      debug:
        msg:
          - "==================================="
          - "CLUSTERS KUBERNETES DÉPLOYÉS"
          - "==================================="
          - "EKS (AWS): {{ cluster_health.results[0].resources | length }} nœuds"
          - "AKS (Azure): {{ cluster_health.results[1].resources | length }} nœuds"
          - "GKE (GCP): {{ cluster_health.results[2].resources | length }} nœuds"
          - "==================================="
`;
}

export function generatePlaybook30PlatformBasics(projectName: string, environment: 'staging' | 'production'): string {
  return `---
# Playbook 30: Déploiement de la plateforme de base
# Vault + Observabilité (Prometheus/Grafana)

- name: Déployer Vault et stack d'observabilité
  hosts: localhost
  connection: local
  gather_facts: yes

  vars:
    environment: ${environment}
    project_name: ${projectName}
    vault_version: "1.15.0"

  tasks:
    - name: Installer et configurer HashiCorp Vault
      include_role:
        name: vault
        tasks_from: install.yml

    - name: Initialiser Vault
      include_role:
        name: vault
        tasks_from: init.yml
      when: vault_init_required | default(true)

    - name: Configurer les policies Vault
      include_role:
        name: vault
        tasks_from: policies.yml

    - name: Déployer Prometheus sur tous les clusters
      include_role:
        name: observability
        tasks_from: prometheus.yml
      vars:
        clusters:
          - { name: eks, kubeconfig: ~/.kube/config-eks }
          - { name: aks, kubeconfig: ~/.kube/config-aks }
          - { name: gke, kubeconfig: ~/.kube/config-gke }

    - name: Déployer Grafana centralisé
      include_role:
        name: observability
        tasks_from: grafana.yml
      vars:
        grafana_domain: "grafana.${projectName}.${environment}.cloud"
        data_sources:
          - prometheus-eks
          - prometheus-aks
          - prometheus-gke

  post_tasks:
    - name: Afficher les informations d'accès
      debug:
        msg:
          - "==================================="
          - "PLATEFORME DÉPLOYÉE"
          - "==================================="
          - "Vault UI: https://vault.${projectName}.${environment}.cloud"
          - "Grafana: https://grafana.${projectName}.${environment}.cloud"
          - "Prometheus (EKS): http://prometheus-eks.monitoring:9090"
          - "Prometheus (AKS): http://prometheus-aks.monitoring:9090"
          - "Prometheus (GKE): http://prometheus-gke.monitoring:9090"
          - "==================================="
`;
}

export function generatePlaybook40AppDelivery(projectName: string, appName: string, environment: 'staging' | 'production'): string {
  return `---
# Playbook 40: Livraison applicative
# CI/CD + Blue-Green Deployment

- name: Déploiement applicatif multi-cloud avec CI/CD
  hosts: localhost
  connection: local
  gather_facts: no

  vars:
    environment: ${environment}
    project_name: ${projectName}
    app_name: ${appName}
    k8s_namespace: ${projectName}-app

  tasks:
    - name: Déclencher le pipeline GitLab CI
      include_role:
        name: cicd
        tasks_from: trigger_pipeline.yml
      vars:
        gitlab_project_id: "12345"
        git_branch: ${environment === 'production' ? 'main' : 'develop'}

    - name: Vérifier le statut du pipeline
      include_role:
        name: cicd
        tasks_from: check_status.yml
      vars:
        pipeline_id: "{{ ci_pipeline_id }}"
        max_wait: 1800

    - name: Déployer l'application via Helm
      include_role:
        name: app_deploy
        tasks_from: helm_install.yml
      vars:
        chart_path: ./charts/{{ app_name }}
        clusters:
          - { name: eks, kubeconfig: ~/.kube/config-eks, priority: primary }
          - { name: aks, kubeconfig: ~/.kube/config-aks, priority: secondary }
          - { name: gke, kubeconfig: ~/.kube/config-gke, priority: tertiary }

    - name: Effectuer déploiement Blue-Green
      include_role:
        name: app_deploy
        tasks_from: blue_green.yml
      vars:
        new_version: "{{ ci_build_tag }}"
        health_check_url: "/health"
        canary_weight: ${environment === 'production' ? 10 : 50}

  rescue:
    - name: Rollback en cas d'échec
      include_role:
        name: app_deploy
        tasks_from: rollback.yml

    - name: Notifier l'échec
      include_role:
        name: cicd
        tasks_from: notify.yml
      vars:
        status: failed
        message: "Déploiement de {{ app_name }} échoué sur {{ environment }}"

  post_tasks:
    - name: Notifier le succès
      include_role:
        name: cicd
        tasks_from: notify.yml
      vars:
        status: success
        message: "{{ app_name }} déployé avec succès sur {{ environment }}"

    - name: Afficher les endpoints
      debug:
        msg:
          - "==================================="
          - "APPLICATION DÉPLOYÉE"
          - "==================================="
          - "EKS: https://{{ app_name }}.eks.${projectName}.${environment}.cloud"
          - "AKS: https://{{ app_name }}.aks.${projectName}.${environment}.cloud"
          - "GKE: https://{{ app_name }}.gke.${projectName}.${environment}.cloud"
          - "==================================="
`;
}

export function generatePlaybook50DRFailover(projectName: string, environment: 'staging' | 'production'): string {
  return `---
# Playbook 50: Disaster Recovery & Failover
# Bascule inter-cloud automatisée

- name: Gestion du Disaster Recovery et failover multi-cloud
  hosts: localhost
  connection: local
  gather_facts: yes

  vars:
    environment: ${environment}
    project_name: ${projectName}
    primary_cloud: aws
    secondary_cloud: azure
    tertiary_cloud: gcp

  tasks:
    - name: Vérifier l'état du cluster primaire
      kubernetes.core.k8s_info:
        kind: Node
        kubeconfig: ~/.kube/config-{{ primary_cloud }}
      register: primary_health
      ignore_errors: yes

    - name: Déclencher le failover si nécessaire
      block:
        - name: Basculer le DNS vers le secondaire
          include_role:
            name: dr_failover
            tasks_from: switch_dns.yml
          vars:
            from_cloud: "{{ primary_cloud }}"
            to_cloud: "{{ secondary_cloud }}"

        - name: Promouvoir le cluster secondaire
          include_role:
            name: dr_failover
            tasks_from: promote_secondary.yml
          vars:
            new_primary: "{{ secondary_cloud }}"

        - name: Vérifier le failover
          include_role:
            name: dr_failover
            tasks_from: verify.yml
          vars:
            expected_cloud: "{{ secondary_cloud }}"

      when: primary_health.failed or (primary_health.resources | length == 0)

    - name: Générer rapport DR
      template:
        src: dr_report.html.j2
        dest: "/var/log/ansible/dr-report-{{ ansible_date_time.date }}.html"
      vars:
        failover_triggered: "{{ primary_health.failed | default(false) }}"
        current_primary: "{{ primary_cloud if not primary_health.failed else secondary_cloud }}"

  post_tasks:
    - name: Afficher le statut DR
      debug:
        msg:
          - "==================================="
          - "DISASTER RECOVERY STATUS"
          - "==================================="
          - "Cluster primaire: {{ primary_cloud }}"
          - "État primaire: {{ 'OPERATIONAL' if not primary_health.failed else 'FAILED' }}"
          - "Failover déclenché: {{ 'OUI' if primary_health.failed else 'NON' }}"
          - "Cluster actif: {{ primary_cloud if not primary_health.failed else secondary_cloud }}"
          - "==================================="
`;
}

export function generateEnterpriseBlueprint(
  projectName: string,
  appName: string,
  environment: 'staging' | 'production' = 'production'
): Record<string, string> {
  return {
    'README.md': generateEnterpriseBlueprintStructure(projectName, environment),
    'playbooks/00_init_tf.yml': generatePlaybook00InitTf(projectName, environment),
    'playbooks/10_network_tf_apply.yml': generatePlaybook10NetworkTfApply(projectName, environment),
    'playbooks/20_k8s_manage.yml': generatePlaybook20K8sManage(projectName, environment),
    'playbooks/30_platform_basics.yml': generatePlaybook30PlatformBasics(projectName, environment),
    'playbooks/40_app_delivery.yml': generatePlaybook40AppDelivery(projectName, appName, environment),
    'playbooks/50_dr_failover.yml': generatePlaybook50DRFailover(projectName, environment),
  };
}
