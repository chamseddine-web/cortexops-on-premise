export interface CISControl {
  id: string;
  title: string;
  level: 1 | 2;
  category: string;
  commands: string[];
  check?: string;
  remediation: string;
}

export const CIS_UBUNTU_22_04: CISControl[] = [
  {
    id: '1.1.1',
    title: 'Désactiver systèmes de fichiers inutilisés',
    level: 1,
    category: 'filesystem',
    commands: [
      'install cramfs /bin/true',
      'install freevxfs /bin/true',
      'install jffs2 /bin/true',
      'install hfs /bin/true',
      'install hfsplus /bin/true',
      'install udf /bin/true',
    ],
    remediation: '/etc/modprobe.d/CIS.conf',
  },
  {
    id: '5.2.1',
    title: 'Désactiver root login SSH',
    level: 1,
    category: 'ssh',
    commands: ['PermitRootLogin no'],
    check: 'sshd -T | grep -i permitrootlogin',
    remediation: '/etc/ssh/sshd_config',
  },
  {
    id: '5.2.2',
    title: 'SSH Protocol 2 uniquement',
    level: 1,
    category: 'ssh',
    commands: ['Protocol 2'],
    remediation: '/etc/ssh/sshd_config',
  },
  {
    id: '5.2.10',
    title: 'Désactiver empty passwords SSH',
    level: 1,
    category: 'ssh',
    commands: ['PermitEmptyPasswords no'],
    remediation: '/etc/ssh/sshd_config',
  },
  {
    id: '5.2.15',
    title: 'Max auth tries SSH',
    level: 1,
    category: 'ssh',
    commands: ['MaxAuthTries 3'],
    remediation: '/etc/ssh/sshd_config',
  },
  {
    id: '5.2.16',
    title: 'SSH ClientAliveInterval',
    level: 1,
    category: 'ssh',
    commands: [
      'ClientAliveInterval 300',
      'ClientAliveCountMax 2',
    ],
    remediation: '/etc/ssh/sshd_config',
  },
  {
    id: '3.3.1',
    title: 'Désactiver IP forwarding',
    level: 1,
    category: 'network',
    commands: ['sysctl -w net.ipv4.ip_forward=0'],
    check: 'sysctl net.ipv4.ip_forward',
    remediation: '/etc/sysctl.conf: net.ipv4.ip_forward=0',
  },
  {
    id: '3.3.2',
    title: 'Désactiver send redirects',
    level: 1,
    category: 'network',
    commands: [
      'sysctl -w net.ipv4.conf.all.send_redirects=0',
      'sysctl -w net.ipv4.conf.default.send_redirects=0',
    ],
    remediation: '/etc/sysctl.conf',
  },
  {
    id: '3.3.3',
    title: 'Désactiver source routed packets',
    level: 1,
    category: 'network',
    commands: [
      'sysctl -w net.ipv4.conf.all.accept_source_route=0',
      'sysctl -w net.ipv4.conf.default.accept_source_route=0',
    ],
    remediation: '/etc/sysctl.conf',
  },
  {
    id: '3.3.4',
    title: 'Désactiver ICMP redirects',
    level: 1,
    category: 'network',
    commands: [
      'sysctl -w net.ipv4.conf.all.accept_redirects=0',
      'sysctl -w net.ipv4.conf.default.accept_redirects=0',
    ],
    remediation: '/etc/sysctl.conf',
  },
  {
    id: '3.3.5',
    title: 'Activer reverse path filtering',
    level: 1,
    category: 'network',
    commands: [
      'sysctl -w net.ipv4.conf.all.rp_filter=1',
      'sysctl -w net.ipv4.conf.default.rp_filter=1',
    ],
    check: 'sysctl net.ipv4.conf.all.rp_filter',
    remediation: '/etc/sysctl.conf: net.ipv4.conf.all.rp_filter=1',
  },
  {
    id: '3.3.6',
    title: 'Activer log martians',
    level: 1,
    category: 'network',
    commands: [
      'sysctl -w net.ipv4.conf.all.log_martians=1',
      'sysctl -w net.ipv4.conf.default.log_martians=1',
    ],
    remediation: '/etc/sysctl.conf',
  },
  {
    id: '3.3.7',
    title: 'Ignorer ICMP broadcasts',
    level: 1,
    category: 'network',
    commands: ['sysctl -w net.ipv4.icmp_echo_ignore_broadcasts=1'],
    remediation: '/etc/sysctl.conf',
  },
  {
    id: '3.3.8',
    title: 'Activer TCP SYN cookies',
    level: 1,
    category: 'network',
    commands: ['sysctl -w net.ipv4.tcp_syncookies=1'],
    remediation: '/etc/sysctl.conf',
  },
  {
    id: '1.5.1',
    title: 'Activer ASLR',
    level: 1,
    category: 'kernel',
    commands: ['sysctl -w kernel.randomize_va_space=2'],
    check: 'sysctl kernel.randomize_va_space',
    remediation: '/etc/sysctl.conf: kernel.randomize_va_space=2',
  },
  {
    id: '5.4.1',
    title: 'Politique expiration mot de passe',
    level: 1,
    category: 'password',
    commands: ['PASS_MAX_DAYS 90'],
    remediation: '/etc/login.defs',
  },
  {
    id: '5.4.2',
    title: 'Politique âge minimum mot de passe',
    level: 1,
    category: 'password',
    commands: ['PASS_MIN_DAYS 1'],
    remediation: '/etc/login.defs',
  },
  {
    id: '5.4.3',
    title: 'Avertissement expiration mot de passe',
    level: 1,
    category: 'password',
    commands: ['PASS_WARN_AGE 7'],
    remediation: '/etc/login.defs',
  },
  {
    id: '5.5.1',
    title: 'Complexité mot de passe - longueur min',
    level: 1,
    category: 'password',
    commands: ['minlen = 14'],
    remediation: '/etc/security/pwquality.conf',
  },
  {
    id: '5.5.2',
    title: 'Complexité mot de passe - chiffres',
    level: 1,
    category: 'password',
    commands: ['dcredit = -1'],
    remediation: '/etc/security/pwquality.conf',
  },
  {
    id: '5.5.3',
    title: 'Complexité mot de passe - majuscules',
    level: 1,
    category: 'password',
    commands: ['ucredit = -1'],
    remediation: '/etc/security/pwquality.conf',
  },
  {
    id: '5.5.4',
    title: 'Complexité mot de passe - caractères spéciaux',
    level: 1,
    category: 'password',
    commands: ['ocredit = -1'],
    remediation: '/etc/security/pwquality.conf',
  },
  {
    id: '1.7.1',
    title: 'Message du jour (MotD)',
    level: 1,
    category: 'banners',
    commands: [],
    remediation: '/etc/motd - Supprimer OS info',
  },
  {
    id: '4.1.1',
    title: 'Activer auditd',
    level: 2,
    category: 'audit',
    commands: ['systemctl enable auditd'],
    check: 'systemctl is-enabled auditd',
    remediation: 'apt install auditd audispd-plugins',
  },
  {
    id: '4.1.3',
    title: 'Auditer modifications /etc/passwd',
    level: 2,
    category: 'audit',
    commands: ['-w /etc/passwd -p wa -k passwd_changes'],
    remediation: '/etc/audit/rules.d/CIS.rules',
  },
  {
    id: '4.1.4',
    title: 'Auditer modifications /etc/group',
    level: 2,
    category: 'audit',
    commands: ['-w /etc/group -p wa -k group_changes'],
    remediation: '/etc/audit/rules.d/CIS.rules',
  },
  {
    id: '4.1.5',
    title: 'Auditer modifications /etc/shadow',
    level: 2,
    category: 'audit',
    commands: ['-w /etc/shadow -p wa -k shadow_changes'],
    remediation: '/etc/audit/rules.d/CIS.rules',
  },
  {
    id: '4.1.6',
    title: 'Auditer modifications sudoers',
    level: 2,
    category: 'audit',
    commands: ['-w /etc/sudoers -p wa -k sudoers_changes'],
    remediation: '/etc/audit/rules.d/CIS.rules',
  },
  {
    id: '2.1.1',
    title: 'Désactiver services inutiles',
    level: 1,
    category: 'services',
    commands: [
      'systemctl disable avahi-daemon',
      'systemctl disable cups',
      'systemctl disable isc-dhcp-server',
      'systemctl disable nfs-server',
      'systemctl disable rpcbind',
      'systemctl disable rsync',
      'systemctl disable snmpd',
    ],
    remediation: 'Désactiver tous services non nécessaires',
  },
];

export function generateCISPlaybookSection(level: 1 | 2, category?: string): string {
  let controls = CIS_UBUNTU_22_04.filter(c => c.level <= level);

  if (category) {
    controls = controls.filter(c => c.category === category);
  }

  const sections: string[] = [];

  const categories = [...new Set(controls.map(c => c.category))];

  for (const cat of categories) {
    const catControls = controls.filter(c => c.category === cat);
    sections.push(generateCategorySection(cat, catControls));
  }

  return sections.join('\n\n');
}

function generateCategorySection(category: string, controls: CISControl[]): string {
  const categoryNames: Record<string, string> = {
    filesystem: 'Système de fichiers',
    ssh: 'Configuration SSH',
    network: 'Paramètres réseau',
    kernel: 'Paramètres noyau',
    password: 'Politiques de mots de passe',
    banners: 'Banners et messages',
    audit: 'Audit et logging',
    services: 'Services système',
  };

  const title = categoryNames[category] || category.toUpperCase();

  let output = `    # ========================================\n`;
  output += `    # ${title}\n`;
  output += `    # ========================================\n\n`;

  for (const control of controls) {
    output += generateControlTask(control);
    output += '\n';
  }

  return output;
}

function generateControlTask(control: CISControl): string {
  const categoryMap: Record<string, string> = {
    filesystem: 'copy',
    ssh: 'lineinfile',
    network: 'sysctl',
    kernel: 'sysctl',
    password: 'lineinfile',
    banners: 'copy',
    audit: 'copy',
    services: 'systemd',
  };

  const module = categoryMap[control.category] || 'shell';

  let task = `    - name: "[CIS ${control.id}] ${control.title}"\n`;

  if (control.category === 'ssh') {
    for (const cmd of control.commands) {
      const [key, value] = cmd.split(' ');
      task += `      lineinfile:\n`;
      task += `        path: /etc/ssh/sshd_config\n`;
      task += `        regexp: '^#?${key}'\n`;
      task += `        line: '${key} ${value}'\n`;
      task += `        state: present\n`;
      task += `      notify: restart sshd\n\n`;
    }
  } else if (control.category === 'network' || control.category === 'kernel') {
    task += `      sysctl:\n`;
    for (const cmd of control.commands) {
      const match = cmd.match(/sysctl -w (.+)=(.+)/);
      if (match) {
        task += `        name: '${match[1]}'\n`;
        task += `        value: '${match[2]}'\n`;
        task += `        state: present\n`;
        task += `        reload: yes\n`;
      }
    }
  } else if (control.category === 'password') {
    task += `      lineinfile:\n`;
    task += `        path: ${control.remediation}\n`;
    const cmd = control.commands[0];
    const [key, value] = cmd.split(' = ');
    task += `        regexp: '^${key}'\n`;
    task += `        line: '${key} = ${value}'\n`;
    task += `        state: present\n`;
  } else if (control.category === 'audit') {
    task += `      lineinfile:\n`;
    task += `        path: /etc/audit/rules.d/CIS.rules\n`;
    task += `        line: '${control.commands[0]}'\n`;
    task += `        create: yes\n`;
    task += `      notify: restart auditd\n`;
  } else if (control.category === 'services') {
    for (const cmd of control.commands) {
      const serviceName = cmd.replace('systemctl disable ', '');
      task += `      systemd:\n`;
      task += `        name: ${serviceName}\n`;
      task += `        state: stopped\n`;
      task += `        enabled: no\n`;
      task += `      ignore_errors: yes\n\n`;
    }
  } else if (control.category === 'filesystem') {
    task += `      copy:\n`;
    task += `        content: |\n`;
    for (const cmd of control.commands) {
      task += `          ${cmd}\n`;
    }
    task += `        dest: /etc/modprobe.d/CIS.conf\n`;
    task += `        mode: '0644'\n`;
  }

  return task;
}

export function generateCISDocumentation(level: 1 | 2): string {
  const controls = CIS_UBUNTU_22_04.filter(c => c.level <= level);

  let doc = `# CIS Ubuntu 22.04 LTS - Niveau ${level}\n\n`;
  doc += `Total de ${controls.length} contrôles appliqués\n\n`;

  const categories = [...new Set(controls.map(c => c.category))];

  for (const cat of categories) {
    const catControls = controls.filter(c => c.category === cat);
    doc += `## ${cat.toUpperCase()}\n\n`;

    for (const control of catControls) {
      doc += `### ${control.id} - ${control.title}\n\n`;
      doc += `**Niveau:** ${control.level}\n\n`;
      doc += `**Remédiation:** ${control.remediation}\n\n`;

      if (control.check) {
        doc += `**Vérification:**\n\`\`\`bash\n${control.check}\n\`\`\`\n\n`;
      }

      doc += `**Commandes:**\n\`\`\`\n`;
      for (const cmd of control.commands) {
        doc += `${cmd}\n`;
      }
      doc += `\`\`\`\n\n`;
    }
  }

  return doc;
}

export function getCISControlsByCategory(level: 1 | 2, category: string): CISControl[] {
  return CIS_UBUNTU_22_04.filter(c => c.level <= level && c.category === category);
}

export function getCISCategories(): string[] {
  return [...new Set(CIS_UBUNTU_22_04.map(c => c.category))];
}
