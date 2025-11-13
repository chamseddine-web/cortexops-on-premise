export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  description?: string;
}

export interface ProjectStructure {
  name: string;
  type: 'basic' | 'roles' | 'collections' | 'enterprise';
  tree: FileNode;
}

export function generateProjectStructure(type: 'basic' | 'roles' | 'collections' | 'enterprise', projectName: string): ProjectStructure {
  const structures = {
    basic: generateBasicStructure(projectName),
    roles: generateRolesStructure(projectName),
    collections: generateCollectionsStructure(projectName),
    enterprise: generateEnterpriseStructure(projectName),
  };

  return structures[type];
}

function generateBasicStructure(projectName: string): ProjectStructure {
  return {
    name: projectName,
    type: 'basic',
    tree: {
      name: projectName,
      type: 'directory',
      children: [
        {
          name: 'playbook.yml',
          type: 'file',
          description: 'Playbook principal',
        },
        {
          name: 'inventory',
          type: 'directory',
          children: [
            {
              name: 'hosts',
              type: 'file',
              description: 'Inventaire des serveurs',
            },
            {
              name: 'group_vars',
              type: 'directory',
              children: [
                {
                  name: 'all.yml',
                  type: 'file',
                  description: 'Variables globales',
                },
              ],
            },
          ],
        },
        {
          name: 'ansible.cfg',
          type: 'file',
          description: 'Configuration Ansible',
        },
        {
          name: 'requirements.yml',
          type: 'file',
          description: 'Collections et rôles externes',
        },
      ],
    },
  };
}

function generateRolesStructure(projectName: string): ProjectStructure {
  return {
    name: projectName,
    type: 'roles',
    tree: {
      name: projectName,
      type: 'directory',
      children: [
        {
          name: 'site.yml',
          type: 'file',
          description: 'Playbook principal',
        },
        {
          name: 'inventory',
          type: 'directory',
          children: [
            {
              name: 'production',
              type: 'directory',
              children: [
                {
                  name: 'hosts',
                  type: 'file',
                  description: 'Serveurs production',
                },
                {
                  name: 'group_vars',
                  type: 'directory',
                  children: [
                    {
                      name: 'all.yml',
                      type: 'file',
                    },
                    {
                      name: 'webservers.yml',
                      type: 'file',
                    },
                    {
                      name: 'databases.yml',
                      type: 'file',
                    },
                  ],
                },
              ],
            },
            {
              name: 'staging',
              type: 'directory',
              children: [
                {
                  name: 'hosts',
                  type: 'file',
                  description: 'Serveurs staging',
                },
              ],
            },
          ],
        },
        {
          name: 'roles',
          type: 'directory',
          children: [
            {
              name: 'common',
              type: 'directory',
              children: [
                {
                  name: 'tasks',
                  type: 'directory',
                  children: [
                    {
                      name: 'main.yml',
                      type: 'file',
                      description: 'Tâches principales',
                    },
                  ],
                },
                {
                  name: 'handlers',
                  type: 'directory',
                  children: [
                    {
                      name: 'main.yml',
                      type: 'file',
                      description: 'Handlers',
                    },
                  ],
                },
                {
                  name: 'templates',
                  type: 'directory',
                  children: [
                    {
                      name: 'config.j2',
                      type: 'file',
                      description: 'Templates Jinja2',
                    },
                  ],
                },
                {
                  name: 'files',
                  type: 'directory',
                  children: [
                    {
                      name: 'example.conf',
                      type: 'file',
                      description: 'Fichiers statiques',
                    },
                  ],
                },
                {
                  name: 'vars',
                  type: 'directory',
                  children: [
                    {
                      name: 'main.yml',
                      type: 'file',
                      description: 'Variables du rôle',
                    },
                  ],
                },
                {
                  name: 'defaults',
                  type: 'directory',
                  children: [
                    {
                      name: 'main.yml',
                      type: 'file',
                      description: 'Variables par défaut',
                    },
                  ],
                },
                {
                  name: 'meta',
                  type: 'directory',
                  children: [
                    {
                      name: 'main.yml',
                      type: 'file',
                      description: 'Métadonnées du rôle',
                    },
                  ],
                },
              ],
            },
            {
              name: 'webserver',
              type: 'directory',
              description: 'Rôle serveur web',
            },
            {
              name: 'database',
              type: 'directory',
              description: 'Rôle base de données',
            },
          ],
        },
        {
          name: 'ansible.cfg',
          type: 'file',
          description: 'Configuration Ansible',
        },
        {
          name: '.ansible-lint',
          type: 'file',
          description: 'Configuration Ansible Lint',
        },
        {
          name: '.yamllint',
          type: 'file',
          description: 'Configuration YAML Lint',
        },
        {
          name: 'requirements.yml',
          type: 'file',
          description: 'Dépendances externes',
        },
      ],
    },
  };
}

function generateCollectionsStructure(projectName: string): ProjectStructure {
  return {
    name: projectName,
    type: 'collections',
    tree: {
      name: projectName,
      type: 'directory',
      children: [
        {
          name: 'ansible_collections',
          type: 'directory',
          children: [
            {
              name: 'company',
              type: 'directory',
              children: [
                {
                  name: projectName,
                  type: 'directory',
                  children: [
                    {
                      name: 'plugins',
                      type: 'directory',
                      children: [
                        {
                          name: 'modules',
                          type: 'directory',
                          description: 'Modules personnalisés',
                        },
                        {
                          name: 'filter',
                          type: 'directory',
                          description: 'Filtres Jinja2',
                        },
                      ],
                    },
                    {
                      name: 'roles',
                      type: 'directory',
                      description: 'Rôles de la collection',
                    },
                    {
                      name: 'playbooks',
                      type: 'directory',
                      description: 'Playbooks inclus',
                    },
                    {
                      name: 'galaxy.yml',
                      type: 'file',
                      description: 'Métadonnées Ansible Galaxy',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function generateEnterpriseStructure(projectName: string): ProjectStructure {
  return {
    name: projectName,
    type: 'enterprise',
    tree: {
      name: projectName,
      type: 'directory',
      children: [
        {
          name: 'playbooks',
          type: 'directory',
          children: [
            {
              name: 'site.yml',
              type: 'file',
              description: 'Playbook principal',
            },
            {
              name: 'webservers.yml',
              type: 'file',
              description: 'Déploiement serveurs web',
            },
            {
              name: 'databases.yml',
              type: 'file',
              description: 'Déploiement bases de données',
            },
          ],
        },
        {
          name: 'inventory',
          type: 'directory',
          children: [
            {
              name: 'production',
              type: 'directory',
              children: [
                {
                  name: 'hosts.yml',
                  type: 'file',
                  description: 'Inventaire production',
                },
                {
                  name: 'group_vars',
                  type: 'directory',
                  description: 'Variables par groupe',
                },
                {
                  name: 'host_vars',
                  type: 'directory',
                  description: 'Variables par hôte',
                },
              ],
            },
            {
              name: 'staging',
              type: 'directory',
              description: 'Environnement staging',
            },
            {
              name: 'development',
              type: 'directory',
              description: 'Environnement développement',
            },
          ],
        },
        {
          name: 'roles',
          type: 'directory',
          description: 'Rôles personnalisés',
        },
        {
          name: 'collections',
          type: 'directory',
          children: [
            {
              name: 'requirements.yml',
              type: 'file',
              description: 'Collections externes',
            },
          ],
        },
        {
          name: 'filter_plugins',
          type: 'directory',
          description: 'Filtres personnalisés',
        },
        {
          name: 'library',
          type: 'directory',
          description: 'Modules personnalisés',
        },
        {
          name: 'scripts',
          type: 'directory',
          children: [
            {
              name: 'deploy.sh',
              type: 'file',
              description: 'Script de déploiement',
            },
            {
              name: 'lint.sh',
              type: 'file',
              description: 'Script de validation',
            },
          ],
        },
        {
          name: 'tests',
          type: 'directory',
          children: [
            {
              name: 'integration',
              type: 'directory',
              description: 'Tests d\'intégration',
            },
            {
              name: 'unit',
              type: 'directory',
              description: 'Tests unitaires',
            },
          ],
        },
        {
          name: 'docs',
          type: 'directory',
          children: [
            {
              name: 'README.md',
              type: 'file',
              description: 'Documentation',
            },
            {
              name: 'architecture.md',
              type: 'file',
              description: 'Architecture',
            },
          ],
        },
        {
          name: 'ansible.cfg',
          type: 'file',
          description: 'Configuration Ansible',
        },
        {
          name: '.ansible-lint',
          type: 'file',
          description: 'Configuration Ansible Lint',
        },
        {
          name: '.yamllint',
          type: 'file',
          description: 'Configuration YAML Lint',
        },
        {
          name: '.gitignore',
          type: 'file',
          description: 'Git ignore',
        },
        {
          name: 'Makefile',
          type: 'file',
          description: 'Commandes make',
        },
        {
          name: 'requirements.txt',
          type: 'file',
          description: 'Dépendances Python',
        },
      ],
    },
  };
}

export function renderTree(node: FileNode, prefix: string = '', isLast: boolean = true): string {
  let result = '';

  const connector = isLast ? '└── ' : '├── ';
  const icon = node.type === 'directory' ? '📁 ' : '📄 ';
  const desc = node.description ? ` (${node.description})` : '';

  result += `${prefix}${connector}${icon}${node.name}${desc}\n`;

  if (node.children) {
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    node.children.forEach((child, index) => {
      const childIsLast = index === node.children!.length - 1;
      result += renderTree(child, childPrefix, childIsLast);
    });
  }

  return result;
}

export function generateStructureVisualization(structure: ProjectStructure): string {
  let output = `# Structure du projet: ${structure.name}\n\n`;
  output += `**Type:** ${structure.type}\n\n`;
  output += '```\n';
  output += renderTree(structure.tree);
  output += '```\n\n';

  return output;
}

export function generateReadme(structure: ProjectStructure): string {
  return `# ${structure.name}

Projet Ansible généré avec CortexOps

## Structure du projet

\`\`\`
${renderTree(structure.tree)}
\`\`\`

## Installation

\`\`\`bash
# Installer les dépendances
ansible-galaxy install -r requirements.yml

# Vérifier la syntaxe
ansible-playbook --syntax-check playbook.yml

# Valider avec ansible-lint
ansible-lint playbook.yml
\`\`\`

## Utilisation

\`\`\`bash
# Exécution en dry-run
ansible-playbook -i inventory/hosts playbook.yml --check

# Exécution réelle
ansible-playbook -i inventory/hosts playbook.yml

# Avec verbosité
ansible-playbook -i inventory/hosts playbook.yml -vvv
\`\`\`

## Tests

\`\`\`bash
# Valider YAML
yamllint .

# Valider Ansible
ansible-lint .

# Tests d'intégration
cd tests/integration && ansible-playbook test.yml
\`\`\`

## Standards de qualité

- ✅ Conforme ansible-lint
- ✅ Conforme yamllint
- ✅ Idempotence garantie
- ✅ Gestion d'erreurs robuste
- ✅ Documentation inline

## Support

Pour toute question: support@cortexops.com
`;
}

export function injectStructureHeader(playbook: string, structure: ProjectStructure): string {
  const header = `# Projet: ${structure.name}
# Structure: ${structure.type}
#
${generateStructureVisualization(structure)}
`;

  return header + playbook;
}
