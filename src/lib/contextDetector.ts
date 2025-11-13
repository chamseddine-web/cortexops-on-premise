/**
 * Détecteur de Contexte Intelligent
 * Évite la sur-ingénierie en détectant le vrai besoin
 */

export type DeploymentContext =
  | 'classic-linux'      // Ansible sur serveurs Ubuntu/Debian/RedHat
  | 'kubernetes'         // Déploiement sur cluster K8s
  | 'cloud-provisioning' // Terraform/CloudFormation
  | 'hybrid'             // Mix Terraform + Ansible + K8s
  | 'container-simple'   // Docker Compose
  | 'serverless';        // Lambda/Functions

export interface ContextAnalysis {
  context: DeploymentContext;
  confidence: number;
  indicators: string[];
  infrastructure: {
    target: string[];      // ['ubuntu', 'ec2', 'vm']
    tools: string[];       // ['nginx', 'systemd', 'postgresql']
    orchestration: string; // 'none' | 'kubernetes' | 'docker-compose'
  };
  recommendation: string;
}

/**
 * Détecte le contexte réel du déploiement
 * PRIORITÉ: Ne pas forcer Kubernetes si ce n'est pas demandé !
 */
export function detectDeploymentContext(prompt: string): ContextAnalysis {
  const normalized = prompt.toLowerCase();

  // ════════════════════════════════════════════════════════════════
  // 1. KUBERNETES - Indicateurs explicites
  // ════════════════════════════════════════════════════════════════
  const k8sIndicators = [
    'kubernetes', 'k8s', 'cluster k8s', 'eks', 'aks', 'gke',
    'pod', 'deployment k8s', 'namespace', 'helm', 'kubectl',
    'ingress controller', 'service mesh', 'istio', 'kustomize',
    'operator', 'crd', 'statefulset'
  ];

  const hasK8sExplicit = k8sIndicators.some(ind => normalized.includes(ind));

  // ════════════════════════════════════════════════════════════════
  // 2. LINUX CLASSIQUE - Indicateurs de déploiement sur serveurs
  // ════════════════════════════════════════════════════════════════
  const linuxIndicators = [
    'ubuntu', 'debian', 'centos', 'rhel', 'redhat', 'amazon linux',
    'serveur', 'server', 'vm', 'ec2', 'instance', 'machine',
    'vps', 'droplet', 'linode'
  ];

  const systemdIndicators = [
    'systemd', 'systemctl', 'service', 'daemon',
    'auto-start', 'démarrage automatique', 'boot'
  ];

  const webServerIndicators = [
    'nginx', 'apache', 'reverse proxy', 'proxy inverse',
    'load balancer', 'haproxy', 'caddy'
  ];

  const hasLinux = linuxIndicators.some(ind => normalized.includes(ind));
  const hasSystemd = systemdIndicators.some(ind => normalized.includes(ind));
  const hasWebServer = webServerIndicators.some(ind => normalized.includes(ind));

  // ════════════════════════════════════════════════════════════════
  // 3. CLOUD PROVISIONING - Terraform, CloudFormation
  // ════════════════════════════════════════════════════════════════
  const provisioningIndicators = [
    'terraform', 'cloudformation', 'pulumi', 'cdk',
    'provisionner', 'créer infra', 'infrastructure as code',
    'vpc', 'subnet', 'security group', 'réseau'
  ];

  const hasProvisioning = provisioningIndicators.some(ind => normalized.includes(ind));

  // ════════════════════════════════════════════════════════════════
  // 4. CONTAINER SIMPLE - Docker Compose (pas K8s)
  // ════════════════════════════════════════════════════════════════
  const dockerComposeIndicators = [
    'docker compose', 'docker-compose', 'compose.yml',
    'docker stack', 'swarm'
  ];

  const hasDockerCompose = dockerComposeIndicators.some(ind => normalized.includes(ind));

  // ════════════════════════════════════════════════════════════════
  // 5. SERVERLESS
  // ════════════════════════════════════════════════════════════════
  const serverlessIndicators = [
    'lambda', 'function', 'serverless', 'cloud function',
    'azure functions', 'vercel', 'netlify'
  ];

  const hasServerless = serverlessIndicators.some(ind => normalized.includes(ind));

  // ════════════════════════════════════════════════════════════════
  // DÉCISION LOGIQUE (ordre important !)
  // ════════════════════════════════════════════════════════════════

  // CAS 1: Serverless explicite
  if (hasServerless) {
    return {
      context: 'serverless',
      confidence: 0.95,
      indicators: ['lambda', 'functions', 'serverless'],
      infrastructure: {
        target: ['cloud-functions'],
        tools: ['aws-lambda', 'api-gateway'],
        orchestration: 'none'
      },
      recommendation: 'Utiliser Serverless Framework ou SAM'
    };
  }

  // CAS 2: Docker Compose simple (pas K8s)
  if (hasDockerCompose && !hasK8sExplicit) {
    return {
      context: 'container-simple',
      confidence: 0.9,
      indicators: ['docker-compose'],
      infrastructure: {
        target: ['docker-host'],
        tools: ['docker', 'compose'],
        orchestration: 'docker-compose'
      },
      recommendation: 'Générer docker-compose.yml avec Ansible'
    };
  }

  // CAS 3: Kubernetes EXPLICITE (pods, namespaces, helm)
  if (hasK8sExplicit) {
    const isHybrid = hasProvisioning || (hasLinux && normalized.includes('puis'));

    if (isHybrid) {
      return {
        context: 'hybrid',
        confidence: 0.9,
        indicators: ['terraform', 'kubernetes', 'multi-étapes'],
        infrastructure: {
          target: ['cloud', 'kubernetes'],
          tools: ['terraform', 'ansible', 'kubectl', 'helm'],
          orchestration: 'kubernetes'
        },
        recommendation: 'Pipeline: Terraform (infra) → Ansible (config) → K8s (apps)'
      };
    }

    return {
      context: 'kubernetes',
      confidence: 0.95,
      indicators: ['kubernetes', 'pods', 'helm'],
      infrastructure: {
        target: ['kubernetes-cluster'],
        tools: ['kubectl', 'helm', 'kustomize'],
        orchestration: 'kubernetes'
      },
      recommendation: 'Playbook Ansible avec modules kubernetes.core.*'
    };
  }

  // CAS 4: Provisioning cloud (sans K8s)
  if (hasProvisioning && !hasK8sExplicit) {
    return {
      context: 'cloud-provisioning',
      confidence: 0.85,
      indicators: ['terraform', 'infrastructure'],
      infrastructure: {
        target: ['cloud-provider'],
        tools: ['terraform', 'ansible'],
        orchestration: 'none'
      },
      recommendation: 'Terraform pour infra, puis Ansible pour config'
    };
  }

  // CAS 5: LINUX CLASSIQUE (défaut pour la plupart des cas)
  // C'est le CAS LE PLUS FRÉQUENT et doit être le défaut !
  if (hasLinux || hasSystemd || hasWebServer ||
      (!hasK8sExplicit && !hasProvisioning && !hasServerless)) {

    const tools: string[] = [];
    if (normalized.includes('nginx') || normalized.includes('apache')) {
      tools.push('nginx');
    }
    if (normalized.includes('systemd') || normalized.includes('service')) {
      tools.push('systemd');
    }
    if (normalized.includes('postgres') || normalized.includes('mysql')) {
      tools.push('postgresql');
    }
    if (normalized.includes('node') || normalized.includes('python') || normalized.includes('java')) {
      tools.push('application-runtime');
    }

    return {
      context: 'classic-linux',
      confidence: 0.9,
      indicators: ['ubuntu', 'serveurs', 'systemd', 'nginx'],
      infrastructure: {
        target: hasLinux ? linuxIndicators.filter(i => normalized.includes(i)) : ['ubuntu'],
        tools: tools.length > 0 ? tools : ['systemd', 'nginx'],
        orchestration: 'none'
      },
      recommendation: 'Playbook Ansible avec rôles (nginx, app, database)'
    };
  }

  // CAS 6: Fallback - assumer Linux classique par défaut
  return {
    context: 'classic-linux',
    confidence: 0.5,
    indicators: ['prompt-générique'],
    infrastructure: {
      target: ['linux-servers'],
      tools: ['systemd', 'nginx'],
      orchestration: 'none'
    },
    recommendation: 'Playbook Ansible classique avec best practices'
  };
}

/**
 * Vérifie si le contexte nécessite une structure avec rôles
 */
export function needsRoleBasedStructure(context: DeploymentContext): boolean {
  return context === 'classic-linux' || context === 'hybrid';
}

/**
 * Retourne les composants attendus selon le contexte
 */
export function getExpectedComponents(context: DeploymentContext): string[] {
  const components: Record<DeploymentContext, string[]> = {
    'classic-linux': ['nginx', 'systemd', 'application', 'database', 'firewall'],
    'kubernetes': ['namespace', 'deployment', 'service', 'ingress', 'configmap'],
    'cloud-provisioning': ['vpc', 'subnets', 'security-groups', 'instances'],
    'hybrid': ['terraform', 'ansible-roles', 'kubernetes-manifests'],
    'container-simple': ['docker-compose', 'volumes', 'networks'],
    'serverless': ['lambda', 'api-gateway', 'dynamodb', 'sqs']
  };

  return components[context] || [];
}

/**
 * Génère un résumé du contexte détecté
 */
export function generateContextSummary(analysis: ContextAnalysis): string {
  return `
╔════════════════════════════════════════════════════════════════╗
║           DÉTECTION DU CONTEXTE DE DÉPLOIEMENT                 ║
╚════════════════════════════════════════════════════════════════╝

Type de Déploiement : ${analysis.context.toUpperCase()}
Confiance           : ${(analysis.confidence * 100).toFixed(0)}%

Infrastructure Cible
────────────────────────────────────────────────────────────────
${analysis.infrastructure.target.map(t => `  • ${t}`).join('\n')}

Outils Détectés
────────────────────────────────────────────────────────────────
${analysis.infrastructure.tools.map(t => `  • ${t}`).join('\n')}

Orchestration       : ${analysis.infrastructure.orchestration}

Recommandation
────────────────────────────────────────────────────────────────
${analysis.recommendation}

Composants Attendus
────────────────────────────────────────────────────────────────
${getExpectedComponents(analysis.context).map(c => `  • ${c}`).join('\n')}

════════════════════════════════════════════════════════════════
`;
}

/**
 * Indicateurs pour détecter la nécessité de rôles Ansible
 */
export function detectRequiredRoles(prompt: string): string[] {
  const normalized = prompt.toLowerCase();
  const roles: Set<string> = new Set();

  // Web servers
  if (normalized.includes('nginx') || normalized.includes('apache')) {
    roles.add('nginx');
  }

  // Databases
  if (normalized.includes('postgres') || normalized.includes('postgresql')) {
    roles.add('postgresql');
  }
  if (normalized.includes('mysql') || normalized.includes('mariadb')) {
    roles.add('mysql');
  }
  if (normalized.includes('mongodb') || normalized.includes('mongo')) {
    roles.add('mongodb');
  }
  if (normalized.includes('redis')) {
    roles.add('redis');
  }

  // Application runtimes
  if (normalized.includes('python') || normalized.includes('django') || normalized.includes('flask') || normalized.includes('fastapi')) {
    roles.add('pythonapp');
  }
  if (normalized.includes('node') || normalized.includes('nodejs') || normalized.includes('express')) {
    roles.add('nodeapp');
  }
  if (normalized.includes('java') || normalized.includes('spring') || normalized.includes('tomcat')) {
    roles.add('javaapp');
  }
  if (normalized.includes('php') || normalized.includes('laravel') || normalized.includes('symfony')) {
    roles.add('phpapp');
  }

  // Infrastructure
  if (normalized.includes('docker') && !normalized.includes('kubernetes')) {
    roles.add('docker');
  }

  // Monitoring
  if (normalized.includes('prometheus') || normalized.includes('grafana')) {
    roles.add('monitoring');
  }

  // Security
  if (normalized.includes('firewall') || normalized.includes('ufw') || normalized.includes('iptables')) {
    roles.add('firewall');
  }
  if (normalized.includes('ssl') || normalized.includes('certbot') || normalized.includes('letsencrypt')) {
    roles.add('ssl');
  }

  // Si aucun rôle détecté, retourner un ensemble basique
  if (roles.size === 0) {
    return ['common', 'security'];
  }

  // Toujours inclure common en premier
  return ['common', ...Array.from(roles)];
}
