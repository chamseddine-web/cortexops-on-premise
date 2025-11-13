import * as yaml from 'js-yaml';

export interface SmartFix {
  title: string;
  description: string;
  apply: (content: string) => string;
}

export function getSmartFixes(yamlContent: string, errors: string[]): SmartFix[] {
  const fixes: SmartFix[] = [];

  errors.forEach(error => {
    if (error.includes('doit commencer par "---"')) {
      fixes.push({
        title: 'Ajouter "---" au début',
        description: 'Ajoute le séparateur de document YAML requis',
        apply: (content) => '---\n' + content
      });
    }

    if (error.includes('tabulations')) {
      fixes.push({
        title: 'Remplacer tabulations par espaces',
        description: 'Convertit toutes les tabulations en 2 espaces',
        apply: (content) => content.replace(/\t/g, '  ')
      });
    }

    if (error.includes('Indentation') || error.includes('indentation') || error.includes('bad indentation')) {
      fixes.push({
        title: 'Corriger l\'indentation',
        description: 'Réaligne toutes les lignes avec l\'indentation correcte',
        apply: (content) => autoFixIndentation(content)
      });
    }

    if (error.includes('expected a single document') || error.includes('found more')) {
      fixes.push({
        title: 'Corriger documents multiples YAML',
        description: 'Réorganise les documents YAML multiples',
        apply: (content) => fixYamlSyntax(content)
      });
    }

    if (error.includes('Erreur de syntaxe YAML')) {
      fixes.push({
        title: 'Réparer la structure YAML',
        description: 'Tente de corriger automatiquement les problèmes structurels',
        apply: (content) => fixYamlSyntax(content)
      });
    }

    if (error.includes('"name" est requise') && error.includes('Play')) {
      fixes.push({
        title: 'Ajouter "name" au play',
        description: 'Ajoute un nom descriptif au play',
        apply: (content) => addMissingPlayName(content)
      });
    }

    if (error.includes('"hosts" est requise')) {
      fixes.push({
        title: 'Ajouter "hosts" au play',
        description: 'Spécifie les hosts cibles (par défaut: all)',
        apply: (content) => addMissingHosts(content)
      });
    }

    if (error.includes('Aucun module Ansible spécifié')) {
      fixes.push({
        title: 'Ajouter module debug aux tâches',
        description: 'Ajoute un module debug aux tâches incomplètes',
        apply: (content) => addDebugToEmptyTasks(content)
      });
    }

    if (error.includes('Variables Jinja2 mal formées')) {
      fixes.push({
        title: 'Corriger variables Jinja2',
        description: 'Tente de fermer les variables Jinja2 ouvertes',
        apply: (content) => fixJinja2Variables(content)
      });
    }

    if (error.includes('duplicated mapping key') || error.includes('clé dupliquée')) {
      fixes.push({
        title: 'Supprimer les clés dupliquées',
        description: 'Retire les clés en double dans le document YAML',
        apply: (content) => fixYamlSyntax(content)
      });
    }

    if (error.includes('can not read a block mapping entry') ||
        error.includes('multiline key') ||
        error.includes('bad indentation of a mapping entry')) {
      fixes.push({
        title: 'Réparer la structure YAML',
        description: 'Tente de corriger automatiquement les problèmes structurels',
        apply: (content) => fixYamlSyntax(content)
      });
    }
  });

  if (fixes.length > 0) {
    fixes.push({
      title: 'Tout corriger',
      description: 'Applique toutes les corrections automatiques possibles',
      apply: (content) => {
        let fixed = content;
        fixes.forEach(fix => {
          if (fix.title !== 'Tout corriger') {
            try {
              fixed = fix.apply(fixed);
            } catch (e) {
              // Ignore failed fixes
            }
          }
        });
        return fixed;
      }
    });
  }

  return fixes;
}

function autoFixIndentation(content: string): string {
  try {
    const parsed = yaml.load(content);
    if (parsed && Array.isArray(parsed)) {
      return '---\n' + yaml.dump(parsed, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });
    }
  } catch (e) {
    // Continue with manual fix
  }

  const lines = content.split('\n');
  const fixed: string[] = [];
  let currentIndent = 0;
  let inPlay = false;
  let inTasks = false;
  let inTask = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      fixed.push(line);
      continue;
    }

    if (trimmed === '---') {
      fixed.push('---');
      currentIndent = 0;
      inPlay = false;
      inTasks = false;
      inTask = false;
      continue;
    }

    if (trimmed.startsWith('- name:')) {
      if (!inTasks) {
        fixed.push('- name:' + trimmed.substring(7));
        currentIndent = 2;
        inPlay = true;
        inTasks = false;
        inTask = false;
      } else {
        fixed.push('    - name:' + trimmed.substring(7));
        currentIndent = 6;
        inTask = true;
      }
      continue;
    }

    if (inPlay && trimmed.match(/^(hosts|become|gather_facts|check_mode|remote_user|vars|become_user|become_method):/)) {
      fixed.push('  ' + trimmed);
      continue;
    }

    if (inPlay && trimmed.match(/^(tasks|handlers|pre_tasks|post_tasks):/)) {
      fixed.push('  ' + trimmed);
      inTasks = true;
      currentIndent = 4;
      inTask = false;
      continue;
    }

    if (inPlay && trimmed === 'vars:') {
      fixed.push('  vars:');
      currentIndent = 4;
      continue;
    }

    if (inTask && trimmed.match(/^[a-z_]+:/)) {
      fixed.push('      ' + trimmed);
      continue;
    }

    if (currentIndent > 0) {
      fixed.push(' '.repeat(currentIndent) + trimmed);
    } else {
      fixed.push(line);
    }
  }

  return fixed.join('\n');
}

function addMissingPlayName(content: string): string {
  try {
    const lines = content.split('\n');
    const fixed: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      fixed.push(line);

      if (line.trim().startsWith('- ') && !line.includes('name:')) {
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.trim().startsWith('name:')) {
          fixed.push('  name: Playbook généré automatiquement');
        }
      }
    }

    return fixed.join('\n');
  } catch (error) {
    console.error('Error in addMissingPlayName:', error);
    return content;
  }
}

function addMissingHosts(content: string): string {
  try {
    const lines = content.split('\n');
    const fixed: string[] = [];
    let inPlay = false;
    let hasHosts = false;
    let playIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.length - line.trimStart().length;

      if (trimmed.startsWith('- name:') && (indent === 0 || indent === playIndent)) {
        if (inPlay && !hasHosts) {
          fixed.push(' '.repeat(playIndent + 2) + 'hosts: all');
        }
        inPlay = true;
        hasHosts = false;
        playIndent = indent;
        fixed.push(line);
        continue;
      }

      if (inPlay && trimmed.startsWith('hosts:')) {
        hasHosts = true;
      }

      if (inPlay && !hasHosts && (trimmed.startsWith('tasks:') || trimmed.startsWith('handlers:') || trimmed.startsWith('pre_tasks:') || trimmed.startsWith('post_tasks:'))) {
        fixed.push(' '.repeat(playIndent + 2) + 'hosts: all');
        hasHosts = true;
      }

      fixed.push(line);
    }

    if (inPlay && !hasHosts) {
      fixed.push(' '.repeat(playIndent + 2) + 'hosts: all');
    }

    return fixed.join('\n');
  } catch (error) {
    console.error('Error in addMissingHosts:', error);
    return content;
  }
}

function addDebugToEmptyTasks(content: string): string {
  try {
    const parsed = yaml.load(content) as any[];

    if (!Array.isArray(parsed)) return content;

    parsed.forEach(play => {
      if (play.tasks && Array.isArray(play.tasks)) {
        play.tasks.forEach((task: any) => {
          const hasModule = Object.keys(task).some(k =>
            k !== 'name' && k !== 'become' && k !== 'when' &&
            k !== 'register' && k !== 'tags' && k !== 'notify'
          );

          if (!hasModule) {
            task.debug = { msg: 'Task to be implemented' };
          }
        });
      }
    });

    return '---\n' + yaml.dump(parsed, { indent: 2 });
  } catch (e) {
    return content;
  }
}

function fixJinja2Variables(content: string): string {
  const openBraces = (content.match(/\{\{/g) || []).length;
  const closeBraces = (content.match(/\}\}/g) || []).length;

  if (openBraces > closeBraces) {
    const diff = openBraces - closeBraces;
    return content + ' }}'.repeat(diff);
  }

  return content;
}

function fixDuplicateKeys(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  const keysByLevel: Map<number, Set<string>> = new Map();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || trimmed === '---') {
      result.push(line);
      continue;
    }

    const indent = line.length - line.trimStart().length;

    for (const [level, keys] of keysByLevel.entries()) {
      if (level >= indent) {
        keysByLevel.delete(level);
      }
    }

    if (trimmed.includes(':') && !trimmed.startsWith('-')) {
      const key = trimmed.split(':')[0].trim();

      if (!keysByLevel.has(indent)) {
        keysByLevel.set(indent, new Set());
      }

      const keysAtLevel = keysByLevel.get(indent)!;

      if (keysAtLevel.has(key)) {
        continue;
      }

      keysAtLevel.add(key);
    }

    result.push(line);
  }

  return result.join('\n');
}

function fixYamlSyntax(content: string): string {
  try {
    let fixed = content;

    if (!fixed.trim().startsWith('---')) {
      fixed = '---\n' + fixed;
    }

    fixed = fixed.replace(/\t/g, '  ');

    fixed = fixDuplicateKeys(fixed);

    // Gérer les documents YAML multiples (Ansible playbooks)
    const documents = fixed.split(/\n---\n/).filter(doc => doc.trim());

    if (documents.length > 1) {
      // Multiple documents - c'est normal pour Ansible, vérifier chaque document séparément
      const fixedDocs: string[] = [];
      let hasErrors = false;

      for (let doc of documents) {
        if (!doc.trim().startsWith('---')) {
          doc = '---\n' + doc;
        }

        try {
          const parsed = yaml.load(doc);
          if (parsed && typeof parsed === 'object') {
            const dumped = yaml.dump(parsed, {
              indent: 2,
              lineWidth: -1,
              noRefs: true,
              sortKeys: false
            });
            fixedDocs.push(dumped.trim());
          } else {
            fixedDocs.push(doc);
          }
        } catch (e) {
          // Si un document échoue, essayer de le corriger avec l'indentation
          try {
            const indentFixed = autoFixIndentation(doc);
            fixedDocs.push(indentFixed.trim());
          } catch {
            fixedDocs.push(doc);
            hasErrors = true;
          }
        }
      }

      if (!hasErrors || fixedDocs.length > 0) {
        return fixedDocs.map(doc => {
          const trimmed = doc.trim();
          return trimmed.startsWith('---') ? trimmed : '---\n' + trimmed;
        }).join('\n\n');
      }
    }

    // Document unique - traitement standard
    try {
      yaml.load(fixed);
    } catch (e: any) {
      if (e.message && e.mark) {
        const errorLine = e.mark.line;
        const lines = fixed.split('\n');

        if (errorLine >= 0 && errorLine < lines.length) {
          const line = lines[errorLine];
          const trimmed = line.trim();

          if (trimmed.includes(':')) {
            const leadingSpaces = line.length - line.trimStart().length;

            if (leadingSpaces % 2 !== 0) {
              lines[errorLine] = ' '.repeat(Math.floor(leadingSpaces / 2) * 2) + trimmed;
              fixed = lines.join('\n');
            }
          }
        }
      }
    }

    try {
      const parsed = yaml.load(fixed);
      if (parsed && typeof parsed === 'object') {
        return '---\n' + yaml.dump(parsed, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false
        });
      }
    } catch (e) {
      return autoFixIndentation(fixed);
    }

    return fixed;
  } catch (error) {
    console.error('Error in fixYamlSyntax:', error);
    return content;
  }
}

export function smartAutoFix(yamlContent: string, errorMessages: string[]): string {
  let fixed = yamlContent;

  if (!fixed.trim().startsWith('---')) {
    fixed = '---\n' + fixed;
  }

  fixed = fixed.replace(/\t/g, '  ');

  if (errorMessages.some(e =>
    e.includes('Indentation') ||
    e.includes('indentation') ||
    e.includes('bad indentation') ||
    e.includes('can not read a block mapping entry') ||
    e.includes('multiline key')
  )) {
    fixed = autoFixIndentation(fixed);
  }

  if (errorMessages.some(e =>
    e.includes('Erreur de syntaxe YAML') ||
    e.includes('can not read a block mapping entry') ||
    e.includes('multiline key')
  )) {
    fixed = fixYamlSyntax(fixed);
  }

  if (errorMessages.some(e => e.includes('"name" est requise') && e.includes('Play'))) {
    fixed = addMissingPlayName(fixed);
  }

  if (errorMessages.some(e => e.includes('"hosts" est requise'))) {
    fixed = addMissingHosts(fixed);
  }

  if (errorMessages.some(e => e.includes('Aucun module Ansible'))) {
    fixed = addDebugToEmptyTasks(fixed);
  }

  if (errorMessages.some(e => e.includes('Variables Jinja2 mal formées'))) {
    fixed = fixJinja2Variables(fixed);
  }

  return fixed;
}
