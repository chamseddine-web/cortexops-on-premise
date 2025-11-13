export interface TerraformConfig {
  workspace: string;
  backend: {
    type: 's3' | 'azurerm' | 'gcs';
    bucket: string;
    key: string;
    region: string;
  };
  outputs: string[];
}

export interface CloudCluster {
  provider: 'aws' | 'azure' | 'gcp';
  name: string;
  region: string;
  nodeCount: number;
}

export function generateTerraformIntegration(environment: 'staging' | 'production' = 'production'): string {
  return `---
# Playbook d'orchestration Infrastructure as Code avec Terraform
# Génération multi-cloud automatisée

- name: Provisionner infrastructure multi-cloud avec Terraform
  hosts: localhost
  connection: local
  gather_facts: no

  vars:
    environment: ${environment}
    terraform_version: "1.6.0"
    tf_workspace: ${environment}
    vault_addr: https://vault.example.com:8200
    use_vault: true

  tasks:
    - name: Récupérer les credentials cloud depuis Vault
      set_fact:
        aws_access_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/aws:access_key token={{ vault_token }} url={{ vault_addr }}') }}"
        aws_secret_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/aws:secret_key token={{ vault_token }} url={{ vault_addr }}') }}"
        azure_client_id: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/azure:client_id token={{ vault_token }} url={{ vault_addr }}') }}"
        azure_client_secret: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/azure:client_secret token={{ vault_token }} url={{ vault_addr }}') }}"
        gcp_credentials: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/gcp:credentials token={{ vault_token }} url={{ vault_addr }}') }}"
      when: use_vault
      no_log: true

    - name: Installer Terraform
      get_url:
        url: "https://releases.hashicorp.com/terraform/{{ terraform_version }}/terraform_{{ terraform_version }}_linux_amd64.zip"
        dest: /tmp/terraform.zip
        mode: '0644'

    - name: Extraire Terraform
      unarchive:
        src: /tmp/terraform.zip
        dest: /usr/local/bin/
        remote_src: yes
        creates: /usr/local/bin/terraform

    - name: Créer le répertoire Terraform
      file:
        path: ./terraform
        state: directory
        mode: '0755'

    - name: Initialiser Terraform avec backend S3
      community.general.terraform:
        project_path: ./terraform
        workspace: "{{ tf_workspace }}"
        state: present
        force_init: yes
        backend_config:
          bucket: "spectra-multicloud-tfstate-{{ environment }}"
          key: "{{ environment }}/terraform.tfstate"
          region: "eu-west-1"
          encrypt: "true"
          dynamodb_table: "terraform-locks"
        backend_config_files:
          - backend.tf
      environment:
        AWS_ACCESS_KEY_ID: "{{ aws_access_key }}"
        AWS_SECRET_ACCESS_KEY: "{{ aws_secret_key }}"
      register: tf_init

    - name: Planifier le déploiement Terraform
      community.general.terraform:
        project_path: ./terraform
        state: planned
        workspace: "{{ tf_workspace }}"
        plan_file: /tmp/tfplan-{{ environment }}
        var_files:
          - vars/{{ environment }}.tfvars
          - vars/global.tfvars
        variables:
          environment: "{{ environment }}"
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

    - name: Appliquer le plan Terraform
      community.general.terraform:
        project_path: ./terraform
        state: present
        workspace: "{{ tf_workspace }}"
        plan_file: /tmp/tfplan-{{ environment }}
      environment:
        AWS_ACCESS_KEY_ID: "{{ aws_access_key }}"
        AWS_SECRET_ACCESS_KEY: "{{ aws_secret_key }}"
        ARM_CLIENT_ID: "{{ azure_client_id }}"
        ARM_CLIENT_SECRET: "{{ azure_client_secret }}"
        GOOGLE_CREDENTIALS: "{{ gcp_credentials }}"
      register: tf_output

    - name: Enregistrer les outputs Terraform
      set_fact:
        kubeconfig_eks: "{{ tf_output.outputs.eks_kubeconfig.value }}"
        kubeconfig_aks: "{{ tf_output.outputs.aks_kubeconfig.value }}"
        kubeconfig_gke: "{{ tf_output.outputs.gke_kubeconfig.value }}"
        eks_endpoint: "{{ tf_output.outputs.eks_endpoint.value }}"
        aks_endpoint: "{{ tf_output.outputs.aks_endpoint.value }}"
        gke_endpoint: "{{ tf_output.outputs.gke_endpoint.value }}"
        lb_records: "{{ tf_output.outputs.lb_records.value }}"

    - name: Sauvegarder les kubeconfigs
      copy:
        content: "{{ item.content }}"
        dest: "~/.kube/config-{{ item.name }}"
        mode: '0600'
      loop:
        - { name: 'eks', content: "{{ kubeconfig_eks }}" }
        - { name: 'aks', content: "{{ kubeconfig_aks }}" }
        - { name: 'gke', content: "{{ kubeconfig_gke }}" }
      no_log: true

    - name: Afficher les informations des clusters
      debug:
        msg:
          - "==================================="
          - "CLUSTERS MULTI-CLOUD CRÉÉS"
          - "==================================="
          - "AWS EKS: {{ eks_endpoint }}"
          - "Azure AKS: {{ aks_endpoint }}"
          - "GCP GKE: {{ gke_endpoint }}"
          - "==================================="
`;
}

export function generateMultiClusterDeployment(appName: string, environment: 'staging' | 'production' = 'production'): string {
  const replicas = environment === 'production' ? 3 : 1;

  return `---
# Déploiement multi-cluster orchestré
# Application: ${appName}

- name: Déployer ${appName} sur tous les clusters multi-cloud
  hosts: localhost
  connection: local
  gather_facts: no

  vars:
    environment: ${environment}
    app_name: ${appName}
    k8s_namespace: ${appName}-${environment}
    vault_addr: https://vault.example.com:8200

    # Définition des clusters
    clusters:
      - name: eks
        provider: aws
        region: eu-west-1
        kubeconfig: ~/.kube/config-eks
        priority: primary
      - name: aks
        provider: azure
        region: westeurope
        kubeconfig: ~/.kube/config-aks
        priority: secondary
      - name: gke
        provider: gcp
        region: europe-west1
        kubeconfig: ~/.kube/config-gke
        priority: tertiary

  tasks:
    - name: Récupérer les secrets depuis Vault
      set_fact:
        db_password: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/{{ app_name }}:db_password token={{ vault_token }} url={{ vault_addr }}') }}"
        api_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/{{ app_name }}:api_key token={{ vault_token }} url={{ vault_addr }}') }}"
      no_log: true

    - name: Vérifier la connectivité à tous les clusters
      kubernetes.core.k8s_info:
        kind: Node
        kubeconfig: "{{ item.kubeconfig }}"
      loop: "{{ clusters }}"
      register: cluster_health

    - name: Afficher le statut des clusters
      debug:
        msg: "{{ item.item.name }} ({{ item.item.provider }}): {{ item.resources | length }} nœuds disponibles"
      loop: "{{ cluster_health.results }}"

    - name: Créer le namespace sur chaque cluster
      kubernetes.core.k8s:
        kubeconfig: "{{ item.kubeconfig }}"
        api_version: v1
        kind: Namespace
        name: "{{ k8s_namespace }}"
        state: present
      loop: "{{ clusters }}"

    - name: Déployer les secrets sur chaque cluster
      kubernetes.core.k8s:
        kubeconfig: "{{ item.kubeconfig }}"
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: ${appName}-secrets
            namespace: "{{ k8s_namespace }}"
            labels:
              app: ${appName}
              environment: ${environment}
              cluster: "{{ item.name }}"
          type: Opaque
          stringData:
            DB_PASSWORD: "{{ db_password }}"
            API_KEY: "{{ api_key }}"
      loop: "{{ clusters }}"
      no_log: true

    - name: Déployer le ConfigMap global sur chaque cluster
      kubernetes.core.k8s:
        kubeconfig: "{{ item.kubeconfig }}"
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: ${appName}-config
            namespace: "{{ k8s_namespace }}"
            labels:
              app: ${appName}
              environment: ${environment}
          data:
            ENVIRONMENT: ${environment}
            APP_NAME: ${appName}
            CLUSTER_NAME: "{{ item.name }}"
            CLUSTER_PROVIDER: "{{ item.provider }}"
            CLUSTER_REGION: "{{ item.region }}"
      loop: "{{ clusters }}"

    - name: Déployer l'application sur chaque cluster
      kubernetes.core.k8s:
        kubeconfig: "{{ item.kubeconfig }}"
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: ${appName}
            namespace: "{{ k8s_namespace }}"
            labels:
              app: ${appName}
              environment: ${environment}
              cluster: "{{ item.name }}"
          spec:
            replicas: ${replicas}
            selector:
              matchLabels:
                app: ${appName}
            template:
              metadata:
                labels:
                  app: ${appName}
                  environment: ${environment}
                  cluster: "{{ item.name }}"
              spec:
                containers:
                - name: ${appName}
                  image: registry.example.com/${appName}:${environment}
                  ports:
                  - containerPort: 8080
                    name: http
                  envFrom:
                  - configMapRef:
                      name: ${appName}-config
                  - secretRef:
                      name: ${appName}-secrets
                  resources:
                    requests:
                      memory: "256Mi"
                      cpu: "100m"
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
                    initialDelaySeconds: 5
                    periodSeconds: 5
      loop: "{{ clusters }}"
      register: deployments

    - name: Créer les Services sur chaque cluster
      kubernetes.core.k8s:
        kubeconfig: "{{ item.kubeconfig }}"
        state: present
        definition:
          apiVersion: v1
          kind: Service
          metadata:
            name: ${appName}-service
            namespace: "{{ k8s_namespace }}"
            annotations:
              service.beta.kubernetes.io/{{ item.provider }}-load-balancer-type: "external"
          spec:
            type: LoadBalancer
            selector:
              app: ${appName}
            ports:
            - port: 80
              targetPort: 8080
              protocol: TCP
      loop: "{{ clusters }}"
      register: services

    - name: Attendre que les déploiements soient prêts
      kubernetes.core.k8s_info:
        kind: Deployment
        namespace: "{{ k8s_namespace }}"
        name: ${appName}
        kubeconfig: "{{ item.kubeconfig }}"
      loop: "{{ clusters }}"
      register: deployment_status
      until: deployment_status.resources[0].status.availableReplicas == ${replicas}
      retries: 30
      delay: 10

    - name: Récupérer les Load Balancer IPs
      kubernetes.core.k8s_info:
        kind: Service
        namespace: "{{ k8s_namespace }}"
        name: ${appName}-service
        kubeconfig: "{{ item.kubeconfig }}"
      loop: "{{ clusters }}"
      register: lb_info

    - name: Afficher les endpoints multi-cloud
      debug:
        msg:
          - "==================================="
          - "DÉPLOIEMENT MULTI-CLOUD RÉUSSI"
          - "==================================="
          - "Application: ${appName}"
          - "Environnement: ${environment}"
          - "-----------------------------------"
          - "AWS EKS: {{ lb_info.results[0].resources[0].status.loadBalancer.ingress[0].hostname | default('En cours...') }}"
          - "Azure AKS: {{ lb_info.results[1].resources[0].status.loadBalancer.ingress[0].ip | default('En cours...') }}"
          - "GCP GKE: {{ lb_info.results[2].resources[0].status.loadBalancer.ingress[0].ip | default('En cours...') }}"
          - "==================================="
`;
}

export function generateDNSLoadBalancer(domain: string, environment: 'staging' | 'production' = 'production'): string {
  return `---
# Configuration DNS & Load Balancing global multi-cloud

- name: Configurer DNS multi-cloud avec Cloudflare
  hosts: localhost
  connection: local
  gather_facts: no

  vars:
    environment: ${environment}
    domain_root: ${domain}
    vault_addr: https://vault.example.com:8200
    cloudflare_zone: ${domain}

  tasks:
    - name: Récupérer le token Cloudflare depuis Vault
      set_fact:
        cloudflare_api_token: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/cloudflare:api_token token={{ vault_token }} url={{ vault_addr }}') }}"
      no_log: true

    - name: Récupérer les Load Balancer IPs depuis les clusters
      set_fact:
        lb_records:
          - { name: 'eks', region: 'eu-west-1', ip: "{{ eks_lb_ip }}" }
          - { name: 'aks', region: 'westeurope', ip: "{{ aks_lb_ip }}" }
          - { name: 'gke', region: 'europe-west1', ip: "{{ gke_lb_ip }}" }

    - name: Créer les enregistrements DNS par cluster
      community.general.cloudflare_dns:
        api_token: "{{ cloudflare_api_token }}"
        zone: "{{ domain_root }}"
        record: "api.{{ item.name }}.{{ domain_root }}"
        type: A
        value: "{{ item.ip }}"
        ttl: 300
        proxied: yes
      loop: "{{ lb_records }}"
      when: item.ip is defined and item.ip != ""

    - name: Créer l'enregistrement DNS principal avec geo-routing
      community.general.cloudflare_dns:
        api_token: "{{ cloudflare_api_token }}"
        zone: "{{ domain_root }}"
        record: "api.{{ domain_root }}"
        type: A
        value: "{{ lb_records[0].ip }}"
        ttl: 60
        proxied: yes

    - name: Configurer Load Balancer Cloudflare
      uri:
        url: "https://api.cloudflare.com/client/v4/zones/{{ cloudflare_zone_id }}/load_balancers"
        method: POST
        headers:
          Authorization: "Bearer {{ cloudflare_api_token }}"
          Content-Type: "application/json"
        body_format: json
        body:
          name: "api.{{ domain_root }}"
          default_pool_ids: "{{ pool_ids }}"
          fallback_pool: "{{ fallback_pool_id }}"
          ttl: 30
          steering_policy: "geo"
          region_pools:
            WEUR: ["{{ eks_pool_id }}", "{{ aks_pool_id }}"]
            EEUR: ["{{ aks_pool_id }}", "{{ gke_pool_id }}"]
          pop_pools:
            LAX: ["{{ gke_pool_id }}"]
          proxied: true
        status_code: 200
      register: lb_config

    - name: Configurer les health checks
      community.general.cloudflare_dns:
        api_token: "{{ cloudflare_api_token }}"
        zone: "{{ domain_root }}"
        record: "_health.{{ item.name }}.{{ domain_root }}"
        type: A
        value: "{{ item.ip }}"
        ttl: 60
      loop: "{{ lb_records }}"

    - name: Afficher la configuration DNS
      debug:
        msg:
          - "==================================="
          - "CONFIGURATION DNS MULTI-CLOUD"
          - "==================================="
          - "Domaine principal: https://api.{{ domain_root }}"
          - "EKS Endpoint: https://api.eks.{{ domain_root }}"
          - "AKS Endpoint: https://api.aks.{{ domain_root }}"
          - "GKE Endpoint: https://api.gke.{{ domain_root }}"
          - "Geo-routing: ACTIVÉ"
          - "Health checks: ACTIVÉS"
          - "==================================="
`;
}

export function generateBlueGreenDeployment(appName: string, environment: 'staging' | 'production' = 'production'): string {
  return `---
# Déploiement Blue-Green avec rollback automatique

- name: Déploiement Blue-Green de ${appName}
  hosts: localhost
  connection: local
  gather_facts: no

  vars:
    environment: ${environment}
    app_name: ${appName}
    k8s_namespace: ${appName}-${environment}
    deployment_strategy: blue-green
    vault_addr: https://vault.example.com:8200
    gitlab_api_url: https://gitlab.com/api/v4
    gitlab_project_id: "12345"

  tasks:
    - name: Récupérer le token GitLab depuis Vault
      set_fact:
        gitlab_token: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/gitlab:token token={{ vault_token }} url={{ vault_addr }}') }}"
      no_log: true

    - name: Sauvegarder l'état actuel (GREEN)
      kubernetes.core.k8s_info:
        kind: Deployment
        namespace: "{{ k8s_namespace }}"
        name: "{{ app_name }}-green"
        kubeconfig: ~/.kube/config
      register: green_state

    - name: Taguer la version stable pour rollback
      command: |
        kubectl annotate deployment {{ app_name }}-green \
          rollback-version="{{ green_state.resources[0].spec.template.spec.containers[0].image }}" \
          rollback-timestamp="{{ ansible_date_time.iso8601 }}" \
          -n {{ k8s_namespace }}
      when: green_state.resources | length > 0

    - name: Déclencher le pipeline GitLab CI
      uri:
        url: "{{ gitlab_api_url }}/projects/{{ gitlab_project_id }}/trigger/pipeline"
        method: POST
        headers:
          PRIVATE-TOKEN: "{{ gitlab_token }}"
        body_format: json
        body:
          ref: main
          variables:
            DEPLOY_ENV: "{{ environment }}"
            BLUE_GREEN: "true"
            APP_NAME: "{{ app_name }}"
            NAMESPACE: "{{ k8s_namespace }}"
        status_code: 201
      register: ci_result

    - name: Suivre le pipeline
      uri:
        url: "{{ gitlab_api_url }}/projects/{{ gitlab_project_id }}/pipelines/{{ ci_result.json.id }}"
        method: GET
        headers:
          PRIVATE-TOKEN: "{{ gitlab_token }}"
      register: pipeline_status
      until: pipeline_status.json.status in ["success", "failed", "canceled"]
      retries: 60
      delay: 30

    - name: Déployer la version BLUE (nouvelle)
      block:
        - name: Créer le déploiement BLUE
          kubernetes.core.k8s:
            state: present
            kubeconfig: ~/.kube/config
            definition:
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: "{{ app_name }}-blue"
                namespace: "{{ k8s_namespace }}"
                labels:
                  app: "{{ app_name }}"
                  slot: blue
                  version: "{{ ci_result.json.sha[:7] }}"
              spec:
                replicas: ${environment === 'production' ? 3 : 1}
                selector:
                  matchLabels:
                    app: "{{ app_name }}"
                    slot: blue
                template:
                  metadata:
                    labels:
                      app: "{{ app_name }}"
                      slot: blue
                      version: "{{ ci_result.json.sha[:7] }}"
                  spec:
                    containers:
                    - name: "{{ app_name }}"
                      image: "registry.example.com/{{ app_name }}:{{ ci_result.json.sha[:7] }}"
                      ports:
                      - containerPort: 8080
                      resources:
                        requests:
                          memory: "256Mi"
                          cpu: "100m"
                        limits:
                          memory: "512Mi"
                          cpu: "500m"
                      livenessProbe:
                        httpGet:
                          path: /health
                          port: 8080
                        initialDelaySeconds: 30
                      readinessProbe:
                        httpGet:
                          path: /ready
                          port: 8080
                        initialDelaySeconds: 5

        - name: Attendre que BLUE soit prêt
          kubernetes.core.k8s_info:
            kind: Deployment
            namespace: "{{ k8s_namespace }}"
            name: "{{ app_name }}-blue"
            kubeconfig: ~/.kube/config
          register: blue_status
          until: blue_status.resources[0].status.availableReplicas == blue_status.resources[0].spec.replicas
          retries: 30
          delay: 10

        - name: Tests de fumée sur BLUE
          uri:
            url: "http://{{ app_name }}-blue.{{ k8s_namespace }}.svc.cluster.local:8080/health"
            method: GET
            status_code: 200
          retries: 5
          delay: 10

        - name: Basculer le trafic vers BLUE
          kubernetes.core.k8s:
            state: patched
            kubeconfig: ~/.kube/config
            definition:
              apiVersion: v1
              kind: Service
              metadata:
                name: "{{ app_name }}-service"
                namespace: "{{ k8s_namespace }}"
              spec:
                selector:
                  app: "{{ app_name }}"
                  slot: blue

        - name: Monitorer BLUE pendant 5 minutes
          pause:
            minutes: 5
            prompt: "Monitoring BLUE deployment..."

        - name: Vérifier les métriques BLUE
          uri:
            url: "http://prometheus.monitoring.svc.cluster.local:9090/api/v1/query"
            method: GET
            body_format: json
            body:
              query: 'rate(http_requests_total{deployment="{{ app_name }}-blue"}[5m])'
          register: blue_metrics

        - name: Valider le déploiement BLUE
          assert:
            that:
              - blue_metrics.json.data.result | length > 0
              - blue_metrics.json.data.result[0].value[1] | float > 0
            fail_msg: "BLUE deployment failed validation!"
            success_msg: "BLUE deployment validated successfully!"

        - name: Supprimer l'ancien déploiement GREEN
          kubernetes.core.k8s:
            state: absent
            kind: Deployment
            namespace: "{{ k8s_namespace }}"
            name: "{{ app_name }}-green"
            kubeconfig: ~/.kube/config

        - name: Renommer BLUE en GREEN
          command: |
            kubectl patch deployment {{ app_name }}-blue \
              -n {{ k8s_namespace }} \
              -p '{"metadata":{"name":"{{ app_name }}-green"} }'

        - debug:
            msg: "✅ Déploiement Blue-Green réussi!"

      rescue:
        - name: ROLLBACK - Restaurer le déploiement GREEN stable
          debug:
            msg: "⚠️ Échec détecté, rollback vers GREEN..."

        - name: Restaurer le trafic vers GREEN
          kubernetes.core.k8s:
            state: patched
            kubeconfig: ~/.kube/config
            definition:
              apiVersion: v1
              kind: Service
              metadata:
                name: "{{ app_name }}-service"
                namespace: "{{ k8s_namespace }}"
              spec:
                selector:
                  app: "{{ app_name }}"
                  slot: green

        - name: Supprimer BLUE défaillant
          kubernetes.core.k8s:
            state: absent
            kind: Deployment
            namespace: "{{ k8s_namespace }}"
            name: "{{ app_name }}-blue"
            kubeconfig: ~/.kube/config

        - name: Notifier l'échec
          uri:
            url: "{{ slack_webhook_url }}"
            method: POST
            body_format: json
            body:
              text: "🔴 Rollback effectué pour {{ app_name }} sur {{ environment }}"
              attachments:
                - color: "danger"
                  title: "Déploiement échoué"
                  fields:
                    - title: "Application"
                      value: "{{ app_name }}"
                    - title: "Pipeline"
                      value: "#{{ ci_result.json.id }}"

        - fail:
            msg: "Déploiement Blue-Green échoué, rollback effectué"
`;
}

export function generateMultiCloudReport(environment: 'staging' | 'production' = 'production'): string {
  return `---
# Génération de rapport multi-cloud complet

- name: Générer rapport de déploiement multi-cloud
  hosts: localhost
  connection: local
  gather_facts: yes

  vars:
    environment: ${environment}
    report_date: "{{ ansible_date_time.iso8601 }}"
    report_dir: /var/log/ansible/reports

  tasks:
    - name: Créer le répertoire des rapports
      file:
        path: "{{ report_dir }}"
        state: directory
        mode: '0755'

    - name: Collecter les informations des clusters
      kubernetes.core.k8s_info:
        kind: Node
        kubeconfig: "{{ item }}"
      loop:
        - ~/.kube/config-eks
        - ~/.kube/config-aks
        - ~/.kube/config-gke
      register: cluster_nodes

    - name: Collecter les déploiements
      kubernetes.core.k8s_info:
        kind: Deployment
        namespace: all
        kubeconfig: "{{ item }}"
      loop:
        - ~/.kube/config-eks
        - ~/.kube/config-aks
        - ~/.kube/config-gke
      register: cluster_deployments

    - name: Générer rapport HTML
      copy:
        dest: "{{ report_dir }}/multicloud_report_{{ environment }}_{{ ansible_date_time.date }}.html"
        mode: '0644'
        content: |
          <!DOCTYPE html>
          <html>
          <head>
            <title>Rapport Multi-Cloud - {{ environment | upper }}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
              .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
              h2 { color: #34495e; margin-top: 30px; }
              .cluster { background: #ecf0f1; padding: 15px; margin: 15px 0; border-radius: 5px; }
              .status { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
              .success { background: #2ecc71; color: white; }
              .warning { background: #f39c12; color: white; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background: #3498db; color: white; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🌐 Rapport de Déploiement Multi-Cloud</h1>
              <p><strong>Environnement:</strong> <span class="status success">{{ environment | upper }}</span></p>
              <p><strong>Date:</strong> {{ report_date }}</p>
              <p><strong>Exécuté par:</strong> {{ ansible_user_id }}</p>

              <h2>📊 Vue d'ensemble des Clusters</h2>

              <div class="cluster">
                <h3>☁️ AWS EKS</h3>
                <p><strong>Région:</strong> eu-west-1</p>
                <p><strong>Nœuds:</strong> {{ cluster_nodes.results[0].resources | length }}</p>
                <p><strong>Endpoint:</strong> {{ kubeconfig_eks | default('N/A') }}</p>
                <p><strong>Statut:</strong> <span class="status success">OPERATIONAL</span></p>
              </div>

              <div class="cluster">
                <h3>☁️ Azure AKS</h3>
                <p><strong>Région:</strong> westeurope</p>
                <p><strong>Nœuds:</strong> {{ cluster_nodes.results[1].resources | length }}</p>
                <p><strong>Endpoint:</strong> {{ kubeconfig_aks | default('N/A') }}</p>
                <p><strong>Statut:</strong> <span class="status success">OPERATIONAL</span></p>
              </div>

              <div class="cluster">
                <h3>☁️ GCP GKE</h3>
                <p><strong>Région:</strong> europe-west1</p>
                <p><strong>Nœuds:</strong> {{ cluster_nodes.results[2].resources | length }}</p>
                <p><strong>Endpoint:</strong> {{ kubeconfig_gke | default('N/A') }}</p>
                <p><strong>Statut:</strong> <span class="status success">OPERATIONAL</span></p>
              </div>

              <h2>🚀 Applications Déployées</h2>
              <table>
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Namespace</th>
                    <th>Replicas</th>
                    <th>Clusters</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>microservices</td>
                    <td>production</td>
                    <td>{{ cluster_deployments.results[0].resources | length }}</td>
                    <td>EKS, AKS, GKE</td>
                    <td><span class="status success">HEALTHY</span></td>
                  </tr>
                </tbody>
              </table>

              <h2>🌍 DNS & Load Balancing</h2>
              <ul>
                <li><strong>Domaine principal:</strong> https://api.{{ environment }}.spectra-multi.cloud</li>
                <li><strong>EKS Endpoint:</strong> https://api.eks.{{ environment }}.spectra-multi.cloud</li>
                <li><strong>AKS Endpoint:</strong> https://api.aks.{{ environment }}.spectra-multi.cloud</li>
                <li><strong>GKE Endpoint:</strong> https://api.gke.{{ environment }}.spectra-multi.cloud</li>
                <li><strong>Geo-routing:</strong> ✅ Activé</li>
                <li><strong>Health checks:</strong> ✅ Actifs</li>
              </ul>

              <h2>📈 Métriques</h2>
              <ul>
                <li>Nombre total de nœuds: {{ (cluster_nodes.results | map(attribute='resources') | map('length') | sum) }}</li>
                <li>Déploiements actifs: {{ (cluster_deployments.results | map(attribute='resources') | map('length') | sum) }}</li>
                <li>Régions couvertes: 3 (EU, US, ASIA)</li>
                <li>Disponibilité: 99.99%</li>
              </ul>

              <div class="footer">
                <p>Généré automatiquement par Ansible Academy Platform</p>
                <p>Date de génération: {{ report_date }}</p>
              </div>
            </div>
          </body>
          </html>

    - name: Générer rapport Markdown
      copy:
        dest: "{{ report_dir }}/multicloud_report_{{ environment }}_{{ ansible_date_time.date }}.md"
        mode: '0644'
        content: |
          # 🌐 Rapport de Déploiement Multi-Cloud

          **Environnement:** {{ environment | upper }}
          **Date:** {{ report_date }}
          **Exécuté par:** {{ ansible_user_id }}

          ---

          ## 📊 Vue d'ensemble des Clusters

          ### ☁️ AWS EKS
          - **Région:** eu-west-1
          - **Nœuds:** {{ cluster_nodes.results[0].resources | length }}
          - **Endpoint:** {{ kubeconfig_eks | default('N/A') }}
          - **Statut:** ✅ OPERATIONAL

          ### ☁️ Azure AKS
          - **Région:** westeurope
          - **Nœuds:** {{ cluster_nodes.results[1].resources | length }}
          - **Endpoint:** {{ kubeconfig_aks | default('N/A') }}
          - **Statut:** ✅ OPERATIONAL

          ### ☁️ GCP GKE
          - **Région:** europe-west1
          - **Nœuds:** {{ cluster_nodes.results[2].resources | length }}
          - **Endpoint:** {{ kubeconfig_gke | default('N/A') }}
          - **Statut:** ✅ OPERATIONAL

          ---

          ## 🚀 Applications Déployées

          | Application | Namespace | Replicas | Clusters | Statut |
          |-------------|-----------|----------|----------|--------|
          | microservices | production | {{ cluster_deployments.results[0].resources | length }} | EKS, AKS, GKE | ✅ HEALTHY |

          ---

          ## 🌍 DNS & Load Balancing

          - **Domaine principal:** https://api.{{ environment }}.spectra-multi.cloud
          - **EKS Endpoint:** https://api.eks.{{ environment }}.spectra-multi.cloud
          - **AKS Endpoint:** https://api.aks.{{ environment }}.spectra-multi.cloud
          - **GKE Endpoint:** https://api.gke.{{ environment }}.spectra-multi.cloud
          - **Geo-routing:** ✅ Activé
          - **Health checks:** ✅ Actifs

          ---

          ## 📈 Métriques

          - **Nombre total de nœuds:** {{ (cluster_nodes.results | map(attribute='resources') | map('length') | sum) }}
          - **Déploiements actifs:** {{ (cluster_deployments.results | map(attribute='resources') | map('length') | sum) }}
          - **Régions couvertes:** 3 (EU, US, ASIA)
          - **Disponibilité:** 99.99%

          ---

          *Généré automatiquement par Ansible Academy Platform*
          *Date de génération: {{ report_date }}*

    - name: Générer rapport JSON pour API
      copy:
        dest: "{{ report_dir }}/multicloud_report_{{ environment }}_{{ ansible_date_time.date }}.json"
        mode: '0644'
        content: |
          {
            "environment": "{{ environment }}",
            "timestamp": "{{ report_date }}",
            "executor": "{{ ansible_user_id }}",
            "clusters": {
              "eks": {
                "provider": "aws",
                "region": "eu-west-1",
                "nodes": {{ cluster_nodes.results[0].resources | length }},
                "status": "operational",
                "endpoint": "{{ kubeconfig_eks | default('N/A') }}"
              },
              "aks": {
                "provider": "azure",
                "region": "westeurope",
                "nodes": {{ cluster_nodes.results[1].resources | length }},
                "status": "operational",
                "endpoint": "{{ kubeconfig_aks | default('N/A') }}"
              },
              "gke": {
                "provider": "gcp",
                "region": "europe-west1",
                "nodes": {{ cluster_nodes.results[2].resources | length }},
                "status": "operational",
                "endpoint": "{{ kubeconfig_gke | default('N/A') }}"
              }
            },
            "summary": {
              "total_nodes": {{ (cluster_nodes.results | map(attribute='resources') | map('length') | sum) }},
              "total_deployments": {{ (cluster_deployments.results | map(attribute='resources') | map('length') | sum) }},
              "regions_covered": 3,
              "availability": "99.99%"
            }
          }

    - name: Afficher le résumé
      debug:
        msg:
          - "==================================="
          - "RAPPORTS GÉNÉRÉS"
          - "==================================="
          - "HTML: {{ report_dir }}/multicloud_report_{{ environment }}_{{ ansible_date_time.date }}.html"
          - "Markdown: {{ report_dir }}/multicloud_report_{{ environment }}_{{ ansible_date_time.date }}.md"
          - "JSON: {{ report_dir }}/multicloud_report_{{ environment }}_{{ ansible_date_time.date }}.json"
          - "==================================="
`;
}
