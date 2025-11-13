/**
 * Détecteur de Complexité de Playbook
 * Détermine si un playbook doit être Basic, Pro ou Enterprise
 */

export type PlaybookComplexity = 'basic' | 'pro' | 'enterprise';

export interface ComplexityAnalysis {
  level: PlaybookComplexity;
  confidence: number;
  reasons: string[];
  indicators: {
    serviceCount: number;
    hasMultipleServers: boolean;
    hasMonitoring: boolean;
    hasCICD: boolean;
    hasCustomLogic: boolean;
    hasSecurityFeatures: boolean;
  };
  recommendation: string;
}

/**
 * Détecte le niveau de complexité requis pour le playbook
 */
export function detectComplexity(prompt: string, rolesCount: number): ComplexityAnalysis {
  const normalized = prompt.toLowerCase();
  const indicators = analyzeIndicators(normalized, rolesCount);

  // Calculer le score de complexité
  let complexityScore = 0;
  const reasons: string[] = [];

  // Facteur 1: Nombre de services (poids: 3)
  if (indicators.serviceCount === 1) {
    complexityScore += 0;
    reasons.push(`Service unique (${indicators.serviceCount})`);
  } else if (indicators.serviceCount <= 3) {
    complexityScore += 3;
    reasons.push(`Services multiples (${indicators.serviceCount})`);
  } else {
    complexityScore += 6;
    reasons.push(`Infrastructure complexe (${indicators.serviceCount} services)`);
  }

  // Facteur 2: Multi-serveurs (poids: 2)
  if (indicators.hasMultipleServers) {
    complexityScore += 2;
    reasons.push('Déploiement multi-serveurs');
  }

  // Facteur 3: Monitoring (poids: 2)
  if (indicators.hasMonitoring) {
    complexityScore += 2;
    reasons.push('Monitoring/Observabilité requis');
  }

  // Facteur 4: CI/CD (poids: 2)
  if (indicators.hasCICD) {
    complexityScore += 2;
    reasons.push('Intégration CI/CD');
  }

  // Facteur 5: Logique métier (poids: 1)
  if (indicators.hasCustomLogic) {
    complexityScore += 1;
    reasons.push('Logique personnalisée');
  }

  // Facteur 6: Sécurité avancée (poids: 1)
  if (indicators.hasSecurityFeatures) {
    complexityScore += 1;
    reasons.push('Fonctionnalités de sécurité avancées');
  }

  // Déterminer le niveau
  let level: PlaybookComplexity;
  let recommendation: string;
  let confidence: number;

  if (complexityScore <= 3) {
    level = 'basic';
    confidence = 0.9;
    recommendation = 'Playbook simple et direct (10-20 lignes), idéal pour débutants';
  } else if (complexityScore <= 8) {
    level = 'pro';
    confidence = 0.85;
    recommendation = 'Playbook structuré avec handlers et templates, pour utilisateurs intermédiaires';
  } else {
    level = 'enterprise';
    confidence = 0.95;
    recommendation = 'Playbook complet avec monitoring, CI/CD, reporting et validation';
  }

  return {
    level,
    confidence,
    reasons,
    indicators,
    recommendation
  };
}

/**
 * Analyse les indicateurs de complexité dans le prompt
 */
function analyzeIndicators(normalized: string, rolesCount: number): ComplexityAnalysis['indicators'] {
  return {
    serviceCount: rolesCount,
    hasMultipleServers: detectMultipleServers(normalized),
    hasMonitoring: detectMonitoring(normalized),
    hasCICD: detectCICD(normalized),
    hasCustomLogic: detectCustomLogic(normalized),
    hasSecurityFeatures: detectSecurityFeatures(normalized)
  };
}

/**
 * Détecte si le déploiement concerne plusieurs serveurs
 */
function detectMultipleServers(normalized: string): boolean {
  const multiServerIndicators = [
    'plusieurs serveurs', 'multiple servers', 'multi-serveur', 'cluster',
    'load balanc', 'haute disponibilité', 'high availability', 'ha',
    'répartition de charge', 'distributed', 'distribué'
  ];
  return multiServerIndicators.some(ind => normalized.includes(ind));
}

/**
 * Détecte la nécessité de monitoring
 */
function detectMonitoring(normalized: string): boolean {
  const monitoringIndicators = [
    'prometheus', 'grafana', 'monitoring', 'métriques', 'metrics',
    'observabilité', 'observability', 'alerting', 'alertes',
    'logs centralisés', 'centralized logging', 'elk', 'loki',
    'tempo', 'jaeger', 'tracing', 'datadog', 'newrelic'
  ];
  return monitoringIndicators.some(ind => normalized.includes(ind));
}

/**
 * Détecte la nécessité d'intégration CI/CD
 */
function detectCICD(normalized: string): boolean {
  const cicdIndicators = [
    'ci/cd', 'cicd', 'pipeline', 'gitlab ci', 'github actions',
    'jenkins', 'automated deploy', 'déploiement automatique',
    'continuous deployment', 'continuous integration',
    'devops', 'gitops', 'argocd', 'flux'
  ];
  return cicdIndicators.some(ind => normalized.includes(ind));
}

/**
 * Détecte la nécessité de logique personnalisée
 */
function detectCustomLogic(normalized: string): boolean {
  const customLogicIndicators = [
    'si', 'when', 'condition', 'selon', 'depending on', 'dynamic',
    'dynamique', 'calculer', 'calculate', 'script python', 'script bash',
    'personnalisé', 'custom', 'spécifique', 'specific'
  ];
  return customLogicIndicators.some(ind => normalized.includes(ind));
}

/**
 * Détecte les fonctionnalités de sécurité avancées
 */
function detectSecurityFeatures(normalized: string): boolean {
  const securityIndicators = [
    'falco', 'trivy', 'vulnerability scan', 'scan de vulnérabilités',
    'security audit', 'audit de sécurité', 'compliance', 'conformité',
    'hardening', 'durcissement', 'intrusion detection', 'ids',
    'waf', 'firewall applicatif', 'selinux', 'apparmor'
  ];
  return securityIndicators.some(ind => normalized.includes(ind));
}

/**
 * Génère un résumé de l'analyse de complexité
 */
export function generateComplexitySummary(analysis: ComplexityAnalysis): string {
  const levelEmoji = {
    basic: '🟢',
    pro: '🟡',
    enterprise: '🔴'
  };

  const levelName = {
    basic: 'BASIC',
    pro: 'PRO',
    enterprise: 'ENTERPRISE'
  };

  return `
╔════════════════════════════════════════════════════════════════╗
║           ANALYSE DE COMPLEXITÉ DU PLAYBOOK                    ║
╚════════════════════════════════════════════════════════════════╝

Niveau détecté      : ${levelEmoji[analysis.level]} ${levelName[analysis.level]}
Confiance           : ${(analysis.confidence * 100).toFixed(0)}%

Indicateurs
────────────────────────────────────────────────────────────────
  • Nombre de services     : ${analysis.indicators.serviceCount}
  • Multi-serveurs         : ${analysis.indicators.hasMultipleServers ? '✓' : '✗'}
  • Monitoring             : ${analysis.indicators.hasMonitoring ? '✓' : '✗'}
  • CI/CD                  : ${analysis.indicators.hasCICD ? '✓' : '✗'}
  • Logique personnalisée  : ${analysis.indicators.hasCustomLogic ? '✓' : '✗'}
  • Sécurité avancée       : ${analysis.indicators.hasSecurityFeatures ? '✓' : '✗'}

Raisons
────────────────────────────────────────────────────────────────
${analysis.reasons.map(r => `  • ${r}`).join('\n')}

Recommandation
────────────────────────────────────────────────────────────────
${analysis.recommendation}

════════════════════════════════════════════════════════════════
`;
}

/**
 * Détermine si on doit inclure les fonctionnalités avancées
 */
export function shouldIncludeFeature(
  complexity: PlaybookComplexity,
  feature: 'monitoring' | 'cicd' | 'reporting' | 'validation' | 'multiserver'
): boolean {
  const featureMatrix: Record<PlaybookComplexity, Record<string, boolean>> = {
    basic: {
      monitoring: false,
      cicd: false,
      reporting: false,
      validation: false,
      multiserver: false
    },
    pro: {
      monitoring: false,
      cicd: true,
      reporting: false,
      validation: true,
      multiserver: true
    },
    enterprise: {
      monitoring: true,
      cicd: true,
      reporting: true,
      validation: true,
      multiserver: true
    }
  };

  return featureMatrix[complexity][feature] || false;
}
