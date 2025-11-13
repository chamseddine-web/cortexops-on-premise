/**
 * Module d'Audit YAML pour Ansible Playbooks
 * Compare les versions pre-deploy vs post-deploy
 */

import * as yaml from 'js-yaml';

export interface AuditResult {
  timestamp: string;
  comparison: 'pre-deploy' | 'post-deploy' | 'diff';
  changes: AuditChange[];
  summary: AuditSummary;
  recommendations: string[];
}

export interface AuditChange {
  type: 'added' | 'removed' | 'modified';
  path: string;
  oldValue?: any;
  newValue?: any;
  impact: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface AuditSummary {
  totalChanges: number;
  added: number;
  removed: number;
  modified: number;
  criticalChanges: number;
  securityImpact: boolean;
  performanceImpact: boolean;
}

/**
 * Compare deux playbooks YAML et génère un rapport d'audit
 */
export function auditPlaybookChanges(
  previousYaml: string,
  currentYaml: string
): AuditResult {
  const timestamp = new Date().toISOString();
  const changes: AuditChange[] = [];

  try {
    const previousData = yaml.load(previousYaml) as any;
    const currentData = yaml.load(currentYaml) as any;

    // Comparer les structures
    compareObjects(previousData, currentData, '', changes);

    // Générer le résumé
    const summary = generateSummary(changes);

    // Générer des recommandations
    const recommendations = generateRecommendations(changes, summary);

    return {
      timestamp,
      comparison: 'diff',
      changes,
      summary,
      recommendations
    };
  } catch (error: any) {
    return {
      timestamp,
      comparison: 'diff',
      changes: [{
        type: 'modified',
        path: 'parse_error',
        description: `Erreur de parsing YAML: ${error.message}`,
        impact: 'critical'
      }],
      summary: {
        totalChanges: 1,
        added: 0,
        removed: 0,
        modified: 1,
        criticalChanges: 1,
        securityImpact: false,
        performanceImpact: false
      },
      recommendations: ['Corriger les erreurs de syntaxe YAML avant déploiement']
    };
  }
}

/**
 * Compare récursivement deux objets YAML
 */
function compareObjects(
  previous: any,
  current: any,
  path: string,
  changes: AuditChange[]
): void {
  // Cas 1: Les deux sont des tableaux
  if (Array.isArray(previous) && Array.isArray(current)) {
    compareArrays(previous, current, path, changes);
    return;
  }

  // Cas 2: Les deux sont des objets
  if (typeof previous === 'object' && typeof current === 'object' &&
      previous !== null && current !== null &&
      !Array.isArray(previous) && !Array.isArray(current)) {

    const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);

    allKeys.forEach(key => {
      const newPath = path ? `${path}.${key}` : key;

      if (!(key in previous)) {
        changes.push({
          type: 'added',
          path: newPath,
          newValue: current[key],
          impact: determineImpact(key, current[key]),
          description: `Nouvelle propriété ajoutée: ${key}`
        });
      } else if (!(key in current)) {
        changes.push({
          type: 'removed',
          path: newPath,
          oldValue: previous[key],
          impact: determineImpact(key, previous[key]),
          description: `Propriété supprimée: ${key}`
        });
      } else if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
        compareObjects(previous[key], current[key], newPath, changes);
      }
    });
    return;
  }

  // Cas 3: Valeurs primitives différentes
  if (previous !== current) {
    changes.push({
      type: 'modified',
      path,
      oldValue: previous,
      newValue: current,
      impact: determineImpact(path, current),
      description: `Valeur modifiée: ${previous} → ${current}`
    });
  }
}

/**
 * Compare deux tableaux YAML
 */
function compareArrays(
  previous: any[],
  current: any[],
  path: string,
  changes: AuditChange[]
): void {
  if (previous.length !== current.length) {
    changes.push({
      type: 'modified',
      path,
      oldValue: `${previous.length} éléments`,
      newValue: `${current.length} éléments`,
      impact: 'medium',
      description: `Taille du tableau modifiée: ${previous.length} → ${current.length}`
    });
  }

  // Comparer chaque élément
  const maxLength = Math.max(previous.length, current.length);
  for (let i = 0; i < maxLength; i++) {
    const newPath = `${path}[${i}]`;

    if (i >= previous.length) {
      changes.push({
        type: 'added',
        path: newPath,
        newValue: current[i],
        impact: 'low',
        description: `Nouvel élément ajouté à l'index ${i}`
      });
    } else if (i >= current.length) {
      changes.push({
        type: 'removed',
        path: newPath,
        oldValue: previous[i],
        impact: 'low',
        description: `Élément supprimé à l'index ${i}`
      });
    } else if (JSON.stringify(previous[i]) !== JSON.stringify(current[i])) {
      compareObjects(previous[i], current[i], newPath, changes);
    }
  }
}

/**
 * Détermine l'impact d'un changement
 */
function determineImpact(path: string, value: any): 'low' | 'medium' | 'high' | 'critical' {
  const pathLower = path.toLowerCase();

  // Impact critique
  if (pathLower.includes('password') ||
      pathLower.includes('secret') ||
      pathLower.includes('token') ||
      pathLower.includes('key') ||
      pathLower.includes('credential')) {
    return 'critical';
  }

  // Impact élevé
  if (pathLower.includes('hosts') ||
      pathLower.includes('become') ||
      pathLower.includes('port') ||
      pathLower.includes('state') ||
      pathLower.includes('enabled')) {
    return 'high';
  }

  // Impact moyen
  if (pathLower.includes('name') ||
      pathLower.includes('config') ||
      pathLower.includes('version') ||
      pathLower.includes('path')) {
    return 'medium';
  }

  // Impact faible par défaut
  return 'low';
}

/**
 * Génère un résumé des changements
 */
function generateSummary(changes: AuditChange[]): AuditSummary {
  const summary: AuditSummary = {
    totalChanges: changes.length,
    added: changes.filter(c => c.type === 'added').length,
    removed: changes.filter(c => c.type === 'removed').length,
    modified: changes.filter(c => c.type === 'modified').length,
    criticalChanges: changes.filter(c => c.impact === 'critical').length,
    securityImpact: changes.some(c =>
      c.path.toLowerCase().includes('security') ||
      c.path.toLowerCase().includes('ssl') ||
      c.path.toLowerCase().includes('firewall') ||
      c.impact === 'critical'
    ),
    performanceImpact: changes.some(c =>
      c.path.toLowerCase().includes('performance') ||
      c.path.toLowerCase().includes('cache') ||
      c.path.toLowerCase().includes('timeout')
    )
  };

  return summary;
}

/**
 * Génère des recommandations basées sur l'audit
 */
function generateRecommendations(changes: AuditChange[], summary: AuditSummary): string[] {
  const recommendations: string[] = [];

  // Recommandations pour changements critiques
  if (summary.criticalChanges > 0) {
    recommendations.push('🔴 CRITIQUE: Des changements de sécurité ont été détectés. Vérifiez les secrets et mots de passe.');
  }

  // Recommandations pour impact sécurité
  if (summary.securityImpact) {
    recommendations.push('🛡️ SÉCURITÉ: Exécutez un scan de sécurité avant le déploiement (ex: ansible-lint, yamllint).');
    recommendations.push('✅ Vérifiez que les ports firewall sont correctement configurés.');
  }

  // Recommandations pour impact performance
  if (summary.performanceImpact) {
    recommendations.push('⚡ PERFORMANCE: Effectuez des tests de charge après le déploiement.');
  }

  // Recommandations pour suppressions
  if (summary.removed > 5) {
    recommendations.push('⚠️ ATTENTION: Plusieurs éléments ont été supprimés. Vérifiez que c\'est intentionnel.');
  }

  // Recommandations pour ajouts massifs
  if (summary.added > 10) {
    recommendations.push('📊 INFO: Beaucoup de nouveaux éléments ajoutés. Documentez ces changements.');
  }

  // Recommandations de backup
  if (summary.totalChanges > 0) {
    recommendations.push('💾 BACKUP: Créez un snapshot ou backup avant de déployer ces changements.');
  }

  // Recommandation de test
  if (summary.totalChanges > 0) {
    recommendations.push('🧪 TEST: Testez d\'abord sur un environnement de staging.');
  }

  // Recommandation de rollback plan
  if (summary.criticalChanges > 0 || summary.securityImpact) {
    recommendations.push('🔄 ROLLBACK: Préparez un plan de rollback en cas de problème.');
  }

  // Si aucun changement
  if (summary.totalChanges === 0) {
    recommendations.push('✅ Aucun changement détecté. Le playbook est identique à la version précédente.');
  }

  return recommendations;
}

/**
 * Génère un rapport d'audit au format texte
 */
export function generateAuditReport(audit: AuditResult): string {
  let report = `
════════════════════════════════════════════════════════════════
📋 RAPPORT D'AUDIT YAML - ${audit.comparison.toUpperCase()}
════════════════════════════════════════════════════════════════
Date: ${new Date(audit.timestamp).toLocaleString('fr-FR')}

📊 RÉSUMÉ DES CHANGEMENTS
────────────────────────────────────────────────────────────────
Total de changements:      ${audit.summary.totalChanges}
  ├─ ✅ Ajouts:            ${audit.summary.added}
  ├─ ❌ Suppressions:      ${audit.summary.removed}
  └─ 🔄 Modifications:     ${audit.summary.modified}

Changements critiques:     ${audit.summary.criticalChanges}
Impact sécurité:          ${audit.summary.securityImpact ? '⚠️ OUI' : '✅ Non'}
Impact performance:       ${audit.summary.performanceImpact ? '⚠️ OUI' : '✅ Non'}

`;

  // Détail des changements critiques
  const criticalChanges = audit.changes.filter(c => c.impact === 'critical');
  if (criticalChanges.length > 0) {
    report += `
🔴 CHANGEMENTS CRITIQUES
────────────────────────────────────────────────────────────────
`;
    criticalChanges.forEach((change, index) => {
      report += `${index + 1}. [${change.type.toUpperCase()}] ${change.path}
   ${change.description}
   Ancien: ${JSON.stringify(change.oldValue)}
   Nouveau: ${JSON.stringify(change.newValue)}

`;
    });
  }

  // Détail des changements à impact élevé
  const highImpactChanges = audit.changes.filter(c => c.impact === 'high');
  if (highImpactChanges.length > 0) {
    report += `
🟠 CHANGEMENTS À IMPACT ÉLEVÉ
────────────────────────────────────────────────────────────────
`;
    highImpactChanges.forEach((change, index) => {
      report += `${index + 1}. [${change.type.toUpperCase()}] ${change.path}
   ${change.description}

`;
    });
  }

  // Recommandations
  if (audit.recommendations.length > 0) {
    report += `
💡 RECOMMANDATIONS
────────────────────────────────────────────────────────────────
`;
    audit.recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
  }

  report += `
════════════════════════════════════════════════════════════════
`;

  return report;
}

/**
 * Génère une tâche Ansible pour exécuter un audit
 */
export function generateAuditTask(): string {
  return `---
# Tâche d'audit YAML pre-deploy vs post-deploy

- name: "🔍 Sauvegarder la configuration actuelle (pre-deploy)"
  fetch:
    src: /etc/ansible/current_playbook.yml
    dest: /tmp/ansible_pre_deploy.yml
    flat: yes
  ignore_errors: yes

- name: "📋 Copier le nouveau playbook (post-deploy)"
  copy:
    src: playbook.yml
    dest: /tmp/ansible_post_deploy.yml

- name: "🔍 Audit des changements YAML"
  shell: |
    cat << 'EOF' > /tmp/audit_yaml.py
${generateAuditPythonScript()}
    EOF
    python3 /tmp/audit_yaml.py /tmp/ansible_pre_deploy.yml /tmp/ansible_post_deploy.yml
  register: audit_result
  ignore_errors: yes

- name: "📊 Afficher le rapport d'audit"
  debug:
    msg: "{{ audit_result.stdout_lines }}"

- name: "⚠️ Bloquer si changements critiques détectés"
  fail:
    msg: "Des changements critiques ont été détectés. Vérifiez le rapport d'audit."
  when:
    - audit_result.stdout is defined
    - "'CRITIQUE' in audit_result.stdout"
    - block_on_critical_changes | default(false)
`;
}

/**
 * Génère un script Python pour l'audit (peut être utilisé standalone)
 */
function generateAuditPythonScript(): string {
  return `#!/usr/bin/env python3
import yaml
import sys
import json
from datetime import datetime

def audit_yaml_changes(file1, file2):
    try:
        with open(file1, 'r') as f:
            data1 = yaml.safe_load(f)
        with open(file2, 'r') as f:
            data2 = yaml.safe_load(f)

        changes = []
        compare_objects(data1, data2, '', changes)

        print("═" * 60)
        print("📋 AUDIT YAML - Pre-deploy vs Post-deploy")
        print("═" * 60)
        print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"\\nTotal de changements: {len(changes)}")

        if len(changes) == 0:
            print("✅ Aucun changement détecté")
        else:
            critical = [c for c in changes if c.get('impact') == 'critical']
            if critical:
                print(f"\\n🔴 CHANGEMENTS CRITIQUES: {len(critical)}")
                for change in critical:
                    print(f"  - {change['path']}: {change['description']}")

    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        sys.exit(1)

def compare_objects(obj1, obj2, path, changes):
    # Implémentation simplifiée
    if type(obj1) != type(obj2):
        changes.append({
            'path': path,
            'description': f'Type changé: {type(obj1).__name__} → {type(obj2).__name__}',
            'impact': 'high'
        })

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: audit_yaml.py <file1> <file2>")
        sys.exit(1)

    audit_yaml_changes(sys.argv[1], sys.argv[2])
`;
}
