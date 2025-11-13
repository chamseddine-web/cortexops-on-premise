/**
 * Module de Reporting pour Ansible Playbooks
 * Centralise la génération de rapports HTML/JSON
 */

export interface ReportConfig {
  title: string;
  environment: string;
  timestamp?: string;
  sections: ReportSection[];
  metadata?: Record<string, any>;
}

export interface ReportSection {
  title: string;
  type: 'summary' | 'metrics' | 'logs' | 'alerts' | 'compliance';
  data: any;
}

/**
 * Génère le CSS pour les rapports HTML
 */
export function generateReportCSS(): string {
  return `
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 2rem;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  overflow: hidden;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 3rem 2rem;
  text-align: center;
}

.header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.header .subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
}

.content {
  padding: 2rem;
}

.section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 12px;
  border-left: 4px solid #667eea;
}

.section h2 {
  color: #667eea;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.metric-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.metric-card .label {
  font-size: 0.875rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.metric-card .value {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
}

.metric-card .change {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.change.positive {
  color: #10b981;
}

.change.negative {
  color: #ef4444;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.success {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.warning {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.error {
  background: #fee2e2;
  color: #991b1b;
}

.log-entry {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: white;
  border-radius: 6px;
  font-family: "Monaco", "Courier New", monospace;
  font-size: 0.875rem;
  border-left: 3px solid #cbd5e1;
}

.log-entry.error {
  border-left-color: #ef4444;
  background: #fef2f2;
}

.log-entry.warning {
  border-left-color: #f59e0b;
  background: #fffbeb;
}

.log-entry.success {
  border-left-color: #10b981;
  background: #f0fdf4;
}

.footer {
  background: #f1f5f9;
  padding: 1.5rem 2rem;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
}

.progress-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 9999px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

th {
  background: #f1f5f9;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

td {
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
}

tr:hover {
  background: #f8fafc;
}

.alert {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.alert.info {
  background: #dbeafe;
  color: #1e40af;
  border-left: 4px solid #3b82f6;
}

.alert.warning {
  background: #fef3c7;
  color: #92400e;
  border-left: 4px solid #f59e0b;
}

.alert.error {
  background: #fee2e2;
  color: #991b1b;
  border-left: 4px solid #ef4444;
}
`;
}

/**
 * Génère un template HTML de rapport
 */
export function generateReportTemplate(config: ReportConfig): string {
  const timestamp = config.timestamp || new Date().toISOString();

  let sectionsHTML = '';

  config.sections.forEach(section => {
    sectionsHTML += generateSectionHTML(section);
  });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <style>
${generateReportCSS()}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ${config.title}</h1>
      <div class="subtitle">
        Environnement: <strong>${config.environment}</strong> •
        Généré le: <strong>${new Date(timestamp).toLocaleString('fr-FR')}</strong>
      </div>
    </div>

    <div class="content">
${sectionsHTML}
    </div>

    <div class="footer">
      <p>Rapport généré automatiquement par Ansible Playbook • ${config.title}</p>
      <p>© ${new Date().getFullYear()} - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Génère le HTML pour une section de rapport
 */
function generateSectionHTML(section: ReportSection): string {
  const icon = getSectionIcon(section.type);

  switch (section.type) {
    case 'summary':
      return generateSummarySection(section, icon);
    case 'metrics':
      return generateMetricsSection(section, icon);
    case 'logs':
      return generateLogsSection(section, icon);
    case 'alerts':
      return generateAlertsSection(section, icon);
    case 'compliance':
      return generateComplianceSection(section, icon);
    default:
      return '';
  }
}

function getSectionIcon(type: string): string {
  const icons: Record<string, string> = {
    summary: '📝',
    metrics: '📊',
    logs: '📋',
    alerts: '⚠️',
    compliance: '✅'
  };
  return icons[type] || '📄';
}

function generateSummarySection(section: ReportSection, icon: string): string {
  return `
      <div class="section">
        <h2>${icon} ${section.title}</h2>
        <div class="metric-grid">
          ${Object.entries(section.data).map(([key, value]) => `
          <div class="metric-card">
            <div class="label">${key}</div>
            <div class="value">${value}</div>
          </div>
          `).join('')}
        </div>
      </div>`;
}

function generateMetricsSection(section: ReportSection, icon: string): string {
  return `
      <div class="section">
        <h2>${icon} ${section.title}</h2>
        <div class="metric-grid">
          ${section.data.map((metric: any) => `
          <div class="metric-card">
            <div class="label">${metric.label}</div>
            <div class="value">${metric.value}</div>
            ${metric.unit ? `<div style="color: #64748b; font-size: 0.875rem;">${metric.unit}</div>` : ''}
            ${metric.progress ? `
            <div class="progress-bar">
              <div class="progress-bar-fill" style="width: ${metric.progress}%"></div>
            </div>
            ` : ''}
          </div>
          `).join('')}
        </div>
      </div>`;
}

function generateLogsSection(section: ReportSection, icon: string): string {
  return `
      <div class="section">
        <h2>${icon} ${section.title}</h2>
        ${section.data.map((log: any) => `
        <div class="log-entry ${log.level || ''}">
          <strong>${log.timestamp || ''}</strong> - ${log.message}
        </div>
        `).join('')}
      </div>`;
}

function generateAlertsSection(section: ReportSection, icon: string): string {
  return `
      <div class="section">
        <h2>${icon} ${section.title}</h2>
        ${section.data.map((alert: any) => `
        <div class="alert ${alert.severity || 'info'}">
          <strong>${alert.title}:</strong> ${alert.message}
        </div>
        `).join('')}
      </div>`;
}

function generateComplianceSection(section: ReportSection, icon: string): string {
  return `
      <div class="section">
        <h2>${icon} ${section.title}</h2>
        <table>
          <thead>
            <tr>
              <th>Règle</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${section.data.map((item: any) => `
            <tr>
              <td>${item.rule}</td>
              <td><span class="status-badge ${item.passed ? 'success' : 'error'}">${item.passed ? '✓ Conforme' : '✗ Non conforme'}</span></td>
              <td>${item.description}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
}

/**
 * Génère un rôle Ansible pour le reporting
 */
export function generateReportingRole(): Record<string, string> {
  return {
    'tasks/main.yml': `---
# ════════════════════════════════════════════════════════════════
# Rôle: Reporting
# Description: Génération de rapports HTML/JSON de déploiement
# ════════════════════════════════════════════════════════════════

- name: "📁 Créer le répertoire de rapports"
  file:
    path: "{{ report_output_dir | default('/var/log/ansible/reports') }}"
    state: directory
    mode: '0755'
    owner: root
    group: root

- name: "📊 Collecter les métriques de déploiement"
  set_fact:
    deployment_metrics:
      start_time: "{{ ansible_date_time.iso8601 }}"
      hostname: "{{ inventory_hostname }}"
      environment: "{{ environment_name | default('production') }}"
      ansible_version: "{{ ansible_version.full }}"
      os: "{{ ansible_distribution }} {{ ansible_distribution_version }}"
      cpu_count: "{{ ansible_processor_vcpus }}"
      memory_mb: "{{ ansible_memtotal_mb }}"
      disk_free_gb: "{{ (ansible_mounts | selectattr('mount', 'equalto', '/') | first).size_available / 1024 / 1024 / 1024 | round(2) }}"

- name: "📄 Copier le template CSS"
  copy:
    dest: "{{ report_output_dir | default('/var/log/ansible/reports') }}/report.css"
    content: |
${generateReportCSS().split('\n').map(line => '      ' + line).join('\n')}
    mode: '0644'

- name: "📝 Générer le rapport HTML"
  template:
    src: report.html.j2
    dest: "{{ report_output_dir | default('/var/log/ansible/reports') }}/deployment-{{ ansible_date_time.date }}.html"
    mode: '0644'

- name: "💾 Générer le rapport JSON"
  copy:
    content: "{{ deployment_metrics | to_nice_json }}"
    dest: "{{ report_output_dir | default('/var/log/ansible/reports') }}/deployment-{{ ansible_date_time.date }}.json"
    mode: '0644'

- name: "📦 Archiver les rapports (compression)"
  archive:
    path:
      - "{{ report_output_dir | default('/var/log/ansible/reports') }}/deployment-{{ ansible_date_time.date }}.html"
      - "{{ report_output_dir | default('/var/log/ansible/reports') }}/deployment-{{ ansible_date_time.date }}.json"
    dest: "{{ report_output_dir | default('/var/log/ansible/reports') }}/deployment-{{ ansible_date_time.date }}.tar.gz"
    format: gz
    remove: false

- name: "🧹 Nettoyer les anciens rapports (garder les {{ keep_reports | default(30) }} derniers jours)"
  find:
    paths: "{{ report_output_dir | default('/var/log/ansible/reports') }}"
    patterns: "*.tar.gz"
    age: "{{ keep_reports | default(30) }}d"
  register: old_reports

- name: "🗑️ Supprimer les anciens rapports"
  file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ old_reports.files }}"

- name: "📊 Envoyer le rapport par email (optionnel)"
  mail:
    host: "{{ smtp_host | default('localhost') }}"
    port: "{{ smtp_port | default(25) }}"
    to: "{{ report_email }}"
    subject: "Rapport de déploiement - {{ ansible_date_time.date }}"
    body: "Rapport de déploiement disponible. Voir pièce jointe."
    attach:
      - "{{ report_output_dir | default('/var/log/ansible/reports') }}/deployment-{{ ansible_date_time.date }}.html"
  when: report_email is defined and send_report_email | default(false)

- name: "☁️ Upload vers S3 (optionnel)"
  aws_s3:
    bucket: "{{ s3_bucket }}"
    object: "reports/{{ ansible_date_time.date }}/deployment-{{ ansible_date_time.date }}.tar.gz"
    src: "{{ report_output_dir | default('/var/log/ansible/reports') }}/deployment-{{ ansible_date_time.date }}.tar.gz"
    mode: put
  when: s3_bucket is defined and upload_to_s3 | default(false)

- name: "✅ Rapport généré avec succès"
  debug:
    msg:
      - "✅ Rapport HTML: {{ report_output_dir | default('/var/log/ansible/reports') }}/deployment-{{ ansible_date_time.date }}.html"
      - "📦 Archive: {{ report_output_dir | default('/var/log/ansible/reports') }}/deployment-{{ ansible_date_time.date }}.tar.gz"
      - "📊 Rapport JSON: {{ report_output_dir | default('/var/log/ansible/reports') }}/deployment-{{ ansible_date_time.date }}.json"
      - "{{ '📧 Email envoyé à: ' + report_email if report_email is defined else '📧 Email: Non configuré' }}"
      - "{{ '☁️ Uploadé vers S3: ' + s3_bucket if s3_bucket is defined else '☁️ S3: Non configuré' }}"
`,
    'templates/report.html.j2': generateReportTemplate({
      title: '{{ report_title | default("Rapport de Déploiement") }}',
      environment: '{{ environment_name | default("production") }}',
      timestamp: '{{ ansible_date_time.iso8601 }}',
      sections: [
        {
          title: 'Résumé du Déploiement',
          type: 'summary',
          data: {
            'Serveur': '{{ inventory_hostname }}',
            'Environnement': '{{ environment_name }}',
            'Date': '{{ ansible_date_time.iso8601 }}',
            'Durée': '{{ deployment_duration | default("N/A") }}'
          }
        }
      ]
    }),
    'defaults/main.yml': `---
report_output_dir: /var/log/ansible/reports
report_title: "Rapport de Déploiement Ansible"
report_format: html
keep_reports: 30
send_report_email: false
upload_to_s3: false
`,
    'README.md': `# Rôle Ansible: Reporting

## Description
Génère des rapports HTML et JSON de déploiement avec métriques et logs.

## Variables
- \`report_output_dir\`: Répertoire de sortie (défaut: /var/log/ansible/reports)
- \`report_title\`: Titre du rapport
- \`report_format\`: Format (html, json, ou both)

## Utilisation
\`\`\`yaml
- role: reporting
  vars:
    report_title: "Mon Rapport Custom"
\`\`\`
`
  };
}
