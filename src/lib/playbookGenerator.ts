import * as yaml from 'js-yaml';

export interface PlaybookTemplate {
  keywords: string[];
  template: (params: Record<string, string>) => string;
  description: string;
  category: 'infrastructure' | 'security' | 'database' | 'deployment' | 'monitoring' | 'backup';
  complexity: 'basic' | 'intermediate' | 'advanced';
}

export interface GeneratedPlaybook {
  id: string;
  prompt: string;
  playbook: string;
  timestamp: Date;
  category: string;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function cleanIncompleteTasks(playbook: string): string {
  let cleaned = playbook;

  // Remplacer "Installer les" par "Installer le package"
  cleaned = cleaned.replace(/(name:\s+Installer)\s+les\s*$/gm, '$1 le package');
  cleaned = cleaned.replace(/(Installer)\s+les\s+([^\n]*?)\s*$/gm, '$1 $2');

  // Remplacer "Créer les" par "Créer le répertoire"
  cleaned = cleaned.replace(/(name:\s+Créer)\s+les\s*$/gm, '$1 le répertoire');

  // Remplacer "Configurer les" par "Configurer le service"
  cleaned = cleaned.replace(/(name:\s+Configurer)\s+les\s*$/gm, '$1 le service');

  // Supprimer les mots parasites en fin de ligne
  cleaned = cleaned.replace(/(name:\s+\w+)\s+(les|des|aux|pour)\s*$/gm, '$1');

  // Corriger les articles incomplets
  cleaned = cleaned.replace(/\s+le\s+$/gm, ' le package');
  cleaned = cleaned.replace(/\s+la\s+$/gm, ' la configuration');

  return cleaned;
}

function extractHostsFromPrompt(prompt: string): string {
  const normalized = normalizeText(prompt);

  // Mapping de mots-clés vers des groupes de hosts
  const hostMappings: Record<string, string> = {
    'web': 'webservers',
    'serveur web': 'webservers',
    'nginx': 'webservers',
    'apache': 'webservers',
    'database': 'databases',
    'base de donnees': 'databases',
    'postgresql': 'databases',
    'mysql': 'databases',
    'db': 'databases',
    'load balancer': 'loadbalancers',
    'proxy': 'proxies',
    'cache': 'cache_servers',
    'monitoring': 'monitoring',
    'backup': 'backup_servers'
  };

  for (const [keyword, hostGroup] of Object.entries(hostMappings)) {
    if (normalized.includes(keyword)) {
      return hostGroup;
    }
  }

  // Par défaut, retourner 'all' si aucun groupe spécifique n'est trouvé
  return 'all';
}

function extractSecondaryActions(prompt: string): string[] {
  const normalized = normalizeText(prompt);
  const secondaryActions: string[] = [];

  const securityKeywords = ['securite', 'security', 'firewall', 'fail2ban', 'banner', 'ssh'];
  const backupKeywords = ['backup', 'sauvegarde', 'snapshot'];
  const monitoringKeywords = ['monitoring', 'surveillance', 'logs', 'alertes'];

  if (securityKeywords.some(kw => normalized.includes(kw))) {
    secondaryActions.push('security');
  }

  if (backupKeywords.some(kw => normalized.includes(kw))) {
    secondaryActions.push('backup');
  }

  if (monitoringKeywords.some(kw => normalized.includes(kw))) {
    secondaryActions.push('monitoring');
  }

  return secondaryActions;
}

function generatePreTasks(): string {
  return `  pre_tasks:
    - name: Vérifier la connectivité
      ping:
      changed_when: false

    - name: Vérifier l'espace disque disponible
      shell: df -h / | tail -1 | awk '{print $5}' | sed 's/%//'
      register: disk_usage
      changed_when: false

    - name: Échouer si l'espace disque est insuffisant
      fail:
        msg: "Espace disque insuffisant ({{ disk_usage.stdout }}% utilisé)"
      when: disk_usage.stdout | int > 90

    - name: Vérifier que les packages système sont à jour
      command: apt-get update
      changed_when: false
      when: ansible_os_family == "Debian"`;
}

function generatePostTasks(): string {
  return `  post_tasks:
    - name: Nettoyer les packages inutilisés
      apt:
        autoremove: yes
        autoclean: yes
      when: ansible_os_family == "Debian"
      ignore_errors: yes

    - name: Vérifier les services critiques
      service_facts:
      register: services_state

    - name: Créer un rapport de déploiement
      copy:
        content: |
          Déploiement effectué le {{ ansible_date_time.iso8601 }}
          Par: {{ ansible_user_id }}
          Sur: {{ ansible_hostname }}
          Distribution: {{ ansible_distribution }} {{ ansible_distribution_version }}
        dest: /var/log/ansible-deploy-{{ ansible_date_time.date }}.log
        mode: '0644'
      ignore_errors: yes`;
}

function generateSecurityTasks(): string {
  return `    - name: Installer fail2ban
      apt:
        name: fail2ban
        state: present
      when: ansible_os_family == "Debian"

    - name: Configurer fail2ban pour SSH
      copy:
        content: |
          [sshd]
          enabled = true
          port = ssh
          filter = sshd
          logpath = /var/log/auth.log
          maxretry = 3
          bantime = 3600
        dest: /etc/fail2ban/jail.local
        mode: '0644'
      notify: restart fail2ban

    - name: Démarrer et activer fail2ban
      service:
        name: fail2ban
        state: started
        enabled: yes

    - name: Configurer le banner SSH
      copy:
        content: |
          *******************************************
          ACCÈS AUTORISÉ UNIQUEMENT
          Toute connexion non autorisée est interdite
          *******************************************
        dest: /etc/ssh/banner
        mode: '0644'

    - name: Activer le banner dans SSH
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?Banner'
        line: 'Banner /etc/ssh/banner'
        state: present
      notify: restart ssh`;
}

function addErrorHandling(playbook: string): string {
  const lines = playbook.split('\n');
  const result: string[] = [];
  let inTasks = false;
  let taskIndentLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    result.push(line);

    // Détecter le début de la section tasks
    if (line.match(/^\s{2}tasks:/)) {
      inTasks = true;
      continue;
    }

    // Détecter les tâches critiques qui devraient avoir une gestion d'erreur
    if (inTasks && line.match(/^\s{4}- name:.*(?:install|service|restart|start)/i)) {
      const nextLine = lines[i + 1];
      if (nextLine && !nextLine.includes('block:') && !nextLine.includes('rescue:')) {
        // Ajouter ignore_errors pour les tâches non-critiques
        if (line.match(/(?:clean|cache|log)/i)) {
          // Insérer ignore_errors après la tâche
          let j = i + 1;
          while (j < lines.length && lines[j].match(/^\s{6,}/)) {
            j++;
          }
          result.push('      ignore_errors: yes');
        }
      }
    }

    // Sortir de la section tasks
    if (inTasks && line.match(/^\s{2}[a-z_]+:/) && !line.match(/^\s{4}/)) {
      inTasks = false;
    }
  }

  return result.join('\n');
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function fuzzyMatch(word: string, keyword: string, threshold: number = 2): boolean {
  const normalizedWord = normalizeText(word);
  const normalizedKeyword = normalizeText(keyword);

  if (normalizedWord.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedWord)) {
    return true;
  }

  const distance = levenshteinDistance(normalizedWord, normalizedKeyword);
  const maxLength = Math.max(normalizedWord.length, normalizedKeyword.length);

  return distance <= Math.min(threshold, Math.floor(maxLength * 0.3));
}

const playbookTemplates: PlaybookTemplate[] = [
  {
    keywords: ['installer', 'install', 'package', 'logiciel'],
    description: 'Installation de packages',
    category: 'infrastructure',
    complexity: 'basic',
    template: (params) => `---
- name: Installation de packages
  hosts: ${params.hosts || 'all'}
  become: yes
  tasks:
    - name: Mettre à jour le cache des packages
      apt:
        update_cache: yes
      when: ansible_os_family == "Debian"

    - name: Installer ${params.package || 'le package'}
      apt:
        name: ${params.package || 'package_name'}
        state: present
      when: ansible_os_family == "Debian"

    - name: Installer ${params.package || 'le package'} (RedHat)
      yum:
        name: ${params.package || 'package_name'}
        state: present
      when: ansible_os_family == "RedHat"`
  },
  {
    keywords: ['créer', 'create', 'utilisateur', 'user'],
    description: 'Création d\'utilisateur',
    category: 'infrastructure',
    complexity: 'basic',
    template: (params) => `---
- name: Création d'utilisateur
  hosts: ${params.hosts || 'all'}
  become: yes
  tasks:
    - name: Vérifier si l'utilisateur existe
      command: id ${params.username || 'newuser'}
      register: user_exists
      failed_when: false
      changed_when: false

    - name: Créer l'utilisateur ${params.username || 'newuser'}
      user:
        name: ${params.username || 'newuser'}
        state: present
        shell: /bin/bash
        groups: ${params.groups || 'sudo'}
        append: yes
      when: user_exists.rc != 0

    - name: Configurer le mot de passe
      user:
        name: ${params.username || 'newuser'}
        password: "{{ '${params.password || 'changeme'}' | password_hash('sha512') }}"
        update_password: on_create`
  },
  {
    keywords: ['déployer', 'deploy', 'copier', 'copy', 'fichier', 'file'],
    description: 'Déploiement de fichiers',
    category: 'deployment',
    complexity: 'intermediate',
    template: (params) => `---
- name: Déploiement de fichiers
  hosts: ${params.hosts || 'all'}
  tasks:
    - name: Créer le répertoire de destination
      file:
        path: ${params.dest_dir || '/opt/app'}
        state: directory
        mode: '0755'
        creates: ${params.dest_dir || '/opt/app'}
      become: yes

    - name: Copier les fichiers
      copy:
        src: ${params.src || './files/'}
        dest: ${params.dest_dir || '/opt/app'}
        owner: ${params.owner || 'www-data'}
        group: ${params.group || 'www-data'}
        mode: '0644'
      become: yes`
  },
  {
    keywords: ['nginx', 'serveur web', 'web server'],
    description: 'Configuration Nginx',
    category: 'infrastructure',
    complexity: 'intermediate',
    template: (params) => `---
- name: Installation et configuration de Nginx
  hosts: ${params.hosts || 'webservers'}
  become: yes
  tasks:
    - name: Installer Nginx
      apt:
        name: nginx
        state: present
        update_cache: yes

    - name: Démarrer et activer Nginx
      service:
        name: nginx
        state: started
        enabled: yes

    - name: Configurer le firewall pour HTTP/HTTPS
      ufw:
        rule: allow
        name: 'Nginx Full'
      when: ansible_os_family == "Debian"

    - name: Créer le répertoire du site
      file:
        path: /var/www/${params.domain || 'example.com'}
        state: directory
        owner: www-data
        group: www-data
        mode: '0755'
        creates: /var/www/${params.domain || 'example.com'}

    - name: Déployer la configuration Nginx
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/sites-available/${params.domain || 'example.com'}
        owner: root
        group: root
        mode: '0644'
      notify: restart nginx

  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted`
  },
  {
    keywords: ['docker', 'conteneur', 'container'],
    description: 'Installation Docker',
    category: 'infrastructure',
    complexity: 'intermediate',
    template: (params) => `---
- name: Installation de Docker
  hosts: ${params.hosts || 'all'}
  become: yes
  tasks:
    - name: Installer les prérequis
      apt:
        name:
          - apt-transport-https
          - ca-certificates
          - curl
          - gnupg
          - lsb-release
        state: present
        update_cache: yes

    - name: Vérifier si Docker est déjà installé
      command: docker --version
      register: docker_installed
      failed_when: false
      changed_when: false

    - name: Ajouter la clé GPG de Docker
      apt_key:
        url: https://download.docker.com/linux/ubuntu/gpg
        state: present
      when: docker_installed.rc != 0

    - name: Ajouter le dépôt Docker
      apt_repository:
        repo: deb [arch=amd64] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable
        state: present
      when: docker_installed.rc != 0

    - name: Installer Docker
      apt:
        name:
          - docker-ce
          - docker-ce-cli
          - containerd.io
        state: present
        update_cache: yes

    - name: Démarrer Docker
      service:
        name: docker
        state: started
        enabled: yes

    - name: Ajouter l'utilisateur au groupe docker
      user:
        name: ${params.username || 'ubuntu'}
        groups: docker
        append: yes`
  },
  {
    keywords: ['base de données', 'database', 'mysql', 'postgresql', 'postgres'],
    description: 'Installation base de données',
    category: 'database',
    complexity: 'intermediate',
    template: (params) => `---
- name: Installation de PostgreSQL
  hosts: ${params.hosts || 'databases'}
  become: yes
  tasks:
    - name: Installer PostgreSQL
      apt:
        name:
          - postgresql
          - postgresql-contrib
          - python3-psycopg2
        state: present
        update_cache: yes

    - name: Démarrer PostgreSQL
      service:
        name: postgresql
        state: started
        enabled: yes

    - name: Configurer PostgreSQL pour écouter sur toutes les interfaces
      lineinfile:
        path: /etc/postgresql/*/main/postgresql.conf
        regexp: "^#?listen_addresses"
        line: "listen_addresses = 'localhost'"
        state: present
        backup: yes
      notify: restart postgresql

    - name: Créer une base de données
      postgresql_db:
        name: ${params.db_name || 'mydb'}
        state: present
      become_user: postgres

    - name: Créer un utilisateur de base de données
      postgresql_user:
        name: ${params.db_user || 'myuser'}
        password: ${params.db_password || 'changeme'}
        db: ${params.db_name || 'mydb'}
        priv: ALL
        state: present
      become_user: postgres

  handlers:
    - name: restart postgresql
      service:
        name: postgresql
        state: restarted`
  },
  {
    keywords: ['sécurité', 'security', 'firewall', 'ssh'],
    description: 'Configuration sécurité SSH',
    category: 'security',
    complexity: 'advanced',
    template: (params) => `---
- name: Configuration de la sécurité SSH
  hosts: ${params.hosts || 'all'}
  become: yes
  tasks:
    - name: Désactiver l'authentification par mot de passe
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^PasswordAuthentication'
        line: 'PasswordAuthentication no'
        state: present
        backup: yes
      notify: restart ssh

    - name: Désactiver la connexion root
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^PermitRootLogin'
        line: 'PermitRootLogin no'
        state: present
        backup: yes
      notify: restart ssh

    - name: Changer le port SSH
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^Port'
        line: 'Port ${params.ssh_port || '2222'}'
        state: present
        backup: yes
      notify: restart ssh

    - name: Installer et configurer UFW
      apt:
        name: ufw
        state: present

    - name: Autoriser le nouveau port SSH
      ufw:
        rule: allow
        port: '${params.ssh_port || '2222'}'
        proto: tcp

    - name: Activer UFW
      ufw:
        state: enabled

  handlers:
    - name: restart ssh
      service:
        name: ssh
        state: restarted`
  },
  {
    keywords: ['backup', 'sauvegarde', 'archiver'],
    description: 'Configuration de sauvegarde',
    category: 'backup',
    complexity: 'intermediate',
    template: (params) => `---
- name: Configuration de sauvegarde
  hosts: ${params.hosts || 'all'}
  become: yes
  tasks:
    - name: Créer le répertoire de sauvegarde
      file:
        path: ${params.backup_dir || '/backup'}
        state: directory
        mode: '0700'
        creates: ${params.backup_dir || '/backup'}

    - name: Installer rsync si nécessaire
      apt:
        name: rsync
        state: present
      register: rsync_installed
      changed_when: rsync_installed.changed

    - name: Créer une archive des données
      archive:
        path: ${params.source_dir || '/var/www'}
        dest: ${params.backup_dir || '/backup'}/backup-{{ ansible_date_time.date }}.tar.gz
        format: gz

    - name: Configurer la rotation des sauvegardes (garder 7 jours)
      find:
        paths: ${params.backup_dir || '/backup'}
        patterns: 'backup-*.tar.gz'
        age: 7d
      register: old_backups

    - name: Supprimer les anciennes sauvegardes
      file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ old_backups.files }}"`
  }
];

export function getTemplateCategories(): Array<{category: string; count: number}> {
  const categories = playbookTemplates.reduce((acc, template) => {
    acc[template.category] = (acc[template.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(categories).map(([category, count]) => ({ category, count }));
}

export function getTemplatesByCategory(category: string): PlaybookTemplate[] {
  return playbookTemplates.filter(t => t.category === category);
}

export interface ValidationError {
  message: string;
  line?: number;
  fixable: boolean;
  fix?: () => string;
}

export function validateYAML(yamlContent: string): { valid: boolean; errors: string[]; detailedErrors?: ValidationError[] } {
  const errors: string[] = [];
  const detailedErrors: ValidationError[] = [];

  if (!yamlContent.trim()) {
    return { valid: false, errors: ['Le playbook est vide'] };
  }

  // Vérifier que le playbook commence par ---
  if (!yamlContent.trim().startsWith('---')) {
    errors.push('Le playbook doit commencer par "---"');
    detailedErrors.push({
      message: 'Le playbook doit commencer par "---"',
      line: 1,
      fixable: true,
      fix: () => '---\n' + yamlContent
    });
  }

  try {
    // Parser le YAML avec js-yaml
    // Utiliser loadAll pour supporter les documents multiples (Ansible playbooks)
    const documents: any[] = [];
    yaml.loadAll(yamlContent, (doc) => {
      if (doc !== null && doc !== undefined) {
        documents.push(doc);
      }
    }, {
      schema: yaml.DEFAULT_SCHEMA,
      json: false
    });

    if (documents.length === 0) {
      errors.push('Aucun document YAML valide trouvé');
      return { valid: false, errors, detailedErrors };
    }

    // Vérifier chaque document
    documents.forEach((parsed, docIndex) => {
      // Vérifier que c'est un array (liste de plays)
      if (!Array.isArray(parsed)) {
        // Si c'est un objet unique, peut-être un commentaire ou métadonnées - ignorer
        if (typeof parsed === 'object' && parsed !== null) {
          // Vérifier si c'est un play unique (pas dans un array)
          if (parsed.name || parsed.hosts || parsed.tasks) {
            // C'est un play valide, mais pas dans un array - convertir
            errors.push(`Document ${docIndex + 1}: Le playbook devrait être une liste de plays (commencer par "- name:")`);
            detailedErrors.push({
              message: 'Le playbook devrait être une liste de plays',
              fixable: false
            });
          }
          // Sinon, c'est probablement des métadonnées ou commentaires - OK
          return;
        }

        errors.push(`Document ${docIndex + 1}: Doit être une liste de plays ou un objet valide`);
        return;
      }

      // Vérifier chaque play dans le document
      parsed.forEach((play: any, index: number) => {
        if (typeof play !== 'object' || play === null) {
          errors.push(`Document ${docIndex + 1}, Play ${index + 1}: Doit être un objet valide`);
          return;
        }

        // Vérifier les propriétés obligatoires
        if (!play.name) {
          errors.push(`Document ${docIndex + 1}, Play ${index + 1}: La propriété "name" est requise`);
        }

        if (!play.hosts) {
          errors.push(`Document ${docIndex + 1}, Play ${index + 1}: La propriété "hosts" est requise`);
        }

        // Vérifier que tasks est un array si présent
        if (play.tasks) {
          if (!Array.isArray(play.tasks)) {
            errors.push(`Document ${docIndex + 1}, Play ${index + 1}: "tasks" doit être une liste`);
          } else {
            // Vérifier chaque tâche
            play.tasks.forEach((task: any, taskIndex: number) => {
              if (typeof task !== 'object' || task === null) {
                errors.push(`Document ${docIndex + 1}, Play ${index + 1}, Tâche ${taskIndex + 1}: Doit être un objet valide`);
                return;
              }

              if (!task.name) {
                errors.push(`Document ${docIndex + 1}, Play ${index + 1}, Tâche ${taskIndex + 1}: La propriété "name" est requise`);
              }

              // Vérifier qu'il y a au moins un module Ansible
              const taskKeys = Object.keys(task).filter(k => k !== 'name' && k !== 'become' && k !== 'when' && k !== 'register' && k !== 'changed_when' && k !== 'failed_when' && k !== 'tags' && k !== 'notify' && k !== 'ignore_errors' && k !== 'loop' && k !== 'with_items');

              if (taskKeys.length === 0) {
                errors.push(`Document ${docIndex + 1}, Play ${index + 1}, Tâche ${taskIndex + 1}: Aucun module Ansible spécifié`);
              }
            });
          }
        }

        // Vérifier que handlers est un array si présent
        if (play.handlers && !Array.isArray(play.handlers)) {
          errors.push(`Document ${docIndex + 1}, Play ${index + 1}: "handlers" doit être une liste`);
        }

        // Vérifier que vars est un objet si présent
        if (play.vars && typeof play.vars !== 'object') {
          errors.push(`Document ${docIndex + 1}, Play ${index + 1}: "vars" doit être un objet`);
        }
      });
    });

  } catch (error: any) {
    // Erreur de parsing YAML
    if (error.mark) {
      errors.push(`Erreur de syntaxe YAML à la ligne ${error.mark.line + 1}, colonne ${error.mark.column + 1}: ${error.reason || error.message}`);
    } else {
      errors.push(`Erreur de syntaxe YAML: ${error.message || 'Format invalide'}`);
    }
  }

  // Vérifications supplémentaires sur le texte brut
  const lines = yamlContent.split('\n');

  // Vérifier les variables Jinja2
  const openBraces = (yamlContent.match(/\{\{/g) || []).length;
  const closeBraces = (yamlContent.match(/\}\}/g) || []).length;

  if (openBraces !== closeBraces) {
    errors.push(`Variables Jinja2 mal formées: ${openBraces} "{{" mais ${closeBraces} "}}"`);
  }

  // Vérifier les tabulations (YAML n'accepte que les espaces)
  lines.forEach((line, index) => {
    if (line.includes('\t')) {
      errors.push(`Ligne ${index + 1}: Utilisez des espaces, pas des tabulations`);
      detailedErrors.push({
        message: `Ligne ${index + 1}: Utilisez des espaces, pas des tabulations`,
        line: index + 1,
        fixable: true,
        fix: () => yamlContent.replace(/\t/g, '  ')
      });
    }
  });

  return { valid: errors.length === 0, errors, detailedErrors };
}

export function generatePlaybook(naturalLanguageInput: string): string {
  const input = naturalLanguageInput.toLowerCase();
  const lines = input.split(/\n+/).filter(line => line.trim());
  const words = input.split(/\s+/);

  // Extraire les actions secondaires du prompt
  const secondaryActions = extractSecondaryActions(naturalLanguageInput);
  const autoDetectedHosts = extractHostsFromPrompt(naturalLanguageInput);

  const extractParams = (input: string): Record<string, string> => {
    const params: Record<string, string> = {};

    const hostsMatch = input.match(/(?:sur|on|hosts?)\s+([a-zA-Z0-9_-]+)/);
    if (hostsMatch) {
      params.hosts = hostsMatch[1];
    } else {
      // Utiliser l'hôte auto-détecté si aucun n'est spécifié
      params.hosts = autoDetectedHosts;
    }

    const packageMatch = input.match(/(?:installer|install|instaler|instal|instalé|installez)\s+([a-zA-Z0-9_-]+)/);
    if (packageMatch && !['nginx', 'docker', 'mysql', 'postgresql'].includes(packageMatch[1])) {
      params.package = packageMatch[1];
    }

    const usernameMatch = input.match(/(?:utilisateur|user|utilisatuer|utlisateur|utilsateur)\s+([a-zA-Z0-9_-]+)/);
    if (usernameMatch) params.username = usernameMatch[1];

    const domainMatch = input.match(/(?:domaine|domain|domene)\s+([a-zA-Z0-9.-]+)/);
    if (domainMatch) params.domain = domainMatch[1];

    const portMatch = input.match(/port\s+(\d+)/);
    if (portMatch) params.ssh_port = portMatch[1];

    return params;
  };

  const matchedTemplates: Array<{ template: PlaybookTemplate; params: Record<string, string>; priority: number }> = [];

  for (const template of playbookTemplates) {
    const hasKeyword = template.keywords.some(keyword => {
      return words.some(word => fuzzyMatch(word, keyword));
    });

    if (hasKeyword) {
      const params = extractParams(input);

      // Pondération sémantique : priorité aux actions de sécurité
      let priority = 1;
      if (template.category === 'security' && secondaryActions.includes('security')) {
        priority = 3;
      } else if (template.category === 'backup' && secondaryActions.includes('backup')) {
        priority = 2;
      }

      matchedTemplates.push({ template, params, priority });
    }
  }

  // Trier par priorité (plus haute en premier)
  matchedTemplates.sort((a, b) => b.priority - a.priority);

  if (matchedTemplates.length === 0) {
    return `---
- name: Playbook généré automatiquement
  hosts: ${autoDetectedHosts}
  tasks:
    - name: Tâche personnalisée
      debug:
        msg: "Playbook basé sur: ${naturalLanguageInput}"

# 💡 Conseil: Essayez des commandes comme:
# - "installer nginx sur webservers"
# - "créer utilisateur admin"
# - "déployer fichiers dans /opt/app"
# - "configurer base de données postgresql"
# - "sécuriser ssh sur port 2222"`;
  }

  if (matchedTemplates.length === 1) {
    let playbook = matchedTemplates[0].template.template(matchedTemplates[0].params);

    // Insérer pre_tasks et post_tasks
    const lines = playbook.split('\n');
    const tasksIndex = lines.findIndex(line => line.match(/^\s{2}tasks:/));

    if (tasksIndex !== -1) {
      lines.splice(tasksIndex, 0, generatePreTasks());

      // Trouver où insérer post_tasks (avant handlers)
      const handlersIndex = lines.findIndex(line => line.match(/^\s{2}handlers:/));
      if (handlersIndex !== -1) {
        lines.splice(handlersIndex, 0, generatePostTasks());
      } else {
        lines.push(generatePostTasks());
      }
    }

    // Ajouter les tâches de sécurité si demandées
    if (secondaryActions.includes('security') && !playbook.includes('fail2ban')) {
      const tasksEndIndex = lines.findIndex(line => line.match(/^\s{2}(?:handlers|post_tasks):/));
      if (tasksEndIndex !== -1) {
        lines.splice(tasksEndIndex, 0, '\n' + generateSecurityTasks());
      }

      // Ajouter le handler pour fail2ban
      const handlersIndex = lines.findIndex(line => line.match(/^\s{2}handlers:/));
      if (handlersIndex !== -1) {
        lines.splice(handlersIndex + 1, 0, `    - name: restart fail2ban
      service:
        name: fail2ban
        state: restarted\n`);
      } else {
        lines.push(`\n  handlers:
    - name: restart fail2ban
      service:
        name: fail2ban
        state: restarted`);
      }
    }

    playbook = lines.join('\n');
    playbook = addErrorHandling(playbook);
    return cleanIncompleteTasks(playbook);
  }

  const plays: string[] = [];
  for (const { template, params } of matchedTemplates) {
    const playbook = template.template(params);
    const playbookLines = playbook.split('\n').slice(1);
    plays.push(playbookLines.join('\n'));
  }

  let fullPlaybook = `---\n${plays.join('\n\n')}`;
  fullPlaybook = addErrorHandling(fullPlaybook);
  return cleanIncompleteTasks(fullPlaybook);
}
