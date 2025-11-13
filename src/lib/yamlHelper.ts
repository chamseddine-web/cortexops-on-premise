export function autoFixIndentation(yamlContent: string): string {
  const lines = yamlContent.split('\n');
  const fixedLines: string[] = [];
  let currentIndent = 0;
  let inTasks = false;
  let inPlay = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      fixedLines.push(line);
      continue;
    }

    if (trimmed === '---') {
      fixedLines.push('---');
      currentIndent = 0;
      continue;
    }

    if (trimmed.startsWith('- name:') && !inTasks) {
      fixedLines.push('- name:' + trimmed.substring(7));
      inPlay = true;
      currentIndent = 2;
      continue;
    }

    if (trimmed === 'tasks:' || trimmed === 'handlers:' || trimmed === 'vars:' || trimmed === 'pre_tasks:' || trimmed === 'post_tasks:') {
      fixedLines.push('  ' + trimmed);
      if (trimmed === 'tasks:' || trimmed === 'handlers:' || trimmed === 'pre_tasks:' || trimmed === 'post_tasks:') {
        inTasks = true;
        currentIndent = 4;
      }
      continue;
    }

    if (inTasks && trimmed.startsWith('- name:')) {
      fixedLines.push('    - name:' + trimmed.substring(7));
      currentIndent = 6;
      continue;
    }

    if (trimmed.startsWith('hosts:') || trimmed.startsWith('become:') || trimmed.startsWith('gather_facts:') || trimmed.startsWith('check_mode:')) {
      fixedLines.push('  ' + trimmed);
      continue;
    }

    if (inTasks && !trimmed.startsWith('-')) {
      fixedLines.push(' '.repeat(currentIndent) + trimmed);
      continue;
    }

    fixedLines.push(line);
  }

  return fixedLines.join('\n');
}

export function autoFixCommonErrors(yamlContent: string): string {
  let fixed = yamlContent;

  if (!fixed.trim().startsWith('---')) {
    fixed = '---\n' + fixed;
  }

  fixed = fixed.replace(/\t/g, '  ');

  fixed = fixed.replace(/^(\s*)- name:\s*$/gm, '$1- name: "Task name"');

  fixed = fixed.replace(/^(\s*)hosts:\s*$/gm, '$1hosts: all');

  fixed = fixed.replace(/^(\s*)become:\s*$/gm, '$1become: yes');

  return fixed;
}

export function getYamlSuggestions(line: string, lineNumber: number): string[] {
  const suggestions: string[] = [];
  const trimmed = line.trim();

  if (trimmed === '' && lineNumber === 0) {
    suggestions.push('---');
  }

  if (trimmed === '- name:' || trimmed.endsWith('- name:')) {
    suggestions.push('Ajoutez un nom descriptif après "- name:"');
  }

  if (trimmed === 'hosts:' || trimmed.endsWith('hosts:')) {
    suggestions.push('Spécifiez les hosts (ex: all, webservers, localhost)');
  }

  if (trimmed.includes('apt:') && !line.includes('name:')) {
    suggestions.push('Ajoutez "name:" pour spécifier le package à installer');
  }

  if (trimmed.includes('copy:') && !line.includes('src:')) {
    suggestions.push('Ajoutez "src:" et "dest:" pour copy');
  }

  if (trimmed.includes('service:') && !line.includes('name:')) {
    suggestions.push('Ajoutez "name:" pour spécifier le service');
  }

  return suggestions;
}

export function insertSnippet(currentContent: string, cursorPosition: number, snippetType: string): { newContent: string; newCursorPosition: number } {
  const taskSnippets: Record<string, string> = {
    'task': `- name: Task name
  debug:
    msg: "Task content"`,

    'apt': `- name: Install package with apt
  apt:
    name: package_name
    state: present
    update_cache: yes
  become: yes`,

    'yum': `- name: Install package with yum
  yum:
    name: package_name
    state: present
    update_cache: yes
  become: yes`,

    'copy': `- name: Copy file
  copy:
    src: ./source/file
    dest: /destination/path
    owner: root
    group: root
    mode: '0644'
  become: yes`,

    'service': `- name: Manage service
  service:
    name: service_name
    state: started
    enabled: yes
    daemon_reload: yes
  become: yes`,

    'user': `- name: Create user
  user:
    name: username
    state: present
    shell: /bin/bash
    groups: sudo
    append: yes
    create_home: yes
  become: yes`,

    'template': `- name: Deploy template
  template:
    src: template.j2
    dest: /etc/config/file.conf
    owner: root
    group: root
    mode: '0644'
    backup: yes
  become: yes
  notify: restart service`,

    'file': `- name: Manage file/directory
  file:
    path: /path/to/file
    state: directory
    mode: '0755'
    owner: root
    group: root
  become: yes`,

    'command': `- name: Run command
  command: your_command_here
  args:
    chdir: /path/to/directory
  register: command_result
  changed_when: false`,

    'lineinfile': `- name: Modify config file
  lineinfile:
    path: /etc/config/file
    regexp: '^#?OptionName'
    line: 'OptionName value'
    state: present
    backup: yes
  become: yes`,

    'docker-install': `- name: Install Docker dependencies
  apt:
    name:
      - apt-transport-https
      - ca-certificates
      - curl
      - gnupg
      - lsb-release
    state: present
    update_cache: yes
  become: yes

- name: Add Docker GPG key
  apt_key:
    url: https://download.docker.com/linux/ubuntu/gpg
    state: present
  become: yes

- name: Add Docker repository
  apt_repository:
    repo: deb [arch=amd64] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable
    state: present
  become: yes

- name: Install Docker
  apt:
    name:
      - docker-ce
      - docker-ce-cli
      - containerd.io
    state: present
    update_cache: yes
  become: yes

- name: Start and enable Docker
  service:
    name: docker
    state: started
    enabled: yes
  become: yes`,

    'docker-container': `- name: Deploy Docker container
  docker_container:
    name: container_name
    image: image_name:tag
    state: started
    restart_policy: unless-stopped
    ports:
      - "80:80"
    env:
      ENV_VAR: value
    volumes:
      - /host/path:/container/path
  become: yes`,

    'nginx-install': `- name: Install Nginx
  apt:
    name: nginx
    state: present
    update_cache: yes
  become: yes

- name: Start and enable Nginx
  service:
    name: nginx
    state: started
    enabled: yes
  become: yes

- name: Configure firewall for Nginx
  ufw:
    rule: allow
    name: 'Nginx Full'
  become: yes`,

    'nginx-vhost': `- name: Deploy Nginx vhost configuration
  template:
    src: vhost.conf.j2
    dest: /etc/nginx/sites-available/{{ domain_name }}
    owner: root
    group: root
    mode: '0644'
  become: yes

- name: Enable Nginx vhost
  file:
    src: /etc/nginx/sites-available/{{ domain_name }}
    dest: /etc/nginx/sites-enabled/{{ domain_name }}
    state: link
  become: yes
  notify: reload nginx

- name: Test Nginx configuration
  command: nginx -t
  become: yes
  changed_when: false`,

    'postgresql-install': `- name: Install PostgreSQL
  apt:
    name:
      - postgresql
      - postgresql-contrib
      - python3-psycopg2
    state: present
    update_cache: yes
  become: yes

- name: Start and enable PostgreSQL
  service:
    name: postgresql
    state: started
    enabled: yes
  become: yes`,

    'postgresql-db': `- name: Create PostgreSQL database
  postgresql_db:
    name: database_name
    encoding: UTF-8
    lc_collate: en_US.UTF-8
    lc_ctype: en_US.UTF-8
  become: yes
  become_user: postgres

- name: Create PostgreSQL user
  postgresql_user:
    name: db_user
    password: "{{ db_password }}"
    db: database_name
    priv: ALL
  become: yes
  become_user: postgres`,

    'mysql-install': `- name: Install MySQL
  apt:
    name:
      - mysql-server
      - python3-pymysql
    state: present
    update_cache: yes
  become: yes

- name: Start and enable MySQL
  service:
    name: mysql
    state: started
    enabled: yes
  become: yes

- name: Secure MySQL installation
  mysql_user:
    name: root
    password: "{{ mysql_root_password }}"
    host: localhost
  become: yes`,

    'git-clone': `- name: Clone Git repository
  git:
    repo: https://github.com/user/repo.git
    dest: /opt/application
    version: main
    force: yes
  become: yes`,

    'cron-job': `- name: Create cron job
  cron:
    name: "Job description"
    minute: "0"
    hour: "2"
    job: "/usr/bin/command"
    user: root
  become: yes`,

    'ssl-cert': `- name: Install Certbot
  apt:
    name:
      - certbot
      - python3-certbot-nginx
    state: present
    update_cache: yes
  become: yes

- name: Obtain SSL certificate
  command: certbot --nginx -d {{ domain_name }} --non-interactive --agree-tos -m {{ admin_email }}
  become: yes
  args:
    creates: /etc/letsencrypt/live/{{ domain_name }}/fullchain.pem`,

    'firewall-ufw': `- name: Install UFW
  apt:
    name: ufw
    state: present
  become: yes

- name: Configure UFW defaults
  ufw:
    direction: "{{ item.direction }}"
    policy: "{{ item.policy }}"
  loop:
    - { direction: 'incoming', policy: 'deny' }
    - { direction: 'outgoing', policy: 'allow' }
  become: yes

- name: Allow SSH
  ufw:
    rule: allow
    port: '22'
    proto: tcp
  become: yes

- name: Enable UFW
  ufw:
    state: enabled
  become: yes`,

    'backup-script': `- name: Create backup directory
  file:
    path: /backup
    state: directory
    mode: '0755'
  become: yes

- name: Deploy backup script
  template:
    src: backup.sh.j2
    dest: /usr/local/bin/backup.sh
    mode: '0755'
  become: yes

- name: Schedule backup cron job
  cron:
    name: "Daily backup"
    minute: "0"
    hour: "3"
    job: "/usr/local/bin/backup.sh"
  become: yes`,

    'ssh-hardening': `- name: Disable root login
  lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^PermitRootLogin'
    line: 'PermitRootLogin no'
    backup: yes
  become: yes

- name: Disable password authentication
  lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^PasswordAuthentication'
    line: 'PasswordAuthentication no'
  become: yes

- name: Restart SSH service
  service:
    name: sshd
    state: restarted
  become: yes`,

    'nodejs-install': `- name: Add NodeSource repository
  shell: curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
  become: yes
  args:
    creates: /etc/apt/sources.list.d/nodesource.list

- name: Install Node.js
  apt:
    name: nodejs
    state: present
    update_cache: yes
  become: yes

- name: Install PM2 globally
  npm:
    name: pm2
    global: yes
  become: yes`,

    'systemd-service': `- name: Deploy systemd service file
  template:
    src: service.service.j2
    dest: /etc/systemd/system/{{ service_name }}.service
    mode: '0644'
  become: yes

- name: Reload systemd daemon
  service:
    daemon_reload: yes
  become: yes

- name: Start and enable service
  service:
    name: "{{ service_name }}"
    state: started
    enabled: yes
  become: yes`,

    'when-condition': `- name: Task with condition
  debug:
    msg: "This runs only on Ubuntu"
  when: ansible_distribution == "Ubuntu"`,

    'loop-items': `- name: Task with loop
  debug:
    msg: "Processing {{ item }}"
  loop:
    - item1
    - item2
    - item3`,

    'block-rescue': `- name: Task block with error handling
  block:
    - name: Try to do something
      command: /bin/false
  rescue:
    - name: Handle error
      debug:
        msg: "An error occurred"
  always:
    - name: Always run this
      debug:
        msg: "Cleanup tasks"`,

    'handler': `- name: Restart service handler
  service:
    name: service_name
    state: restarted
  become: yes`,
  };

  const playSnippet = `- name: New Play
  hosts: all
  become: yes
  tasks:
    - name: First task
      debug:
        msg: "Task content here"`;

  const before = currentContent.substring(0, cursorPosition);
  const after = currentContent.substring(cursorPosition);

  const lines = before.split('\n');
  let inTasksSection = false;
  let tasksIndent = 0;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === 'tasks:' || trimmed === 'handlers:' || trimmed === 'pre_tasks:' || trimmed === 'post_tasks:') {
      inTasksSection = true;
      tasksIndent = line.length - line.trimStart().length;
      break;
    }
  }

  let snippet = '';

  if (snippetType === 'play') {
    snippet = playSnippet;
  } else if (taskSnippets[snippetType]) {
    if (inTasksSection) {
      const baseSnippet = taskSnippets[snippetType];
      const snippetLines = baseSnippet.split('\n');
      const indentedLines = snippetLines.map(line => '    ' + line);
      snippet = indentedLines.join('\n');
    } else {
      snippet = taskSnippets[snippetType];
    }
  } else {
    return { newContent: currentContent, newCursorPosition: cursorPosition };
  }

  const newContent = before + '\n' + snippet + after;
  const newCursorPosition = cursorPosition + snippet.length + 1;

  return { newContent, newCursorPosition };
}

export function autoCompleteModule(partialModule: string): string[] {
  const modules = [
    'apt', 'yum', 'dnf', 'package',
    'service', 'systemd',
    'copy', 'template', 'fetch', 'file',
    'user', 'group',
    'command', 'shell', 'raw', 'script',
    'lineinfile', 'blockinfile', 'replace',
    'git', 'subversion',
    'docker_container', 'docker_image', 'docker_network',
    'postgresql_db', 'postgresql_user', 'mysql_db', 'mysql_user',
    'uri', 'get_url',
    'debug', 'assert', 'fail', 'pause',
    'set_fact', 'include_tasks', 'import_tasks',
    'archive', 'unarchive',
    'cron', 'at',
    'ufw', 'firewalld',
    'mount', 'filesystem',
  ];

  return modules.filter(m => m.startsWith(partialModule.toLowerCase()));
}
