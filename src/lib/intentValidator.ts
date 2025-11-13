/**
 * Intent Validator & Guard Rails
 * Validates user prompts before generation to ensure technical relevance
 */

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  detectedTerms: string[];
  category: 'technical' | 'ambiguous' | 'invalid' | 'empty';
  suggestions?: string[];
  errorMessage?: string;
}

const TECHNICAL_SERVICES = [
  'nginx', 'apache', 'haproxy', 'tomcat', 'httpd',
  'mysql', 'postgresql', 'postgres', 'mariadb', 'mongodb', 'redis', 'elasticsearch',
  'docker', 'kubernetes', 'k8s', 'ansible', 'terraform',
  'jenkins', 'gitlab', 'github', 'bitbucket',
  'php', 'python', 'node', 'nodejs', 'java', 'go', 'rust',
  'wordpress', 'drupal', 'joomla', 'magento',
  'rabbitmq', 'kafka', 'activemq',
  'prometheus', 'grafana', 'zabbix', 'nagios',
  'ssl', 'tls', 'https', 'ssh', 'vpn', 'firewall',
  'backup', 'restore', 'cron', 'systemd',
  'load balancer', 'reverse proxy', 'cache',
  'api', 'rest', 'graphql', 'websocket'
];

const TECHNICAL_SYSTEM = [
  'utilisateur', 'user', 'admin', 'administrator', 'root', 'sudo', 'sudoers',
  'groupe', 'group', 'permission', 'chmod', 'chown', 'acl',
  'package', 'paquet', 'apt', 'yum', 'dnf', 'zypper',
  'service', 'daemon', 'process', 'processus',
  'fichier', 'file', 'directory', 'répertoire', 'dossier',
  'mount', 'disk', 'disque', 'partition',
  'kernel', 'noyau', 'module',
  'selinux', 'apparmor', 'security', 'sécurité'
];

const TECHNICAL_OS = [
  'linux', 'ubuntu', 'debian', 'centos', 'rhel', 'redhat', 'fedora',
  'alpine', 'arch', 'rocky', 'alma', 'suse', 'opensuse'
];

const TECHNICAL_INFRA = [
  'server', 'serveur', 'cluster', 'node', 'noeud', 'host', 'hôte',
  'vm', 'virtual machine', 'container', 'conteneur',
  'deployment', 'déploiement', 'configuration', 'installation',
  'monitoring', 'supervision', 'logging', 'logs',
  'network', 'réseau', 'port', 'ip', 'dns',
  'database', 'base de données', 'bdd',
  'web', 'application', 'app', 'service',
  'infrastructure', 'infra', 'cloud', 'provision', 'provisionner'
];

const TECHNICAL_CLOUD = [
  'aws', 'amazon', 'ec2', 'eks', 's3', 'rds', 'lambda', 'cloudformation',
  'azure', 'microsoft azure', 'aks', 'vm azure',
  'gcp', 'google cloud', 'gke', 'compute engine',
  'kubernetes', 'k8s', 'docker', 'container', 'conteneur',
  'terraform', 'iac', 'infrastructure as code',
  'helm', 'kubectl', 'kustomize'
];

const AMBIGUOUS_TERMS = [
  'cinéma', 'cinema', 'film', 'movie',
  'école', 'school', 'education',
  'boutique', 'shop', 'store', 'magasin',
  'restaurant', 'café', 'coffee',
  'hôtel', 'hotel',
  'blog', 'site', 'website',
  'portfolio', 'cv', 'resume'
];

const INVALID_TERMS = [
  'amour', 'love', 'coeur', 'heart',
  'musique', 'music', 'song', 'chanson',
  'pizza', 'burger', 'food', 'nourriture',
  'jeu', 'game', 'play',
  'voyage', 'travel', 'vacances', 'vacation'
];

export function validateIntent(prompt: string): ValidationResult {
  if (!prompt || prompt.trim().length === 0) {
    return {
      isValid: false,
      confidence: 0,
      detectedTerms: [],
      category: 'empty',
      errorMessage: '⚠️ Veuillez entrer une description de votre infrastructure.'
    };
  }

  const normalizedPrompt = prompt.toLowerCase();
  const detectedTerms: string[] = [];
  let technicalScore = 0;
  let ambiguousScore = 0;
  let invalidScore = 0;

  // Check technical services (highest priority)
  TECHNICAL_SERVICES.forEach(term => {
    if (normalizedPrompt.includes(term)) {
      detectedTerms.push(term);
      technicalScore += 10;
    }
  });

  // Check cloud services (highest priority for cloud infrastructure)
  TECHNICAL_CLOUD.forEach(term => {
    if (normalizedPrompt.includes(term)) {
      detectedTerms.push(term);
      technicalScore += 10;
    }
  });

  // Check system administration terms (high priority for user/permission management)
  TECHNICAL_SYSTEM.forEach(term => {
    if (normalizedPrompt.includes(term)) {
      detectedTerms.push(term);
      technicalScore += 9;
    }
  });

  // Check OS terms
  TECHNICAL_OS.forEach(term => {
    if (normalizedPrompt.includes(term)) {
      detectedTerms.push(term);
      technicalScore += 8;
    }
  });

  // Check infrastructure terms
  TECHNICAL_INFRA.forEach(term => {
    if (normalizedPrompt.includes(term)) {
      detectedTerms.push(term);
      technicalScore += 5;
    }
  });

  // Check ambiguous terms
  AMBIGUOUS_TERMS.forEach(term => {
    if (normalizedPrompt.includes(term)) {
      ambiguousScore += 3;
    }
  });

  // Check invalid terms
  INVALID_TERMS.forEach(term => {
    if (normalizedPrompt.includes(term)) {
      invalidScore += 5;
    }
  });

  // Decision logic
  if (technicalScore >= 10) {
    return {
      isValid: true,
      confidence: Math.min(100, technicalScore * 5),
      detectedTerms,
      category: 'technical'
    };
  }

  if (technicalScore >= 5 && ambiguousScore > 0) {
    return {
      isValid: true,
      confidence: 60,
      detectedTerms,
      category: 'ambiguous',
      suggestions: [
        'Précisez les technologies à utiliser (nginx, mysql, etc.)',
        'Indiquez le système d\'exploitation (Ubuntu, CentOS, etc.)',
        'Décrivez l\'architecture technique souhaitée'
      ]
    };
  }

  if (ambiguousScore > 0 && technicalScore < 5) {
    return {
      isValid: false,
      confidence: 30,
      detectedTerms,
      category: 'ambiguous',
      errorMessage: '⚠️ Votre demande manque de détails techniques.',
      suggestions: [
        'Exemple: "Déployer un site WordPress avec nginx et MySQL sur Ubuntu"',
        'Exemple: "Installer 3 serveurs CentOS avec HAProxy et Apache"',
        'Exemple: "Configurer un cluster Kubernetes avec monitoring Prometheus"'
      ]
    };
  }

  if (invalidScore > 0) {
    return {
      isValid: false,
      confidence: 0,
      detectedTerms: [],
      category: 'invalid',
      errorMessage: '❌ CortexOps génère des playbooks Ansible pour l\'infrastructure IT.',
      suggestions: [
        'Décrivez une infrastructure technique (serveurs, services, applications)',
        'Exemple: "Installer nginx avec SSL sur Ubuntu"',
        'Exemple: "Configurer un cluster Redis avec réplication"'
      ]
    };
  }

  // No technical terms detected at all
  return {
    isValid: false,
    confidence: 0,
    detectedTerms: [],
    category: 'invalid',
    errorMessage: '⚠️ Aucun service technique détecté dans votre demande.',
    suggestions: [
      'CortexOps génère des playbooks Ansible pour déployer des infrastructures IT',
      'Exemple: "Installer un serveur web nginx avec PHP et MySQL"',
      'Exemple: "Déployer HAProxy comme load balancer avec 3 backends"',
      'Exemple: "Configurer un cluster Kubernetes avec 3 nodes"'
    ]
  };
}

export function getTechnicalSuggestions(prompt: string): string[] {
  const normalizedPrompt = prompt.toLowerCase();
  const suggestions: string[] = [];

  // Suggest OS if not present
  const hasOS = TECHNICAL_OS.some(os => normalizedPrompt.includes(os));
  if (!hasOS) {
    suggestions.push('Précisez le système d\'exploitation (Ubuntu, CentOS, Debian, etc.)');
  }

  // Suggest web server if web-related
  if ((normalizedPrompt.includes('web') || normalizedPrompt.includes('site')) &&
      !normalizedPrompt.includes('nginx') && !normalizedPrompt.includes('apache')) {
    suggestions.push('Ajoutez un serveur web (nginx, apache, etc.)');
  }

  // Suggest database if application-related
  if ((normalizedPrompt.includes('app') || normalizedPrompt.includes('application')) &&
      !normalizedPrompt.includes('mysql') && !normalizedPrompt.includes('postgres')) {
    suggestions.push('Spécifiez une base de données (MySQL, PostgreSQL, MongoDB, etc.)');
  }

  // Suggest architecture if multiple servers mentioned
  const serverMatch = normalizedPrompt.match(/(\d+)\s*(server|serveur)/i);
  if (serverMatch && parseInt(serverMatch[1]) > 1) {
    if (!normalizedPrompt.includes('haproxy') && !normalizedPrompt.includes('load')) {
      suggestions.push('Considérez un load balancer (HAProxy) pour répartir la charge');
    }
  }

  return suggestions;
}

export function formatValidationError(result: ValidationResult): string {
  let message = result.errorMessage || 'Demande invalide';

  if (result.suggestions && result.suggestions.length > 0) {
    message += '\n\n💡 Suggestions:\n' + result.suggestions.map(s => `  • ${s}`).join('\n');
  }

  return message;
}
