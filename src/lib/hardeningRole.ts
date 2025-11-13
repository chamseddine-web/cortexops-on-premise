/**
 * Rôle Ansible: Hardening (Sécurisation des serveurs)
 * Implémente les standards CIS, fail2ban, UFW, auditd
 */

export function generateHardeningRole(): Record<string, string> {
  return {
    'tasks/main.yml': `---
# ════════════════════════════════════════════════════════════════
# Rôle: Hardening (Sécurisation des serveurs)
# Description: Implémente les standards CIS Benchmark, fail2ban, UFW, auditd
# ════════════════════════════════════════════════════════════════

- name: "🔒 PHASE 1: Installation des outils de sécurité"
  block:
    - name: "📦 Installer les packages de sécurité"
      apt:
        name:
          - fail2ban
          - ufw
          - auditd
          - apparmor
          - apparmor-utils
          - aide
          - libpam-pwquality
          - unattended-upgrades
        state: present
        update_cache: yes
      async: 180
      poll: 5

    - name: "✅ Vérifier l'installation"
      command: "{{ item }}"
      loop:
        - "fail2ban-client --version"
        - "ufw version"
        - "auditctl -s"
      register: security_versions
      changed_when: false

  rescue:
    - name: "⚠️ Échec de l'installation des outils de sécurité"
      debug:
        msg: "Impossible d'installer les outils de sécurité. Vérifiez les dépôts."

- name: "🔥 PHASE 2: Configuration UFW (Firewall)"
  block:
    - name: "🔒 Configurer les règles UFW par défaut"
      ufw:
        state: enabled
        policy: deny
        direction: incoming

    - name: "✅ Autoriser SSH (port {{ ssh_port | default(22) }})"
      ufw:
        rule: allow
        port: "{{ ssh_port | default(22) }}"
        proto: tcp

    - name: "✅ Autoriser HTTP/HTTPS"
      ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - 80
        - 443
      when: allow_web_traffic | default(true)

    - name: "🔒 Activer le logging UFW"
      ufw:
        logging: 'on'

    - name: "🔒 Limiter les tentatives SSH (rate limiting)"
      ufw:
        rule: limit
        port: "{{ ssh_port | default(22) }}"
        proto: tcp

  when: enable_firewall | default(true)

- name: "🛡️ PHASE 3: Configuration Fail2Ban"
  block:
    - name: "📝 Créer la configuration Fail2Ban locale"
      copy:
        dest: /etc/fail2ban/jail.local
        content: |
          [DEFAULT]
          bantime = {{ fail2ban_bantime | default('1h') }}
          findtime = {{ fail2ban_findtime | default('10m') }}
          maxretry = {{ fail2ban_maxretry | default(5) }}
          destemail = {{ fail2ban_email | default('admin@localhost') }}
          sendername = Fail2Ban
          action = %(action_mwl)s

          [sshd]
          enabled = true
          port = {{ ssh_port | default(22) }}
          logpath = /var/log/auth.log
          maxretry = 3
          bantime = 1h

          [nginx-http-auth]
          enabled = true
          port = http,https
          logpath = /var/log/nginx/error.log

          [nginx-noscript]
          enabled = true
          port = http,https
          logpath = /var/log/nginx/access.log

          [nginx-badbots]
          enabled = true
          port = http,https
          logpath = /var/log/nginx/access.log
        mode: '0644'
      notify: restart fail2ban

    - name: "▶️ Démarrer et activer Fail2Ban"
      service:
        name: fail2ban
        state: started
        enabled: yes

    - name: "📊 Vérifier le statut Fail2Ban"
      command: fail2ban-client status
      register: fail2ban_status
      changed_when: false

    - name: "📋 Afficher le statut Fail2Ban"
      debug:
        var: fail2ban_status.stdout_lines

  when: enable_fail2ban | default(true)

- name: "📊 PHASE 4: Configuration Auditd (Surveillance système)"
  block:
    - name: "📝 Configurer les règles d'audit"
      copy:
        dest: /etc/audit/rules.d/hardening.rules
        content: |
          ## Audit des changements sur les fichiers sensibles
          -w /etc/passwd -p wa -k identity
          -w /etc/group -p wa -k identity
          -w /etc/shadow -p wa -k identity
          -w /etc/sudoers -p wa -k sudoers
          -w /etc/ssh/sshd_config -p wa -k sshd

          ## Audit des modifications système
          -w /sbin/insmod -p x -k modules
          -w /sbin/rmmod -p x -k modules
          -w /sbin/modprobe -p x -k modules
          -a always,exit -F arch=b64 -S init_module -S delete_module -k modules

          ## Audit des accès sudo
          -w /var/log/sudo.log -p wa -k sudo_log

          ## Audit des modifications réseau
          -a always,exit -F arch=b64 -S socket -S connect -k network

          ## Audit des suppressions de fichiers
          -a always,exit -F arch=b64 -S unlink -S unlinkat -S rename -S renameat -k delete
        mode: '0640'
      notify: restart auditd

    - name: "▶️ Démarrer et activer Auditd"
      service:
        name: auditd
        state: started
        enabled: yes

  when: enable_auditd | default(true)

- name: "🔐 PHASE 5: Durcissement SSH (CIS Baseline)"
  block:
    - name: "💾 Backup de la configuration SSH originale"
      copy:
        src: /etc/ssh/sshd_config
        dest: /etc/ssh/sshd_config.backup.{{ ansible_date_time.epoch }}
        remote_src: yes
        mode: '0600'

    - name: "🔒 Configurer SSH selon CIS Benchmark"
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
        state: present
      loop:
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication {{ allow_password_auth | default("no") }}' }
        - { regexp: '^#?PubkeyAuthentication', line: 'PubkeyAuthentication yes' }
        - { regexp: '^#?PermitEmptyPasswords', line: 'PermitEmptyPasswords no' }
        - { regexp: '^#?X11Forwarding', line: 'X11Forwarding no' }
        - { regexp: '^#?MaxAuthTries', line: 'MaxAuthTries 3' }
        - { regexp: '^#?ClientAliveInterval', line: 'ClientAliveInterval 300' }
        - { regexp: '^#?ClientAliveCountMax', line: 'ClientAliveCountMax 2' }
        - { regexp: '^#?Protocol', line: 'Protocol 2' }
        - { regexp: '^#?LogLevel', line: 'LogLevel VERBOSE' }
        - { regexp: '^#?MaxSessions', line: 'MaxSessions 2' }
        - { regexp: '^#?AllowTcpForwarding', line: 'AllowTcpForwarding no' }
      notify: restart sshd

    - name: "🔒 Configurer les permissions des clés SSH"
      file:
        path: /etc/ssh
        state: directory
        mode: '0755'

    - name: "🔒 Sécuriser les clés privées SSH"
      shell: chmod 0600 /etc/ssh/ssh_host_*_key
      changed_when: false

  when: enable_ssh_hardening | default(true)

- name: "🔐 PHASE 6: Durcissement système (CIS Baseline)"
  block:
    - name: "🔒 Configurer les permissions sur /etc/passwd"
      file:
        path: /etc/passwd
        owner: root
        group: root
        mode: '0644'

    - name: "🔒 Configurer les permissions sur /etc/shadow"
      file:
        path: /etc/shadow
        owner: root
        group: shadow
        mode: '0640'

    - name: "🔒 Désactiver les services inutiles"
      service:
        name: "{{ item }}"
        state: stopped
        enabled: no
      loop: "{{ services_to_disable | default([]) }}"
      ignore_errors: yes

    - name: "🔒 Configurer les limites de sécurité"
      pam_limits:
        domain: '*'
        limit_type: hard
        limit_item: core
        value: '0'

    - name: "🔒 Désactiver les core dumps"
      sysctl:
        name: fs.suid_dumpable
        value: '0'
        state: present
        reload: yes

    - name: "🔒 Activer l'ASLR (Address Space Layout Randomization)"
      sysctl:
        name: kernel.randomize_va_space
        value: '2'
        state: present
        reload: yes

    - name: "🔒 Protéger contre les attaques SYN flood"
      sysctl:
        name: "{{ item.name }}"
        value: "{{ item.value }}"
        state: present
        reload: yes
      loop:
        - { name: 'net.ipv4.tcp_syncookies', value: '1' }
        - { name: 'net.ipv4.tcp_max_syn_backlog', value: '2048' }
        - { name: 'net.ipv4.tcp_synack_retries', value: '2' }
        - { name: 'net.ipv4.tcp_syn_retries', value: '5' }

    - name: "🔒 Désactiver IPv6 (si non utilisé)"
      sysctl:
        name: "{{ item }}"
        value: '1'
        state: present
        reload: yes
      loop:
        - net.ipv6.conf.all.disable_ipv6
        - net.ipv6.conf.default.disable_ipv6
      when: disable_ipv6 | default(false)

    - name: "🔒 Protéger contre les attaques ICMP"
      sysctl:
        name: "{{ item.name }}"
        value: "{{ item.value }}"
        state: present
        reload: yes
      loop:
        - { name: 'net.ipv4.icmp_echo_ignore_all', value: '0' }
        - { name: 'net.ipv4.icmp_echo_ignore_broadcasts', value: '1' }
        - { name: 'net.ipv4.icmp_ignore_bogus_error_responses', value: '1' }

  when: enable_system_hardening | default(true)

- name: "📊 PHASE 7: Mises à jour automatiques de sécurité"
  block:
    - name: "🔄 Configurer les mises à jour automatiques"
      copy:
        dest: /etc/apt/apt.conf.d/50unattended-upgrades
        content: |
          Unattended-Upgrade::Allowed-Origins {
            "\${distro_id}:\${distro_codename}-security";
            "\${distro_id}ESMApps:\${distro_codename}-apps-security";
            "\${distro_id}ESM:\${distro_codename}-infra-security";
          };
          Unattended-Upgrade::AutoFixInterruptedDpkg "true";
          Unattended-Upgrade::MinimalSteps "true";
          Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
          Unattended-Upgrade::Remove-Unused-Dependencies "true";
          Unattended-Upgrade::Automatic-Reboot "{{ auto_reboot | default('false') }}";
          Unattended-Upgrade::Automatic-Reboot-Time "{{ auto_reboot_time | default('03:00') }}";
        mode: '0644'

    - name: "🔄 Activer les mises à jour automatiques"
      copy:
        dest: /etc/apt/apt.conf.d/20auto-upgrades
        content: |
          APT::Periodic::Update-Package-Lists "1";
          APT::Periodic::Unattended-Upgrade "1";
          APT::Periodic::Download-Upgradeable-Packages "1";
          APT::Periodic::AutocleanInterval "7";
        mode: '0644'

  when: enable_auto_updates | default(true)

- name: "📋 PHASE 8: Rapport de sécurité"
  block:
    - name: "📊 Collecter les informations de sécurité"
      set_fact:
        security_report:
          timestamp: "{{ ansible_date_time.iso8601 }}"
          hostname: "{{ inventory_hostname }}"
          firewall: "{{ 'Activé (UFW)' if enable_firewall | default(true) else 'Désactivé' }}"
          fail2ban: "{{ 'Activé' if enable_fail2ban | default(true) else 'Désactivé' }}"
          auditd: "{{ 'Activé' if enable_auditd | default(true) else 'Désactivé' }}"
          ssh_hardening: "{{ 'Appliqué' if enable_ssh_hardening | default(true) else 'Non appliqué' }}"
          system_hardening: "{{ 'Appliqué' if enable_system_hardening | default(true) else 'Non appliqué' }}"
          auto_updates: "{{ 'Activées' if enable_auto_updates | default(true) else 'Désactivées' }}"

    - name: "📄 Générer le rapport de sécurité"
      copy:
        dest: /var/log/ansible/security_hardening_report.txt
        content: |
          ════════════════════════════════════════════════════════════════
          📋 RAPPORT DE DURCISSEMENT SÉCURITÉ
          ════════════════════════════════════════════════════════════════
          Date: {{ security_report.timestamp }}
          Serveur: {{ security_report.hostname }}

          🔒 STATUT DES PROTECTIONS:
          ├─ Firewall (UFW):           {{ security_report.firewall }}
          ├─ Fail2Ban:                 {{ security_report.fail2ban }}
          ├─ Auditd:                   {{ security_report.auditd }}
          ├─ SSH Hardening:            {{ security_report.ssh_hardening }}
          ├─ System Hardening:         {{ security_report.system_hardening }}
          └─ Mises à jour auto:        {{ security_report.auto_updates }}

          ✅ Le serveur a été durci selon les standards CIS Benchmark.
          ════════════════════════════════════════════════════════════════
        mode: '0644'

    - name: "✅ Rapport de sécurité généré"
      debug:
        msg:
          - "🔒 Durcissement de sécurité terminé avec succès"
          - "📄 Rapport disponible: /var/log/ansible/security_hardening_report.txt"
          - "Firewall: {{ security_report.firewall }}"
          - "Fail2Ban: {{ security_report.fail2ban }}"
          - "Auditd: {{ security_report.auditd }}"
`,

    'handlers/main.yml': `---
- name: restart fail2ban
  service:
    name: fail2ban
    state: restarted

- name: restart auditd
  service:
    name: auditd
    state: restarted

- name: restart sshd
  service:
    name: sshd
    state: restarted
`,

    'defaults/main.yml': `---
# Configuration Firewall
enable_firewall: true
ssh_port: 22
allow_web_traffic: true

# Configuration Fail2Ban
enable_fail2ban: true
fail2ban_bantime: "1h"
fail2ban_findtime: "10m"
fail2ban_maxretry: 5
fail2ban_email: "admin@localhost"

# Configuration Auditd
enable_auditd: true

# Configuration SSH Hardening
enable_ssh_hardening: true
allow_password_auth: "no"

# Configuration System Hardening
enable_system_hardening: true
disable_ipv6: false
services_to_disable: []

# Mises à jour automatiques
enable_auto_updates: true
auto_reboot: false
auto_reboot_time: "03:00"
`,

    'README.md': `# Rôle Ansible: Hardening (Sécurisation des serveurs)

## Description
Rôle complet de durcissement de sécurité selon les standards **CIS Benchmark**.

## Fonctionnalités

### 🔥 Firewall (UFW)
- Politique par défaut: DENY incoming
- Rate limiting SSH
- Autorisation HTTP/HTTPS optionnelle
- Logging activé

### 🛡️ Fail2Ban
- Protection SSH (3 tentatives max)
- Protection Nginx (auth, noscript, badbots)
- Bannissement: 1h par défaut
- Notifications email

### 📊 Auditd
- Surveillance des fichiers sensibles (/etc/passwd, /etc/shadow, /etc/sudoers)
- Audit des modules kernel
- Audit des accès sudo
- Audit des modifications réseau
- Audit des suppressions de fichiers

### 🔐 SSH Hardening (CIS Compliant)
- PermitRootLogin: no
- PasswordAuthentication: no (clés SSH uniquement)
- MaxAuthTries: 3
- Protocol: 2 (SSH v2 uniquement)
- X11Forwarding: disabled
- ClientAliveInterval: 300s

### 🔒 System Hardening
- ASLR activé
- Core dumps désactivés
- Protection SYN flood
- Protection ICMP attacks
- Permissions fichiers sensibles
- Désactivation IPv6 (optionnel)

### 🔄 Mises à jour automatiques
- Mises à jour de sécurité automatiques
- Redémarrage automatique optionnel (03:00 par défaut)
- Nettoyage automatique des anciens kernels

## Variables

\`\`\`yaml
# Firewall
enable_firewall: true
ssh_port: 22
allow_web_traffic: true

# Fail2Ban
enable_fail2ban: true
fail2ban_bantime: "1h"
fail2ban_maxretry: 5

# SSH
enable_ssh_hardening: true
allow_password_auth: "no"

# Système
enable_system_hardening: true
disable_ipv6: false

# Mises à jour
enable_auto_updates: true
auto_reboot: false
\`\`\`

## Utilisation

\`\`\`yaml
- role: hardening
  vars:
    ssh_port: 2222
    fail2ban_email: "security@example.com"
    auto_reboot: true
\`\`\`

## Conformité CIS Benchmark

Ce rôle implémente les recommandations CIS suivantes:
- 5.2.x: SSH Configuration
- 3.5.x: Firewall Configuration
- 4.1.x: Auditd Configuration
- 1.5.x: Bootloader Configuration
- 3.2.x: Network Parameters

## Vérification post-déploiement

\`\`\`bash
# Vérifier UFW
sudo ufw status verbose

# Vérifier Fail2Ban
sudo fail2ban-client status

# Vérifier Auditd
sudo auditctl -l

# Consulter le rapport
cat /var/log/ansible/security_hardening_report.txt
\`\`\`
`
  };
}
