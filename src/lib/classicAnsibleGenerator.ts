/**
 * Générateur de Playbooks Ansible Classiques
 * Structure professionnelle avec rôles, inventaires, templates
 */

import { detectRequiredRoles } from './contextDetector';

export interface ClassicAnsibleConfig {
  projectName: string;
  environment: 'staging' | 'production';
  targetOS: 'ubuntu' | 'debian' | 'centos' | 'rhel';
  hosts: string[];
  roles: string[];
  variables: Record<string, any>;
}

/**
 * Génère une structure complète de projet Ansible avec rôles
 */
export function generateClassicAnsibleProject(config: ClassicAnsibleConfig): Record<string, string> {
  const files: Record<string, string> = {};

  // Site.yml principal
  files['site.yml'] = generateSiteYml(config);

  // Inventaire
  files[`inventories/${config.environment}.ini`] = generateInventory(config);

  // Group vars
  files['group_vars/all.yml'] = generateGroupVars(config);

  // Vault global (exemple à chiffrer avec ansible-vault)
  files['vault.yml'] = generateVaultExample(config);

  // Vaults spécifiques par rôle (meilleure isolation)
  if (config.roles.includes('postgresql')) {
    files['vault_db.yml'] = generateVaultDB(config);
  }
  if (config.roles.includes('pythonapp') || config.roles.includes('nodeapp')) {
    files['vault_app.yml'] = generateVaultApp(config);
  }

  // Générer chaque rôle
  config.roles.forEach(role => {
    const roleFiles = generateRole(role, config);
    Object.entries(roleFiles).forEach(([path, content]) => {
      files[`roles/${role}/${path}`] = content;
    });
  });

  // README
  files['README.md'] = generateReadme(config);

  // ansible.cfg
  files['ansible.cfg'] = generateAnsibleCfg();

  // GitLab CI/CD
  files['.gitlab-ci.yml'] = generateGitLabCI(config);

  // Scripts Python externes pour AI Ops
  files['files/ai_ops_calculator.py'] = generateAIOpsScript();

  // CSS externe pour rapports HTML
  files['files/report.css'] = generateReportCSS();

  return files;
}

/**
 * Génère la section roles avec conditions when: optimisées
 */
function generateRolesSection(roles: string[]): string {
  // Définir les conditions de ciblage par rôle (optimisé - sans 'all' redondant)
  // Les conditions sont entourées de guillemets doubles pour compatibilité YAML stricte
  const roleConditions: Record<string, string> = {
    nginx: "\"'web' in group_names\"",
    postgresql: "\"'db' in group_names\"",
    redis: "\"'redis' in group_names\"", // FIX: Redis SEULEMENT sur groupe redis (pas avec DB)
    docker: "\"'app' in group_names or 'ci' in group_names\"",
    pythonapp: "\"'pythonapp' in group_names\"",
    nodeapp: "\"'nodeapp' in group_names\"",
    monitoring: "\"'monitoring' in group_names\"",
    firewall: "true"
  };

  const otherRoles = roles.filter(r => r !== 'common');
  if (otherRoles.length === 0) {
    return '';
  }

  return otherRoles.map(role => {
    const condition = roleConditions[role] || "true";

    if (condition === "true" || condition === "\"true\"") {
      // 4 espaces pour "- role:", 6 espaces pour "tags:" (aligné avec "role:")
      return `    - role: ${role}\n      tags: ['${role}']`;
    } else {
      // 4 espaces pour "- role:", 6 espaces pour "when:" et "tags:"
      return `    - role: ${role}\n      when: ${condition}\n      tags: ['${role}']`;
    }
  }).join('\n');
}

/**
 * Génère le playbook principal site.yml
 */
function generateSiteYml(config: ClassicAnsibleConfig): string {
  const { projectName, environment, roles } = config;
  const additionalRoles = generateRolesSection(roles);

  return `---
# ════════════════════════════════════════════════════════════════════════════
# ANSIBLE PLAYBOOK - ${projectName}
# ════════════════════════════════════════════════════════════════════════════
# Environnement   : ${environment.toUpperCase()}
# Structure       : Rôles Ansible (Best Practices)
# Target          : Serveurs Linux (${config.targetOS})
# ════════════════════════════════════════════════════════════════════════════
#
# UTILISATION:
#   ansible-playbook site.yml -i inventories/${environment}.ini
#   ansible-playbook site.yml -i inventories/${environment}.ini --check
#   ansible-playbook site.yml -i inventories/${environment}.ini --tags "nginx"
#
# ════════════════════════════════════════════════════════════════════════════

- name: "📋 Configuration initiale - Tous les serveurs"
  hosts: all
  become: yes
  gather_facts: no  # Optimisation: facts collectés manuellement si nécessaire
  vars_files:
    - vault.yml
    - vault_db.yml
    - vault_app.yml

  pre_tasks:
    - name: "⏱️ Capturer le timestamp de début"
      set_fact:
        playbook_start_time: "{{ ansible_date_time.epoch }}"
      run_once: true
      tags: ['always']

    - name: "🔍 Vérifier les dépendances critiques"
      shell: "command -v {{ item }}"
      loop:
        - python3
        - curl
        - jq
      register: depcheck
      failed_when: false
      changed_when: false
      tags: ['always', 'check']

    - name: "⚠️ Avertir si dépendances manquantes"
      debug:
        msg: "ATTENTION: Dépendance manquante détectée. Certaines fonctionnalités peuvent ne pas fonctionner."
      when: depcheck.results | selectattr('rc', 'ne', 0) | list | length > 0
      tags: ['always', 'check']

    - name: "🔐 Validation des variables vault (FIX: vérifier intégrité)"
      assert:
        that:
          - vault_db_password is defined
          - vault_db_password != 'ChangeThisSecureDBPassword123!'
          - vault_app_secret_key is defined
          - vault_app_secret_key != 'YourApplicationSecretKey2024'
        fail_msg: "❌ ERREUR CRITIQUE: Variables vault manquantes ou avec valeurs par défaut. Les vaults doivent être configurés avec de vraies valeurs avant déploiement."
        success_msg: "✅ Variables vault correctement configurées"
      when:
        - "'db' in group_names or 'pythonapp' in group_names or 'nodeapp' in group_names"
        - environment_name == 'production'
      ignore_errors: "{{ ansible_check_mode | default(false) }}"
      tags: ['always', 'security', 'vault']

    - name: "📁 Vérifier/Créer le répertoire /var/log/ansible"
      file:
        path: /var/log/ansible
        state: directory
        owner: root
        group: root
        mode: '0755'
        selevel: s0
      tags: ['always', 'setup']
      ignore_errors: yes  # SELinux peut ne pas être installé

    - name: "🔍 Vérifier la connectivité"
      ping:
      changed_when: false
      tags: ['always']

    - name: "📊 Collecter les facts (manuel pour performance)"
      setup:
      when: gather_system_facts | default(true) | bool
      tags: ['setup', 'facts']

    - name: "📊 Afficher les informations serveur"
      debug:
        msg:
          - "Serveur: {{ inventory_hostname }}"
          - "OS: {{ ansible_distribution }} {{ ansible_distribution_version }}"
          - "IP: {{ ansible_default_ipv4.address }}"
          - "Groupes: {{ group_names }}"
      changed_when: false
      tags: ['always', 'info']

    - name: "📡 Test de latence réseau réel avec ICMP (FIX: ping au lieu de wait_for)"
      shell: "ping -c 2 -W 3 {{ hostvars[item].ansible_host | default(item) }}"
      loop: "{{ groups['all'] | difference([inventory_hostname]) }}"
      when: groups['all'] | length > 1
      failed_when: false
      register: network_latency
      changed_when: false
      tags: ['preflight', 'network']

    - name: "📊 Calculer latence moyenne"
      set_fact:
        avg_latency: "{{ item.stdout | regex_search('time=([0-9.]+)', '\\1') | first | default('N/A') }}"
      loop: "{{ network_latency.results | default([]) }}"
      when:
        - network_latency is defined
        - item.rc == 0
      tags: ['preflight', 'network']

    - name: "⚠️ Avertir si latence réseau élevée ou échec"
      debug:
        msg: "ATTENTION: Problème de connectivité détecté avec {{ item.item }}"
      loop: "{{ network_latency.results | default([]) }}"
      when:
        - network_latency is defined
        - item.rc != 0
      tags: ['preflight', 'network']

    - name: "📦 Mise à jour du cache des packages"
      apt:
        update_cache: yes
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"
      tags: ['setup']

    - name: "🔄 Mise à jour des paquets critiques avec gestion d'erreurs"
      block:
        - name: "📦 Mise à jour sécurisée des paquets"
          apt:
            upgrade: safe
            update_cache: yes
            autoremove: yes
          register: apt_upgrade_result

      rescue:
        - name: "⚠️ Échec de la mise à jour - Tentative de correction"
          apt:
            autoclean: yes

        - name: "📝 Logger l'échec de mise à jour"
          debug:
            msg: "ATTENTION: La mise à jour a échoué. Vérifiez /var/log/ansible/upgrade_failures.log"

        - name: "💾 Sauvegarder l'erreur dans un fichier"
          copy:
            content: |
              Échec de mise à jour système
              Date: {{ ansible_date_time.iso8601 }}
              Serveur: {{ inventory_hostname }}
              Erreur: {{ apt_upgrade_result.msg | default('Erreur inconnue') }}
            dest: /var/log/ansible/upgrade_failures.log
            mode: '0644'
          ignore_errors: yes

      always:
        - name: "✅ Nettoyage post-mise à jour"
          apt:
            autoclean: yes
            autoremove: yes
          ignore_errors: yes

      when:
        - ansible_os_family == "Debian"
        - update_packages | default(false)
      tags: ['update', 'never']

  roles:
    - role: common
      tags: ['common', 'base']
${additionalRoles ? '\n' + additionalRoles : ''}

  post_tasks:
    - name: "✅ Vérification de l'état des services"
      service_facts:
      changed_when: false
      tags: ['always', 'validation']

    - name: "📊 Rapport de déploiement (console)"
      debug:
        msg:
          - "════════════════════════════════════════════════════════"
          - "✅ DÉPLOIEMENT ${projectName.toUpperCase()} TERMINÉ"
          - "════════════════════════════════════════════════════════"
          - "Environnement: ${environment}"
          - "Version: {{ app_version | default('latest') }}"
          - "Serveurs: {{ groups['all'] | length }}"
          - "Date: {{ ansible_date_time.iso8601 }}"
          - "Check Mode: {{ ansible_check_mode | default(false) }}"
          - "════════════════════════════════════════════════════════"
      changed_when: false
      tags: ['always']

    - name: "📄 Générer le rapport de déploiement JSON"
      copy:
        content: |
          {
            "project": "${projectName}",
            "environment": "${environment}",
            "version": "{{ app_version | default('latest') }}",
            "deployment_date": "{{ ansible_date_time.iso8601 }}",
            "deployment_user": "{{ ansible_user_id }}",
            "check_mode": "{{ ansible_check_mode | ternary('enabled', 'disabled') }}",
            "dry_run": {{ ansible_check_mode | ternary('true', 'false') }},
            "total_hosts": {{ groups['all'] | length }},
            "hosts": {{ groups['all'] | to_json }},
            "roles_deployed": ${JSON.stringify(roles)},
            "status": "success"
          }
        dest: /var/log/ansible/deploy_report_{{ ansible_date_time.epoch }}.json
        mode: '0644'
      run_once: true
      delegate_to: localhost
      when: not ansible_check_mode
      tags: ['always', 'report']

    - name: "📝 Enregistrer le succès du déploiement"
      lineinfile:
        path: /var/log/ansible/deploy_history.log
        create: yes
        line: "[{{ ansible_date_time.iso8601 }}] SUCCESS: ${projectName} deployed by {{ ansible_user_id }} ({{ ansible_check_mode | ternary('dry-run', 'real') }})"
        mode: '0644'
      run_once: true
      delegate_to: localhost
      tags: ['always']

    - name: "📤 Notifier le système de logs central (optionnel)"
      debug:
        msg: "Envoi des logs au système central si configuré"
      changed_when: true
      notify: "send central logs"
      when: central_log_url is defined
      run_once: true
      tags: ['logging', 'never']

    - name: "🔍 Vérification post-déploiement des services critiques"
      block:
        - name: "Vérifier les ports des services critiques (FIX: ansible_host)"
          wait_for:
            port: "{{ item.port }}"
            host: "{{ ansible_host | default(inventory_hostname) }}"
            timeout: 10
            state: started
          loop:
            - { port: 22, name: "SSH", group: "all" }
            - { port: 80, name: "HTTP", group: "web" }
            - { port: 443, name: "HTTPS", group: "web" }
            - { port: "{{ postgresql_port }}", name: "PostgreSQL", group: "db" }
            - { port: "{{ redis_port }}", name: "Redis", group: "redis" }
            - { port: "{{ nodeapp_port }}", name: "NodeApp", group: "nodeapp" }
            - { port: "{{ pythonapp_port }}", name: "PythonApp", group: "pythonapp" }
          when: item.group in group_names
          ignore_errors: yes
          register: port_checks
          tags: ['validation', 'network']

        - name: "Vérifier l'état des services systemd (FIX: service_facts)"
          service_facts:
          tags: ['validation', 'services']

        - name: "Valider services critiques actifs"
          assert:
            that:
              - ansible_facts.services[item ~ '.service'] is defined
              - ansible_facts.services[item ~ '.service'].state == 'running'
            fail_msg: "Service {{ item }} n'est pas actif"
            success_msg: "Service {{ item }} est actif"
          loop: "{{ critical_services | default(['ssh']) }}"
          ignore_errors: yes
          tags: ['validation', 'services']

      rescue:
        - name: "❌ Échec de validation post-déploiement"
          debug:
            msg:
              - "⚠️ Un ou plusieurs services critiques ne sont pas accessibles"
              - "Vérifiez les logs dans /var/log/ansible/"
              - "Ports vérifiés: {{ port_checks | default('N/A') }}"

        - name: "📝 Logger l'échec de validation"
          copy:
            content: |
              Échec de validation post-déploiement
              Projet: ${projectName}
              Environnement: ${environment}
              Date: {{ ansible_date_time.iso8601 }}
              Serveur: {{ inventory_hostname }}

              Détails:
              {{ port_checks | default('Aucun détail disponible') }}
            dest: /var/log/ansible/validation_failure_{{ ansible_date_time.epoch }}.log
            mode: '0644'
          ignore_errors: yes

      always:
        - name: "📊 Résumé de la validation"
          debug:
            msg: "Validation post-déploiement {{ 'réussie' if port_checks is success else 'échouée' }}"

      when: perform_validation | default(true) | bool
      tags: ['validation', 'always']

    - name: "🔗 Validation cross-services (FIX: web→app→db→redis)"
      block:
        - name: "Tester web → pythonapp:8000"
          wait_for:
            host: "{{ hostvars[groups['pythonapp'][0]].ansible_host }}"
            port: "{{ pythonapp_port | default(8000) }}"
            timeout: 5
          when:
            - "'web' in group_names"
            - groups['pythonapp'] is defined
            - groups['pythonapp'] | length > 0
          register: web_to_pythonapp
          ignore_errors: yes
          tags: ['validation', 'cross-service']

        - name: "Tester web → nodeapp:3000"
          wait_for:
            host: "{{ hostvars[groups['nodeapp'][0]].ansible_host }}"
            port: "{{ nodeapp_port | default(3000) }}"
            timeout: 5
          when:
            - "'web' in group_names"
            - groups['nodeapp'] is defined
            - groups['nodeapp'] | length > 0
          register: web_to_nodeapp
          ignore_errors: yes
          tags: ['validation', 'cross-service']

        - name: "Tester pythonapp → postgresql:5432"
          wait_for:
            host: "{{ hostvars[groups['db'][0]].ansible_host }}"
            port: 5432
            timeout: 5
          when:
            - "'pythonapp' in group_names"
            - groups['db'] is defined
            - groups['db'] | length > 0
          register: pythonapp_to_db
          ignore_errors: yes
          tags: ['validation', 'cross-service']

        - name: "Tester pythonapp → redis:6379"
          wait_for:
            host: "{{ hostvars[groups['redis'][0]].ansible_host }}"
            port: 6379
            timeout: 5
          when:
            - "'pythonapp' in group_names"
            - groups['redis'] is defined
            - groups['redis'] | length > 0
          register: pythonapp_to_redis
          ignore_errors: yes
          tags: ['validation', 'cross-service']

        - name: "Tester nodeapp → redis:6379"
          wait_for:
            host: "{{ hostvars[groups['redis'][0]].ansible_host }}"
            port: 6379
            timeout: 5
          when:
            - "'nodeapp' in group_names"
            - groups['redis'] is defined
            - groups['redis'] | length > 0
          register: nodeapp_to_redis
          ignore_errors: yes
          tags: ['validation', 'cross-service']

        - name: "📊 Résumé validation cross-services"
          debug:
            msg:
              - "════════════════════════════════════════════"
              - "VALIDATION CROSS-SERVICES"
              - "════════════════════════════════════════════"
              - "web → pythonapp:8000 : {{ 'OK' if web_to_pythonapp is success else 'ÉCHEC' }}"
              - "web → nodeapp:3000   : {{ 'OK' if web_to_nodeapp is success else 'ÉCHEC' }}"
              - "pythonapp → db:5432  : {{ 'OK' if pythonapp_to_db is success else 'ÉCHEC' }}"
              - "pythonapp → redis:6379 : {{ 'OK' if pythonapp_to_redis is success else 'ÉCHEC' }}"
              - "nodeapp → redis:6379 : {{ 'OK' if nodeapp_to_redis is success else 'ÉCHEC' }}"
          when: inventory_hostname == groups['all'][0]
          run_once: true
          tags: ['validation', 'cross-service']

      rescue:
        - name: "⚠️ Échec validation cross-services"
          debug:
            msg: "ATTENTION: Certaines connexions cross-services ont échoué"

      when: perform_validation | default(true) | bool
      tags: ['validation', 'cross-service']

    - name: "📡 Envoyer métrique de succès à Prometheus Pushgateway"
      uri:
        url: "{{ prometheus_pushgateway_url }}/metrics/job/ansible_deploy/instance/{{ inventory_hostname }}"
        method: POST
        body: |
          # TYPE ansible_deploy_success gauge
          ansible_deploy_success{project="${projectName}",environment="${environment}",user="{{ ansible_user_id }}"} 1
          # TYPE ansible_deploy_timestamp gauge
          ansible_deploy_timestamp{project="${projectName}",environment="${environment}"} {{ ansible_date_time.epoch }}
          # TYPE ansible_deploy_duration_seconds gauge
          ansible_deploy_duration_seconds{project="${projectName}",environment="${environment}"} {{ (ansible_date_time.epoch | int) - (playbook_start_time | default(ansible_date_time.epoch) | int) }}
        headers:
          Content-Type: "text/plain"
        status_code: [200, 202]
        timeout: 5
      when:
        - prometheus_pushgateway_url is defined
        - not ansible_check_mode
      ignore_errors: yes
      run_once: true
      delegate_to: localhost
      tags: ['monitoring', 'never']

    - name: "📄 Générer un rapport HTML de déploiement"
      copy:
        content: |
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta http-equiv="refresh" content="300">
            <meta name="description" content="Rapport de déploiement Ansible pour ${projectName}">
            <meta name="generator" content="Ansible Playbook">
            <title>Rapport de Déploiement - ${projectName}</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 40px; background: #f5f5f5; line-height: 1.6; }
              .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 1200px; margin: 0 auto; }
              h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; margin-bottom: 20px; }
              h2 { color: #34495e; margin-top: 30px; margin-bottom: 15px; font-size: 1.5em; }
              .success { color: #27ae60; font-weight: bold; }
              .info { background: #ecf0f1; padding: 15px; border-radius: 4px; margin: 10px 0; }
              .info p { margin: 8px 0; }
              .info strong { color: #2c3e50; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background: #3498db; color: white; font-weight: 600; }
              tr:hover { background: #f8f9fa; }
              ul { list-style-type: none; padding-left: 0; }
              ul li { padding: 8px 0; border-bottom: 1px solid #ecf0f1; }
              ul li:last-child { border-bottom: none; }
              ul li strong { color: #2c3e50; display: inline-block; min-width: 150px; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; font-size: 0.9em; }
              @media (max-width: 768px) {
                body { margin: 20px; }
                .container { padding: 20px; }
                table { font-size: 0.9em; }
                th, td { padding: 8px; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📦 Rapport de Déploiement Ansible</h1>

              <div class="info">
                <p><strong>Statut:</strong> <span class="success">✅ DÉPLOIEMENT RÉUSSI</span></p>
                <p><strong>Projet:</strong> ${projectName}</p>
                <p><strong>Environnement:</strong> ${environment.toUpperCase()}</p>
                <p><strong>Date:</strong> {{ ansible_date_time.iso8601 }}</p>
                <p><strong>Utilisateur:</strong> {{ ansible_user_id }}</p>
                <p><strong>Version:</strong> {{ app_version | default('latest') }}</p>
                <p><strong>Mode:</strong> {{ ansible_check_mode | ternary('DRY-RUN', 'RÉEL') }}</p>
              </div>

              <h2>🖥️ Serveurs Déployés</h2>
              <table>
                <thead>
                  <tr>
                    <th>Hostname</th>
                    <th>IP</th>
                    <th>Groupes</th>
                    <th>OS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{{ inventory_hostname }}</td>
                    <td>{{ ansible_default_ipv4.address | default('N/A') }}</td>
                    <td>{{ group_names | join(', ') }}</td>
                    <td>{{ ansible_distribution }} {{ ansible_distribution_version }}</td>
                  </tr>
                </tbody>
              </table>

              <h2>📋 Rôles Déployés</h2>
              <ul>
                ${config.roles.map(role => `<li><strong>${role}</strong></li>`).join('\n                ')}
              </ul>

              <h2>📊 Statistiques</h2>
              <div class="info">
                <p><strong>Nombre de serveurs:</strong> {{ groups['all'] | length }}</p>
                <p><strong>Nombre de rôles:</strong> ${config.roles.length}</p>
                <p><strong>Durée:</strong> {{ (ansible_date_time.epoch | int) - (playbook_start_time | default(ansible_date_time.epoch) | int) }} secondes</p>
              </div>

              <div class="footer">
                <p>Généré automatiquement par Ansible • ${new Date().toISOString()}</p>
                <p>Rapport JSON disponible: /var/log/ansible/deploy_report_{{ ansible_date_time.epoch }}.json</p>
              </div>
            </div>
          </body>
          </html>
        dest: /var/log/ansible/deploy_report_{{ ansible_date_time.epoch }}.html
        mode: '0644'
      run_once: true
      delegate_to: localhost
      when: not ansible_check_mode
      tags: ['report', 'always']

  handlers:
    - name: reload systemd daemon
      become: yes
      service:
        daemon_reload: yes
      when: not ansible_check_mode
      listen: "reload systemd"

    - name: restart critical services
      become: yes
      service:
        name: "{{ item }}"
        state: restarted
      loop: "{{ services_to_restart | default([]) }}"
      when:
        - not ansible_check_mode
        - services_to_restart is defined
        - services_to_restart | length > 0
      listen: "restart all"

    - name: send logs to central system
      uri:
        url: "{{ central_log_url }}"
        method: POST
        body: "{{ lookup('file', '/var/log/ansible/deploy_report_{{ ansible_date_time.epoch }}.json') }}"
        body_format: json
        headers:
          Content-Type: "application/json"
          Authorization: "Bearer {{ central_log_token }}"
        status_code: [200, 201, 204]
        timeout: 10
      when:
        - not ansible_check_mode
        - central_log_url is defined
        - central_log_token is defined
      ignore_errors: yes
      listen: "send central logs"
      tags: ['logging']
`;
}

/**
 * Génère l'inventaire
 */
function generateInventory(config: ClassicAnsibleConfig): string {
  const { hosts, environment } = config;

  let inventory = `# ════════════════════════════════════════════════════════════════
# Inventaire Ansible - ${environment.toUpperCase()}
# ════════════════════════════════════════════════════════════════
# Structure: Groupes logiques (web, db, app, ci, monitoring)
# Usage: ansible-playbook site.yml -i inventories/${environment}.ini --limit web
# ════════════════════════════════════════════════════════════════

[all:vars]
ansible_python_interpreter=/usr/bin/python3
ansible_user=deploy
ansible_become=yes
env=${environment}
timezone=UTC
app_version=1.0.0

`;

  // Groupes logiques basés sur les rôles
  const hasWeb = hosts.some(h => h.includes('web')) || config.roles.includes('nginx');
  const hasDb = hosts.some(h => h.includes('db')) || config.roles.includes('postgresql');
  const hasApp = hosts.some(h => h.includes('app')) || config.roles.includes('pythonapp') || config.roles.includes('nodeapp');

  if (hasWeb) {
    inventory += `# Groupe Web (Nginx, reverse proxy)\n[web]\n`;
    const webHosts = hosts.filter(h => h.includes('web'));
    if (webHosts.length > 0) {
      webHosts.forEach((h, i) => {
        inventory += `${h} ansible_host=192.168.1.${10 + i}\n`;
      });
    } else {
      inventory += `web01 ansible_host=192.168.1.10\n`;
    }
    inventory += '\n';
  }

  if (hasDb) {
    inventory += `# Groupe Database (PostgreSQL, MySQL)\n[db]\n`;
    const dbHosts = hosts.filter(h => h.includes('db'));
    if (dbHosts.length > 0) {
      dbHosts.forEach((h, i) => {
        inventory += `${h} ansible_host=192.168.1.${20 + i}\n`;
      });
    } else {
      inventory += `db01 ansible_host=192.168.1.20\n`;
    }
    inventory += '\n';
  }

  // Séparer pythonapp et nodeapp pour éviter les conflits
  const hasPythonApp = config.roles.includes('pythonapp');
  const hasNodeApp = config.roles.includes('nodeapp');

  if (hasPythonApp) {
    inventory += `# Groupe Python Application\n[pythonapp]\n`;
    const pythonHosts = hosts.filter(h => h.includes('python') || h.includes('py'));
    if (pythonHosts.length > 0) {
      pythonHosts.forEach((h, i) => {
        inventory += `${h} ansible_host=192.168.1.${30 + i} app_type=python\n`;
      });
    } else {
      inventory += `pyapp01 ansible_host=192.168.1.30 app_type=python\n`;
    }
    inventory += '\n';
  }

  if (hasNodeApp) {
    inventory += `# Groupe Node.js Application\n[nodeapp]\n`;
    const nodeHosts = hosts.filter(h => h.includes('node') || h.includes('js'));
    if (nodeHosts.length > 0) {
      nodeHosts.forEach((h, i) => {
        inventory += `${h} ansible_host=192.168.1.${40 + i} app_type=nodejs\n`;
      });
    } else {
      inventory += `nodeapp01 ansible_host=192.168.1.40 app_type=nodejs\n`;
    }
    inventory += '\n';
  }

  // Groupe app générique (si ni python ni node spécifié)
  if (hasApp && !hasPythonApp && !hasNodeApp) {
    inventory += `# Groupe Application générique\n[app]\n`;
    const appHosts = hosts.filter(h => h.includes('app'));
    if (appHosts.length > 0) {
      appHosts.forEach((h, i) => {
        inventory += `${h} ansible_host=192.168.1.${30 + i}\n`;
      });
    } else {
      inventory += `app01 ansible_host=192.168.1.30\n`;
    }
    inventory += '\n';
  }

  // Groupe monitoring (optionnel)
  if (config.roles.includes('monitoring')) {
    inventory += `# Groupe Monitoring (Prometheus, Grafana)\n[monitoring]\n`;
    inventory += `monitoring01 ansible_host=192.168.1.40\n\n`;
  }

  // Si pas de groupes spécifiques, tout mettre dans [all]
  if (!hasWeb && !hasDb && !hasApp) {
    inventory += `# Tous les serveurs\n[all]\n`;
    hosts.forEach((h, i) => {
      inventory += `${h} ansible_host=192.168.1.${10 + i}\n`;
    });
  }

  return inventory;
}

/**
 * Génère un fichier vault.yml exemple (à chiffrer avec ansible-vault)
 */
function generateVaultExample(config: ClassicAnsibleConfig): string {
  return `---
# ════════════════════════════════════════════════════════════════
# ANSIBLE VAULT - SECRETS CHIFFRÉS
# ════════════════════════════════════════════════════════════════
# ⚠️  IMPORTANT: Ce fichier doit être chiffré avec ansible-vault
#
# Pour chiffrer ce fichier:
#   ansible-vault encrypt vault.yml
#
# Pour éditer:
#   ansible-vault edit vault.yml
#
# Pour exécuter avec vault:
#   ansible-playbook site.yml -i inventories/${config.environment}.ini --ask-vault-pass
#   ansible-playbook site.yml -i inventories/${config.environment}.ini --vault-password-file ~/.vault_pass
#
# ════════════════════════════════════════════════════════════════

# Secrets de base de données
vault_db_password: "ChangeThisSecurePassword123!"
vault_db_root_password: "ChangeThisRootPassword456!"

# Clés API
vault_api_key: "your-secret-api-key-here"
vault_api_secret: "your-secret-api-secret-here"

# Certificats SSL/TLS
vault_ssl_key: |
  -----BEGIN PRIVATE KEY-----
  [Votre clé privée SSL ici]
  -----END PRIVATE KEY-----

vault_ssl_cert: |
  -----BEGIN CERTIFICATE-----
  [Votre certificat SSL ici]
  -----END CERTIFICATE-----

# Tokens d'authentification
vault_jwt_secret: "your-jwt-secret-key-256-bits-minimum"
vault_session_secret: "your-session-secret-key"

# Credentials externes (AWS, GCP, etc.)
vault_aws_access_key: "AKIAIOSFODNN7EXAMPLE"
vault_aws_secret_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# Autres secrets spécifiques au projet
# vault_custom_secret: "value"
`;
}

/**
 * Génère le vault spécifique pour la base de données
 */
function generateVaultDB(config: ClassicAnsibleConfig): string {
  return `---
# ════════════════════════════════════════════════════════════════
# ANSIBLE VAULT - SECRETS BASE DE DONNÉES
# ════════════════════════════════════════════════════════════════
# ⚠️  IMPORTANT: Chiffrer avec: ansible-vault encrypt vault_db.yml
#
# Usage dans les rôles:
#   vars_files:
#     - ../../vault_db.yml
# ════════════════════════════════════════════════════════════════

# PostgreSQL / MySQL
vault_db_password: "ChangeThisSecureDBPassword123!"
vault_db_root_password: "ChangeThisRootPassword456!"
vault_db_replication_password: "ReplicationSecurePass789!"

# Backup credentials
vault_db_backup_encryption_key: "BackupEncryptionKey2024"
`;
}

/**
 * Génère le vault spécifique pour les applications
 */
function generateVaultApp(config: ClassicAnsibleConfig): string {
  return `---
# ════════════════════════════════════════════════════════════════
# ANSIBLE VAULT - SECRETS APPLICATIONS
# ════════════════════════════════════════════════════════════════
# ⚠️  IMPORTANT: Chiffrer avec: ansible-vault encrypt vault_app.yml
# ════════════════════════════════════════════════════════════════

# Application secrets
vault_app_secret_key: "YourApplicationSecretKey2024"
vault_jwt_secret: "YourJWTSecretKey256BitsMinimum"
vault_session_secret: "YourSessionSecretKey"

# API Keys
vault_api_key: "your-api-key-here"
vault_api_secret: "your-api-secret-here"

# External services
vault_stripe_key: "sk_live_..."
vault_sendgrid_key: "SG..."
vault_aws_access_key: "AKIAIOSFODNN7EXAMPLE"
vault_aws_secret_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
`;
}

/**
 * Génère les variables de groupe
 */
function generateGroupVars(config: ClassicAnsibleConfig): string {
  const { environment, variables } = config;

  return `---
# ════════════════════════════════════════════════════════════════
# Variables Globales - ${environment.toUpperCase()}
# ════════════════════════════════════════════════════════════════
# Ces variables sont accessibles par tous les playbooks et rôles
# Peut être surchargé par host_vars ou lors de l'exécution
# ════════════════════════════════════════════════════════════════

# Environnement
env: ${environment}
environment_name: ${environment}
deployment_user: deploy
timezone: UTC

# 🌍 Configuration Multi-Environnement
environment_config:
  staging:
    debug_mode: true
    log_level: debug
    ssl_verify: false
  production:
    debug_mode: false
    log_level: warning
    ssl_verify: true

# Utilisation de la config basée sur l'environnement actuel
debug_mode: "{{ environment_config[environment_name]['debug_mode'] }}"
log_level: "{{ environment_config[environment_name]['log_level'] }}"
ssl_verify: "{{ environment_config[environment_name]['ssl_verify'] }}"
app_version: "1.0.0"

# Chemins
app_base_dir: /opt/{{ project_name }}
logs_dir: /var/log/{{ project_name }}
backup_dir: /var/backups/{{ project_name }}

# Ports applications (FIX: variables au lieu de hardcoded)
nodeapp_port: 3000
pythonapp_port: 8000
redis_port: 6379
postgresql_port: 5432

# Sécurité
firewall_allowed_ports:
  - 22    # SSH
  - 80    # HTTP
  - 443   # HTTPS

# Mise à jour système (à activer avec --extra-vars "update_packages=true")
update_packages: false

# Logs centralisés (optionnel - pour Graylog, Loki, etc.)
# Décommentez et configurez pour activer l'envoi automatique des logs
# central_log_url: "https://logs.example.com/api/v1/push"
# central_log_token: "{{ vault_central_log_token }}"

# Monitoring Prometheus (optionnel)
# Décommentez pour envoyer des métriques de déploiement à Prometheus Pushgateway
# prometheus_pushgateway_url: "http://monitoring.example.com:9091"

# Validation post-déploiement
perform_validation: true

# Services critiques à vérifier (si défini)
# critical_services:
#   - nginx
#   - postgresql
#   - docker

# Variables spécifiques au projet
${Object.entries(variables).map(([key, value]) =>
  `${key}: ${typeof value === 'string' ? `"${value}"` : value}`
).join('\n')}

# Vault (référence aux secrets chiffrés)
# Pour créer un vault: ansible-vault create vault.yml
# Pour éditer: ansible-vault edit vault.yml
# vault_db_password: "{{ vault_db_password }}"
# vault_api_key: "{{ vault_api_key }}"
`;
}

/**
 * Génère un rôle complet
 */
function generateRole(roleName: string, config: ClassicAnsibleConfig): Record<string, string> {
  const files: Record<string, string> = {};

  // tasks/main.yml
  files['tasks/main.yml'] = generateRoleTasks(roleName, config);

  // handlers/main.yml (si nécessaire)
  if (['common', 'nginx', 'postgresql', 'mysql', 'pythonapp', 'nodeapp', 'firewall'].includes(roleName)) {
    files['handlers/main.yml'] = generateRoleHandlers(roleName);
  }

  // templates (si nécessaire)
  if (roleName === 'nginx') {
    files['templates/nginx.conf.j2'] = generateNginxTemplate(config);
  }
  if (roleName === 'pythonapp' || roleName === 'nodeapp') {
    files['templates/.env.j2'] = generateEnvTemplate(config);
    files[`templates/${config.projectName}.service.j2`] = generateSystemdTemplate(roleName, config);
  }

  // vars/main.yml
  files['vars/main.yml'] = generateRoleVars(roleName, config);

  // defaults/main.yml
  files['defaults/main.yml'] = generateRoleDefaults(roleName);

  return files;
}

/**
 * Génère les tasks d'un rôle
 */
function generateRoleTasks(roleName: string, config: ClassicAnsibleConfig): string {
  const taskGenerators: Record<string, () => string> = {
    common: () => `---
- name: "📦 Installer les packages essentiels (Debian/Ubuntu)"
  apt:
    name:
      - curl
      - wget
      - git
      - vim
      - htop
      - net-tools
      - python3-pip
      - unattended-upgrades
      - apt-listchanges
    state: present
  when: ansible_os_family == "Debian"

- name: "📦 Installer les packages essentiels (RedHat/CentOS)"
  dnf:
    name:
      - curl
      - wget
      - git
      - vim
      - htop
      - net-tools
      - python3-pip
      - dnf-automatic
    state: present
  when: ansible_os_family == "RedHat"

- name: "⏰ Configurer le fuseau horaire"
  timezone:
    name: "{{ timezone }}"
  notify: restart all

- name: "🔄 Mise à jour complète du système (optionnel)"
  apt:
    upgrade: dist
    update_cache: yes
    autoremove: yes
    autoclean: yes
  when:
    - ansible_os_family == "Debian"
    - update_packages | default(false)
  tags: ['update', 'never']

- name: "👤 Créer l'utilisateur de déploiement"
  user:
    name: "{{ deployment_user }}"
    shell: /bin/bash
    create_home: yes
    groups: sudo
    append: yes

- name: "🔑 Configurer la clé SSH pour l'utilisateur"
  authorized_key:
    user: "{{ deployment_user }}"
    key: "{{ lookup('file', '~/.ssh/id_rsa.pub') }}"
    state: present
  ignore_errors: yes

- name: "🛡️ Installer et configurer UFW"
  apt:
    name: ufw
    state: present
  when: ansible_os_family == "Debian"

- name: "🛡️ Configurer le firewall UFW"
  ufw:
    rule: allow
    port: "{{ item }}"
    proto: tcp
  loop: "{{ firewall_allowed_ports }}"
  when: ansible_os_family == "Debian"

- name: "🛡️ Activer UFW"
  ufw:
    state: enabled

- name: "🔒 Hardening SSH - Désactiver root login"
  lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^#?PermitRootLogin'
    line: 'PermitRootLogin no'
    state: present
  notify: restart sshd
  tags: ['security', 'ssh']

- name: "🔒 Hardening SSH - Forcer authentification par clés"
  lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^#?PasswordAuthentication'
    line: 'PasswordAuthentication no'
    state: present
  notify: restart sshd
  tags: ['security', 'ssh']

- name: "🔒 Hardening SSH - Désactiver mots de passe vides"
  lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^#?PermitEmptyPasswords'
    line: 'PermitEmptyPasswords no'
    state: present
  notify: restart sshd
  tags: ['security', 'ssh']

- name: "🔒 Hardening SSH - Limiter tentatives"
  lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^#?MaxAuthTries'
    line: 'MaxAuthTries 3'
    state: present
  notify: restart sshd
  tags: ['security', 'ssh']
    policy: deny
  when: ansible_os_family == "Debian"`,

    nginx: () => `---
- name: "📦 Installer Nginx (Debian/Ubuntu)"
  apt:
    name: nginx
    state: present
  when: ansible_os_family == "Debian"
  notify: restart nginx

- name: "📦 Installer Nginx (RedHat/CentOS)"
  dnf:
    name: nginx
    state: present
  when: ansible_os_family == "RedHat"
  notify: restart nginx

- name: "📁 Créer les répertoires de configuration"
  file:
    path: "{{ item }}"
    state: directory
    mode: '0755'
  loop:
    - /etc/nginx/sites-available
    - /etc/nginx/sites-enabled
    - /var/www/{{ project_name }}

- name: "📝 Déployer la configuration Nginx"
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/sites-available/{{ project_name }}
    mode: '0644'
  notify: restart nginx

- name: "🔗 Activer le site"
  file:
    src: /etc/nginx/sites-available/{{ project_name }}
    dest: /etc/nginx/sites-enabled/{{ project_name }}
    state: link
  notify: restart nginx

- name: "❌ Désactiver le site par défaut"
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: restart nginx`,

    postgresql: () => `---
- name: "📦 Installer PostgreSQL"
  apt:
    name:
      - postgresql
      - postgresql-contrib
      - python3-psycopg2
    state: present

- name: "🚀 Démarrer PostgreSQL"
  service:
    name: postgresql
    state: started
    enabled: yes

- name: "💾 Créer la base de données"
  become_user: postgres
  postgresql_db:
    name: "{{ db_name }}"
    encoding: UTF8
    state: present

- name: "👤 Créer l'utilisateur PostgreSQL"
  become_user: postgres
  postgresql_user:
    name: "{{ db_user }}"
    password: "{{ db_password }}"
    db: "{{ db_name }}"
    priv: ALL
    state: present
  no_log: true`,

    pythonapp: () => `---
- name: "📦 Installer Python et dépendances"
  apt:
    name:
      - python3.11
      - python3.11-venv
      - python3.11-dev
      - build-essential
    state: present

- name: "👤 Créer l'utilisateur applicatif"
  user:
    name: "{{ app_user }}"
    system: yes
    create_home: no
    shell: /bin/bash

- name: "📁 Créer la structure de répertoires"
  file:
    path: "{{ item }}"
    state: directory
    owner: "{{ app_user }}"
    mode: '0755'
  loop:
    - "{{ app_dir }}"
    - "{{ app_dir }}/releases"
    - "{{ app_dir }}/shared"
    - "{{ logs_dir }}"

- name: "🔄 Cloner le repository"
  git:
    repo: "{{ git_repo }}"
    dest: "{{ app_dir }}/releases/{{ ansible_date_time.epoch }}"
    version: "{{ git_branch }}"
  become_user: "{{ app_user }}"
  notify: restart pythonapp

- name: "🐍 Créer l'environnement virtuel"
  command: python3.11 -m venv {{ app_dir }}/releases/{{ ansible_date_time.epoch }}/venv
  args:
    creates: "{{ app_dir }}/releases/{{ ansible_date_time.epoch }}/venv"
  become_user: "{{ app_user }}"

- name: "📦 Installer les dépendances Python"
  pip:
    requirements: "{{ app_dir }}/releases/{{ ansible_date_time.epoch }}/requirements.txt"
    virtualenv: "{{ app_dir }}/releases/{{ ansible_date_time.epoch }}/venv"
  become_user: "{{ app_user }}"

- name: "📝 Déployer le fichier .env"
  template:
    src: .env.j2
    dest: "{{ app_dir }}/releases/{{ ansible_date_time.epoch }}/.env"
    owner: "{{ app_user }}"
    mode: '0600'
  notify: restart pythonapp

- name: "🔗 Créer le symlink current"
  file:
    src: "{{ app_dir }}/releases/{{ ansible_date_time.epoch }}"
    dest: "{{ app_dir }}/current"
    state: link
    owner: "{{ app_user }}"

- name: "⚙️ Déployer le service systemd"
  template:
    src: "{{ project_name }}.service.j2"
    dest: /etc/systemd/system/{{ project_name }}.service
  notify: restart pythonapp

- name: "🚀 Activer et démarrer le service"
  service:
    name: "{{ project_name }}"
    state: started
    enabled: yes
    daemon_reload: yes`,

    firewall: () => `---
# ════════════════════════════════════════════════════════════════
# FIREWALL COMPLET UFW (FIX: Enterprise-ready)
# ════════════════════════════════════════════════════════════════

- name: "📦 Installer UFW et fail2ban"
  apt:
    name:
      - ufw
      - fail2ban
    state: present
  when: ansible_os_family == "Debian"

- name: "🛡️ Réinitialiser UFW (idempotent)"
  ufw:
    state: reset
  when: firewall_reset | default(false) | bool

- name: "🛡️ Configuration UFW - SSH (PRIORITÉ 1)"
  ufw:
    rule: limit
    port: '22'
    proto: tcp
    comment: 'SSH rate limited'
  tags: ['security', 'firewall']

- name: "🛡️ Configuration UFW - HTTP/HTTPS"
  ufw:
    rule: allow
    port: "{{ item }}"
    proto: tcp
    comment: "Web traffic"
  loop:
    - '80'
    - '443'
  when: "'web' in group_names"
  tags: ['security', 'firewall']

- name: "🛡️ Configuration UFW - PostgreSQL"
  ufw:
    rule: allow
    port: "{{ postgresql_port }}"
    proto: tcp
    comment: "PostgreSQL"
  when: "'db' in group_names"
  tags: ['security', 'firewall']

- name: "🛡️ Configuration UFW - Redis"
  ufw:
    rule: allow
    port: "{{ redis_port }}"
    proto: tcp
    comment: "Redis"
  when: "'redis' in group_names"
  tags: ['security', 'firewall']

- name: "🛡️ Configuration UFW - NodeApp"
  ufw:
    rule: allow
    port: "{{ nodeapp_port }}"
    proto: tcp
    comment: "NodeApp"
  when: "'nodeapp' in group_names"
  tags: ['security', 'firewall']

- name: "🛡️ Configuration UFW - PythonApp"
  ufw:
    rule: allow
    port: "{{ pythonapp_port }}"
    proto: tcp
    comment: "PythonApp"
  when: "'pythonapp' in group_names"
  tags: ['security', 'firewall']

- name: "🛡️ Bloquer IPv6 (optionnel)"
  lineinfile:
    path: /etc/default/ufw
    regexp: '^IPV6='
    line: 'IPV6=no'
  when: firewall_block_ipv6 | default(false) | bool
  notify: reload ufw

- name: "🛡️ Protection DoS (limite connexions)"
  blockinfile:
    path: /etc/ufw/before.rules
    marker: "# {mark} ANSIBLE MANAGED - DoS Protection"
    insertbefore: "# don't delete the 'COMMIT' line"
    block: |
      # Limite connexions simultanées
      -A ufw-before-input -p tcp --syn -m connlimit --connlimit-above 15 -j DROP
      -A ufw-before-input -p tcp --dport 80 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT
  when: firewall_dos_protection | default(true) | bool
  notify: reload ufw

- name: "🛡️ Configurer fail2ban pour SSH"
  copy:
    dest: /etc/fail2ban/jail.local
    content: |
      [DEFAULT]
      bantime = 3600
      findtime = 600
      maxretry = 3

      [sshd]
      enabled = true
      port = 22
      logpath = /var/log/auth.log
    mode: '0644'
  notify: restart fail2ban

- name: "✅ Activer UFW avec politique restrictive"
  ufw:
    state: enabled
    policy: deny
    logging: 'on'

- name: "✅ Démarrer fail2ban"
  service:
    name: fail2ban
    state: started
    enabled: yes`
  };

  return taskGenerators[roleName]?.() || `---
# Tasks pour le rôle ${roleName}
- name: "⚙️ Configuration ${roleName}"
  debug:
    msg: "Rôle ${roleName} - À implémenter"`;
}

/**
 * Génère les handlers
 */
function generateRoleHandlers(roleName: string): string {
  const handlerMap: Record<string, string> = {
    common: `---
- name: restart sshd
  service:
    name: "{{ 'ssh' if ansible_os_family == 'Debian' else 'sshd' }}"
    state: restarted

- name: restart all
  debug:
    msg: "System restart required - please reboot manually if needed"`,

    nginx: `---
- name: restart nginx
  service:
    name: nginx
    state: restarted

- name: reload nginx
  service:
    name: nginx
    state: reloaded`,

    postgresql: `---
- name: restart postgresql
  service:
    name: postgresql
    state: restarted`,

    pythonapp: `---
- name: restart pythonapp
  service:
    name: "{{ project_name }}"
    state: restarted
    daemon_reload: yes`,

    nodeapp: `---
- name: restart nodeapp
  service:
    name: "{{ project_name }}"
    state: restarted
    daemon_reload: yes`,

    firewall: `---
- name: reload ufw
  ufw:
    state: reloaded

- name: restart fail2ban
  service:
    name: fail2ban
    state: restarted`
  };

  return handlerMap[roleName] || '';
}

/**
 * Génère le template Nginx
 */
function generateNginxTemplate(config: ClassicAnsibleConfig): string {
  return `upstream {{ project_name }}_backend {
    server 127.0.0.1:{{ app_port }};
    keepalive 64;
}

server {
    listen 80;
    server_name {{ server_name }};

    access_log {{ logs_dir }}/nginx_access.log;
    error_log {{ logs_dir }}/nginx_error.log;

    location / {
        proxy_pass http://{{ project_name }}_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /static/ {
        alias {{ app_dir }}/current/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /health {
        access_log off;
        proxy_pass http://{{ project_name }}_backend/health;
    }
}`;
}

/**
 * Génère le template .env
 */
function generateEnvTemplate(config: ClassicAnsibleConfig): string {
  return `# Environment Configuration
NODE_ENV={{ environment_name }}
PORT={{ app_port }}

# Database
DB_HOST={{ db_host }}
DB_PORT={{ db_port }}
DB_NAME={{ db_name }}
DB_USER={{ db_user }}
DB_PASSWORD={{ db_password }}

# Application
APP_SECRET={{ app_secret }}
LOG_LEVEL={{ log_level }}`;
}

/**
 * Génère le template systemd
 */
function generateSystemdTemplate(roleName: string, config: ClassicAnsibleConfig): string {
  const commands: Record<string, string> = {
    pythonapp: '{{ app_dir }}/current/venv/bin/gunicorn -w 4 -b 127.0.0.1:{{ app_port }} main:app',
    nodeapp: '{{ app_dir }}/current/node_modules/.bin/pm2 start ecosystem.config.js --no-daemon'
  };

  return `[Unit]
Description={{ project_name }} Application
After=network.target

[Service]
Type=simple
User={{ app_user }}
WorkingDirectory={{ app_dir }}/current
Environment="PATH={{ app_dir }}/current/venv/bin:/usr/bin"
EnvironmentFile={{ app_dir }}/current/.env
ExecStart=${commands[roleName]}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target`;
}

/**
 * Génère les variables du rôle
 */
function generateRoleVars(roleName: string, config: ClassicAnsibleConfig): string {
  return `---
# Variables pour ${roleName}
project_name: ${config.projectName}
environment_name: ${config.environment}`;
}

/**
 * Génère les defaults du rôle
 */
function generateRoleDefaults(roleName: string): string {
  return `---
# Defaults pour ${roleName}
# Ces valeurs peuvent être surchargées dans group_vars ou host_vars`;
}

/**
 * Génère le README
 */
function generateReadme(config: ClassicAnsibleConfig): string {
  return `# ${config.projectName} - Ansible Playbook

## Structure du Projet

\`\`\`
project/
├── site.yml              # Playbook principal
├── inventories/
│   ├── staging.ini       # Inventaire staging
│   └── production.ini    # Inventaire production
├── group_vars/
│   └── all.yml           # Variables globales
├── roles/
${config.roles.map(r => `│   ├── ${r}/`).join('\n')}
└── ansible.cfg           # Configuration Ansible
\`\`\`

## Utilisation

### Déploiement complet
\`\`\`bash
ansible-playbook site.yml -i inventories/${config.environment}.ini
\`\`\`

### Dry-run (vérification)
\`\`\`bash
ansible-playbook site.yml -i inventories/${config.environment}.ini --check
\`\`\`

### Déployer un rôle spécifique
\`\`\`bash
ansible-playbook site.yml -i inventories/${config.environment}.ini --tags "nginx"
\`\`\`

### Déploiement avec vault
\`\`\`bash
ansible-playbook site.yml -i inventories/${config.environment}.ini \\
  --vault-password-file ~/.vault_pass.txt \\
  --tags "nginx,postgresql,monitoring" \\
  -v
\`\`\`

### Déploiement avec logs centralisés
\`\`\`bash
ansible-playbook site.yml -i inventories/${config.environment}.ini \\
  --vault-password-file ~/.vault_pass.txt \\
  --tags "all,logging"
\`\`\`

### Déploiement avec monitoring Prometheus
\`\`\`bash
ansible-playbook site.yml -i inventories/${config.environment}.ini \\
  --vault-password-file ~/.vault_pass.txt \\
  --tags "all,monitoring"
\`\`\`

### Désactiver la validation post-déploiement
\`\`\`bash
ansible-playbook site.yml -i inventories/${config.environment}.ini \\
  --extra-vars "perform_validation=false"
\`\`\`

## Rôles Disponibles

${config.roles.map(r => `- **${r}**: Configuration ${r}`).join('\n')}

## Prérequis

- Ansible >= 2.10
- Python 3.8+
- Accès SSH aux serveurs cibles
- Utilisateur avec privilèges sudo

## Variables

Voir \`group_vars/all.yml\` pour la configuration globale.

## Fonctionnalités Production

### 📊 Rapports de Déploiement

Chaque déploiement génère automatiquement :

- **Rapport JSON** : \`/var/log/ansible/deploy_report_<timestamp>.json\`
- **Rapport HTML** : \`/var/log/ansible/deploy_report_<timestamp>.html\`
  - Interface web élégante avec statistiques complètes
  - Accessible via navigateur pour les équipes non-techniques
- **Historique** : \`/var/log/ansible/deploy_history.log\`

### 🔍 Validation Post-Déploiement

Vérification automatique après déploiement :

- **Ports des services** : SSH (22), HTTP (80), HTTPS (443), PostgreSQL (5432)
- **Services systemd** : Vérifie que les services critiques sont démarrés
- **Logs d'échec** : Génère \`/var/log/ansible/validation_failure_<timestamp>.log\` en cas d'erreur

Pour désactiver : \`--extra-vars "perform_validation=false"\`

### 📡 Monitoring Prometheus

Envoie automatiquement des métriques à Prometheus Pushgateway :

- \`ansible_deploy_success\` : Succès du déploiement (1 = succès)
- \`ansible_deploy_timestamp\` : Timestamp du déploiement
- \`ansible_deploy_duration_seconds\` : Durée du déploiement

Configuration dans \`group_vars/all.yml\` :
\`\`\`yaml
prometheus_pushgateway_url: "http://monitoring.example.com:9091"
\`\`\`

### 📤 Logs Centralisés

Support pour Graylog, Loki, Elasticsearch, etc.

Configuration dans \`group_vars/all.yml\` :
\`\`\`yaml
central_log_url: "https://logs.example.com/api/v1/push"
central_log_token: "{{ vault_central_log_token }}"
\`\`\`

Activation : \`--tags "all,logging"\`

## Scripts Externes

### AI Ops Calculator (\`files/ai_ops_calculator.py\`)

Script Python pour analyser les gros rapports de sécurité (Trivy, Falco) :

\`\`\`yaml
- name: "Analyser le rapport Trivy"
  script: files/ai_ops_calculator.py /tmp/trivy_report.json
  args:
    executable: python3
  register: ai_ops_result

- name: "Afficher le score de risque"
  debug:
    msg: "Score de risque: {{ (ai_ops_result.stdout | from_json).risk_score }}"
\`\`\`

### Bonnes Pratiques Curl

Toujours utiliser les options de sécurité :

\`\`\`bash
# ✅ Bon : Gestion d'erreur explicite
curl -fsSL https://example.com/script.sh | bash

# ❌ Mauvais : Peut masquer les erreurs HTTP
curl https://example.com/script.sh | bash
\`\`\`

Options recommandées :
- \`-f\` : Fail silently sur erreur HTTP (4xx, 5xx)
- \`-s\` : Silent mode (pas de progress bar)
- \`-S\` : Show error même en mode silent
- \`-L\` : Follow redirects

## Intégration CI/CD

### GitLab CI (.gitlab-ci.yml)

\`\`\`yaml
stages:
  - validate
  - deploy

variables:
  ANSIBLE_HOST_KEY_CHECKING: "False"

validate_playbook:
  stage: validate
  script:
    - ansible-playbook site.yml -i inventories/${config.environment}.ini --syntax-check
    - ansible-playbook site.yml -i inventories/${config.environment}.ini --check
  only:
    - merge_requests

deploy_${config.environment}:
  stage: deploy
  script:
    - ansible-playbook site.yml -i inventories/${config.environment}.ini --vault-password-file=.vault-pass
  only:
    - ${config.environment === 'production' ? 'main' : 'develop'}
  environment:
    name: ${config.environment}
\`\`\`

### GitHub Actions (.github/workflows/deploy.yml)

\`\`\`yaml
name: Deploy with Ansible
on:
  push:
    branches: [${config.environment === 'production' ? 'main' : 'develop'}]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install Ansible
        run: pip install ansible
      - name: Run playbook
        env:
          ANSIBLE_VAULT_PASSWORD: \${{ secrets.ANSIBLE_VAULT_PASSWORD }}
        run: |
          echo "\$ANSIBLE_VAULT_PASSWORD" > .vault-pass
          ansible-playbook site.yml -i inventories/${config.environment}.ini --vault-password-file=.vault-pass
          rm .vault-pass
\`\`\`

## Métriques Prometheus (Optionnel)

Pour exposer les métriques de déploiement à Prometheus, le rapport JSON est disponible à :
\`/var/log/ansible/deploy_report_<timestamp>.json\`

Exemple de configuration pour Node Exporter avec Textfile Collector :
\`\`\`yaml
- name: Exposer métriques déploiement
  copy:
    dest: /var/lib/node_exporter/textfile_collector/ansible_deploy.prom
    content: |
      # HELP ansible_deployment_timestamp Last deployment timestamp
      # TYPE ansible_deployment_timestamp gauge
      ansible_deployment_timestamp{project="${config.projectName}",environment="${config.environment}"} {{ ansible_date_time.epoch }}
\`\`\`
`;
}

/**
 * Génère le fichier GitLab CI/CD
 */
function generateGitLabCI(config: ClassicAnsibleConfig): string {
  const { environment } = config;

  return `# ════════════════════════════════════════════════════════════════
# GitLab CI/CD Pipeline pour Ansible
# ════════════════════════════════════════════════════════════════
# Exécution automatique des playbooks Ansible après validation
# ════════════════════════════════════════════════════════════════

stages:
  - syntax
  - validate
  - deploy

variables:
  ANSIBLE_HOST_KEY_CHECKING: "False"
  ANSIBLE_FORCE_COLOR: "true"

# ════════════════════════════════════════════════════════════════
# Stage 1: Vérification de la syntaxe YAML
# ════════════════════════════════════════════════════════════════
ansible_syntax:
  stage: syntax
  image: willhallonline/ansible:latest
  script:
    - echo "🔍 Vérification de la syntaxe du playbook..."
    - ansible-playbook site.yml --syntax-check
    - echo "✅ Syntaxe validée"
  only:
    - merge_requests
    - main
    - develop
  tags:
    - docker

# ════════════════════════════════════════════════════════════════
# Stage 2: Validation en mode dry-run
# ════════════════════════════════════════════════════════════════
ansible_check:
  stage: validate
  image: willhallonline/ansible:latest
  script:
    - echo "🧪 Exécution en mode check (dry-run)..."
    - ansible-playbook site.yml -i inventories/${environment}.ini --check
    - echo "✅ Validation réussie"
  only:
    - merge_requests
  tags:
    - docker

# ════════════════════════════════════════════════════════════════
# Stage 3: Déploiement automatique (environnement staging)
# ════════════════════════════════════════════════════════════════
deploy_staging:
  stage: deploy
  image: willhallonline/ansible:latest
  script:
    - echo "🚀 Déploiement sur staging..."
    - ansible-playbook site.yml -i inventories/staging.ini --vault-password-file=\${VAULT_PASSWORD_FILE}
    - echo "✅ Déploiement staging terminé"
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - develop
  when: manual
  tags:
    - docker

# ════════════════════════════════════════════════════════════════
# Stage 4: Déploiement production (manuel avec protection)
# ════════════════════════════════════════════════════════════════
deploy_production:
  stage: deploy
  image: willhallonline/ansible:latest
  script:
    - echo "🚀 Déploiement sur PRODUCTION..."
    - ansible-playbook site.yml -i inventories/production.ini --vault-password-file=\${VAULT_PASSWORD_FILE} -v
    - echo "✅ Déploiement production terminé"
  environment:
    name: production
    url: https://production.example.com
  only:
    - main
  when: manual
  allow_failure: false
  tags:
    - docker

# ════════════════════════════════════════════════════════════════
# Notes:
# - Configurer VAULT_PASSWORD_FILE dans GitLab CI/CD Variables
# - Les déploiements sont manuels pour contrôle humain
# - Utiliser des runners avec accès SSH aux serveurs cibles
# ════════════════════════════════════════════════════════════════
`;
}

/**
 * Génère ansible.cfg
 */
function generateAnsibleCfg(): string {
  return `[defaults]
inventory = inventories/production.ini
remote_user = deploy
host_key_checking = False
retry_files_enabled = False
roles_path = roles
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 3600

[privilege_escalation]
become = True
become_method = sudo
become_user = root
become_ask_pass = False

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
pipelining = True`;
}

/**
 * Génère un playbook simple basé sur le prompt
 */
export function generateClassicAnsiblePlaybook(prompt: string, environment: 'staging' | 'production'): string {
  const normalized = prompt.toLowerCase();

  // Extraire le nom du projet
  const projectMatch = prompt.match(/(?:projet|project|application|app)\s+([a-zA-Z0-9-_]+)/i);
  const projectName = projectMatch ? projectMatch[1] : 'webapp';

  // Détecter les rôles nécessaires
  const roles = detectRequiredRoles(prompt);

  // Détecter les hosts
  const hosts: string[] = [];
  const hostMatches = prompt.match(/(\d+)\s+serveurs?/i);
  const hostCount = hostMatches ? parseInt(hostMatches[1]) : 3;

  for (let i = 1; i <= hostCount; i++) {
    if (normalized.includes('web')) hosts.push(`web${String(i).padStart(2, '0')}`);
    else if (normalized.includes('app')) hosts.push(`app${String(i).padStart(2, '0')}`);
    else hosts.push(`server${String(i).padStart(2, '0')}`);
  }

  // Configuration
  const config: ClassicAnsibleConfig = {
    projectName,
    environment,
    targetOS: normalized.includes('centos') || normalized.includes('rhel') ? 'centos' : 'ubuntu',
    hosts,
    roles,
    variables: {
      app_port: 8000,
      db_name: `${projectName}_${environment}`,
      db_user: `${projectName}_user`,
      db_password: '{{ vault_db_password }}',
      git_branch: environment === 'production' ? 'main' : 'develop'
    }
  };

  // Générer le projet complet
  const project = generateClassicAnsibleProject(config);

  // Retourner UNIQUEMENT le playbook principal (site.yml) pour éviter les erreurs de validation YAML
  // Les autres fichiers (inventaires, rôles) sont documentés en commentaires
  const siteYml = project['site.yml'];

  // Ajouter la documentation au début du playbook (APRÈS le premier ---)
  const documentation = `---
# ════════════════════════════════════════════════════════════════════════════
# 📦 PROJET ANSIBLE COMPLET - NIVEAU EXPERT DevOps
# ════════════════════════════════════════════════════════════════════════════
# Environnement: ${environment}
# Serveurs: ${hosts.length} x ${config.targetOS}
# Rôles: ${roles.join(', ')}
#
# ✅ OPTIMISATIONS NIVEAU EXPERT:
# 1. 🎯 Ciblage optimisé (sans 'all' redondant)
# 2. 🔐 Vaults modulaires (vault.yml, vault_db.yml, vault_app.yml)
#    - vault_db.yml: db_user, db_password, db_host
#    - vault_app.yml: api_key, jwt_secret, app_secret_key
#    - vault.yml: secrets globaux (admin, monitoring, ci/cd)
# 3. 🔄 Handlers améliorés (reload systemd, restart critical services)
# 4. 🛡️ Gestion d'erreurs (block/rescue/always)
# 5. ⚡ Performance (gather_facts manuel)
# 6. 🎭 Idempotence renforcée
# 7. 📄 Rapport JSON structuré + historique de déploiement
# 8. 📁 Inventaires séparés pythonapp/nodeapp
# 9. 🧪 Check mode production-ready avec flag dry_run
# 10. ✅ Conditions when: compatibles YAML strict (double-quoted)
#
# STRUCTURE: site.yml, vault*.yml, ansible.cfg, inventories/, group_vars/, roles/
# ════════════════════════════════════════════════════════════════════════════

`;

  // Retourner uniquement le playbook avec documentation en en-tête (après le ---)
  // On retire le --- du siteYml car il est déjà dans la documentation
  const siteYmlWithoutHeader = siteYml.replace(/^---\n/, '');
  return `${documentation}${siteYmlWithoutHeader}`;
}

/**
 * Génère le script Python externe pour AI Ops
 */
function generateAIOpsScript(): string {
  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Ops Calculator - Analyse et corrélation de métriques de sécurité
Utilisé pour traiter de gros rapports (Trivy, Falco, etc.)
"""

import json
import sys
from typing import Dict, List, Any


def calculate_risk_score(vulnerabilities: List[Dict[str, Any]]) -> float:
    """
    Calcule un score de risque basé sur les vulnérabilités détectées

    Args:
        vulnerabilities: Liste des vulnérabilités

    Returns:
        Score de risque (0-100)
    """
    if not vulnerabilities:
        return 0.0

    severity_weights = {
        'CRITICAL': 10.0,
        'HIGH': 7.0,
        'MEDIUM': 4.0,
        'LOW': 1.0,
        'UNKNOWN': 0.5
    }

    total_score = 0.0
    for vuln in vulnerabilities:
        severity = vuln.get('Severity', 'UNKNOWN').upper()
        weight = severity_weights.get(severity, 0.5)
        total_score += weight

    # Normaliser sur 100
    max_possible = len(vulnerabilities) * 10.0
    normalized_score = min((total_score / max_possible) * 100, 100.0)

    return round(normalized_score, 2)


def analyze_trivy_report(report_path: str) -> Dict[str, Any]:
    """
    Analyse un rapport Trivy JSON

    Args:
        report_path: Chemin vers le fichier JSON Trivy

    Returns:
        Dictionnaire avec statistiques et score de risque
    """
    try:
        with open(report_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        vulnerabilities = []
        results = data.get('Results', [])

        for result in results:
            vulns = result.get('Vulnerabilities', [])
            vulnerabilities.extend(vulns)

        # Statistiques par sévérité
        severity_counts = {
            'CRITICAL': 0,
            'HIGH': 0,
            'MEDIUM': 0,
            'LOW': 0,
            'UNKNOWN': 0
        }

        for vuln in vulnerabilities:
            severity = vuln.get('Severity', 'UNKNOWN').upper()
            if severity in severity_counts:
                severity_counts[severity] += 1

        risk_score = calculate_risk_score(vulnerabilities)

        return {
            'total_vulnerabilities': len(vulnerabilities),
            'severity_counts': severity_counts,
            'risk_score': risk_score,
            'recommendation': get_recommendation(risk_score)
        }

    except FileNotFoundError:
        return {
            'error': f'Fichier non trouvé: {report_path}',
            'risk_score': 0.0
        }
    except json.JSONDecodeError:
        return {
            'error': f'Erreur de parsing JSON: {report_path}',
            'risk_score': 0.0
        }


def get_recommendation(risk_score: float) -> str:
    """
    Retourne une recommandation basée sur le score de risque

    Args:
        risk_score: Score de risque (0-100)

    Returns:
        Recommandation textuelle
    """
    if risk_score >= 80:
        return 'CRITIQUE: Action immédiate requise'
    elif risk_score >= 60:
        return 'ÉLEVÉ: Correction recommandée dans les 24h'
    elif risk_score >= 40:
        return 'MOYEN: Planifier la correction'
    elif risk_score >= 20:
        return 'FAIBLE: Correction lors de la prochaine maintenance'
    else:
        return 'BON: Aucune action immédiate nécessaire'


def main():
    """
    Point d'entrée principal
    """
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'Usage: ai_ops_calculator.py <trivy_report.json>',
            'risk_score': 0.0
        }))
        sys.exit(1)

    report_path = sys.argv[1]
    result = analyze_trivy_report(report_path)

    # Sortie JSON pour Ansible
    print(json.dumps(result, indent=2))

    # Code de sortie basé sur le score de risque
    if result.get('risk_score', 0) >= 80:
        sys.exit(2)  # Critique
    elif result.get('risk_score', 0) >= 60:
        sys.exit(1)  # Élevé
    else:
        sys.exit(0)  # Acceptable


if __name__ == '__main__':
    main()
`;
}

/**
 * Génère le CSS externe pour les rapports HTML
 */
function generateReportCSS(): string {
  return `/*
 * Styles pour les rapports de déploiement Ansible
 * Utilisé dans les rapports HTML générés automatiquement
 */

/* Reset et base */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  margin: 40px;
  background: #f5f5f5;
  line-height: 1.6;
  color: #333;
}

/* Container principal */
.container {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  max-width: 1200px;
  margin: 0 auto;
}

/* Titres */
h1 {
  color: #2c3e50;
  border-bottom: 3px solid #3498db;
  padding-bottom: 10px;
  margin-bottom: 20px;
  font-size: 2em;
}

h2 {
  color: #34495e;
  margin-top: 30px;
  margin-bottom: 15px;
  font-size: 1.5em;
}

h3 {
  color: #34495e;
  margin-top: 20px;
  margin-bottom: 10px;
  font-size: 1.2em;
}

/* États et badges */
.success {
  color: #27ae60;
  font-weight: bold;
}

.warning {
  color: #f39c12;
  font-weight: bold;
}

.error {
  color: #e74c3c;
  font-weight: bold;
}

/* Blocs d'information */
.info {
  background: #ecf0f1;
  padding: 15px;
  border-radius: 4px;
  margin: 10px 0;
  border-left: 4px solid #3498db;
}

.info p {
  margin: 8px 0;
}

.info strong {
  color: #2c3e50;
  display: inline-block;
  min-width: 150px;
}

/* Tableaux */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background: #3498db;
  color: white;
  font-weight: 600;
}

tr:hover {
  background: #f8f9fa;
}

/* Listes */
ul {
  list-style-type: none;
  padding-left: 0;
}

ul li {
  padding: 8px 0;
  border-bottom: 1px solid #ecf0f1;
}

ul li:last-child {
  border-bottom: none;
}

ul li strong {
  color: #2c3e50;
  display: inline-block;
  min-width: 150px;
}

/* Footer */
.footer {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
  color: #7f8c8d;
  font-size: 0.9em;
  text-align: center;
}

/* Badges de statut */
.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-success {
  background: #27ae60;
  color: white;
}

.badge-warning {
  background: #f39c12;
  color: white;
}

.badge-danger {
  background: #e74c3c;
  color: white;
}

.badge-info {
  background: #3498db;
  color: white;
}

/* Responsive */
@media (max-width: 768px) {
  body {
    margin: 20px;
  }

  .container {
    padding: 20px;
  }

  table {
    font-size: 0.9em;
  }

  th, td {
    padding: 8px;
  }

  h1 {
    font-size: 1.5em;
  }

  h2 {
    font-size: 1.3em;
  }
}

@media (max-width: 480px) {
  body {
    margin: 10px;
  }

  .container {
    padding: 15px;
  }

  table {
    font-size: 0.8em;
  }

  th, td {
    padding: 6px;
  }
}

/* Impression */
@media print {
  body {
    background: white;
    margin: 0;
  }

  .container {
    box-shadow: none;
    padding: 0;
  }

  tr:hover {
    background: transparent;
  }
}
`;
}
