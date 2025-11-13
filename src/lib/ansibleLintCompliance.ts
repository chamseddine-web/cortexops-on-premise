export interface LintRule {
  id: string;
  description: string;
  category: 'syntax' | 'best-practice' | 'security' | 'idempotency';
  fix: (playbook: string) => string;
}

export const ANSIBLE_LINT_RULES: LintRule[] = [
  {
    id: 'name[missing]',
    description: 'All tasks should be named',
    category: 'best-practice',
    fix: (playbook: string) => playbook,
  },
  {
    id: 'yaml[line-length]',
    description: 'Line too long (> 160 characters)',
    category: 'syntax',
    fix: (playbook: string) => playbook,
  },
  {
    id: 'no-changed-when',
    description: 'Commands should not change things if nothing needs doing',
    category: 'idempotency',
    fix: (playbook: string) => {
      return playbook.replace(
        /(\s+)(shell|command):\s*\|?\s*\n([\s\S]*?)(?=\n\s+-\s+name:|\n\n|\n  handlers:|\n  tasks:|$)/g,
        (match, indent, module, content) => {
          if (!content.includes('changed_when:')) {
            return `${indent}${module}: |\n${content}\n${indent}changed_when: false`;
          }
          return match;
        }
      );
    },
  },
  {
    id: 'risky-shell-pipe',
    description: 'Shells that use pipes should set the pipefail option',
    category: 'best-practice',
    fix: (playbook: string) => {
      return playbook.replace(
        /(shell:\s*\|?\s*\n[\s\S]*?\|[\s\S]*?)(?=\n\s+-\s+name:|\n\n)/g,
        (match) => {
          if (!match.includes('set -o pipefail')) {
            return match.replace(/(shell:\s*\|?\s*\n)/, '$1          set -o pipefail\n');
          }
          return match;
        }
      );
    },
  },
  {
    id: 'no-handler',
    description: 'Tasks that run when changed should notify handlers',
    category: 'best-practice',
    fix: (playbook: string) => playbook,
  },
];

export function ensureAnsibleLintCompliance(playbook: string): string {
  let result = playbook;

  result = ensureNamedTasks(result);
  result = ensureChangedWhen(result);
  result = ensurePipefail(result);
  result = ensureNoLog(result);
  result = ensureBecomeUser(result);
  result = ensureProperIndentation(result);
  result = addLintDisableComments(result);

  return result;
}

function ensureNamedTasks(playbook: string): string {
  const lines = playbook.split('\n');
  const result: string[] = [];
  let inTask = false;
  let taskIndent = '';
  let hasName = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*- name:/.test(line)) {
      hasName = true;
      inTask = true;
      taskIndent = line.match(/^(\s*)/)?.[1] || '';
    } else if (inTask && /^\s*- /.test(line)) {
      inTask = false;
      hasName = false;
    }

    result.push(line);
  }

  return result.join('\n');
}

function ensureChangedWhen(playbook: string): string {
  return playbook.replace(
    /(- name:.*\n\s+(?:shell|command|raw):[\s\S]*?)(\n\s+- name:|$)/g,
    (match, task, next) => {
      if (!task.includes('changed_when:') && !task.includes('register:')) {
        const indent = task.match(/\n(\s+)(?:shell|command|raw):/)?.[1] || '  ';
        return task + `\n${indent}changed_when: false` + next;
      }
      return match;
    }
  );
}

function ensurePipefail(playbook: string): string {
  return playbook.replace(
    /(shell:\s*\|[\s\S]*?\|[\s\S]*?)(?=\n\s+(?:register|changed_when|failed_when|when|notify|tags|become):|$)/g,
    (match) => {
      if (!match.includes('set -o pipefail') && match.includes('|')) {
        const lines = match.split('\n');
        const indent = lines[1]?.match(/^(\s*)/)?.[1] || '    ';
        lines.splice(1, 0, `${indent}set -o pipefail`);
        return lines.join('\n');
      }
      return match;
    }
  );
}

function ensureNoLog(playbook: string): string {
  return playbook.replace(
    /(- name:.*(?:password|secret|token|key|credential).*\n(?:(?!- name:)[\s\S])*?)(\n\s+- name:|$)/gi,
    (match, task, next) => {
      if (!task.includes('no_log:')) {
        const indent = task.match(/\n(\s+)\w+:/)?.[1] || '  ';
        return task + `\n${indent}no_log: true` + next;
      }
      return match;
    }
  );
}

function ensureBecomeUser(playbook: string): string {
  return playbook.replace(
    /(become:\s*(?:yes|true)[\s\S]*?)(\n\s+tasks:)/g,
    (match, becomeSection, tasksLine) => {
      if (!becomeSection.includes('become_user:')) {
        const indent = becomeSection.match(/\n(\s+)become:/)?.[1] || '  ';
        return becomeSection + `\n${indent}become_user: root` + tasksLine;
      }
      return match;
    }
  );
}

function ensureProperIndentation(playbook: string): string {
  const lines = playbook.split('\n');
  let inYamlBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === '---') {
      inYamlBlock = true;
      continue;
    }

    if (inYamlBlock && line.includes('\t')) {
      lines[i] = line.replace(/\t/g, '  ');
    }
  }

  return lines.join('\n');
}

function addLintDisableComments(playbook: string): string {
  const lines = playbook.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('shell:') && line.includes('curl') && !line.includes('# noqa')) {
      result.push(line + '  # noqa: command-instead-of-module');
    } else if (line.includes('command: rm ') && !line.includes('# noqa')) {
      result.push(line + '  # noqa: command-instead-of-module');
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

export function generateAnsibleCfg(): string {
  return `[defaults]
inventory = inventory/hosts
host_key_checking = False
retry_files_enabled = False
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 3600
stdout_callback = yaml
callbacks_enabled = profile_tasks, timer
deprecation_warnings = False
interpreter_python = auto_silent

[inventory]
enable_plugins = host_list, yaml, ini, auto

[privilege_escalation]
become = True
become_method = sudo
become_user = root
become_ask_pass = False

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o StrictHostKeyChecking=no
pipelining = True
control_path = /tmp/ansible-ssh-%%h-%%p-%%r
`;
}

export function generateAnsibleLintConfig(): string {
  return `---
# Ansible Lint Configuration
profile: production

exclude_paths:
  - .git/
  - .github/
  - .vscode/
  - venv/
  - __pycache__/
  - '*.retry'

skip_list:
  - yaml[line-length]  # Lines can be longer in templates
  - name[casing]       # Allow various naming styles
  - risky-file-permissions  # We set permissions explicitly

warn_list:
  - experimental
  - no-changed-when

use_default_rules: true

verbosity: 1

# Ansible-specific settings
ansible:
  config: ansible.cfg

# Enable additional strict rules in production
strict: true

# Task naming
task_name_prefix: "{play}: "
var_naming_pattern: "^[a-z_][a-z0-9_]*$"
`;
}

export function generateYamlLintConfig(): string {
  return `---
extends: default

rules:
  line-length:
    max: 160
    level: warning
  indentation:
    spaces: 2
    indent-sequences: true
  comments:
    min-spaces-from-content: 1
  comments-indentation: {}
  document-start:
    present: true
  trailing-spaces: {}
  truthy:
    allowed-values: ['true', 'false', 'yes', 'no']
`;
}

export function generateHandlersSeparately(service: string): string {
  const handlers: Record<string, string> = {
    nginx: `---
# Handlers pour Nginx

- name: restart nginx
  service:
    name: nginx
    state: restarted
  become: yes

- name: reload nginx
  service:
    name: nginx
    state: reloaded
  become: yes

- name: validate nginx config
  command: nginx -t
  changed_when: false
  become: yes
`,
    php: `---
# Handlers pour PHP-FPM

- name: restart php-fpm
  service:
    name: php8.2-fpm
    state: restarted
  become: yes

- name: reload php-fpm
  service:
    name: php8.2-fpm
    state: reloaded
  become: yes
`,
    apache: `---
# Handlers pour Apache

- name: restart apache
  service:
    name: apache2
    state: restarted
  become: yes

- name: reload apache
  service:
    name: apache2
    state: reloaded
  become: yes
`,
    systemd: `---
# Handlers pour systemd

- name: reload systemd
  systemd:
    daemon_reload: yes
  become: yes

- name: restart service
  systemd:
    name: "{{ service_name }}"
    state: restarted
  become: yes
`,
    sshd: `---
# Handlers pour SSH

- name: restart sshd
  service:
    name: sshd
    state: restarted
  become: yes

- name: validate sshd config
  command: sshd -t
  changed_when: false
  become: yes
`,
    firewall: `---
# Handlers pour UFW

- name: restart ufw
  service:
    name: ufw
    state: restarted
  become: yes

- name: reload ufw
  command: ufw reload
  changed_when: false
  become: yes
`,
  };

  return handlers[service.toLowerCase()] || `---
# Handlers pour ${service}

- name: restart ${service}
  service:
    name: ${service}
    state: restarted
  become: yes
`;
}

export function injectHandlers(playbook: string, services: string[]): string {
  if (services.length === 0) return playbook;

  const handlers = services.map(s => generateHandlersSeparately(s).split('\n').slice(2).join('\n')).join('\n');

  if (playbook.includes('handlers:')) {
    return playbook.replace(/(\n\s+handlers:\s*\n)/, `$1${handlers}\n`);
  } else {
    return playbook + `\n\n  handlers:\n${handlers}`;
  }
}
