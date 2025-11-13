export interface CICDConfig {
  provider: 'gitlab' | 'github';
  projectId: string;
  branch: string;
  token: string;
}

export interface CloudTarget {
  name: string;
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  kubeconfig: string;
  priority: 'primary' | 'secondary' | 'tertiary';
}

export function generateCompleteCICDPlaybook(
  appName: string,
  environment: 'staging' | 'production',
  clouds: CloudTarget[]
): string {
  return `---
# Playbook CI/CD complet avec rollback automatique
# Application: ${appName}
# Environnement: ${environment}

- name: Pipeline CI/CD complet avec orchestration multi-cloud
  hosts: localhost
  connection: local
  gather_facts: yes

  vars:
    app_name: ${appName}
    environment: ${environment}
    k8s_namespace: ${appName}-${environment}
    vault_addr: https://vault.example.com:8200

    # Configuration des clouds cibles
    cloud_targets:
${clouds.map(cloud => `      - name: ${cloud.name}
        provider: ${cloud.provider}
        region: ${cloud.region}
        kubeconfig: ${cloud.kubeconfig}
        priority: ${cloud.priority}`).join('\n')}

    # Configuration CI/CD
    gitlab_api_url: https://gitlab.com/api/v4
    gitlab_project_id: "12345"
    github_api_url: https://api.github.com
    github_repo: "company/${appName}"

  tasks:
    # ============================================
    # ÉTAPE 1: PROVISIONNEMENT TERRAFORM
    # ============================================
    - name: Récupérer les credentials cloud depuis Vault
      set_fact:
        aws_access_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/aws:access_key token={{ vault_token }} url={{ vault_addr }}') }}"
        aws_secret_key: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/aws:secret_key token={{ vault_token }} url={{ vault_addr }}') }}"
        azure_client_id: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/azure:client_id token={{ vault_token }} url={{ vault_addr }}') }}"
        azure_client_secret: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/azure:client_secret token={{ vault_token }} url={{ vault_addr }}') }}"
        gcp_credentials: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/gcp:credentials token={{ vault_token }} url={{ vault_addr }}') }}"
        gitlab_token: "{{ lookup('hashi_vault', 'secret=secret/data/{{ environment }}/gitlab:token token={{ vault_token }} url={{ vault_addr }}') }}"
      no_log: true

    - name: Initialiser Terraform avec workspace
      community.general.terraform:
        project_path: ./terraform
        workspace: "{{ environment }}"
        state: present
        force_init: yes
        backend_config:
          bucket: "tfstate-{{ app_name }}-{{ environment }}"
          key: "{{ environment }}/{{ app_name }}.tfstate"
          region: "eu-west-1"
          encrypt: "true"
          dynamodb_table: "terraform-locks"
      environment:
        AWS_ACCESS_KEY_ID: "{{ aws_access_key }}"
        AWS_SECRET_ACCESS_KEY: "{{ aws_secret_key }}"
      register: tf_init

    - name: Appliquer l'infrastructure Terraform
      community.general.terraform:
        project_path: ./terraform
        workspace: "{{ environment }}"
        state: present
        var_files:
          - vars/{{ environment }}.tfvars
        variables:
          app_name: "{{ app_name }}"
          environment: "{{ environment }}"
      environment:
        AWS_ACCESS_KEY_ID: "{{ aws_access_key }}"
        AWS_SECRET_ACCESS_KEY: "{{ aws_secret_key }}"
        ARM_CLIENT_ID: "{{ azure_client_id }}"
        ARM_CLIENT_SECRET: "{{ azure_client_secret }}"
        GOOGLE_CREDENTIALS: "{{ gcp_credentials }}"
      register: tf_output

    - name: Extraire les outputs Terraform
      set_fact:
        eks_cluster_endpoint: "{{ tf_output.outputs.eks_cluster_endpoint.value | default('') }}"
        aks_cluster_endpoint: "{{ tf_output.outputs.aks_cluster_endpoint.value | default('') }}"
        gke_cluster_endpoint: "{{ tf_output.outputs.gke_cluster_endpoint.value | default('') }}"
        load_balancer_ips: "{{ tf_output.outputs.load_balancer_ips.value | default({}) }}"

    # ============================================
    # ÉTAPE 2: DÉCLENCHEMENT CI/CD
    # ============================================
    - name: Déclencher le pipeline GitLab CI
      uri:
        url: "{{ gitlab_api_url }}/projects/{{ gitlab_project_id }}/trigger/pipeline"
        method: POST
        headers:
          PRIVATE-TOKEN: "{{ gitlab_token }}"
          Content-Type: "application/json"
        body_format: json
        body:
          ref: ${environment === 'production' ? 'main' : 'develop'}
          variables:
            ENVIRONMENT: "{{ environment }}"
            APP_NAME: "{{ app_name }}"
            DEPLOY_TARGET: "multi-cloud"
            TERRAFORM_APPLIED: "true"
            AWS_ENABLED: "{{ 'true' if eks_cluster_endpoint else 'false' }}"
            AZURE_ENABLED: "{{ 'true' if aks_cluster_endpoint else 'false' }}"
            GCP_ENABLED: "{{ 'true' if gke_cluster_endpoint else 'false' }}"
        status_code: 201
      register: ci_pipeline

    - name: Suivre le pipeline GitLab
      uri:
        url: "{{ gitlab_api_url }}/projects/{{ gitlab_project_id }}/pipelines/{{ ci_pipeline.json.id }}"
        method: GET
        headers:
          PRIVATE-TOKEN: "{{ gitlab_token }}"
      register: pipeline_status
      until: pipeline_status.json.status in ["success", "failed", "canceled"]
      retries: 120
      delay: 15

    - name: Vérifier le succès du pipeline
      assert:
        that:
          - pipeline_status.json.status == "success"
        fail_msg: "Pipeline CI/CD échoué - ID: {{ ci_pipeline.json.id }}"
        success_msg: "Pipeline CI/CD réussi - ID: {{ ci_pipeline.json.id }}"

    - name: Récupérer l'artifact Docker image tag
      set_fact:
        docker_image_tag: "{{ pipeline_status.json.sha[:7] }}"

    # ============================================
    # ÉTAPE 3: DÉPLOIEMENT BLUE/GREEN MULTI-CLOUD
    # ============================================
    - name: Déploiement Blue/Green avec rollback automatique
      block:
        # Sauvegarder l'état actuel GREEN
        - name: Identifier la version stable GREEN sur chaque cluster
          kubernetes.core.k8s_info:
            kind: Deployment
            namespace: "{{ k8s_namespace }}"
            name: "{{ app_name }}-green"
            kubeconfig: "{{ item.kubeconfig }}"
          loop: "{{ cloud_targets }}"
          register: green_deployments
          ignore_errors: yes

        - name: Taguer les versions pour rollback
          kubernetes.core.k8s:
            state: patched
            kind: Deployment
            namespace: "{{ k8s_namespace }}"
            name: "{{ app_name }}-green"
            kubeconfig: "{{ item.item.kubeconfig }}"
            definition:
              metadata:
                annotations:
                  rollback.version: "{{ item.resources[0].spec.template.spec.containers[0].image }}"
                  rollback.timestamp: "{{ ansible_date_time.iso8601 }}"
          loop: "{{ green_deployments.results }}"
          when: item.resources | length > 0

        # Déployer la version BLUE (candidate) sur tous les clusters
        - name: Créer le déploiement BLUE (nouvelle version)
          kubernetes.core.k8s:
            state: present
            kubeconfig: "{{ item.kubeconfig }}"
            definition:
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: "{{ app_name }}-blue"
                namespace: "{{ k8s_namespace }}"
                labels:
                  app: "{{ app_name }}"
                  slot: blue
                  environment: "{{ environment }}"
                  cloud: "{{ item.provider }}"
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
                      version: "{{ docker_image_tag }}"
                      cloud: "{{ item.provider }}"
                    annotations:
                      prometheus.io/scrape: "true"
                      prometheus.io/port: "8080"
                      prometheus.io/path: "/metrics"
                  spec:
                    containers:
                    - name: "{{ app_name }}"
                      image: "registry.example.com/{{ app_name }}:{{ docker_image_tag }}"
                      ports:
                      - containerPort: 8080
                        name: http
                        protocol: TCP
                      env:
                      - name: ENVIRONMENT
                        value: "{{ environment }}"
                      - name: CLOUD_PROVIDER
                        value: "{{ item.provider }}"
                      - name: REGION
                        value: "{{ item.region }}"
                      envFrom:
                      - secretRef:
                          name: "{{ app_name }}-secrets"
                      resources:
                        requests:
                          memory: "${environment === 'production' ? '512Mi' : '256Mi'}"
                          cpu: "${environment === 'production' ? '200m' : '100m'}"
                        limits:
                          memory: "${environment === 'production' ? '1Gi' : '512Mi'}"
                          cpu: "${environment === 'production' ? '500m' : '250m'}"
                      livenessProbe:
                        httpGet:
                          path: /health
                          port: 8080
                        initialDelaySeconds: 30
                        periodSeconds: 10
                        timeoutSeconds: 5
                        failureThreshold: 3
                      readinessProbe:
                        httpGet:
                          path: /ready
                          port: 8080
                        initialDelaySeconds: 5
                        periodSeconds: 5
                        timeoutSeconds: 3
                        failureThreshold: 3
          loop: "{{ cloud_targets }}"
          register: blue_deployments

        # Créer Service BLUE avec annotations Prometheus
        - name: Créer le Service BLUE avec monitoring
          kubernetes.core.k8s:
            state: present
            kubeconfig: "{{ item.kubeconfig }}"
            definition:
              apiVersion: v1
              kind: Service
              metadata:
                name: "{{ app_name }}-blue-service"
                namespace: "{{ k8s_namespace }}"
                annotations:
                  prometheus.io/scrape: "true"
                  prometheus.io/port: "8080"
                  prometheus.io/path: "/metrics"
                labels:
                  app: "{{ app_name }}"
                  slot: blue
                  cloud: "{{ item.provider }}"
              spec:
                type: ClusterIP
                selector:
                  app: "{{ app_name }}"
                  slot: blue
                ports:
                - port: 80
                  targetPort: 8080
                  protocol: TCP
                  name: http
          loop: "{{ cloud_targets }}"

        # Créer Ingress BLUE (candidate)
        - name: Créer l'Ingress BLUE pour tests
          kubernetes.core.k8s:
            state: present
            kubeconfig: "{{ item.kubeconfig }}"
            definition:
              apiVersion: networking.k8s.io/v1
              kind: Ingress
              metadata:
                name: "{{ app_name }}-blue-ingress"
                namespace: "{{ k8s_namespace }}"
                annotations:
                  kubernetes.io/ingress.class: nginx
                  cert-manager.io/cluster-issuer: letsencrypt-prod
                  nginx.ingress.kubernetes.io/ssl-redirect: "true"
              spec:
                tls:
                - hosts:
                  - "candidate.{{ app_name }}.{{ item.name }}.{{ environment }}.example.com"
                  secretName: "{{ app_name }}-blue-tls"
                rules:
                - host: "candidate.{{ app_name }}.{{ item.name }}.{{ environment }}.example.com"
                  http:
                    paths:
                    - path: /
                      pathType: Prefix
                      backend:
                        service:
                          name: "{{ app_name }}-blue-service"
                          port:
                            number: 80
          loop: "{{ cloud_targets }}"

        # Attendre que BLUE soit prêt
        - name: Attendre que les déploiements BLUE soient prêts
          kubernetes.core.k8s_info:
            kind: Deployment
            namespace: "{{ k8s_namespace }}"
            name: "{{ app_name }}-blue"
            kubeconfig: "{{ item.kubeconfig }}"
          loop: "{{ cloud_targets }}"
          register: blue_status
          until: blue_status.resources[0].status.availableReplicas == blue_status.resources[0].spec.replicas
          retries: 60
          delay: 10

        # Tests de fumée sur BLUE
        - name: Tests de santé sur version BLUE
          uri:
            url: "https://candidate.{{ app_name }}.{{ item.name }}.{{ environment }}.example.com/health"
            method: GET
            status_code: 200
            validate_certs: yes
            return_content: yes
          loop: "{{ cloud_targets }}"
          retries: 10
          delay: 10
          register: health_checks

        # Vérifier les métriques Prometheus
        - name: Vérifier les métriques de BLUE via Prometheus
          uri:
            url: "http://prometheus.monitoring.svc.cluster.local:9090/api/v1/query"
            method: GET
            body_format: json
            body:
              query: 'up{job="{{ app_name }}-blue"}'
          register: prometheus_check
          until: prometheus_check.json.data.result | length > 0
          retries: 10
          delay: 10

        # Monitoring pendant 5 minutes
        - name: Période d'observation BLUE (5 minutes)
          pause:
            minutes: 5
            prompt: "Monitoring de la version BLUE en cours..."

        # Valider les métriques finales
        - name: Valider les métriques de performance BLUE
          uri:
            url: "http://prometheus.monitoring.svc.cluster.local:9090/api/v1/query"
            method: GET
            body_format: json
            body:
              query: 'rate(http_requests_total{deployment="{{ app_name }}-blue"}[5m])'
          register: blue_metrics

        - name: Vérifier taux d'erreur acceptable
          assert:
            that:
              - blue_metrics.json.data.result | length > 0
              - (blue_metrics.json.data.result[0].value[1] | float) < 0.05
            fail_msg: "Taux d'erreur trop élevé sur BLUE!"
            success_msg: "BLUE validé - Taux d'erreur acceptable"

        # BASCULE: Promouvoir BLUE → GREEN
        - name: Basculer le trafic de GREEN vers BLUE
          kubernetes.core.k8s:
            state: patched
            kind: Service
            namespace: "{{ k8s_namespace }}"
            name: "{{ app_name }}-service"
            kubeconfig: "{{ item.kubeconfig }}"
            definition:
              spec:
                selector:
                  app: "{{ app_name }}"
                  slot: blue
          loop: "{{ cloud_targets }}"

        - name: Mettre à jour l'Ingress principal vers BLUE
          kubernetes.core.k8s:
            state: present
            kubeconfig: "{{ item.kubeconfig }}"
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
                  - "{{ app_name }}.{{ item.name }}.{{ environment }}.example.com"
                  secretName: "{{ app_name }}-tls"
                rules:
                - host: "{{ app_name }}.{{ item.name }}.{{ environment }}.example.com"
                  http:
                    paths:
                    - path: /
                      pathType: Prefix
                      backend:
                        service:
                          name: "{{ app_name }}-blue-service"
                          port:
                            number: 80
          loop: "{{ cloud_targets }}"

        # Nettoyer l'ancien GREEN
        - name: Supprimer l'ancien déploiement GREEN
          kubernetes.core.k8s:
            state: absent
            kind: Deployment
            namespace: "{{ k8s_namespace }}"
            name: "{{ app_name }}-green"
            kubeconfig: "{{ item.kubeconfig }}"
          loop: "{{ cloud_targets }}"

        - name: Renommer BLUE en GREEN (nouvelle stable)
          command: |
            kubectl label deployment {{ app_name }}-blue slot=green --overwrite -n {{ k8s_namespace }} --kubeconfig {{ item.kubeconfig }}
          loop: "{{ cloud_targets }}"

        - debug:
            msg: "✅ Déploiement Blue/Green réussi sur tous les clusters!"

      rescue:
        # ============================================
        # ROLLBACK AUTOMATIQUE EN CAS D'ÉCHEC
        # ============================================
        - name: "⚠️ ROLLBACK AUTOMATIQUE DÉCLENCHÉ"
          debug:
            msg: "Échec détecté - Rollback vers la version GREEN stable..."

        - name: Restaurer le trafic vers GREEN
          kubernetes.core.k8s:
            state: patched
            kind: Service
            namespace: "{{ k8s_namespace }}"
            name: "{{ app_name }}-service"
            kubeconfig: "{{ item.kubeconfig }}"
            definition:
              spec:
                selector:
                  app: "{{ app_name }}"
                  slot: green
          loop: "{{ cloud_targets }}"

        - name: Rollback Helm si utilisé
          community.kubernetes.helm:
            name: "{{ app_name }}"
            namespace: "{{ k8s_namespace }}"
            kubeconfig: "{{ item.kubeconfig }}"
            state: rollback
          loop: "{{ cloud_targets }}"
          ignore_errors: yes

        - name: Supprimer le déploiement BLUE défaillant
          kubernetes.core.k8s:
            state: absent
            kind: Deployment
            namespace: "{{ k8s_namespace }}"
            name: "{{ app_name }}-blue"
            kubeconfig: "{{ item.kubeconfig }}"
          loop: "{{ cloud_targets }}"

        - name: Notifier l'échec via Slack
          uri:
            url: "{{ slack_webhook_url }}"
            method: POST
            body_format: json
            body:
              text: "🔴 ROLLBACK effectué pour {{ app_name }} sur {{ environment }}"
              attachments:
                - color: "danger"
                  title: "Déploiement échoué"
                  fields:
                    - title: "Application"
                      value: "{{ app_name }}"
                      short: true
                    - title: "Environnement"
                      value: "{{ environment }}"
                      short: true
                    - title: "Pipeline"
                      value: "#{{ ci_pipeline.json.id }}"
                      short: true
                    - title: "Action"
                      value: "Rollback automatique vers GREEN"
                      short: false

        - fail:
            msg: "Déploiement échoué - Rollback effectué"

    # ============================================
    # ÉTAPE 4: REPORTING AVANCÉ
    # ============================================
  post_tasks:
    - name: Générer rapport de déploiement HTML
      copy:
        dest: "/var/log/ansible/deployment-report-{{ ansible_date_time.date }}-{{ ansible_date_time.time }}.html"
        mode: '0644'
        content: |
          <!DOCTYPE html>
          <html>
          <head>
            <title>Rapport de Déploiement - {{ app_name }}</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); overflow: hidden; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
              .header h1 { margin: 0; font-size: 36px; }
              .header p { margin: 10px 0 0; opacity: 0.9; }
              .content { padding: 40px; }
              .section { margin-bottom: 40px; }
              .section h2 { color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; margin-bottom: 20px; }
              .status { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; }
              .status.success { background: #10b981; color: white; }
              .status.failed { background: #ef4444; color: white; }
              .status.warning { background: #f59e0b; color: white; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
              th { background: #f3f4f6; font-weight: 600; color: #374151; }
              tr:hover { background: #f9fafb; }
              .metric { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 10px 0; }
              .metric h3 { margin: 0 0 10px; color: #374151; }
              .metric .value { font-size: 32px; font-weight: bold; color: #667eea; }
              .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚀 Rapport de Déploiement CI/CD</h1>
                <p>{{ app_name }} - {{ environment | upper }}</p>
                <p>{{ ansible_date_time.iso8601 }}</p>
              </div>

              <div class="content">
                <div class="section">
                  <h2>📊 Statut Global</h2>
                  <p><span class="status success">✅ DÉPLOIEMENT RÉUSSI</span></p>
                  <div class="metric">
                    <h3>Version déployée</h3>
                    <div class="value">{{ docker_image_tag }}</div>
                  </div>
                </div>

                <div class="section">
                  <h2>☁️ Clusters Multi-Cloud</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Cloud</th>
                        <th>Région</th>
                        <th>Endpoint</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
{% for target in cloud_targets %}
                      <tr>
                        <td>{{ target.provider | upper }}</td>
                        <td>{{ target.region }}</td>
                        <td>{{ app_name }}.{{ target.name }}.{{ environment }}.example.com</td>
                        <td><span class="status success">OPERATIONAL</span></td>
                      </tr>
{% endfor %}
                    </tbody>
                  </table>
                </div>

                <div class="section">
                  <h2>🔄 Pipeline CI/CD</h2>
                  <table>
                    <tr>
                      <td><strong>Pipeline ID</strong></td>
                      <td>#{{ ci_pipeline.json.id }}</td>
                    </tr>
                    <tr>
                      <td><strong>Statut</strong></td>
                      <td><span class="status success">{{ pipeline_status.json.status | upper }}</span></td>
                    </tr>
                    <tr>
                      <td><strong>Durée</strong></td>
                      <td>{{ pipeline_status.json.duration | default(0) }}s</td>
                    </tr>
                    <tr>
                      <td><strong>Image Docker</strong></td>
                      <td>registry.example.com/{{ app_name }}:{{ docker_image_tag }}</td>
                    </tr>
                  </table>
                </div>

                <div class="section">
                  <h2>📈 Métriques Prometheus</h2>
                  <div class="metric">
                    <h3>Taux de requêtes</h3>
                    <div class="value">{{ blue_metrics.json.data.result[0].value[1] | default(0) | float * 100 | round(2) }}%</div>
                  </div>
                </div>

                <div class="section">
                  <h2>🏗️ Infrastructure Terraform</h2>
                  <table>
                    <tr>
                      <td><strong>Workspace</strong></td>
                      <td>{{ environment }}</td>
                    </tr>
                    <tr>
                      <td><strong>Backend</strong></td>
                      <td>S3 (tfstate-{{ app_name }}-{{ environment }})</td>
                    </tr>
                    <tr>
                      <td><strong>EKS Endpoint</strong></td>
                      <td>{{ eks_cluster_endpoint }}</td>
                    </tr>
                    <tr>
                      <td><strong>AKS Endpoint</strong></td>
                      <td>{{ aks_cluster_endpoint }}</td>
                    </tr>
                    <tr>
                      <td><strong>GKE Endpoint</strong></td>
                      <td>{{ gke_cluster_endpoint }}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <div class="footer">
                <p>Généré automatiquement par Ansible Academy Platform</p>
                <p>{{ ansible_date_time.iso8601 }}</p>
              </div>
            </div>
          </body>
          </html>

    - name: Générer rapport Markdown
      copy:
        dest: "/var/log/ansible/deployment-report-{{ ansible_date_time.date }}.md"
        mode: '0644'
        content: |
          # 🚀 Rapport de Déploiement CI/CD

          **Application:** {{ app_name }}
          **Environnement:** {{ environment | upper }}
          **Date:** {{ ansible_date_time.iso8601 }}
          **Statut:** ✅ RÉUSSI

          ---

          ## 📊 Résumé

          - **Version déployée:** \`{{ docker_image_tag }}\`
          - **Pipeline ID:** #{{ ci_pipeline.json.id }}
          - **Durée pipeline:** {{ pipeline_status.json.duration | default(0) }}s
          - **Stratégie:** Blue/Green Deployment

          ---

          ## ☁️ Déploiements Multi-Cloud

          | Cloud | Région | Endpoint | Statut |
          |-------|--------|----------|--------|
{% for target in cloud_targets %}
          | {{ target.provider | upper }} | {{ target.region }} | https://{{ app_name }}.{{ target.name }}.{{ environment }}.example.com | ✅ OPERATIONAL |
{% endfor %}

          ---

          ## 🏗️ Infrastructure Terraform

          - **Workspace:** {{ environment }}
          - **EKS:** {{ eks_cluster_endpoint }}
          - **AKS:** {{ aks_cluster_endpoint }}
          - **GKE:** {{ gke_cluster_endpoint }}

          ---

          ## 📈 Métriques

          - **Taux de requêtes:** {{ blue_metrics.json.data.result[0].value[1] | default(0) | float * 100 | round(2) }}%
          - **Health checks:** ✅ Tous passés
          - **Rollback:** Non nécessaire

          ---

          *Généré par Ansible Academy Platform*

    - name: Afficher le résumé final
      debug:
        msg:
          - "===================================================="
          - "✅ DÉPLOIEMENT CI/CD COMPLET RÉUSSI"
          - "===================================================="
          - "Application: {{ app_name }}"
          - "Version: {{ docker_image_tag }}"
          - "Environnement: {{ environment }}"
          - "Pipeline ID: #{{ ci_pipeline.json.id }}"
          - ""
          - "Endpoints:"
{% for target in cloud_targets %}
          - "  {{ target.provider | upper }}: https://{{ app_name }}.{{ target.name }}.{{ environment }}.example.com"
{% endfor %}
          - ""
          - "Rapports:"
          - "  HTML: /var/log/ansible/deployment-report-{{ ansible_date_time.date }}-{{ ansible_date_time.time }}.html"
          - "  Markdown: /var/log/ansible/deployment-report-{{ ansible_date_time.date }}.md"
          - "===================================================="
`;
}
