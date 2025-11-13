/**
 * Advanced NLP Analyzer for Ansible Playbook Generation
 * Provides professional-grade natural language understanding
 */

export interface Intent {
  primary: string;
  secondary: string[];
  confidence: number;
}

export interface Entity {
  type: 'service' | 'platform' | 'environment' | 'action' | 'infrastructure' | 'security' | 'database' | 'application';
  value: string;
  normalized: string;
  context?: string;
}

export interface AnalysisResult {
  intent: Intent;
  entities: Entity[];
  complexity: 'simple' | 'intermediate' | 'advanced' | 'enterprise';
  suggestedModules: string[];
  infraRequirements: string[];
  securityRequirements: string[];
}

// Patterns d'intention avec pondération et contexte
const intentPatterns = {
  deployment: {
    keywords: [
      'déployer', 'déploie', 'deploy', 'déploiement', 'installer', 'installe', 'installation',
      'mettre en place', 'configurer', 'configure', 'setup', 'provisionner', 'provision',
      'rollout', 'release', 'mise en production', 'go-live', 'lancer', 'démarrer',
      'créer', 'create', 'créer', 'ajouter', 'add', 'initialiser', 'init'
    ],
    weight: 10,
    related: ['configuration', 'infrastructure']
  },
  security: {
    keywords: [
      'sécuriser', 'sécurise', 'secure', 'sécurité', 'security', 'protéger', 'protège', 'protect',
      'hardening', 'durcir', 'conformité', 'compliance', 'audit', 'scanner', 'scan', 'vulnérabilité',
      'chiffrer', 'encrypt', 'firewall', 'ssl', 'tls', 'certificat', 'penetration test', 'pentest',
      'zero trust', 'rbac', 'iam', 'authentication', 'authorization', 'sécurisation', 'renforcement',
      'devsecops', 'shift-left', 'sast', 'dast', 'vulnerability', 'cve', 'exploit', 'threat'
    ],
    weight: 12,
    related: ['monitoring', 'compliance']
  },
  monitoring: {
    keywords: [
      'monitorer', 'monitor', 'monitoring', 'superviser', 'supervision', 'observer', 'observabilité',
      'métriques', 'metrics', 'logs', 'alertes', 'alerts', 'dashboard', 'grafana', 'prometheus',
      'tracer', 'tracing', 'apm', 'observability', 'telemetry', 'télémétrie', 'visualisation',
      'elasticsearch', 'kibana', 'datadog', 'new relic', 'splunk', 'slo', 'sli', 'sla'
    ],
    weight: 9,
    related: ['logging', 'alerting']
  },
  cicd: {
    keywords: [
      'ci/cd', 'ci cd', 'cicd', 'pipeline', 'intégration continue', 'déploiement continu',
      'continuous integration', 'continuous deployment', 'gitlab', 'jenkins', 'github actions',
      'automation', 'automatiser', 'rollback', 'blue-green', 'canary', 'gitops', 'argocd', 'flux',
      'progressive delivery', 'feature flags', 'trunk-based', 'devops', 'release automation',
      'build automation', 'test automation', 'deployment automation', 'circleci', 'travis', 'bamboo'
    ],
    weight: 11,
    related: ['deployment', 'testing']
  },
  infrastructure: {
    keywords: [
      'infrastructure', 'infra', 'cluster', 'serveur', 'server', 'vm', 'machine',
      'kubernetes', 'k8s', 'docker', 'container', 'cloud', 'aws', 'azure', 'gcp',
      'terraform', 'iac', 'infrastructure as code', 'openstack', 'vmware', 'hyperviseur',
      'bare metal', 'on-premise', 'datacentre', 'datacenter', 'réseau', 'network',
      'load balancer', 'cdn', 'edge computing', 'fog computing', 'microservices', 'serverless'
    ],
    weight: 10,
    related: ['networking', 'storage']
  },
  database: {
    keywords: [
      'base de données', 'database', 'db', 'postgres', 'postgresql', 'mysql', 'mongodb',
      'redis', 'elasticsearch', 'backup', 'sauvegarde', 'réplication', 'replication',
      'migration', 'schema'
    ],
    weight: 9,
    related: ['backup', 'replication']
  },
  multicloud: {
    keywords: [
      'multi-cloud', 'multicloud', 'multi cloud', 'plusieurs clouds', 'hybride', 'hybrid',
      'aws et azure', 'aws et gcp', 'tous les clouds', 'cross-cloud', 'federation'
    ],
    weight: 12,
    related: ['infrastructure', 'orchestration']
  },
  orchestration: {
    keywords: [
      'orchestrer', 'orchestration', 'coordonner', 'coordination', 'workflow',
      'séquence', 'sequence', 'étapes', 'steps', 'pipeline complexe', 'automation avancée'
    ],
    weight: 11,
    related: ['cicd', 'infrastructure']
  },
  compliance: {
    keywords: [
      'conformité', 'compliance', 'rgpd', 'gdpr', 'iso', 'soc2', 'hipaa', 'pci-dss',
      'cis', 'benchmark', 'standard', 'norme', 'audit', 'certification'
    ],
    weight: 11,
    related: ['security', 'monitoring']
  }
};

// Entités reconnues avec leurs variations
const entityPatterns = {
  services: {
    nginx: ['nginx', 'reverse proxy', 'proxy inverse', 'web server'],
    apache: ['apache', 'httpd'],
    postgres: ['postgres', 'postgresql', 'pgsql'],
    mysql: ['mysql', 'mariadb'],
    redis: ['redis', 'cache'],
    mongodb: ['mongodb', 'mongo', 'nosql'],
    elasticsearch: ['elasticsearch', 'elastic', 'elk'],
    kafka: ['kafka', 'streaming', 'message broker'],
    prometheus: ['prometheus', 'métriques'],
    grafana: ['grafana', 'dashboard', 'visualisation'],
    vault: ['vault', 'hashicorp vault', 'secret manager'],
    consul: ['consul', 'service discovery', 'service mesh'],
    jenkins: ['jenkins', 'ci server'],
    gitlab: ['gitlab', 'gitlab ci', 'gitlab runner'],
    docker: ['docker', 'conteneur', 'container'],
    kubernetes: ['kubernetes', 'k8s', 'orchestration'],
    helm: ['helm', 'helm chart', 'package manager k8s'],
    istio: ['istio', 'service mesh'],
    argocd: ['argocd', 'argo cd', 'gitops'],
    traefik: ['traefik', 'ingress', 'edge router']
  },
  system_management: {
    user_management: ['utilisateur', 'user', 'admin', 'administrator', 'compte', 'account'],
    permissions: ['sudo', 'sudoers', 'permission', 'chmod', 'chown', 'acl', 'droit', 'rights'],
    packages: ['package', 'paquet', 'apt', 'yum', 'dnf', 'installation'],
    services: ['service', 'daemon', 'systemd', 'systemctl'],
    files: ['fichier', 'file', 'directory', 'répertoire', 'configuration'],
    security: ['sécurité', 'security', 'selinux', 'apparmor', 'firewall', 'iptables']
  },
  platforms: {
    aws: ['aws', 'amazon web services', 'ec2', 'eks', 's3', 'rds', 'lambda'],
    azure: ['azure', 'microsoft azure', 'aks', 'azure devops'],
    gcp: ['gcp', 'google cloud', 'gke', 'google cloud platform'],
    digitalocean: ['digitalocean', 'do', 'droplet'],
    ovh: ['ovh', 'ovh cloud'],
    scaleway: ['scaleway'],
    baremetal: ['bare metal', 'serveur physique', 'on-premise', 'on premise']
  },
  security_tools: {
    trivy: ['trivy', 'scan vulnérabilités', 'vulnerability scanner'],
    kube_bench: ['kube-bench', 'kubebench', 'cis benchmark k8s'],
    kyverno: ['kyverno', 'policy engine', 'admission controller'],
    opa: ['opa', 'open policy agent', 'gatekeeper'],
    falco: ['falco', 'runtime security', 'détection intrusion'],
    sops: ['sops', 'secrets encryption', 'chiffrement secrets'],
    cosign: ['cosign', 'signature images', 'image signing'],
    cert_manager: ['cert-manager', 'certificat', 'let\'s encrypt', 'ssl automation']
  },
  environments: {
    production: ['production', 'prod', 'live'],
    staging: ['staging', 'preprod', 'pré-production', 'pre-production'],
    development: ['development', 'dev', 'développement'],
    testing: ['testing', 'test', 'qa']
  }
};

// Actions avec leurs verbes associés
const actionPatterns = {
  install: ['installer', 'installe', 'install', 'installation', 'setup', 'mettre en place'],
  configure: ['configurer', 'configure', 'configuration', 'paramétrer', 'setup'],
  deploy: ['déployer', 'déploie', 'deploy', 'déploiement', 'rollout'],
  update: ['mettre à jour', 'update', 'upgrade', 'migrer', 'migration'],
  backup: ['sauvegarder', 'backup', 'sauvegarde', 'archiver'],
  restore: ['restaurer', 'restore', 'récupérer', 'recover'],
  scale: ['scaler', 'scale', 'redimensionner', 'scaling', 'autoscale'],
  monitor: ['monitorer', 'monitor', 'superviser', 'surveiller'],
  secure: ['sécuriser', 'secure', 'protéger', 'durcir', 'hardening'],
  test: ['tester', 'test', 'vérifier', 'valider', 'check'],
  audit: ['auditer', 'audit', 'scanner', 'analyser'],
  optimize: ['optimiser', 'optimize', 'améliorer', 'performance tuning'],
  create: ['créer', 'create', 'ajouter', 'add', 'nouveau', 'new'],
  delete: ['supprimer', 'delete', 'remove', 'retirer'],
  manage: ['gérer', 'manage', 'administrer', 'administer']
};

/**
 * Normalise le texte pour l'analyse
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^\w\s-]/g, ' ') // Garder lettres, chiffres, espaces, tirets
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrait les tokens significatifs
 */
function tokenize(text: string): string[] {
  const stopWords = [
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du',
    'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
    'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
    'ce', 'cette', 'ces', 'pour', 'par', 'avec', 'sans', 'sur', 'sous',
    'dans', 'en', 'à', 'au', 'aux', 'chez'
  ];

  return text
    .split(/\s+/)
    .filter(token => token.length > 2 && !stopWords.includes(token));
}

/**
 * Analyse l'intention principale et secondaires
 */
function analyzeIntent(text: string): Intent {
  const normalized = normalizeText(text);
  const scores: Record<string, number> = {};

  // Calculer les scores pour chaque intention
  for (const [intentName, intentData] of Object.entries(intentPatterns)) {
    let score = 0;

    for (const keyword of intentData.keywords) {
      const normalizedKeyword = normalizeText(keyword);

      // Score exact
      if (normalized.includes(normalizedKeyword)) {
        score += intentData.weight;

        // Bonus si le mot-clé est au début
        if (normalized.startsWith(normalizedKeyword)) {
          score += 2;
        }
      }

      // Score partiel pour correspondances approximatives
      const words = normalizedKeyword.split(/\s+/);
      const matchingWords = words.filter(word => normalized.includes(word));
      if (matchingWords.length > 0 && matchingWords.length < words.length) {
        score += (matchingWords.length / words.length) * intentData.weight * 0.5;
      }
    }

    if (score > 0) {
      scores[intentName] = score;
    }
  }

  // Trier par score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return {
      primary: 'deployment',
      secondary: [],
      confidence: 0.3
    };
  }

  const primary = sorted[0][0];
  const primaryScore = sorted[0][1];
  const secondary = sorted.slice(1, 4).map(([intent]) => intent);

  // Ajouter les intentions liées
  const relatedIntents = intentPatterns[primary as keyof typeof intentPatterns]?.related || [];
  for (const related of relatedIntents) {
    if (!secondary.includes(related) && related !== primary) {
      secondary.push(related);
    }
  }

  // Calculer la confiance (0-1)
  const maxPossibleScore = intentPatterns[primary as keyof typeof intentPatterns]?.weight || 10;
  const confidence = Math.min(primaryScore / (maxPossibleScore * 2), 1);

  return {
    primary,
    secondary: secondary.slice(0, 3),
    confidence: Math.max(confidence, 0.5)
  };
}

/**
 * Extrait les entités du texte
 */
function extractEntities(text: string): Entity[] {
  const normalized = normalizeText(text);
  const entities: Entity[] = [];
  const seen = new Set<string>();

  // Détecter les services
  for (const [service, variations] of Object.entries(entityPatterns.services)) {
    for (const variation of variations) {
      if (normalized.includes(normalizeText(variation))) {
        const key = `service:${service}`;
        if (!seen.has(key)) {
          entities.push({
            type: 'service',
            value: service,
            normalized: service.toLowerCase(),
            context: variation
          });
          seen.add(key);
          break;
        }
      }
    }
  }

  // Détecter la gestion système
  for (const [category, variations] of Object.entries(entityPatterns.system_management)) {
    for (const variation of variations) {
      if (normalized.includes(normalizeText(variation))) {
        const key = `system:${category}`;
        if (!seen.has(key)) {
          entities.push({
            type: 'action',
            value: category,
            normalized: category.toLowerCase(),
            context: variation
          });
          seen.add(key);
          break;
        }
      }
    }
  }

  // Détecter les plateformes
  for (const [platform, variations] of Object.entries(entityPatterns.platforms)) {
    for (const variation of variations) {
      if (normalized.includes(normalizeText(variation))) {
        const key = `platform:${platform}`;
        if (!seen.has(key)) {
          entities.push({
            type: 'platform',
            value: platform,
            normalized: platform.toLowerCase(),
            context: variation
          });
          seen.add(key);
          break;
        }
      }
    }
  }

  // Détecter les outils de sécurité
  for (const [tool, variations] of Object.entries(entityPatterns.security_tools)) {
    for (const variation of variations) {
      if (normalized.includes(normalizeText(variation))) {
        const key = `security:${tool}`;
        if (!seen.has(key)) {
          entities.push({
            type: 'security',
            value: tool,
            normalized: tool.toLowerCase(),
            context: variation
          });
          seen.add(key);
          break;
        }
      }
    }
  }

  // Détecter l'environnement
  for (const [env, variations] of Object.entries(entityPatterns.environments)) {
    for (const variation of variations) {
      if (normalized.includes(normalizeText(variation))) {
        const key = `environment:${env}`;
        if (!seen.has(key)) {
          entities.push({
            type: 'environment',
            value: env,
            normalized: env.toLowerCase(),
            context: variation
          });
          seen.add(key);
          break;
        }
      }
    }
  }

  // Détecter les actions
  for (const [action, verbs] of Object.entries(actionPatterns)) {
    for (const verb of verbs) {
      if (normalized.includes(normalizeText(verb))) {
        const key = `action:${action}`;
        if (!seen.has(key)) {
          entities.push({
            type: 'action',
            value: action,
            normalized: action.toLowerCase(),
            context: verb
          });
          seen.add(key);
          break;
        }
      }
    }
  }

  return entities;
}

/**
 * Détermine la complexité du playbook requis
 */
function determineComplexity(intent: Intent, entities: Entity[]): 'simple' | 'intermediate' | 'advanced' | 'enterprise' {
  let complexityScore = 0;

  // Score basé sur l'intention
  const complexIntents = ['multicloud', 'orchestration', 'compliance', 'cicd'];
  if (complexIntents.includes(intent.primary)) {
    complexityScore += 3;
  }
  complexityScore += intent.secondary.filter(i => complexIntents.includes(i)).length;

  // Score basé sur le nombre d'entités
  complexityScore += Math.floor(entities.length / 3);

  // Score basé sur les types d'entités
  const platforms = entities.filter(e => e.type === 'platform');
  if (platforms.length > 2) {
    complexityScore += 2;
  }

  const securityTools = entities.filter(e => e.type === 'security');
  if (securityTools.length > 3) {
    complexityScore += 2;
  }

  // Déterminer la complexité finale
  if (complexityScore >= 8) return 'enterprise';
  if (complexityScore >= 5) return 'advanced';
  if (complexityScore >= 2) return 'intermediate';
  return 'simple';
}

/**
 * Suggère les modules Ansible appropriés
 */
function suggestModules(intent: Intent, entities: Entity[]): string[] {
  const modules = new Set<string>();

  // Modules basés sur l'intention
  const intentModuleMap: Record<string, string[]> = {
    deployment: ['kubernetes.core.k8s', 'ansible.builtin.copy', 'ansible.builtin.template'],
    security: ['ansible.builtin.iptables', 'community.crypto.openssl_certificate', 'ansible.builtin.user'],
    monitoring: ['community.kubernetes.helm', 'ansible.builtin.uri', 'ansible.builtin.service'],
    cicd: ['ansible.builtin.git', 'ansible.builtin.uri', 'community.general.gitlab_runner'],
    infrastructure: ['community.general.terraform', 'amazon.aws.ec2_instance', 'kubernetes.core.k8s'],
    database: ['community.postgresql.postgresql_db', 'community.mysql.mysql_db', 'ansible.builtin.file'],
    multicloud: ['community.general.terraform', 'kubernetes.core.k8s', 'amazon.aws.ec2', 'azure.azcollection.azure_rm_virtualmachine'],
    orchestration: ['kubernetes.core.k8s', 'ansible.builtin.include_tasks', 'ansible.builtin.import_playbook'],
    compliance: ['ansible.builtin.command', 'kubernetes.core.k8s', 'ansible.builtin.assert']
  };

  // Ajouter les modules de l'intention principale
  const primaryModules = intentModuleMap[intent.primary] || [];
  primaryModules.forEach(m => modules.add(m));

  // Ajouter les modules des intentions secondaires
  intent.secondary.forEach(secondary => {
    const secondaryModules = intentModuleMap[secondary] || [];
    secondaryModules.forEach(m => modules.add(m));
  });

  // Modules basés sur les entités
  entities.forEach(entity => {
    if (entity.type === 'service') {
      if (entity.value === 'kubernetes' || entity.value === 'helm') {
        modules.add('kubernetes.core.k8s');
        modules.add('community.kubernetes.helm');
      }
      if (entity.value === 'docker') {
        modules.add('community.docker.docker_container');
        modules.add('community.docker.docker_image');
      }
      if (['postgres', 'mysql', 'mongodb'].includes(entity.value)) {
        modules.add('ansible.builtin.package');
        modules.add('ansible.builtin.service');
      }
    }

    if (entity.type === 'platform') {
      if (entity.value === 'aws') {
        modules.add('amazon.aws.ec2_instance');
        modules.add('amazon.aws.s3_bucket');
      }
      if (entity.value === 'azure') {
        modules.add('azure.azcollection.azure_rm_virtualmachine');
      }
      if (entity.value === 'gcp') {
        modules.add('google.cloud.gcp_compute_instance');
      }
    }

    if (entity.type === 'security') {
      modules.add('ansible.builtin.command');
      modules.add('kubernetes.core.k8s');
    }
  });

  // Modules essentiels
  modules.add('ansible.builtin.debug');
  modules.add('ansible.builtin.set_fact');

  return Array.from(modules);
}

/**
 * Identifie les besoins en infrastructure
 */
function identifyInfraRequirements(entities: Entity[]): string[] {
  const requirements: string[] = [];

  const platforms = entities.filter(e => e.type === 'platform').map(e => e.value);
  const services = entities.filter(e => e.type === 'service').map(e => e.value);

  if (services.includes('kubernetes') || services.includes('helm')) {
    requirements.push('Cluster Kubernetes fonctionnel');
    requirements.push('kubectl configuré');
    requirements.push('Accès admin au cluster');
  }

  if (platforms.includes('aws')) {
    requirements.push('Compte AWS avec credentials configurés');
    requirements.push('boto3 installé');
  }

  if (platforms.includes('azure')) {
    requirements.push('Compte Azure avec credentials configurés');
    requirements.push('azure-cli installé');
  }

  if (platforms.includes('gcp')) {
    requirements.push('Compte GCP avec credentials configurés');
    requirements.push('gcloud SDK installé');
  }

  if (services.includes('terraform')) {
    requirements.push('Terraform installé (version >= 1.0)');
    requirements.push('Fichiers .tf préparés');
  }

  if (services.includes('vault')) {
    requirements.push('HashiCorp Vault accessible');
    requirements.push('Token Vault valide');
  }

  return requirements;
}

/**
 * Identifie les besoins en sécurité
 */
function identifySecurityRequirements(intent: Intent, entities: Entity[]): string[] {
  const requirements: string[] = [];

  if (intent.primary === 'security' || intent.secondary.includes('security')) {
    requirements.push('Secrets stockés dans Vault ou encrypted');
    requirements.push('RBAC Kubernetes configuré');
    requirements.push('Network Policies définies');
  }

  if (intent.primary === 'compliance' || intent.secondary.includes('compliance')) {
    requirements.push('Audit logging activé');
    requirements.push('Pod Security Standards appliqués');
    requirements.push('Image scanning configuré');
  }

  const securityTools = entities.filter(e => e.type === 'security');
  if (securityTools.length > 0) {
    requirements.push('Outils de sécurité déployés et configurés');
    requirements.push('Politiques de sécurité définies');
  }

  const platforms = entities.filter(e => e.type === 'platform');
  if (platforms.length > 1) {
    requirements.push('Chiffrement des communications inter-cloud');
    requirements.push('Gestion centralisée des identités');
  }

  return requirements;
}

/**
 * Analyse complète du prompt en langage naturel
 */
export function analyzePrompt(prompt: string): AnalysisResult {
  const intent = analyzeIntent(prompt);
  const entities = extractEntities(prompt);
  const complexity = determineComplexity(intent, entities);
  const suggestedModules = suggestModules(intent, entities);
  const infraRequirements = identifyInfraRequirements(entities);
  const securityRequirements = identifySecurityRequirements(intent, entities);

  return {
    intent,
    entities,
    complexity,
    suggestedModules,
    infraRequirements,
    securityRequirements
  };
}

/**
 * Génère un résumé lisible de l'analyse
 */
export function generateAnalysisSummary(analysis: AnalysisResult): string {
  const { intent, entities, complexity, infraRequirements, securityRequirements } = analysis;

  let summary = `## Analyse du Prompt\n\n`;
  summary += `**Intention principale:** ${intent.primary} (confiance: ${(intent.confidence * 100).toFixed(0)}%)\n`;

  if (intent.secondary.length > 0) {
    summary += `**Intentions secondaires:** ${intent.secondary.join(', ')}\n`;
  }

  summary += `**Complexité:** ${complexity}\n\n`;

  if (entities.length > 0) {
    summary += `### Entités détectées:\n`;
    const grouped = entities.reduce((acc, entity) => {
      if (!acc[entity.type]) acc[entity.type] = [];
      acc[entity.type].push(entity.value);
      return acc;
    }, {} as Record<string, string[]>);

    Object.entries(grouped).forEach(([type, values]) => {
      summary += `- **${type}**: ${values.join(', ')}\n`;
    });
    summary += '\n';
  }

  if (infraRequirements.length > 0) {
    summary += `### Prérequis Infrastructure:\n`;
    infraRequirements.forEach(req => summary += `- ${req}\n`);
    summary += '\n';
  }

  if (securityRequirements.length > 0) {
    summary += `### Exigences Sécurité:\n`;
    securityRequirements.forEach(req => summary += `- ${req}\n`);
  }

  return summary;
}
