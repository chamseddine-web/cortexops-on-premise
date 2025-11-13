/**
 * Observability Integration Generator
 * Integrates Prometheus, Loki, and other observability tools
 */

export interface ObservabilityConfig {
  includePrometheus?: boolean;
  includeLoki?: boolean;
  includeGrafana?: boolean;
  includeJaeger?: boolean;
  lokiUrl?: string;
  prometheusUrl?: string;
}

/**
 * Generate Loki logging integration tasks
 */
export function generateLokiIntegration(lokiUrl: string = 'http://loki:3100'): string {
  return `---
# Loki Logging Integration
# Sends Ansible logs to Loki for centralized logging

- name: Install Promtail (Loki agent)
  block:
    - name: Create promtail user
      user:
        name: promtail
        system: yes
        shell: /bin/false
        create_home: no

    - name: Download Promtail
      get_url:
        url: https://github.com/grafana/loki/releases/download/v2.9.0/promtail-linux-amd64.zip
        dest: /tmp/promtail.zip
        mode: '0644'

    - name: Extract Promtail
      unarchive:
        src: /tmp/promtail.zip
        dest: /usr/local/bin/
        remote_src: yes
        creates: /usr/local/bin/promtail-linux-amd64

    - name: Create symlink for Promtail
      file:
        src: /usr/local/bin/promtail-linux-amd64
        dest: /usr/local/bin/promtail
        state: link

    - name: Create Promtail config directory
      file:
        path: /etc/promtail
        state: directory
        owner: promtail
        group: promtail
        mode: '0755'

    - name: Deploy Promtail configuration
      copy:
        content: |
          server:
            http_listen_port: 9080
            grpc_listen_port: 0

          positions:
            filename: /var/lib/promtail/positions.yaml

          clients:
            - url: ${lokiUrl}/loki/api/v1/push

          scrape_configs:
            - job_name: system
              static_configs:
                - targets:
                    - localhost
                  labels:
                    job: varlogs
                    host: {{ ansible_hostname }}
                    environment: {{ environment | default('unknown') }}
                    __path__: /var/log/*.log

            - job_name: ansible
              static_configs:
                - targets:
                    - localhost
                  labels:
                    job: ansible
                    host: {{ ansible_hostname }}
                    environment: {{ environment | default('unknown') }}
                    __path__: /var/log/ansible*.log

            - job_name: syslog
              static_configs:
                - targets:
                    - localhost
                  labels:
                    job: syslog
                    host: {{ ansible_hostname }}
                    environment: {{ environment | default('unknown') }}
                    __path__: /var/log/syslog
        dest: /etc/promtail/config.yml
        owner: promtail
        group: promtail
        mode: '0644'
      notify: restart promtail

    - name: Create Promtail systemd service
      copy:
        content: |
          [Unit]
          Description=Promtail service
          After=network.target

          [Service]
          Type=simple
          User=promtail
          ExecStart=/usr/local/bin/promtail -config.file=/etc/promtail/config.yml
          Restart=on-failure
          RestartSec=20

          [Install]
          WantedBy=multi-user.target
        dest: /etc/systemd/system/promtail.service
        mode: '0644'
      notify: reload systemd

    - name: Start and enable Promtail
      service:
        name: promtail
        state: started
        enabled: yes

  handlers:
    - name: restart promtail
      service:
        name: promtail
        state: restarted

    - name: reload systemd
      systemd:
        daemon_reload: yes

- name: Send Ansible playbook logs to Loki
  uri:
    url: "${lokiUrl}/loki/api/v1/push"
    method: POST
    body_format: json
    headers:
      Content-Type: "application/json"
    body:
      streams:
        - stream:
            job: "ansible-playbook"
            host: "{{ ansible_hostname }}"
            environment: "{{ environment | default('unknown') }}"
            playbook: "{{ ansible_play_name | default('unknown') }}"
          values:
            - [ "{{ ansible_date_time.epoch }}000000000", "Playbook: {{ ansible_play_name }} | Task: {{ ansible_play_name }} | Status: {{ ansible_play_batch }}" ]
    status_code: [200, 204]
  register: loki_push
  failed_when: false
  delegate_to: localhost
  run_once: yes
`;
}

/**
 * Generate Prometheus metrics integration
 */
export function generatePrometheusIntegration(prometheusUrl: string = 'http://prometheus:9090'): string {
  return `---
# Prometheus Metrics Integration
# Exports Ansible playbook metrics to Prometheus

- name: Install Node Exporter
  block:
    - name: Create node_exporter user
      user:
        name: node_exporter
        system: yes
        shell: /bin/false
        create_home: no

    - name: Download Node Exporter
      get_url:
        url: https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
        dest: /tmp/node_exporter.tar.gz
        mode: '0644'

    - name: Extract Node Exporter
      unarchive:
        src: /tmp/node_exporter.tar.gz
        dest: /tmp/
        remote_src: yes
        creates: /tmp/node_exporter-1.7.0.linux-amd64

    - name: Copy Node Exporter binary
      copy:
        src: /tmp/node_exporter-1.7.0.linux-amd64/node_exporter
        dest: /usr/local/bin/node_exporter
        mode: '0755'
        owner: node_exporter
        group: node_exporter
        remote_src: yes

    - name: Create Node Exporter systemd service
      copy:
        content: |
          [Unit]
          Description=Node Exporter
          After=network.target

          [Service]
          Type=simple
          User=node_exporter
          ExecStart=/usr/local/bin/node_exporter \\
            --collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/) \\
            --collector.textfile.directory=/var/lib/node_exporter/textfile_collector
          Restart=on-failure
          RestartSec=5

          [Install]
          WantedBy=multi-user.target
        dest: /etc/systemd/system/node_exporter.service
        mode: '0644'

    - name: Create textfile collector directory
      file:
        path: /var/lib/node_exporter/textfile_collector
        state: directory
        owner: node_exporter
        group: node_exporter
        mode: '0755'

    - name: Reload systemd
      systemd:
        daemon_reload: yes

    - name: Start and enable Node Exporter
      service:
        name: node_exporter
        state: started
        enabled: yes

- name: Export Ansible playbook metrics
  copy:
    content: |
      # HELP ansible_playbook_run_timestamp_seconds Timestamp of the last Ansible playbook run
      # TYPE ansible_playbook_run_timestamp_seconds gauge
      ansible_playbook_run_timestamp_seconds{playbook="{{ ansible_play_name }}",host="{{ ansible_hostname }}",environment="{{ environment | default('unknown') }}"} {{ ansible_date_time.epoch }}

      # HELP ansible_playbook_task_total Total number of tasks in playbook
      # TYPE ansible_playbook_task_total counter
      ansible_playbook_task_total{playbook="{{ ansible_play_name }}",host="{{ ansible_hostname }}"} {{ ansible_play_hosts | length }}

      # HELP ansible_playbook_duration_seconds Duration of playbook execution
      # TYPE ansible_playbook_duration_seconds gauge
      ansible_playbook_duration_seconds{playbook="{{ ansible_play_name }}",host="{{ ansible_hostname }}"} {{ ansible_date_time.epoch | int - (ansible_date_time.epoch | int - 60) }}
    dest: /var/lib/node_exporter/textfile_collector/ansible_metrics.prom
    mode: '0644'
  when: ansible_date_time is defined
`;
}

/**
 * Generate complete observability playbook
 */
export function generateObservabilityPlaybook(config: ObservabilityConfig): string {
  const {
    includePrometheus = true,
    includeLoki = true,
    includeGrafana = true,
    lokiUrl = 'http://loki:3100',
    prometheusUrl = 'http://prometheus:9090'
  } = config;

  let playbook = `---
# Observability Integration Playbook
# Integrates Prometheus, Loki, and Grafana for complete observability

- name: Deploy Observability Stack
  hosts: monitoring
  become: yes
  gather_facts: yes

  tasks:
`;

  if (includePrometheus) {
    playbook += `
    - name: Install Prometheus
      include_tasks: prometheus-setup.yml
      tags: ['observability', 'prometheus']

`;
  }

  if (includeLoki) {
    playbook += `
    - name: Install Loki
      include_tasks: loki-setup.yml
      tags: ['observability', 'loki']

`;
  }

  if (includeGrafana) {
    playbook += `
    - name: Install Grafana
      include_tasks: grafana-setup.yml
      tags: ['observability', 'grafana']

`;
  }

  playbook += `
- name: Configure Monitoring Agents
  hosts: all
  become: yes
  gather_facts: yes

  tasks:
`;

  if (includePrometheus) {
    playbook += `
${generatePrometheusIntegration(prometheusUrl)}

`;
  }

  if (includeLoki) {
    playbook += `
${generateLokiIntegration(lokiUrl)}

`;
  }

  playbook += `
- name: Verify Observability Stack
  hosts: monitoring
  become: yes
  gather_facts: yes

  tasks:
    - name: Wait for Prometheus to be ready
      uri:
        url: "{{ prometheus_url }}/api/v1/status/config"
        status_code: 200
      register: prom_status
      until: prom_status.status == 200
      retries: 5
      delay: 10
      when: includePrometheus | default(true)

    - name: Wait for Loki to be ready
      uri:
        url: "{{ loki_url }}/ready"
        status_code: 200
      register: loki_status
      until: loki_status.status == 200
      retries: 5
      delay: 10
      when: includeLoki | default(true)

    - name: Wait for Grafana to be ready
      uri:
        url: "http://localhost:3000/api/health"
        status_code: 200
      register: grafana_status
      until: grafana_status.status == 200
      retries: 5
      delay: 10
      when: includeGrafana | default(true)

    - name: Display observability URLs
      debug:
        msg: |
          ========================================
          OBSERVABILITY STACK READY
          ========================================
          Prometheus: {{ prometheus_url }}
          Loki: {{ loki_url }}
          Grafana: http://localhost:3000
          ========================================
`;

  return playbook;
}

/**
 * Generate Grafana dashboard for Ansible metrics
 */
export function generateAnsibleGrafanaDashboard(): string {
  return `{
  "dashboard": {
    "title": "Ansible Playbook Monitoring",
    "tags": ["ansible", "automation", "cortexops"],
    "timezone": "browser",
    "schemaVersion": 36,
    "version": 1,
    "refresh": "30s",
    "panels": [
      {
        "id": 1,
        "title": "Playbook Execution Rate",
        "type": "graph",
        "gridPos": {"x": 0, "y": 0, "w": 12, "h": 8},
        "targets": [
          {
            "expr": "rate(ansible_playbook_run_timestamp_seconds[5m])",
            "legendFormat": "{{ playbook }}",
            "refId": "A"
          }
        ],
        "yaxes": [
          {"label": "Executions/sec", "format": "short"},
          {"format": "short"}
        ]
      },
      {
        "id": 2,
        "title": "Playbook Duration",
        "type": "graph",
        "gridPos": {"x": 12, "y": 0, "w": 12, "h": 8},
        "targets": [
          {
            "expr": "ansible_playbook_duration_seconds",
            "legendFormat": "{{ playbook }} - {{ host }}",
            "refId": "A"
          }
        ],
        "yaxes": [
          {"label": "Duration (seconds)", "format": "s"},
          {"format": "short"}
        ]
      },
      {
        "id": 3,
        "title": "Task Count by Playbook",
        "type": "stat",
        "gridPos": {"x": 0, "y": 8, "w": 6, "h": 4},
        "targets": [
          {
            "expr": "sum(ansible_playbook_task_total) by (playbook)",
            "refId": "A"
          }
        ]
      },
      {
        "id": 4,
        "title": "Recent Playbook Logs",
        "type": "logs",
        "gridPos": {"x": 0, "y": 12, "w": 24, "h": 10},
        "targets": [
          {
            "expr": "{job=\\"ansible-playbook\\"}",
            "refId": "A"
          }
        ],
        "options": {
          "showTime": true,
          "wrapLogMessage": true,
          "enableLogDetails": true
        }
      },
      {
        "id": 5,
        "title": "System Metrics",
        "type": "row",
        "gridPos": {"x": 0, "y": 22, "w": 24, "h": 1}
      },
      {
        "id": 6,
        "title": "CPU Usage",
        "type": "graph",
        "gridPos": {"x": 0, "y": 23, "w": 8, "h": 8},
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\\"idle\\"}[5m])) * 100)",
            "legendFormat": "{{ instance }}",
            "refId": "A"
          }
        ]
      },
      {
        "id": 7,
        "title": "Memory Usage",
        "type": "graph",
        "gridPos": {"x": 8, "y": 23, "w": 8, "h": 8},
        "targets": [
          {
            "expr": "100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))",
            "legendFormat": "{{ instance }}",
            "refId": "A"
          }
        ]
      },
      {
        "id": 8,
        "title": "Disk Usage",
        "type": "graph",
        "gridPos": {"x": 16, "y": 23, "w": 8, "h": 8},
        "targets": [
          {
            "expr": "100 - ((node_filesystem_avail_bytes{mountpoint=\\"/\\"} * 100) / node_filesystem_size_bytes{mountpoint=\\"/\\"})",
            "legendFormat": "{{ instance }}",
            "refId": "A"
          }
        ]
      }
    ],
    "time": {"from": "now-6h", "to": "now"},
    "timepicker": {
      "refresh_intervals": ["10s", "30s", "1m", "5m", "15m", "30m"]
    }
  }
}`;
}

/**
 * Generate logging task that sends data to Loki
 */
export function generateLokiLoggingTask(lokiUrl: string, message: string): string {
  return `- name: Send log to Loki
  uri:
    url: "${lokiUrl}/loki/api/v1/push"
    method: POST
    body_format: json
    headers:
      Content-Type: "application/json"
    body:
      streams:
        - stream:
            job: "ansible"
            host: "{{ ansible_hostname }}"
            environment: "{{ environment | default('unknown') }}"
            playbook: "{{ ansible_play_name | default('unknown') }}"
          values:
            - [ "{{ ansible_date_time.epoch }}000000000", "${message}" ]
    status_code: [200, 204]
  failed_when: false
  delegate_to: localhost
  run_once: yes
`;
}
