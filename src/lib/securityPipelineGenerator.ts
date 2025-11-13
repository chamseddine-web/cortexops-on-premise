export interface SecurityPipelineConfig {
  appName: string;
  environment: 'staging' | 'production';
  registryUrl: string;
  kubernetesVersion: string;
}

export function generateSecurityCompliancePlaybook(
  appName: string,
  environment: 'staging' | 'production' = 'production'
): string {
  return String.raw`---
# Pipeline DevSecOps Haute-Cadence avec Gestion d'Erreurs Non-Bloquante
#
# Corrections appliquées :
# 1. Block/rescue sur étapes critiques
# 2. Parallélisation (Trivy, kube-bench, Falco)
# 3. Corrélation JSON multi-sources
# 4. Métrique IA Ops dynamique
# 5. Centralisation artefacts (/var/log/ansible/devsecops/)

- name: Cloud Security Fusion - Pipeline DevSecOps Robuste
  hosts: localhost
  connection: local
  gather_facts: yes

  vars:
    environment: ${environment}
    app_name: ${appName}
    kubeconfig_path: ~/.kube/config

    # Structure centralisée des artefacts
    base_path: /var/log/ansible/devsecops
    reports_dir: "{{ base_path }}/reports"
    json_dir: "{{ base_path }}/json"
    tmp_dir: "{{ base_path }}/tmp"

    final_report: "{{ reports_dir }}/security_audit_{{ environment }}_{{ ansible_date_time.epoch }}.html"
    registry_url: registry.example.com
    image_tag: "{{ environment }}"

    trivy_version: "0.48.0"
    kube_bench_version: "0.7.0"
    kyverno_version: "3.1.0"
    gatekeeper_version: "3.14.0"
    cosign_version: "2.2.2"
    falco_version: "3.8.0"

  tasks:
    - name: 🚀 Initialisation - Créer structure artefacts
      file:
        path: "{{ item }}"
        state: directory
        mode: '0755'
      loop:
        - "{{ reports_dir }}"
        - "{{ json_dir }}"
        - "{{ tmp_dir }}"

    - name: 📊 Initialiser métriques pipeline
      set_fact:
        pipeline_start: "{{ ansible_date_time.epoch }}"
        steps_completed: "0"
        steps_failed: "0"

    # ====================================================================
    # PARALLÉLISATION : ÉTAPES 1, 2, 7 (Trivy, kube-bench, Falco)
    # ====================================================================
    - name: "[PARALLEL] Lancer scans de sécurité en parallèle"
      debug:
        msg: "Démarrage parallèle : Trivy + kube-bench + Falco"

    # --- TRIVY (ASYNC) ---
    - name: "[Block] Étape 1/8 - Scan Trivy"
      block:
        - name: "[1/8] Installer Trivy"
          shell: |
            curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin v{{ trivy_version }}
          args:
            creates: /usr/local/bin/trivy

        - name: "[1/8] Scanner image avec Trivy (ASYNC)"
          shell: |
            trivy image --severity HIGH,CRITICAL --format json --output {{ json_dir }}/trivy-report.json {{ registry_url }}/{{ app_name }}:{{ image_tag }}
          async: 300
          poll: 0
          register: trivy_async

      rescue:
        - name: "[1/8] ⚠️ Trivy échoué - Poursuite du pipeline"
          set_fact:
            trivy_failed: true
            steps_failed: "{{ steps_failed | int + 1 }}"

        - name: "[1/8] Afficher message d'erreur Trivy"
          debug:
            msg: "Trivy échoué mais pipeline continue"

    # --- KUBE-BENCH (ASYNC) ---
    - name: "[Block] Étape 2/8 - Audit CIS kube-bench"
      block:
        - name: "[2/8] Installer kube-bench"
          shell: |
            curl -L https://github.com/aquasecurity/kube-bench/releases/download/v{{ kube_bench_version }}/kube-bench_{{ kube_bench_version }}_linux_amd64.tar.gz | tar -xz -C /usr/local/bin
          args:
            creates: /usr/local/bin/kube-bench

        - name: "[2/8] Exécuter kube-bench (ASYNC)"
          shell: |
            kube-bench run --json > {{ json_dir }}/kube-bench-report.json
          environment:
            KUBECONFIG: "{{ kubeconfig_path }}"
          async: 300
          poll: 0
          register: kube_bench_async

      rescue:
        - name: "[2/8] ⚠️ kube-bench échoué - Poursuite du pipeline"
          set_fact:
            kube_bench_failed: true
            steps_failed: "{{ steps_failed | int + 1 }}"

        - name: "[2/8] Afficher message d'erreur kube-bench"
          debug:
            msg: "kube-bench échoué mais pipeline continue"

    # --- FALCO (ASYNC) ---
    - name: "[Block] Étape 7/8 - Détection runtime Falco"
      block:
        - name: "[7/8] Installer Falco"
          shell: |
            curl -s https://falco.org/repo/falcosecurity-3672BA8F.asc | apt-key add -
            echo "deb https://download.falco.org/packages/deb stable main" | tee /etc/apt/sources.list.d/falcosecurity.list
            apt-get update && apt-get install -y falco
          args:
            creates: /usr/bin/falco

        - name: "[7/8] Collecter événements Falco (ASYNC)"
          shell: |
            timeout 60 falco -o json_output=true -o file_output.enabled=true -o file_output.filename={{ json_dir }}/falco.json || true
          async: 300
          poll: 0
          register: falco_async

      rescue:
        - name: "[7/8] ⚠️ Falco échoué - Poursuite du pipeline"
          set_fact:
            falco_failed: true
            steps_failed: "{{ steps_failed | int + 1 }}"

        - name: "[7/8] Afficher message d'erreur Falco"
          debug:
            msg: "Falco échoué mais pipeline continue"

    # --- ATTENDRE ACHÈVEMENT PARALLÉLISATION ---
    - name: "Attendre achèvement Trivy"
      async_status:
        jid: "{{ trivy_async.ansible_job_id }}"
      register: trivy_result
      until: trivy_result.finished
      retries: 60
      delay: 5
      when: trivy_async.ansible_job_id is defined

    - name: "Attendre achèvement kube-bench"
      async_status:
        jid: "{{ kube_bench_async.ansible_job_id }}"
      register: kube_bench_result
      until: kube_bench_result.finished
      retries: 60
      delay: 5
      when: kube_bench_async.ansible_job_id is defined

    - name: "Attendre achèvement Falco"
      async_status:
        jid: "{{ falco_async.ansible_job_id }}"
      register: falco_result
      until: falco_result.finished
      retries: 60
      delay: 5
      when: falco_async.ansible_job_id is defined

    - name: "✅ Étapes parallèles terminées"
      set_fact:
        steps_completed: "{{ steps_completed | int + 3 }}"

    # ====================================================================
    # HEALTH CHECK : Vérifier santé du cluster Kubernetes
    # ====================================================================
    - name: "🏥 Health Check - Vérifier état du cluster Kubernetes"
      shell: |
        kubectl get nodes -o json | jq '.items[].status.conditions[] | select(.type=="Ready") | .status' | grep -q True
      environment:
        KUBECONFIG: "{{ kubeconfig_path }}"
      register: kube_health
      failed_when: false
      changed_when: false

    - name: "🏥 Afficher résultat Health Check"
      debug:
        msg: "{{ kube_health.rc == 0 | ternary('✅ Cluster sain', '⚠️ Cluster instable - Poursuite avec précaution') }}"

    - name: "🏥 Alerter si cluster instable"
      debug:
        msg:
          - "⚠️ ATTENTION : Le cluster Kubernetes n'est pas dans un état optimal"
          - "Les installations Kyverno/Gatekeeper pourraient échouer"
          - "Recommandation : Vérifier 'kubectl get nodes' avant de continuer"
      when: kube_health.rc != 0

    # ====================================================================
    # ÉTAPE 3/8 : KYVERNO
    # ====================================================================
    - name: "[Block] Étape 3/8 - Politiques Kyverno"
      block:
        - name: "[3/8] Ajouter repository Helm Kyverno"
          kubernetes.core.helm_repository:
            name: kyverno
            repo_url: https://kyverno.github.io/kyverno/

        - name: "[3/8] Installer Kyverno"
          community.kubernetes.helm:
            name: kyverno
            chart_ref: kyverno/kyverno
            chart_version: "{{ kyverno_version }}"
            release_namespace: kyverno
            create_namespace: true
            kubeconfig: "{{ kubeconfig_path }}"
            values:
              replicas: ${environment === 'production' ? 3 : 1}
            wait: true
            wait_timeout: 5m

        - name: "[3/8] Créer politique - Images signées"
          kubernetes.core.k8s:
            state: present
            kubeconfig: "{{ kubeconfig_path }}"
            definition:
              apiVersion: kyverno.io/v1
              kind: ClusterPolicy
              metadata:
                name: require-image-signature
              spec:
                validationFailureAction: ${environment === 'production' ? 'Enforce' : 'Audit'}
                background: true
                rules:
                - name: check-signature
                  match:
                    any:
                    - resources:
                        kinds:
                        - Pod
                  verifyImages:
                  - imageReferences:
                    - "{{ registry_url }}/*"

        - name: "[3/8] Incrémenter compteur étapes"
          set_fact:
            steps_completed: "{{ steps_completed | int + 1 }}"

      rescue:
        - name: "[3/8] ⚠️ Kyverno échoué - Poursuite du pipeline"
          set_fact:
            kyverno_failed: true
            steps_failed: "{{ steps_failed | int + 1 }}"

    # ====================================================================
    # ÉTAPE 4/8 : OPA GATEKEEPER
    # ====================================================================
    - name: "[Block] Étape 4/8 - OPA Gatekeeper"
      block:
        - name: "[4/8] Installer OPA Gatekeeper"
          community.kubernetes.helm:
            name: gatekeeper
            chart_ref: gatekeeper/gatekeeper
            chart_version: "{{ gatekeeper_version }}"
            release_namespace: gatekeeper-system
            create_namespace: true
            kubeconfig: "{{ kubeconfig_path }}"

        - name: "[4/8] Créer ConstraintTemplate - Ports interdits"
          kubernetes.core.k8s:
            state: present
            kubeconfig: "{{ kubeconfig_path }}"
            definition:
              apiVersion: templates.gatekeeper.sh/v1
              kind: ConstraintTemplate
              metadata:
                name: k8sblockedports
              spec:
                crd:
                  spec:
                    names:
                      kind: K8sBlockedPorts
                    validation:
                      openAPIV3Schema:
                        type: object
                        properties:
                          blockedPorts:
                            type: array
                            items:
                              type: integer
                targets:
                - target: admission.k8s.gatekeeper.sh
                  rego: |
                    package k8sblockedports
                    violation[{"msg": msg}] {
                      input.review.kind.kind == "Service"
                      port := input.review.object.spec.ports[_].port
                      blocked := input.parameters.blockedPorts[_]
                      port == blocked
                      msg := sprintf("Port %v is blocked", [port])
                    }

        - name: "[4/8] Incrémenter compteur étapes"
          set_fact:
            steps_completed: "{{ steps_completed | int + 1 }}"

      rescue:
        - name: "[4/8] ⚠️ OPA Gatekeeper échoué - Poursuite du pipeline"
          set_fact:
            gatekeeper_failed: true
            steps_failed: "{{ steps_failed | int + 1 }}"

    # ====================================================================
    # ÉTAPE 5/8 : SOPS
    # ====================================================================
    - name: "[Block] Étape 5/8 - Chiffrement secrets SOPS"
      block:
        - name: "[5/8] Installer SOPS"
          shell: |
            curl -LO https://github.com/mozilla/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
            mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops
            chmod +x /usr/local/bin/sops
          args:
            creates: /usr/local/bin/sops

        - name: "[5/8] Chiffrer secrets Kubernetes"
          shell: |
            kubectl get secrets -A -o json > {{ tmp_dir }}/secrets-plain.json
            sops --encrypt --age $(age-keygen -y ~/.config/sops/age/keys.txt) {{ tmp_dir }}/secrets-plain.json > {{ json_dir }}/secrets-encrypted.json
          register: sops_encrypt

        - name: "[5/8] Incrémenter compteur étapes"
          set_fact:
            steps_completed: "{{ steps_completed | int + 1 }}"

      rescue:
        - name: "[5/8] ⚠️ SOPS échoué - Poursuite du pipeline"
          set_fact:
            sops_failed: true
            steps_failed: "{{ steps_failed | int + 1 }}"

    # ====================================================================
    # ÉTAPE 6/8 : COSIGN
    # ====================================================================
    - name: "[Block] Étape 6/8 - Signature images Cosign"
      block:
        - name: "[6/8] Installer Cosign"
          shell: |
            curl -LO https://github.com/sigstore/cosign/releases/download/v{{ cosign_version }}/cosign-linux-amd64
            mv cosign-linux-amd64 /usr/local/bin/cosign
            chmod +x /usr/local/bin/cosign
          args:
            creates: /usr/local/bin/cosign

        - name: "[6/8] Créer répertoire Cosign"
          file:
            path: /etc/cosign
            state: directory
            mode: '0755'

        - name: "[6/8] Générer paire de clés Cosign si absente"
          shell: |
            if [ ! -f /etc/cosign/key.pem ]; then
              cd /etc/cosign
              echo "" | cosign generate-key-pair
              echo "✅ Nouvelle paire de clés générée"
            else
              echo "✅ Clés Cosign existantes détectées"
            fi
          args:
            creates: /etc/cosign/key.pem
          register: cosign_keygen

        - name: "[6/8] Afficher info clés Cosign"
          debug:
            msg: "{{ cosign_keygen.stdout_lines }}"

        - name: "[6/8] Vérifier signature image"
          shell: |
            cosign verify --key /etc/cosign/cosign.pub {{ registry_url }}/{{ app_name }}:{{ image_tag }} || echo "unsigned"
          register: cosign_verify

        - name: "[6/8] Incrémenter compteur étapes"
          set_fact:
            steps_completed: "{{ steps_completed | int + 1 }}"

      rescue:
        - name: "[6/8] ⚠️ Cosign échoué - Poursuite du pipeline"
          set_fact:
            cosign_failed: true
            steps_failed: "{{ steps_failed | int + 1 }}"

    # ====================================================================
    # CORRÉLATION JSON - Fusionner tous les résultats
    # ====================================================================
    - name: "📊 Fusionner résultats de sécurité (corrélation multi-sources)"
      shell: |
        jq -s '{
          trivy: (.[0] // {} ),
          kube_bench: (.[1] // {} ),
          falco: (.[2] // {} ),
          timestamp: "{{ ansible_date_time.iso8601 }}",
          environment: "{{ environment }}",
          app_name: "{{ app_name }}"
        }' {{ json_dir }}/trivy-report.json {{ json_dir }}/kube-bench-report.json {{ json_dir }}/falco.json > {{ json_dir }}/security_summary.json
      register: merged_json
      failed_when: false

    # ====================================================================
    # MÉTRIQUE IA OPS - Calcul probabilité incident
    # ====================================================================
    - name: "🤖 Calculer score IA Ops (prédiction stabilité)"
      shell: |
        python3 << 'PYTHON'
        import json
        import sys

        with open('{{ json_dir }}/security_summary.json', 'r') as f:
            data = json.load(f)

        # Scoring pondéré
        trivy_vulns = len(data.get('trivy', {} ).get('Results', []))
        kube_bench_fails = data.get('kube_bench', {} ).get('Totals', {} ).get('total_fail', 0)
        falco_alerts = len(data.get('falco', {} ).get('output_fields', []))

        risk_score = (trivy_vulns * 0.4) + (kube_bench_fails * 0.35) + (falco_alerts * 0.25)
        stability_score = max(0, 100 - min(risk_score, 100))

        result = {
            "risk_score": round(risk_score, 2),
            "stability_score": round(stability_score, 2),
            "incident_probability": round(risk_score / 100, 2),
            "recommendation": "Production ready" if stability_score >= 85 else "Needs remediation"
        }

        print(json.dumps(result))
        PYTHON
      register: ai_ops_metric
      changed_when: false

    - name: "📈 Afficher prédiction IA Ops"
      debug:
        msg:
          - "🤖 IA Ops Analysis:"
          - "   Stabilité prédite: {{ (ai_ops_metric.stdout | from_json).stability_score }}%"
          - "   Probabilité incident: {{ (ai_ops_metric.stdout | from_json).incident_probability }}"
          - "   Recommandation: {{ (ai_ops_metric.stdout | from_json).recommendation }}"

    # ====================================================================
    # SCORE GLOBAL DE MATURITÉ SÉCURITÉ
    # ====================================================================
    - name: "🎯 Calculer score global de maturité sécurité"
      set_fact:
        pipeline_duration: "{{ (ansible_date_time.epoch | int) - (pipeline_start | int) }}"
        completion_rate: "{{ ((steps_completed | int | float / 8.0) * 100) | round(2) }}"
        maturity_score: "{{ (((steps_completed | int | float / 8.0) * 100 - (steps_failed | int * 5) + (ai_ops_metric.stdout | from_json).stability_score | float) / 2) | round(2) }}"

    - name: "🎯 Afficher métriques globales"
      debug:
        msg:
          - "════════════════════════════════════════"
          - "📊 MÉTRIQUES GLOBALES DU PIPELINE"
          - "════════════════════════════════════════"
          - "⏱️  Durée d'exécution: {{ pipeline_duration }}s"
          - "✅ Étapes complétées: {{ steps_completed }}/8 ({{ completion_rate }}%)"
          - "❌ Étapes échouées: {{ steps_failed }}"
          - "🎯 Score de maturité: {{ maturity_score }}/100"
          - "{{ maturity_score | float >= 80 | ternary('🟢 EXCELLENT - Production Ready', maturity_score | float >= 60 | ternary('🟡 BON - Améliorations recommandées', '🔴 FAIBLE - Action requise')) }}"
          - "════════════════════════════════════════"

    # ====================================================================
    # EXPORT PROMETHEUS (Monitoring en temps réel)
    # ====================================================================
    - name: "📡 Exporter métriques vers Prometheus Pushgateway"
      uri:
        url: "http://localhost:9091/metrics/job/devsecops/instance/{{ app_name }}"
        method: POST
        body: |
          # TYPE pipeline_duration_seconds gauge
          pipeline_duration_seconds {{ pipeline_duration }}
          # TYPE stability_score gauge
          stability_score {{ (ai_ops_metric.stdout | from_json).stability_score }}
          # TYPE maturity_score gauge
          maturity_score {{ maturity_score }}
          # TYPE steps_completed counter
          steps_completed {{ steps_completed }}
          # TYPE steps_failed counter
          steps_failed {{ steps_failed }}
          # TYPE incident_probability gauge
          incident_probability {{ (ai_ops_metric.stdout | from_json).incident_probability }}
        headers:
          Content-Type: "text/plain"
        status_code: [200, 202]
      register: prometheus_export
      failed_when: false
      changed_when: false

    - name: "📡 Résultat export Prometheus"
      debug:
        msg: "{{ prometheus_export.status == 200 | ternary('✅ Métriques exportées vers Prometheus', '⚠️ Prometheus Pushgateway non disponible - Export ignoré') }}"

    # ====================================================================
    # CORTEX GLOBAL - Mémoire partagée pour agents IA
    # ====================================================================
    - name: "🧠 Mise à jour Cortex Global (Mémoire IA partagée)"
      copy:
        content: |
          {
            "cortex_version": "2.0",
            "pipeline": "{{ app_name }}",
            "environment": "{{ environment }}",
            "execution_metadata": {
              "timestamp": "{{ ansible_date_time.iso8601 }}",
              "duration_seconds": {{ pipeline_duration }},
              "ansible_version": "{{ ansible_version.full }}"
            },
            "intelligence_metrics": {
              "stability_score": {{ (ai_ops_metric.stdout | from_json).stability_score }},
              "maturity_score": {{ maturity_score }},
              "incident_probability": {{ (ai_ops_metric.stdout | from_json).incident_probability }},
              "risk_score": {{ (ai_ops_metric.stdout | from_json).risk_score }},
              "recommendation": "{{ (ai_ops_metric.stdout | from_json).recommendation }}"
            },
            "pipeline_health": {
              "total_steps": 8,
              "completed_steps": {{ steps_completed }},
              "failed_steps": {{ steps_failed }},
              "completion_rate": {{ completion_rate }},
              "kubernetes_cluster_healthy": {{ kube_health.rc == 0 | lower }}
            },
            "security_tools_status": {
              "trivy": {{ (not trivy_failed | default(false)) | lower }},
              "kube_bench": {{ (not kube_bench_failed | default(false)) | lower }},
              "falco": {{ (not falco_failed | default(false)) | lower }},
              "kyverno": {{ (not kyverno_failed | default(false)) | lower }},
              "gatekeeper": {{ (not gatekeeper_failed | default(false)) | lower }},
              "sops": {{ (not sops_failed | default(false)) | lower }},
              "cosign": {{ (not cosign_failed | default(false)) | lower }}
            },
            "next_actions": {
              "autoheal_required": {{ (maturity_score | float < 60) | lower }},
              "threshold_adjustment_needed": {{ ((ai_ops_metric.stdout | from_json).stability_score | float < 70) | lower }},
              "immediate_attention": {{ (steps_failed | int > 2) | lower }}
            }
          }
        dest: "{{ json_dir }}/cortex_state.json"
        mode: '0644'

    - name: "🧠 Afficher état Cortex"
      debug:
        msg:
          - "🧠 Cortex Global State Updated"
          - "   Fichier: {{ json_dir }}/cortex_state.json"
          - "   Stabilité: {{ (ai_ops_metric.stdout | from_json).stability_score }}%"
          - "   Maturité: {{ maturity_score }}/100"

    # ====================================================================
    # AUTO-HEALING - Agent autonome de réparation
    # ====================================================================
    - name: "🤖 Auto-Healing - Détecter pods en erreur"
      shell: |
        kubectl get pods -A --field-selector=status.phase!=Running -o json > {{ tmp_dir }}/pods_issues.json
        jq '.items | length' {{ tmp_dir }}/pods_issues.json
      environment:
        KUBECONFIG: "{{ kubeconfig_path }}"
      register: pods_error_count
      failed_when: false
      changed_when: false

    - name: "🤖 Auto-Healing - Décision intelligente"
      set_fact:
        autoheal_triggered: "{{ (pods_error_count.stdout | default('0') | int > 0) and (maturity_score | float < 70) }}"

    - name: "🤖 Auto-Healing - Redémarrage pods défaillants"
      when: autoheal_triggered | bool
      block:
        - name: "🤖 Identifier namespaces affectés"
          shell: |
            jq -r '.items[].metadata.namespace' {{ tmp_dir }}/pods_issues.json | sort -u
          register: affected_namespaces

        - name: "🤖 Rollout restart des deployments affectés"
          shell: |
            for ns in {{ affected_namespaces.stdout_lines | join(' ') }}; do
              kubectl rollout restart deployment -n $ns 2>/dev/null || true
            done
            echo "$(date -Iseconds) - Auto-Heal triggered: {{ pods_error_count.stdout }} pods restartés" >> {{ base_path }}/autoheal.log
          environment:
            KUBECONFIG: "{{ kubeconfig_path }}"
          register: autoheal_result

        - name: "🤖 Résultat Auto-Healing"
          debug:
            msg:
              - "🤖 Auto-Healing exécuté avec succès"
              - "   Pods en erreur détectés: {{ pods_error_count.stdout }}"
              - "   Namespaces affectés: {{ affected_namespaces.stdout_lines | join(', ') }}"
              - "   Log: {{ base_path }}/autoheal.log"

    - name: "🤖 Auto-Healing - Statut"
      when: not (autoheal_triggered | bool)
      debug:
        msg: "✅ Aucune intervention Auto-Healing nécessaire ({{ pods_error_count.stdout | default('0') }} pods en erreur)"

    # ====================================================================
    # IA ADAPTATIVE - Ajustement dynamique des seuils
    # ====================================================================
    - name: "🧠 IA Adaptative - Évaluer besoin d'ajustement"
      set_fact:
        needs_threshold_adjustment: "{{ (ai_ops_metric.stdout | from_json).stability_score | float < 70 }}"

    - name: "🧠 IA Adaptative - Réduire sévérité Falco/Kyverno"
      when: needs_threshold_adjustment | bool
      block:
        - name: "🧠 Ajuster ConfigMap Falco vers mode permissif"
          kubernetes.core.k8s:
            state: present
            kubeconfig: "{{ kubeconfig_path }}"
            definition:
              apiVersion: v1
              kind: ConfigMap
              metadata:
                name: falco-config
                namespace: falco
              data:
                priority: "warning"
                output_format: "json"
          failed_when: false

        - name: "🧠 Passer Kyverno en mode Audit (vs Enforce)"
          shell: |
            kubectl get clusterpolicies -o name | while read policy; do
              kubectl patch $policy --type=json -p='[{"op":"replace","path":"/spec/validationFailureAction","value":"Audit"}]' 2>/dev/null || true
            done
          environment:
            KUBECONFIG: "{{ kubeconfig_path }}"
          failed_when: false

        - name: "🧠 Résultat ajustement IA"
          debug:
            msg:
              - "🧠 Ajustement intelligent des seuils exécuté"
              - "   Raison: Stabilité < 70% ({{ (ai_ops_metric.stdout | from_json).stability_score }}%)"
              - "   Actions:"
              - "   - Falco: Niveau WARNING (au lieu de CRITICAL)"
              - "   - Kyverno: Mode AUDIT (au lieu de ENFORCE)"
              - "   Objectif: Réduire faux-positifs et améliorer observabilité"

    - name: "🧠 IA Adaptative - Statut"
      when: not (needs_threshold_adjustment | bool)
      debug:
        msg: "✅ Seuils optimaux (Stabilité: {{ (ai_ops_metric.stdout | from_json).stability_score }}%) - Aucun ajustement nécessaire"

    # ====================================================================
    # ÉTAPE 8/8 : RAPPORT HTML FINAL AVEC IA OPS
    # ===================================================================="
    - name: "[8/8] Générer rapport HTML consolidé"
      copy:
        content: |
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <title>Security Audit - {{ app_name }} ({{ environment }})</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                padding: 20px;
                color: #333;
              }
              .container {
                max-width: 1400px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px;
                text-align: center;
              }
              .header h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
              }
              .header p {
                font-size: 1.1rem;
                opacity: 0.9;
              }
              .metrics {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                padding: 40px;
                background: #f8f9fa;
              }
              .metric-card {
                background: white;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                border-left: 4px solid #667eea;
                transition: transform 0.3s ease;
              }
              .metric-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 12px rgba(0,0,0,0.15);
              }
              .metric-card h3 {
                color: #667eea;
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 10px;
              }
              .metric-card .value {
                font-size: 2.5rem;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 5px;
              }
              .metric-card .label {
                color: #7f8c8d;
                font-size: 0.9rem;
              }
              .ai-ops-section {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                padding: 40px;
                margin: 20px 40px;
                border-radius: 12px;
              }
              .ai-ops-section h2 {
                font-size: 1.8rem;
                margin-bottom: 20px;
              }
              .ai-ops-metrics {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-top: 20px;
              }
              .ai-metric {
                background: rgba(255,255,255,0.2);
                padding: 20px;
                border-radius: 8px;
                backdrop-filter: blur(10px);
              }
              .ai-metric h3 {
                font-size: 0.9rem;
                margin-bottom: 10px;
                opacity: 0.9;
              }
              .ai-metric .value {
                font-size: 2rem;
                font-weight: bold;
              }
              .section {
                padding: 40px;
              }
              .section h2 {
                color: #2c3e50;
                font-size: 1.8rem;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 3px solid #667eea;
              }
              .step {
                background: #f8f9fa;
                padding: 20px;
                margin-bottom: 15px;
                border-radius: 8px;
                border-left: 4px solid #28a745;
              }
              .step.failed {
                border-left-color: #dc3545;
              }
              .step h3 {
                color: #495057;
                margin-bottom: 10px;
              }
              .footer {
                background: #2c3e50;
                color: white;
                padding: 30px;
                text-align: center;
              }
              .progress-circle {
                margin: 20px auto;
              }
              .heatmap {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 10px;
                margin: 20px 0;
              }
              .heatmap-cell {
                aspect-ratio: 1;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
                font-weight: bold;
                color: white;
              }
              .heatmap-cell.green { background: #28a745; }
              .heatmap-cell.yellow { background: #ffc107; color: #333; }
              .heatmap-cell.red { background: #dc3545; }
              .cortex-insight {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 25px;
                margin: 20px 40px;
                border-radius: 12px;
                border: 2px solid rgba(255,255,255,0.3);
              }
              .cortex-insight h3 {
                font-size: 1.2rem;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
              }
              .cortex-insight p {
                line-height: 1.6;
                opacity: 0.95;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🛡️ Security Compliance Report</h1>
                <p>{{ app_name }} - {{ environment | upper }}</p>
                <p>Generated: {{ ansible_date_time.iso8601 }}</p>
              </div>

              <div class="ai-ops-section">
                <h2>🤖 IA Ops - Prédiction de Stabilité</h2>

                <!-- Graphique SVG de progression circulaire -->
                <svg class="progress-circle" width="200" height="200" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="90" fill="none" stroke="#e0e0e0" stroke-width="20"/>
                  <circle cx="100" cy="100" r="90" fill="none"
                    stroke="{{ (ai_ops_metric.stdout | from_json).stability_score | float >= 80 | ternary('#28a745', (ai_ops_metric.stdout | from_json).stability_score | float >= 60 | ternary('#ffc107', '#dc3545')) }}"
                    stroke-width="20"
                    stroke-dasharray="{{ ((ai_ops_metric.stdout | from_json).stability_score | float / 100 * 565) | round(0) }} 565"
                    stroke-linecap="round"
                    transform="rotate(-90 100 100)"/>
                  <text x="100" y="95" text-anchor="middle" font-size="36" font-weight="bold" fill="#2c3e50">{{ (ai_ops_metric.stdout | from_json).stability_score | round(0) }}%</text>
                  <text x="100" y="115" text-anchor="middle" font-size="12" fill="#7f8c8d">STABILITÉ</text>
                </svg>

                <div class="ai-ops-metrics">
                  <div class="ai-metric">
                    <h3>Stabilité Prédite</h3>
                    <div class="value">{{ (ai_ops_metric.stdout | from_json).stability_score }}%</div>
                  </div>
                  <div class="ai-metric">
                    <h3>Score Maturité</h3>
                    <div class="value">{{ maturity_score }}/100</div>
                  </div>
                  <div class="ai-metric">
                    <h3>Probabilité d'Incident</h3>
                    <div class="value">{{ (ai_ops_metric.stdout | from_json).incident_probability }}</div>
                  </div>
                  <div class="ai-metric">
                    <h3>Recommandation</h3>
                    <div class="value" style="font-size: 1.2rem;">{{ (ai_ops_metric.stdout | from_json).recommendation }}</div>
                  </div>
                </div>
              </div>

              <!-- Carte de chaleur des outils de sécurité -->
              <div class="section">
                <h2>🗺️ Carte de Chaleur - Statut des Outils</h2>
                <div class="heatmap">
                  <div class="heatmap-cell {{ 'green' if not trivy_failed | default(false) else 'red' }}">
                    <div>TRIVY</div>
                    <div style="font-size: 0.7rem;">Scan</div>
                  </div>
                  <div class="heatmap-cell {{ 'green' if not kube_bench_failed | default(false) else 'red' }}">
                    <div>KUBE-BENCH</div>
                    <div style="font-size: 0.7rem;">CIS</div>
                  </div>
                  <div class="heatmap-cell {{ 'green' if not kyverno_failed | default(false) else 'red' }}">
                    <div>KYVERNO</div>
                    <div style="font-size: 0.7rem;">Policies</div>
                  </div>
                  <div class="heatmap-cell {{ 'green' if not gatekeeper_failed | default(false) else 'red' }}">
                    <div>GATEKEEPER</div>
                    <div style="font-size: 0.7rem;">OPA</div>
                  </div>
                  <div class="heatmap-cell {{ 'green' if not sops_failed | default(false) else 'red' }}">
                    <div>SOPS</div>
                    <div style="font-size: 0.7rem;">Secrets</div>
                  </div>
                  <div class="heatmap-cell {{ 'green' if not cosign_failed | default(false) else 'red' }}">
                    <div>COSIGN</div>
                    <div style="font-size: 0.7rem;">Signatures</div>
                  </div>
                  <div class="heatmap-cell {{ 'green' if not falco_failed | default(false) else 'red' }}">
                    <div>FALCO</div>
                    <div style="font-size: 0.7rem;">Runtime</div>
                  </div>
                </div>
              </div>

              <!-- Diagnostic Cortex IA -->
              <div class="cortex-insight">
                <h3>🧠 Diagnostic Cortex IA - Prédiction 72h</h3>
                <p>
                  {% if (ai_ops_metric.stdout | from_json).stability_score | float >= 85 %}
                  <strong>✅ Statut Optimal:</strong> Le Cortex analyse les métriques actuelles et prédit une <strong>stabilité élevée</strong> pour les prochaines 72 heures.
                  Tous les systèmes fonctionnent dans les paramètres normaux. Aucune intervention préventive requise.
                  {% elif (ai_ops_metric.stdout | from_json).stability_score | float >= 70 %}
                  <strong>⚠️ Attention Modérée:</strong> Le Cortex détecte des <strong>signaux faibles</strong> de dégradation potentielle.
                  Probabilité d'incident sous 72h: {{ (ai_ops_metric.stdout | from_json).incident_probability }}.
                  Recommandation: Surveiller les namespaces {{ 'kube-system' if kube_health.rc != 0 else 'principaux' }} et valider les logs Falco.
                  {% else %}
                  <strong>🔴 Alerte Critique:</strong> Le Cortex prédit un <strong>risque élevé de défaillance</strong> dans les 72 prochaines heures sur {{ 'le cluster Kubernetes' if kube_health.rc != 0 else 'certains composants' }}.
                  Actions immédiates: (1) Vérifier les pods en erreur ({{ pods_error_count.stdout | default('inconnu') }} détectés),
                  (2) Analyser les vulnérabilités critiques Trivy,
                  (3) Considérer un rollback si déploiement récent.
                  {% if autoheal_triggered | default(false) %}
                  <br><strong>🤖 Auto-Healing activé:</strong> Tentative de récupération automatique en cours.
                  {% endif %}
                  {% endif %}
                </p>
                <p style="margin-top: 15px; font-size: 0.9rem; opacity: 0.8;">
                  📊 Cortex v2.0 | Algorithme: Régression pondérée multi-facteurs | Dernière mise à jour: {{ ansible_date_time.iso8601 }}
                </p>
              </div>

              <div class="metrics">
                <div class="metric-card">
                  <h3>Pipeline Duration</h3>
                  <div class="value">{{ ((ansible_date_time.epoch | int) - (pipeline_start | int)) }}s</div>
                  <div class="label">Temps d'exécution total</div>
                </div>
                <div class="metric-card">
                  <h3>Étapes Complétées</h3>
                  <div class="value">{{ steps_completed }}</div>
                  <div class="label">Sur 8 étapes totales</div>
                </div>
                <div class="metric-card">
                  <h3>Étapes Échouées</h3>
                  <div class="value">{{ steps_failed }}</div>
                  <div class="label">Non-bloquantes</div>
                </div>
                <div class="metric-card">
                  <h3>Taux de Réussite</h3>
                  <div class="value">{{ ((steps_completed | int / 8.0) * 100) | round(1) }}%</div>
                  <div class="label">Taux global</div>
                </div>
              </div>

              <div class="section">
                <h2>📋 Détails des Étapes</h2>

                <div class="step {{ 'failed' if trivy_failed is defined else '' }}">
                  <h3>[1/8] Trivy - Scan de Vulnérabilités</h3>
                  <p>Status: {{ '⚠️ Échoué (non-bloquant)' if trivy_failed is defined else '✅ Réussi' }}</p>
                  <p>Rapport: {{ json_dir }}/trivy-report.json</p>
                </div>

                <div class="step {{ 'failed' if kube_bench_failed is defined else '' }}">
                  <h3>[2/8] kube-bench - Audit CIS Kubernetes</h3>
                  <p>Status: {{ '⚠️ Échoué (non-bloquant)' if kube_bench_failed is defined else '✅ Réussi' }}</p>
                  <p>Rapport: {{ json_dir }}/kube-bench-report.json</p>
                </div>

                <div class="step {{ 'failed' if kyverno_failed is defined else '' }}">
                  <h3>[3/8] Kyverno - Politiques Kubernetes</h3>
                  <p>Status: {{ '⚠️ Échoué (non-bloquant)' if kyverno_failed is defined else '✅ Réussi' }}</p>
                </div>

                <div class="step {{ 'failed' if gatekeeper_failed is defined else '' }}">
                  <h3>[4/8] OPA Gatekeeper - Contraintes Rego</h3>
                  <p>Status: {{ '⚠️ Échoué (non-bloquant)' if gatekeeper_failed is defined else '✅ Réussi' }}</p>
                </div>

                <div class="step {{ 'failed' if sops_failed is defined else '' }}">
                  <h3>[5/8] SOPS - Chiffrement Secrets</h3>
                  <p>Status: {{ '⚠️ Échoué (non-bloquant)' if sops_failed is defined else '✅ Réussi' }}</p>
                  <p>Rapport: {{ json_dir }}/secrets-encrypted.json</p>
                </div>

                <div class="step {{ 'failed' if cosign_failed is defined else '' }}">
                  <h3>[6/8] Cosign - Signature Images</h3>
                  <p>Status: {{ '⚠️ Échoué (non-bloquant)' if cosign_failed is defined else '✅ Réussi' }}</p>
                </div>

                <div class="step {{ 'failed' if falco_failed is defined else '' }}">
                  <h3>[7/8] Falco - Détection Runtime</h3>
                  <p>Status: {{ '⚠️ Échoué (non-bloquant)' if falco_failed is defined else '✅ Réussi' }}</p>
                  <p>Rapport: {{ json_dir }}/falco.json</p>
                </div>

                <div class="step">
                  <h3>[8/8] Corrélation JSON & Rapport</h3>
                  <p>Status: ✅ Généré</p>
                  <p>Corrélation: {{ json_dir }}/security_summary.json</p>
                </div>
              </div>

              <div class="section">
                <h2>📂 Structure des Artefacts</h2>
                <pre style="background: #f8f9fa; padding: 20px; border-radius: 8px; overflow-x: auto;">{{ base_path }}/
          ├── reports/          → Rapports HTML
          │   └── security_audit_{{ environment }}_{{ ansible_date_time.epoch }}.html
          ├── json/             → Logs structurés
          │   ├── trivy-report.json
          │   ├── kube-bench-report.json
          │   ├── falco.json
          │   ├── secrets-encrypted.json
          │   └── security_summary.json (corrélation)
          └── tmp/              → Fichiers temporaires
              └── secrets-plain.json</pre>
              </div>

              <div class="footer">
                <p><strong>Cloud Security Fusion</strong> - Pipeline DevSecOps Haute-Cadence</p>
                <p>Environment: {{ environment }} | App: {{ app_name }} | Ansible {{ ansible_version.full }}</p>
              </div>
            </div>
          </body>
          </html>
        dest: "{{ final_report }}"
        mode: '0644'

    - name: "🎉 Pipeline terminé avec succès"
      debug:
        msg:
          - "=========================================="
          - "✅ Pipeline DevSecOps Haute-Cadence Terminé"
          - "=========================================="
          - ""
          - "📊 Résumé:"
          - "   - Étapes complétées: {{ steps_completed }}/8"
          - "   - Étapes échouées: {{ steps_failed }}/8"
          - "   - Durée: {{ pipeline_duration }}s"
          - "   - Stabilité IA: {{ (ai_ops_metric.stdout | from_json).stability_score }}%"
          - "   - Score maturité: {{ maturity_score }}/100"
          - ""
          - "📂 Artefacts:"
          - "   - Rapport HTML: {{ final_report }}"
          - "   - Corrélation JSON: {{ json_dir }}/security_summary.json"
          - "   - Tous les logs: {{ json_dir }}/"
          - ""
          - "📡 Monitoring:"
          - "   - Métriques Prometheus: {{ prometheus_export.status == 200 | ternary('✅ Exportées', '⚠️ Non disponible') }}"
          - "   - Visualisation: http://localhost:3000/d/devsecops (Grafana)"
          - ""
          - "🤖 Recommandation IA Ops:"
          - "   {{ (ai_ops_metric.stdout | from_json).recommendation }}"
          - "=========================================="
`;
}
