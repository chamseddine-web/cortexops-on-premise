import { generateTerraformIntegration, generateMultiClusterDeployment, generateDNSLoadBalancer, generateBlueGreenDeployment, generateMultiCloudReport } from './multiCloudGenerator';
import { generateEnterpriseBlueprint, generateEnterpriseBlueprintStructure } from './enterpriseBlueprintGenerator';
import { generateCompleteCICDPlaybook, type CloudTarget } from './completeCICDGenerator';
import { generateSecurityCompliancePlaybook } from './securityPipelineGenerator';
import { analyzePrompt, generateAnalysisSummary, type AnalysisResult } from './nlpAnalyzer';
import { isNodeJsDeployment, extractNodeAppConfig, generateNodeAppDeployment } from './nodeAppGenerator';
import { detectDeploymentContext, generateContextSummary, detectRequiredRoles } from './contextDetector';
import { generateClassicAnsiblePlaybook } from './classicAnsibleGenerator';
import { detectComplexity, generateComplexitySummary, shouldIncludeFeature } from './complexityDetector';
import { generateBasicPlaybook, type BasicPlaybookConfig } from './basicPlaybookGenerator';
import {
  generateEKSClusterPlaybook,
  generateJenkinsCICDPlaybook,
  generatePrometheusGrafanaPlaybook,
  generateSecurityHardeningPlaybook,
  type GeneratorConfig
} from './professionalGenerators';
import {
  generateArgoCDGitOpsPlaybook,
  generatePostgreSQLHAPlaybook,
  type GitOpsConfig,
  type DatabaseConfig
} from './professionalGenerators2';

interface KeywordPattern {
  keywords: string[];
  category: 'kubernetes' | 'cloud' | 'security' | 'database' | 'monitoring' | 'cicd' | 'multicloud' | 'terraform' | 'enterprise';
  modules: string[];
  priority: number;
}

const keywordPatterns: KeywordPattern[] = [
  {
    keywords: ['kubernetes', 'k8s', 'cluster', 'pod', 'deployment', 'service', 'ingress', 'namespace'],
    category: 'kubernetes',
    modules: ['kubernetes.core.k8s', 'kubernetes.core.k8s_info'],
    priority: 10
  },
  {
    keywords: ['helm', 'chart', 'release'],
    category: 'kubernetes',
    modules: ['community.kubernetes.helm', 'kubernetes.core.helm_repository'],
    priority: 9
  },
  {
    keywords: ['eks', 'elastic kubernetes'],
    category: 'cloud',
    modules: ['community.aws.eks_cluster', 'community.aws.eks_nodegroup'],
    priority: 10
  },
  {
    keywords: ['ec2', 'instance aws', 'machine aws'],
    category: 'cloud',
    modules: ['amazon.aws.ec2_instance', 'amazon.aws.ec2_vpc_net'],
    priority: 9
  },
  {
    keywords: ['aws', 'amazon'],
    category: 'cloud',
    modules: ['amazon.aws.ec2', 'boto3'],
    priority: 7
  },
  {
    keywords: ['prometheus', 'grafana', 'monitoring', 'metrics'],
    category: 'monitoring',
    modules: ['community.kubernetes.helm'],
    priority: 8
  },
  {
    keywords: ['secret', 'password', 'token', 'credential', 'key'],
    category: 'security',
    modules: ['ansible.builtin.set_fact'],
    priority: 10
  },
  {
    keywords: ['vault', 'hashicorp'],
    category: 'security',
    modules: ['ansible.builtin.set_fact'],
    priority: 9
  },
  {
    keywords: ['trivy', 'kube-bench', 'kyverno', 'opa', 'gatekeeper', 'sops', 'cosign', 'falco', 'conformité', 'compliance', 'audit', 'scan', 'pipeline sécurité'],
    category: 'security',
    modules: ['shell', 'community.kubernetes.helm', 'kubernetes.core.k8s', 'copy', 'register', 'until'],
    priority: 11
  },
  {
    keywords: ['gitlab', 'ci/cd', 'pipeline', 'deploy'],
    category: 'cicd',
    modules: ['ansible.builtin.uri'],
    priority: 8
  },
  {
    keywords: ['postgres', 'postgresql', 'mysql', 'database', 'db'],
    category: 'database',
    modules: ['ansible.builtin.postgresql_db', 'ansible.builtin.mysql_db'],
    priority: 7
  },
  {
    keywords: ['terraform', 'tf', 'infrastructure as code', 'iac'],
    category: 'terraform',
    modules: ['community.general.terraform'],
    priority: 10
  },
  {
    keywords: ['multi-cloud', 'multicloud', 'multi cloud', 'plusieurs clusters', 'tous les clusters'],
    category: 'multicloud',
    modules: ['kubernetes.core.k8s', 'community.general.terraform'],
    priority: 11
  },
  {
    keywords: ['blue-green', 'blue green', 'rollback', 'canary'],
    category: 'cicd',
    modules: ['kubernetes.core.k8s', 'ansible.builtin.uri'],
    priority: 10
  },
  {
    keywords: ['dns', 'cloudflare', 'load balancer', 'geo-routing'],
    category: 'multicloud',
    modules: ['community.general.cloudflare_dns'],
    priority: 9
  },
  {
    keywords: ['rapport', 'report', 'reporting'],
    category: 'multicloud',
    modules: ['ansible.builtin.copy'],
    priority: 8
  },
  {
    keywords: ['enterprise', 'blueprint', 'architecture complete', 'projet complet', 'full stack', 'orchestration complete'],
    category: 'enterprise',
    modules: ['community.general.terraform', 'kubernetes.core.k8s', 'community.kubernetes.helm'],
    priority: 12
  }
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function removeParasiteWords(text: string): string {
  const parasites = ['les', 'des', 'aux', 'pour', 'avec', 'sans', 'dans', 'sur', 'sous', 'et', 'ou', 'mais', 'donc'];
  const words = text.split(/\s+/);

  return words
    .filter((word, index) => {
      // Ne pas supprimer les parasites s'ils sont au début ou suivis d'un mot important
      if (parasites.includes(word.toLowerCase())) {
        const nextWord = words[index + 1];
        if (!nextWord || parasites.includes(nextWord.toLowerCase())) {
          return false;
        }
      }
      return true;
    })
    .join(' ');
}

function detectPatterns(prompt: string): KeywordPattern[] {
  const normalized = normalizeText(prompt);
  const detected: KeywordPattern[] = [];

  for (const pattern of keywordPatterns) {
    for (const keyword of pattern.keywords) {
      if (normalized.includes(normalizeText(keyword))) {
        if (!detected.find(p => p.category === pattern.category)) {
          detected.push(pattern);
        }
        break;
      }
    }
  }

  return detected.sort((a, b) => b.priority - a.priority);
}

function generateVaultLookup(secretType: string, environment: string = 'production'): string {
  const secretMappings: Record<string, { path: string; key: string }> = {
    'password': { path: 'db', key: 'password' },
    'db_password': { path: 'db', key: 'password' },
    'api_key': { path: 'api', key: 'key' },
    'token': { path: 'api', key: 'token' },
    'secret': { path: 'app', key: 'secret' },
    'aws_access': { path: 'aws', key: 'access_key' },
    'aws_secret': { path: 'aws', key: 'secret_key' }
  };

  const mapping = secretMappings[secretType.toLowerCase()] || { path: 'app', key: 'secret' };

  return `"{{ lookup('hashi_vault', 'secret=secret/data/${environment}/${mapping.path}:${mapping.key} token={{ vault_token }} url={{ vault_addr }}') }}"`;
}

function injectVaultHandler(prompt: string, environment: string = 'production'): {
  variables: Record<string, string>;
  tasks: string[];
} {
  const normalized = normalizeText(prompt);
  const variables: Record<string, string> = {};
  const tasks: string[] = [];

  const secretKeywords = [
    { pattern: /mot de passe|password/g, type: 'db_password', varName: 'db_password' },
    { pattern: /api[_\s]key|clé api/g, type: 'api_key', varName: 'api_key' },
    { pattern: /token/g, type: 'token', varName: 'api_token' },
    { pattern: /secret/g, type: 'secret', varName: 'app_secret' },
    { pattern: /aws[_\s]access/g, type: 'aws_access', varName: 'aws_access_key' },
    { pattern: /aws[_\s]secret/g, type: 'aws_secret', varName: 'aws_secret_key' }
  ];

  for (const { pattern, type, varName } of secretKeywords) {
    if (pattern.test(normalized)) {
      const vaultLookup = generateVaultLookup(type, environment);
      variables[varName] = vaultLookup;

      tasks.push(`- name: Récupérer ${varName} depuis Vault
  set_fact:
    ${varName}: ${vaultLookup}
  no_log: true`);
    }
  }

  return { variables, tasks };
}

export function generateIntelligentPlaybook(prompt: string, environment: 'staging' | 'production' = 'production'): string {
  // ÉTAPE 0: Détection du contexte de déploiement (PRIORITÉ ABSOLUE)
  const contextAnalysis = detectDeploymentContext(prompt);
  console.log(generateContextSummary(contextAnalysis));

  // ÉTAPE 0.5: Détection de la complexité (NOUVEAU)
  const roles = detectRequiredRoles(prompt);
  // Ne compter que les vrais services (exclure 'common' et 'security')
  const realServiceCount = roles.filter(r => r !== 'common' && r !== 'security').length;
  const complexityAnalysis = detectComplexity(prompt, realServiceCount);
  console.log(generateComplexitySummary(complexityAnalysis));

  // ÉTAPE 1: Routage par contexte ET complexité
  switch (contextAnalysis.context) {
    case 'classic-linux':
      // Sous-routage basé sur la complexité
      if (complexityAnalysis.level === 'basic') {
        console.log('🎯 Génération: Playbook Simple et Direct (BASIC)');
        const service = extractServiceFromPrompt(prompt);
        const target = extractTargetFromPrompt(prompt) || 'localhost';
        const config: BasicPlaybookConfig = {
          projectName: extractProjectName(prompt) || 'Simple Deployment',
          service,
          target,
          variables: extractBasicVariables(prompt)
        };
        // Retourner uniquement le playbook YAML, pas les fichiers multiples
        return generateBasicPlaybook(config);
      }

      console.log(`🎯 Génération: Playbook Ansible ${complexityAnalysis.level.toUpperCase()}`);
      return generateClassicAnsiblePlaybook(prompt, environment);

    case 'container-simple':
      console.log('🎯 Génération: Docker Compose + Ansible');
      // Fallback vers Node.js si détecté
      if (isNodeJsDeployment(prompt)) {
        const config = extractNodeAppConfig(prompt, environment);
        return generateNodeAppDeployment(config);
      }
      break;

    case 'kubernetes':
      console.log('🎯 Génération: Playbook Kubernetes');
      // Continue vers l'analyse NLP pour K8s
      break;

    case 'cloud-provisioning':
      console.log('🎯 Génération: Terraform + Ansible');
      // Continue vers l'analyse NLP
      break;

    case 'hybrid':
      console.log('🎯 Génération: Pipeline Hybrid (Terraform + Ansible + K8s)');
      // Continue vers l'analyse NLP
      break;
  }

  // ÉTAPE 2: Analyse NLP avancée du prompt (pour cas complexes)
  const analysis = analyzePrompt(prompt);
  const analysisSummary = generateAnalysisSummary(analysis);

  console.log('=== Analyse NLP ===');
  console.log(analysisSummary);
  console.log('==================');

  // ÉTAPE 3: Routage basé sur l'intention et la complexité

  // 1. EKS Cluster provisioning
  if (/\b(eks|elastic kubernetes|cluster\s+k8s|cluster\s+kubernetes)\b/i.test(prompt) &&
      /\b(aws|amazon)\b/i.test(prompt) &&
      /\b(cr[eé][eé]r|d[eé]ploy|provision)\b/i.test(prompt)) {
    const appName = extractAppName(prompt) || 'myapp';
    const config: GeneratorConfig = {
      appName,
      environment,
      clusterName: extractValue(prompt, ['cluster']) || `${appName}-cluster`
    };
    return addAnalysisHeader(generateEKSClusterPlaybook(config), analysis);
  }

  // 2. Jenkins CI/CD Pipeline
  if (/\b(jenkins|ci\/?cd|pipeline)\b/i.test(prompt) &&
      (/\b(test|build|d[eé]ploy)\b/i.test(prompt) || /\bkubernetes\b/i.test(prompt))) {
    const appName = extractAppName(prompt) || 'myapp';
    const config: GeneratorConfig = {
      appName,
      environment
    };
    return addAnalysisHeader(generateJenkinsCICDPlaybook(config), analysis);
  }

  // 3. Prometheus + Grafana + Loki monitoring stack
  if (/\b(prometheus|grafana|loki|monitoring|m[eé]trique|observabilit[eé])\b/i.test(prompt)) {
    const config: GeneratorConfig = {
      appName: 'monitoring',
      environment,
      clusterName: extractValue(prompt, ['cluster']) || 'production-cluster'
    };
    return addAnalysisHeader(generatePrometheusGrafanaPlaybook(config), analysis);
  }

  // 4. Security Hardening (CIS Benchmarks)
  if (/\b(hardening|s[eé]curis|cis|benchmark|firewall|ufw)\b/i.test(prompt) &&
      /\b(linux|serveur|server)\b/i.test(prompt)) {
    const config: GeneratorConfig = {
      appName: 'security',
      environment
    };
    return addAnalysisHeader(generateSecurityHardeningPlaybook(config), analysis);
  }

  // 5. GitOps with ArgoCD
  if (/\b(gitops|argocd|argo\s+cd)\b/i.test(prompt)) {
    const appName = extractAppName(prompt) || 'myapp';
    const gitRepo = extractValue(prompt, ['repo', 'repository', 'git']) || 'https://github.com/company/repo.git';
    const gitOpsConfig: GitOpsConfig = {
      appName,
      environment,
      gitRepo,
      branch: extractValue(prompt, ['branch', 'branche']) || 'main'
    };
    return addAnalysisHeader(generateArgoCDGitOpsPlaybook(gitOpsConfig), analysis);
  }

  // 6. PostgreSQL HA cluster
  if (/\b(postgres|postgresql)\b/i.test(prompt) &&
      (/\b(ha|haute[- ]disponibilit[eé]|high[- ]availability|cluster|replicat)\b/i.test(prompt))) {
    const dbConfig: DatabaseConfig = {
      dbType: 'postgresql',
      clusterName: extractValue(prompt, ['cluster']) || 'pg-cluster',
      environment
    };
    return addAnalysisHeader(generatePostgreSQLHAPlaybook(dbConfig), analysis);
  }

  // 7. DevSecOps / Security Compliance (existing)
  if (analysis.intent.primary === 'security' || analysis.intent.primary === 'compliance') {
    const hasAdvancedSecurity = analysis.entities.some(e =>
      e.type === 'security' && ['trivy', 'kube_bench', 'kyverno', 'opa', 'falco'].includes(e.value)
    );

    if (hasAdvancedSecurity || analysis.complexity === 'advanced' || analysis.complexity === 'enterprise') {
      const appName = extractAppName(prompt) || 'webapp';
      return addAnalysisHeader(generateSecurityCompliancePlaybook(appName, environment), analysis);
    }
  }

  // Multi-Cloud Enterprise
  if (analysis.intent.primary === 'multicloud' || analysis.complexity === 'enterprise') {
    const projectName = extractValue(prompt, ['projet', 'project']) || 'multicloud-platform';
    const appName = extractAppName(prompt) || 'microservices';
    const blueprint = generateEnterpriseBlueprint(projectName, appName, environment);
    return addAnalysisHeader(`# Blueprint Enterprise Multi-Cloud
# Projet: ${projectName}
# Application: ${appName}
# Environnement: ${environment}

${generateEnterpriseBlueprintStructure(projectName, environment)}

---
# PLAYBOOKS GÉNÉRÉS
${blueprint}`, analysis);
  }

  // CI/CD Pipeline
  if (analysis.intent.primary === 'cicd' && analysis.complexity !== 'simple') {
    const appName = extractAppName(prompt) || 'application';
    const platforms = analysis.entities.filter(e => e.type === 'platform').map(e => e.value);
    const cloudTarget = (platforms.length > 0 ? platforms[0] : 'aws') as unknown as CloudTarget;
    const envType = (environment === 'staging' || environment === 'production') ? environment : 'production';
    return addAnalysisHeader(generateCompleteCICDPlaybook(appName, cloudTarget, envType), analysis);
  }

  // Infrastructure / Orchestration complexe
  if ((analysis.intent.primary === 'orchestration' || analysis.intent.primary === 'infrastructure') &&
      (analysis.complexity === 'advanced')) {
    return addAnalysisHeader(generateAdvancedInfrastructurePlaybook(prompt, analysis, environment), analysis);
  }

  // Fallback sur l'ancienne logique si l'analyse n'est pas concluante
  const cleanedPrompt = removeParasiteWords(prompt);
  const normalized = normalizeText(cleanedPrompt);
  const patterns = detectPatterns(cleanedPrompt);

  if (patterns.length === 0) {
    return addAnalysisHeader(generateSimpleAnsiblePlaybook(cleanedPrompt, environment), analysis);
  }

  const primaryPattern = patterns[0];

  // Détection Enterprise Blueprint
  if (primaryPattern.category === 'enterprise') {
    const projectName = extractValue(cleanedPrompt, ['projet', 'project']) || 'spectra-multicloud';
    const appName = extractAppName(cleanedPrompt) || 'microservices';
    const blueprint = generateEnterpriseBlueprint(projectName, appName, environment);

    // Retourner la structure complète
    return `# Blueprint Enterprise Multi-Cloud généré
# Projet: ${projectName}
# Application: ${appName}
# Environnement: ${environment}

${generateEnterpriseBlueprintStructure(projectName, environment)}

---
# PLAYBOOKS GÉNÉRÉS (6 playbooks orchestrés)

${Object.entries(blueprint).map(([filename, content]) =>
  `## ${filename}\n\n\`\`\`yaml\n${content}\n\`\`\``
).join('\n\n')}

---
# COMMANDES D'EXÉCUTION

# 1. Initialiser Terraform
ansible-playbook playbooks/00_init_tf.yml -i inventories/${environment}

# 2. Provisionner le réseau multi-cloud
ansible-playbook playbooks/10_network_tf_apply.yml -i inventories/${environment}

# 3. Déployer les clusters Kubernetes (EKS, AKS, GKE)
ansible-playbook playbooks/20_k8s_manage.yml -i inventories/${environment}

# 4. Installer Vault + Observabilité
ansible-playbook playbooks/30_platform_basics.yml -i inventories/${environment}

# 5. Déployer l'application avec CI/CD
ansible-playbook playbooks/40_app_delivery.yml -i inventories/${environment}

# 6. Tester le Disaster Recovery
ansible-playbook playbooks/50_dr_failover.yml -i inventories/${environment}
`;
  }

  // Détection multi-cloud
  if (primaryPattern.category === 'multicloud' || primaryPattern.category === 'terraform') {
    return handleMultiCloudScenario(cleanedPrompt, patterns, environment);
  }

  switch (primaryPattern.category) {
    case 'kubernetes':
      return generateKubernetesPlaybook(cleanedPrompt, patterns, environment);
    case 'cloud':
      return generateCloudPlaybook(cleanedPrompt, patterns, environment);
    case 'security':
      // Pipeline de sécurité complet
      if (normalizeText(cleanedPrompt).includes('pipeline') ||
          normalizeText(cleanedPrompt).includes('complet') ||
          normalizeText(cleanedPrompt).includes('trivy') ||
          normalizeText(cleanedPrompt).includes('conformité') ||
          normalizeText(cleanedPrompt).includes('compliance')) {
        const appName = extractAppName(cleanedPrompt) || 'webapp';
        return generateSecurityCompliancePlaybook(appName, environment);
      }
      return generateSimpleAnsiblePlaybook(cleanedPrompt, environment);
    case 'monitoring':
      return generateMonitoringPlaybook(cleanedPrompt, environment);
    case 'cicd':
      // CI/CD complet avec rollback automatique
      if (normalizeText(cleanedPrompt).includes('complet') ||
          normalizeText(cleanedPrompt).includes('rollback') ||
          normalizeText(cleanedPrompt).includes('blue-green') ||
          normalizeText(cleanedPrompt).includes('multi-cloud')) {
        const appName = extractAppName(cleanedPrompt) || 'microservices';
        const clouds: CloudTarget[] = [
          { name: 'eks', provider: 'aws', region: 'eu-west-1', kubeconfig: '~/.kube/config-eks', priority: 'primary' },
          { name: 'aks', provider: 'azure', region: 'westeurope', kubeconfig: '~/.kube/config-aks', priority: 'secondary' },
          { name: 'gke', provider: 'gcp', region: 'europe-west1', kubeconfig: '~/.kube/config-gke', priority: 'tertiary' }
        ];
        return generateCompleteCICDPlaybook(appName, environment, clouds);
      }
      return generateCICDPlaybook(cleanedPrompt, environment);
    default:
      return generateSimpleAnsiblePlaybook(cleanedPrompt, environment);
  }
}

function handleMultiCloudScenario(prompt: string, patterns: KeywordPattern[], environment: string): string {
  const normalized = normalizeText(prompt);

  // Terraform detected
  if (normalized.includes('terraform') || normalized.includes('infrastructure')) {
    return generateTerraformIntegration(environment as 'staging' | 'production');
  }

  // Multi-cluster deployment
  if (normalized.includes('plusieurs clusters') || normalized.includes('tous les clusters') ||
      normalized.includes('multi-cloud') || normalized.includes('eks') && normalized.includes('aks')) {
    const appName = extractAppName(prompt) || 'microservices';
    return generateMultiClusterDeployment(appName, environment as 'staging' | 'production');
  }

  // DNS & Load Balancer
  if (normalized.includes('dns') || normalized.includes('cloudflare') || normalized.includes('load balancer')) {
    const domain = extractValue(prompt, ['domain', 'domaine']) || 'spectra-multi.cloud';
    return generateDNSLoadBalancer(domain, environment as 'staging' | 'production');
  }

  // Report generation
  if (normalized.includes('rapport') || normalized.includes('report')) {
    return generateMultiCloudReport(environment as 'staging' | 'production');
  }

  // Default: multi-cluster
  const appName = extractAppName(prompt) || 'microservices';
  return generateMultiClusterDeployment(appName, environment as 'staging' | 'production');
}

function generateKubernetesPlaybook(prompt: string, patterns: KeywordPattern[], environment: string): string {
  const normalized = normalizeText(prompt);
  const vaultHandler = injectVaultHandler(prompt, environment);
  const useHelm = patterns.some(p => p.keywords.includes('helm'));

  // Extraire les détails
  const appName = extractAppName(prompt) || 'myapp';
  const namespace = extractValue(prompt, ['namespace', 'ns']) || `${appName}-${environment}`;
  const replicas = environment === 'production' ? 3 : 1;

  let playbook = `---
# Playbook Kubernetes généré automatiquement
# Prompt: ${prompt}

- name: Préparation de l'environnement Kubernetes
  hosts: localhost
  connection: local
  gather_facts: no

  vars:
    environment: ${environment}
    app_name: ${appName}
    k8s_namespace: ${namespace}
    kubeconfig_path: ~/.kube/config
    vault_addr: https://vault.example.com:8200
    use_vault: true

  tasks:
    - name: Installer les dépendances Python
      pip:
        name:
          - kubernetes
          - openshift
          - pyyaml
        state: present
`;

  if (vaultHandler.tasks.length > 0) {
    playbook += `\n    # Récupération des secrets depuis Vault\n`;
    playbook += vaultHandler.tasks.map(t => '    ' + t.split('\n').join('\n    ')).join('\n\n');
  }

  playbook += `

    - name: Créer le namespace Kubernetes
      kubernetes.core.k8s:
        name: "{{ k8s_namespace }}"
        api_version: v1
        kind: Namespace
        state: present
        kubeconfig: "{{ kubeconfig_path }}"
`;

  if (useHelm) {
    playbook += generateHelmDeployment(appName, environment);
  } else {
    playbook += generateNativeK8sDeployment(appName, environment, replicas, vaultHandler);
  }

  // Ajouter monitoring si détecté
  if (patterns.some(p => p.category === 'monitoring')) {
    playbook += generateMonitoringIntegration();
  }

  return playbook;
}

function generateNativeK8sDeployment(appName: string, environment: string, replicas: number, vaultHandler: any): string {
  const hasSecrets = Object.keys(vaultHandler.variables).length > 0;

  let deployment = `
    - name: Créer le ConfigMap de configuration
      kubernetes.core.k8s:
        state: present
        kubeconfig: "{{ kubeconfig_path }}"
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: ${appName}-config
            namespace: "{{ k8s_namespace }}"
          data:
            ENVIRONMENT: "${environment}"
            APP_NAME: "${appName}"
`;

  if (hasSecrets) {
    deployment += `
    - name: Créer le Secret Kubernetes
      kubernetes.core.k8s:
        state: present
        kubeconfig: "{{ kubeconfig_path }}"
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: ${appName}-secrets
            namespace: "{{ k8s_namespace }}"
          type: Opaque
          stringData:
`;

    for (const [key, _] of Object.entries(vaultHandler.variables)) {
      deployment += `            ${key.toUpperCase()}: "{{ ${key} }}"\n`;
    }
  }

  deployment += `
    - name: Déployer l'application
      kubernetes.core.k8s:
        state: present
        kubeconfig: "{{ kubeconfig_path }}"
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: ${appName}
            namespace: "{{ k8s_namespace }}"
            labels:
              app: ${appName}
              environment: ${environment}
          spec:
            replicas: ${replicas}
            selector:
              matchLabels:
                app: ${appName}
            template:
              metadata:
                labels:
                  app: ${appName}
                  environment: ${environment}
              spec:
                containers:
                - name: ${appName}
                  image: ${appName}:latest
                  ports:
                  - containerPort: 8080
                    name: http
                  envFrom:
                  - configMapRef:
                      name: ${appName}-config
${hasSecrets ? `                  - secretRef:\n                      name: ${appName}-secrets` : ''}
                  resources:
                    requests:
                      memory: "256Mi"
                      cpu: "100m"
                    limits:
                      memory: "512Mi"
                      cpu: "200m"
                  livenessProbe:
                    httpGet:
                      path: /health
                      port: 8080
                    initialDelaySeconds: 30
                    periodSeconds: 10
                  readinessProbe:
                    httpGet:
                      path: /ready
                      port: 8080
                    initialDelaySeconds: 5
                    periodSeconds: 5

    - name: Créer le Service
      kubernetes.core.k8s:
        state: present
        kubeconfig: "{{ kubeconfig_path }}"
        definition:
          apiVersion: v1
          kind: Service
          metadata:
            name: ${appName}-service
            namespace: "{{ k8s_namespace }}"
          spec:
            type: ClusterIP
            selector:
              app: ${appName}
            ports:
            - port: 80
              targetPort: 8080
              protocol: TCP

    - name: Créer l'Ingress
      kubernetes.core.k8s:
        state: present
        kubeconfig: "{{ kubeconfig_path }}"
        definition:
          apiVersion: networking.k8s.io/v1
          kind: Ingress
          metadata:
            name: ${appName}-ingress
            namespace: "{{ k8s_namespace }}"
            annotations:
              kubernetes.io/ingress.class: nginx
              cert-manager.io/cluster-issuer: letsencrypt-prod
          spec:
            tls:
            - hosts:
              - ${appName}.${environment}.example.com
              secretName: ${appName}-tls
            rules:
            - host: ${appName}.${environment}.example.com
              http:
                paths:
                - path: /
                  pathType: Prefix
                  backend:
                    service:
                      name: ${appName}-service
                      port:
                        number: 80

    - name: Attendre que le déploiement soit prêt
      kubernetes.core.k8s_info:
        kind: Deployment
        namespace: "{{ k8s_namespace }}"
        name: ${appName}
        kubeconfig: "{{ kubeconfig_path }}"
      register: deployment_status
      until: deployment_status.resources[0].status.availableReplicas == ${replicas}
      retries: 30
      delay: 10

    - name: Afficher le statut du déploiement
      debug:
        msg:
          - "Déploiement réussi!"
          - "Application: ${appName}"
          - "Namespace: {{ k8s_namespace }}"
          - "Replicas disponibles: {{ deployment_status.resources[0].status.availableReplicas }}"
          - "URL: https://${appName}.${environment}.example.com"
`;

  return deployment;
}

function generateHelmDeployment(appName: string, environment: string): string {
  return `
    - name: Ajouter le dépôt Helm
      kubernetes.core.helm_repository:
        name: stable
        repo_url: https://charts.helm.sh/stable

    - name: Déployer via Helm
      community.kubernetes.helm:
        name: ${appName}
        chart_ref: stable/${appName}
        release_namespace: "{{ k8s_namespace }}"
        kubeconfig: "{{ kubeconfig_path }}"
        values:
          replicaCount: ${environment === 'production' ? 3 : 1}
          image:
            repository: ${appName}
            tag: "${environment}"
          ingress:
            enabled: true
            hosts:
              - host: ${appName}.${environment}.example.com
                paths:
                  - path: /
                    pathType: Prefix
        wait: yes
        timeout: 10m
        create_namespace: yes
`;
}

function generateCloudPlaybook(prompt: string, patterns: KeywordPattern[], environment: string): string {
  const normalized = normalizeText(prompt);
  const isEKS = patterns.some(p => p.keywords.includes('eks'));
  const vaultHandler = injectVaultHandler(prompt, environment);

  let playbook = `---
# Playbook AWS Cloud généré automatiquement
# Prompt: ${prompt}

- name: Provisioning AWS Infrastructure
  hosts: localhost
  connection: local
  gather_facts: no

  vars:
    environment: ${environment}
    aws_region: us-east-1
    vault_addr: https://vault.example.com:8200
    use_vault: true

  tasks:
    - name: Installer les dépendances AWS
      pip:
        name:
          - boto3
          - botocore
        state: present
`;

  if (vaultHandler.tasks.length > 0) {
    playbook += `\n    # Récupération des credentials AWS depuis Vault\n`;
    playbook += vaultHandler.tasks.map(t => '    ' + t.split('\n').join('\n    ')).join('\n\n');
  }

  if (isEKS) {
    playbook += generateEKSProvisioning(environment);
  } else {
    playbook += generateEC2Provisioning(environment);
  }

  return playbook;
}

function generateEKSProvisioning(environment: string): string {
  return `
    - name: Créer le VPC pour EKS
      amazon.aws.ec2_vpc_net:
        name: eks-${environment}-vpc
        cidr_block: 10.0.0.0/16
        region: "{{ aws_region }}"
        aws_access_key: "{{ aws_access_key }}"
        aws_secret_key: "{{ aws_secret_key }}"
        tags:
          Name: eks-${environment}-vpc
          Environment: ${environment}
      register: vpc

    - name: Créer le cluster EKS
      community.aws.eks_cluster:
        name: hybrid-${environment}
        version: "1.29"
        role_arn: "{{ eks_role_arn }}"
        subnets: "{{ vpc_subnets }}"
        region: "{{ aws_region }}"
        aws_access_key: "{{ aws_access_key }}"
        aws_secret_key: "{{ aws_secret_key }}"
        wait: yes
        tags:
          Environment: ${environment}
          ManagedBy: Ansible
      register: eks_cluster

    - name: Créer le groupe de nœuds
      community.aws.eks_nodegroup:
        cluster_name: hybrid-${environment}
        nodegroup_name: hybrid-${environment}-nodes
        node_role: "{{ node_role_arn }}"
        subnets: "{{ vpc_subnets }}"
        region: "{{ aws_region }}"
        aws_access_key: "{{ aws_access_key }}"
        aws_secret_key: "{{ aws_secret_key }}"
        scaling_config:
          min_size: ${environment === 'production' ? 2 : 1}
          max_size: ${environment === 'production' ? 10 : 3}
          desired_size: ${environment === 'production' ? 3 : 1}
        instance_types:
          - ${environment === 'production' ? 't3.medium' : 't3.small'}
        wait: yes

    - name: Configurer kubectl
      command: aws eks update-kubeconfig --region {{ aws_region }} --name hybrid-${environment}
      environment:
        AWS_ACCESS_KEY_ID: "{{ aws_access_key }}"
        AWS_SECRET_ACCESS_KEY: "{{ aws_secret_key }}"

    - name: Vérifier la connectivité au cluster
      kubernetes.core.k8s_info:
        kind: Node
      register: cluster_nodes

    - name: Afficher les informations du cluster
      debug:
        msg:
          - "Cluster EKS créé avec succès!"
          - "Nom: hybrid-${environment}"
          - "Région: {{ aws_region }}"
          - "Nœuds: {{ cluster_nodes.resources | length }}"
          - "Endpoint: {{ eks_cluster.endpoint }}"
`;
}

function generateEC2Provisioning(environment: string): string {
  return `
    - name: Créer le groupe de sécurité
      amazon.aws.ec2_security_group:
        name: web-${environment}-sg
        description: Security group for ${environment}
        region: "{{ aws_region }}"
        aws_access_key: "{{ aws_access_key }}"
        aws_secret_key: "{{ aws_secret_key }}"
        rules:
          - proto: tcp
            from_port: 22
            to_port: 22
            cidr_ip: 0.0.0.0/0
          - proto: tcp
            from_port: 80
            to_port: 80
            cidr_ip: 0.0.0.0/0
          - proto: tcp
            from_port: 443
            to_port: 443
            cidr_ip: 0.0.0.0/0

    - name: Provisionner les instances EC2
      amazon.aws.ec2_instance:
        key_name: ansible-key
        instance_type: ${environment === 'production' ? 't3.medium' : 't3.micro'}
        image_id: ami-0c55b159cbfafe1f0
        region: "{{ aws_region }}"
        aws_access_key: "{{ aws_access_key }}"
        aws_secret_key: "{{ aws_secret_key }}"
        count: ${environment === 'production' ? 3 : 1}
        security_group: web-${environment}-sg
        network:
          assign_public_ip: yes
        wait: yes
        tags:
          Name: web-server-${environment}
          Environment: ${environment}
      register: ec2_instances

    - name: Afficher les informations des instances
      debug:
        msg: "Instances créées: {{ ec2_instances.instances | map(attribute='public_ip_address') | list }}"
`;
}

function generateMonitoringPlaybook(prompt: string, environment: string): string {
  return `---
# Playbook Monitoring généré automatiquement
# Prompt: ${prompt}

- name: Déploiement du stack Monitoring
  hosts: localhost
  connection: local
  gather_facts: no

  vars:
    environment: ${environment}
    monitoring_namespace: monitoring
    kubeconfig_path: ~/.kube/config
    vault_addr: https://vault.example.com:8200

  tasks:
    - name: Récupérer le mot de passe Grafana depuis Vault
      set_fact:
        grafana_admin_password: "{{ lookup('hashi_vault', 'secret=secret/data/${environment}/monitoring:grafana_password token={{ vault_token }} url={{ vault_addr }}') }}"
      no_log: true

    - name: Ajouter le dépôt Prometheus Community
      kubernetes.core.helm_repository:
        name: prometheus-community
        repo_url: https://prometheus-community.github.io/helm-charts

    - name: Déployer kube-prometheus-stack
      community.kubernetes.helm:
        name: monitoring
        chart_ref: prometheus-community/kube-prometheus-stack
        release_namespace: "{{ monitoring_namespace }}"
        kubeconfig: "{{ kubeconfig_path }}"
        values:
          prometheus:
            prometheusSpec:
              retention: ${environment === 'production' ? '30d' : '7d'}
              storageSpec:
                volumeClaimTemplate:
                  spec:
                    accessModes: ["ReadWriteOnce"]
                    resources:
                      requests:
                        storage: ${environment === 'production' ? '50Gi' : '10Gi'}
          grafana:
            adminPassword: "{{ grafana_admin_password }}"
            ingress:
              enabled: true
              hosts:
                - grafana.${environment}.example.com
              tls:
                - secretName: grafana-tls
                  hosts:
                    - grafana.${environment}.example.com
        wait: yes
        timeout: 15m
        create_namespace: yes

    - name: Afficher les informations d'accès
      debug:
        msg:
          - "Stack de monitoring déployé!"
          - "Grafana: https://grafana.${environment}.example.com"
          - "Username: admin"
          - "Password: (stocké dans Vault)"
`;
}

function generateMonitoringIntegration(): string {
  return `
    - name: Ajouter annotations pour Prometheus
      kubernetes.core.k8s:
        state: patched
        kubeconfig: "{{ kubeconfig_path }}"
        definition:
          apiVersion: v1
          kind: Service
          metadata:
            name: "{{ app_name }}-service"
            namespace: "{{ k8s_namespace }}"
            annotations:
              prometheus.io/scrape: "true"
              prometheus.io/port: "8080"
              prometheus.io/path: "/metrics"
`;
}

function generateCICDPlaybook(prompt: string, environment: string): string {
  return `---
# Playbook CI/CD généré automatiquement
# Prompt: ${prompt}

- name: Déclenchement du pipeline GitLab
  hosts: localhost
  connection: local
  gather_facts: no

  vars:
    environment: ${environment}
    gitlab_api_url: https://gitlab.com/api/v4
    vault_addr: https://vault.example.com:8200

  tasks:
    - name: Récupérer le token GitLab depuis Vault
      set_fact:
        gitlab_token: "{{ lookup('hashi_vault', 'secret=secret/data/${environment}/gitlab:token token={{ vault_token }} url={{ vault_addr }}') }}"
      no_log: true

    - name: Déclencher le pipeline
      uri:
        url: "{{ gitlab_api_url }}/projects/{{ gitlab_project_id }}/trigger/pipeline"
        method: POST
        headers:
          PRIVATE-TOKEN: "{{ gitlab_token }}"
        body_format: json
        body:
          ref: ${environment === 'production' ? 'main' : 'develop'}
          variables:
            ENVIRONMENT: ${environment}
        status_code: 201
      register: pipeline

    - name: Suivre le pipeline
      uri:
        url: "{{ gitlab_api_url }}/projects/{{ gitlab_project_id }}/pipelines/{{ pipeline.json.id }}"
        method: GET
        headers:
          PRIVATE-TOKEN: "{{ gitlab_token }}"
      register: pipeline_status
      until: pipeline_status.json.status in ["success", "failed"]
      retries: 60
      delay: 30

    - name: Vérifier le succès du pipeline
      fail:
        msg: "Pipeline échoué!"
      when: pipeline_status.json.status != "success"

    - name: Afficher le résultat
      debug:
        msg:
          - "Pipeline terminé avec succès!"
          - "ID: {{ pipeline.json.id }}"
          - "Durée: {{ pipeline_status.json.duration }}s"
`;
}

function generateSimpleAnsiblePlaybook(prompt: string, environment: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const playName = prompt.length > 60 ? prompt.slice(0, 60) + '...' : prompt;

  return `---
# ════════════════════════════════════════════════════════════════════════════
# ANSIBLE PLAYBOOK - Configuration Système
# ════════════════════════════════════════════════════════════════════════════
# Description : ${playName}
# Environnement : ${environment.toUpperCase()}
# Date : ${timestamp}
# Type : Configuration de base avec best practices
# ════════════════════════════════════════════════════════════════════════════

- name: "📋 ${playName}"
  hosts: all
  become: yes
  gather_facts: yes

  vars:
    ansible_python_interpreter: /usr/bin/python3
    environment_name: ${environment}
    deployment_timestamp: "{{ ansible_date_time.iso8601 }}"
    project_root: /opt/ansible-deployment

  pre_tasks:
    - name: "🔍 Vérifier la connectivité et collecter les facts système"
      ping:
      changed_when: false
      tags: ['always', 'health-check']

    - name: "📊 Afficher les informations système"
      debug:
        msg:
          - "OS: {{ ansible_distribution }} {{ ansible_distribution_version }}"
          - "Kernel: {{ ansible_kernel }}"
          - "Architecture: {{ ansible_architecture }}"
          - "Python: {{ ansible_python_version }}"
          - "Hostname: {{ ansible_hostname }}"
      tags: ['always', 'info']

    - name: "💾 Vérifier l'espace disque disponible"
      assert:
        that:
          - "{{ (ansible_mounts | selectattr('mount', 'equalto', '/') | first).size_available > 1073741824 }}"
        fail_msg: "Espace disque insuffisant (<1GB disponible sur /)"
        success_msg: "Espace disque suffisant"
      tags: ['always', 'prerequisites']

  tasks:
    - name: "🔄 Mise à jour du cache des packages (Debian/Ubuntu)"
      apt:
        update_cache: yes
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"
      tags: ['packages', 'update']

    - name: "🔄 Mise à jour du cache des packages (RedHat/CentOS)"
      yum:
        update_cache: yes
      when: ansible_os_family == "RedHat"
      tags: ['packages', 'update']

    - name: "📦 Installation des packages essentiels"
      package:
        name:
          - curl
          - wget
          - git
          - vim
          - htop
          - net-tools
          - python3-pip
        state: present
      tags: ['packages', 'essentials']

    - name: "🛡️ Configuration du firewall de base (UFW)"
      block:
        - name: "Installer UFW"
          apt:
            name: ufw
            state: present
          when: ansible_os_family == "Debian"

        - name: "Autoriser SSH"
          ufw:
            rule: allow
            port: '22'
            proto: tcp

        - name: "Activer UFW"
          ufw:
            state: enabled
            policy: deny
      when: ansible_os_family == "Debian"
      tags: ['security', 'firewall']

    - name: "📁 Créer la structure de répertoires projet"
      file:
        path: "{{ item }}"
        state: directory
        mode: '0755'
        owner: root
        group: root
      loop:
        - "{{ project_root }}"
        - "{{ project_root }}/logs"
        - "{{ project_root }}/backups"
        - "{{ project_root }}/configs"
      tags: ['setup', 'directories']

    - name: "📝 Configuration personnalisée selon le prompt"
      copy:
        dest: "{{ project_root }}/deployment-info.txt"
        content: |
          ═══════════════════════════════════════════════════════════
          INFORMATIONS DE DÉPLOIEMENT ANSIBLE
          ═══════════════════════════════════════════════════════════

          Prompt original    : ${prompt}
          Environnement      : ${environment}
          Date de déploiement: {{ deployment_timestamp }}
          Serveur cible      : {{ ansible_hostname }}
          IP du serveur      : {{ ansible_default_ipv4.address }}
          OS                 : {{ ansible_distribution }} {{ ansible_distribution_version }}

          ═══════════════════════════════════════════════════════════
        mode: '0644'
      tags: ['setup', 'documentation']

  post_tasks:
    - name: "✅ Vérifier l'état des services critiques"
      service_facts:
      tags: ['always', 'validation']

    - name: "📊 Générer un rapport de déploiement"
      copy:
        dest: "{{ project_root }}/logs/deployment-{{ ansible_date_time.date }}.log"
        content: |
          Déploiement Ansible - {{ ansible_date_time.iso8601 }}
          ════════════════════════════════════════════════════════

          Utilisateur : {{ ansible_user_id }}
          Serveur     : {{ ansible_hostname }}
          OS          : {{ ansible_distribution }} {{ ansible_distribution_version }}
          Playbook    : Configuration de base
          Statut      : ✅ SUCCÈS

          Tâches exécutées : Voir logs Ansible pour détails
        mode: '0644'
      tags: ['always', 'reporting']

    - name: "🎉 Déploiement terminé avec succès"
      debug:
        msg:
          - "════════════════════════════════════════════════════════"
          - "✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS"
          - "════════════════════════════════════════════════════════"
          - "Environnement : ${environment}"
          - "Timestamp     : {{ deployment_timestamp }}"
          - "Documentation : {{ project_root }}/deployment-info.txt"
          - "Logs          : {{ project_root }}/logs/"
          - "════════════════════════════════════════════════════════"
      tags: ['always']
`;
}

function extractAppName(prompt: string): string | null {
  const appMatch = prompt.match(/application\s+([a-zA-Z0-9-_]+)/i);
  if (appMatch) return appMatch[1];

  const deployMatch = prompt.match(/déployer\s+([a-zA-Z0-9-_]+)/i);
  if (deployMatch) return deployMatch[1];

  return null;
}

function extractValue(prompt: string, keywords: string[]): string | null {
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}[:\\s]+([a-zA-Z0-9-_]+)`, 'i');
    const match = prompt.match(regex);
    if (match) return match[1];
  }
  return null;
}

/**
 * Ajoute un en-tête d'analyse NLP au playbook généré
 */
function addAnalysisHeader(playbook: string, analysis: AnalysisResult): string {
  const timestamp = new Date().toISOString();
  const version = '1.0.0';

  // Construire un nom de playbook professionnel
  const playName = generateProfessionalPlayName(analysis);

  // Construire les tags d'entités
  const entityTags = analysis.entities
    .slice(0, 5)
    .map(e => `${e.type}:${e.value}`)
    .join(', ');

  const header = `# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    ANSIBLE PLAYBOOK PROFESSIONNEL                          ║
# ║                      Génération Automatique Avancée                        ║
# ╚════════════════════════════════════════════════════════════════════════════╝
#
# INFORMATIONS GÉNÉRALES
# ────────────────────────────────────────────────────────────────────────────
# Nom du Playbook   : ${playName}
# Version           : ${version}
# Date de Génération: ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}
# Timestamp ISO     : ${timestamp}
#
# ANALYSE NLP INTELLIGENTE
# ────────────────────────────────────────────────────────────────────────────
# Intention Principale : ${analysis.intent.primary.toUpperCase()}
# Confiance            : ${(analysis.intent.confidence * 100).toFixed(0)}%
# Intentions Secondaires: ${analysis.intent.secondary.join(', ') || 'Aucune'}
# Complexité du Playbook: ${analysis.complexity.toUpperCase()}
# Entités Détectées     : ${entityTags || 'Aucune'}
#
# MODULES ANSIBLE UTILISÉS (${analysis.suggestedModules.length})
# ────────────────────────────────────────────────────────────────────────────
${analysis.suggestedModules.slice(0, 8).map(m => `#   ✓ ${m}`).join('\n')}
${analysis.suggestedModules.length > 8 ? `#   ... et ${analysis.suggestedModules.length - 8} autres` : ''}
#
# PRÉREQUIS INFRASTRUCTURE
# ────────────────────────────────────────────────────────────────────────────
${analysis.infraRequirements.length > 0 ? analysis.infraRequirements.map(req => `#   ⚙ ${req}`).join('\n') : '#   ⚙ Aucun prérequis spécifique'}
#
# EXIGENCES SÉCURITÉ
# ────────────────────────────────────────────────────────────────────────────
${analysis.securityRequirements.length > 0 ? analysis.securityRequirements.map(req => `#   🔒 ${req}`).join('\n') : '#   🔒 Sécurité standard Ansible'}
#
# VARIABLES D'ENVIRONNEMENT
# ────────────────────────────────────────────────────────────────────────────
#   KUBECONFIG         : Chemin vers le fichier kubeconfig (Kubernetes)
#   AWS_PROFILE        : Profil AWS à utiliser
#   AZURE_SUBSCRIPTION : ID de la souscription Azure
#   VAULT_ADDR         : URL du serveur Vault
#   VAULT_TOKEN        : Token d'authentification Vault
#
# EXÉCUTION RECOMMANDÉE
# ────────────────────────────────────────────────────────────────────────────
#   ansible-playbook playbook.yml -i inventory/${analysis.complexity === 'enterprise' ? 'production' : 'staging'} \\
#     --check              # Dry-run pour vérifier les changements
#     -v                   # Mode verbeux pour debug
#     --diff               # Afficher les différences
#
# DOCUMENTATION ET SUPPORT
# ────────────────────────────────────────────────────────────────────────────
#   Documentation Ansible: https://docs.ansible.com
#   Best Practices       : https://docs.ansible.com/ansible/latest/user_guide/playbooks_best_practices.html
#
# ════════════════════════════════════════════════════════════════════════════

`;
  return header + playbook;
}

/**
 * Génère un nom professionnel pour le playbook
 */
function generateProfessionalPlayName(analysis: AnalysisResult): string {
  const intent = analysis.intent.primary;
  const entities = analysis.entities;

  // Extraire les éléments clés
  const platforms = entities.filter(e => e.type === 'platform').map(e => e.value.toUpperCase());
  const services = entities.filter(e => e.type === 'service').map(e => {
    return e.value.charAt(0).toUpperCase() + e.value.slice(1);
  });
  const actions = entities.filter(e => e.type === 'action').map(e => {
    return e.value.charAt(0).toUpperCase() + e.value.slice(1);
  });

  let name = '';

  // Action
  if (actions.length > 0) {
    name = actions[0];
  } else {
    name = intent.charAt(0).toUpperCase() + intent.slice(1);
  }

  // Service principal
  if (services.length > 0) {
    name += ` ${services[0]}`;
  }

  // Platform
  if (platforms.length > 1) {
    name += ` - Multi-Cloud (${platforms.join('+')})`;
  } else if (platforms.length === 1) {
    name += ` on ${platforms[0]}`;
  }

  // Complexité
  if (analysis.complexity === 'enterprise') {
    name += ' [Enterprise]';
  } else if (analysis.complexity === 'advanced') {
    name += ' [Advanced]';
  }

  return name || 'Ansible Playbook';
}

/**
 * Génère un playbook d'infrastructure avancé basé sur l'analyse NLP
 */
function generateAdvancedInfrastructurePlaybook(
  prompt: string,
  analysis: AnalysisResult,
  environment: string
): string {
  const appName = extractAppName(prompt) || 'infrastructure';
  const services = analysis.entities.filter(e => e.type === 'service');
  const platforms = analysis.entities.filter(e => e.type === 'platform');
  const actions = analysis.entities.filter(e => e.type === 'action');

  let playbook = `---
- name: Infrastructure Avancée - ${appName}
  hosts: localhost
  gather_facts: false
  vars:
    environment: ${environment}
    app_name: ${appName}
    timestamp: "{{ ansible_date_time.iso8601 }}"

  tasks:
    - name: Afficher les informations d'analyse
      debug:
        msg:
          - "Intention principale: ${analysis.intent.primary}"
          - "Complexité: ${analysis.complexity}"
          - "Services détectés: ${services.map(s => s.value).join(', ') || 'aucun'}"
          - "Plateformes cibles: ${platforms.map(p => p.value).join(', ') || 'aucune'}"
          - "Actions à réaliser: ${actions.map(a => a.value).join(', ') || 'aucune'}"

`;

  // Ajouter les tâches spécifiques aux services détectés
  if (services.some(s => s.value === 'kubernetes' || s.value === 'helm')) {
    playbook += `
    - name: Vérifier la connexion au cluster Kubernetes
      kubernetes.core.k8s_cluster_info:
      register: cluster_info

    - name: Afficher les informations du cluster
      debug:
        var: cluster_info

    - name: Créer le namespace
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ app_name }}-{{ environment }}"
            labels:
              environment: "{{ environment }}"
              managed-by: ansible
`;
  }

  if (services.some(s => s.value === 'terraform')) {
    playbook += `
    - name: Initialiser Terraform
      community.general.terraform:
        project_path: "./terraform"
        state: planned
        plan_file: tfplan

    - name: Appliquer le plan Terraform
      community.general.terraform:
        project_path: "./terraform"
        state: present
        plan_file: tfplan
      when: not ansible_check_mode
`;
  }

  // Ajouter des tâches de monitoring si détecté
  if (services.some(s => ['prometheus', 'grafana'].includes(s.value)) || analysis.intent.secondary.includes('monitoring')) {
    playbook += `
    - name: Installer la stack de monitoring
      community.kubernetes.helm:
        name: monitoring
        chart_ref: prometheus-community/kube-prometheus-stack
        release_namespace: monitoring
        create_namespace: true
        values:
          prometheus:
            prometheusSpec:
              retention: 30d
              storageSpec:
                volumeClaimTemplate:
                  spec:
                    accessModes: ["ReadWriteOnce"]
                    resources:
                      requests:
                        storage: 50Gi
          grafana:
            adminPassword: "{{ lookup('env', 'GRAFANA_PASSWORD') | default('changeme', true) }}"
            persistence:
              enabled: true
              size: 10Gi
`;
  }

  // Ajouter des vérifications de sécurité si requises
  if (analysis.securityRequirements.length > 0) {
    playbook += `
    - name: Vérifications de sécurité
      block:
        - name: Vérifier que les secrets ne sont pas en clair
          assert:
            that:
              - lookup('env', 'VAULT_TOKEN', default='') != ''
            fail_msg: "Les secrets doivent être gérés via Vault"
            success_msg: "Configuration Vault détectée"

        - name: Vérifier RBAC Kubernetes
          kubernetes.core.k8s_info:
            api_version: rbac.authorization.k8s.io/v1
            kind: RoleBinding
            namespace: "{{ app_name }}-{{ environment }}"
          register: rbac_check

        - name: Confirmer configuration RBAC
          debug:
            msg: "RBAC configuré avec {{ rbac_check.resources | length }} bindings"
`;
  }

  // Ajouter des tâches multi-cloud si plusieurs plateformes détectées
  if (platforms.length > 1) {
    playbook += `
    - name: Configuration Multi-Cloud
      block:
`;
    platforms.forEach(platform => {
      playbook += `        - name: Configuration ${platform.value.toUpperCase()}
          debug:
            msg: "Préparation de l'infrastructure ${platform.value.toUpperCase()}"
`;
    });

    playbook += `        - name: Synchronisation inter-cloud
          debug:
            msg: "Synchronisation des configurations entre clouds"
`;
  }

  // Tâche finale de validation
  playbook += `
    - name: Validation finale de l'infrastructure
      debug:
        msg:
          - "Déploiement réussi pour: {{ app_name }}"
          - "Environnement: {{ environment }}"
          - "Timestamp: {{ timestamp }}"
          - "Modules utilisés: ${analysis.suggestedModules.slice(0, 5).join(', ')}"

    - name: Créer rapport de déploiement
      copy:
        content: |
          Rapport de Déploiement
          =====================
          Application: {{ app_name }}
          Environnement: {{ environment }}
          Date: {{ timestamp }}

          Analyse NLP:
          - Intention: ${analysis.intent.primary}
          - Complexité: ${analysis.complexity}
          - Services: ${services.map(s => s.value).join(', ')}
          - Plateformes: ${platforms.map(p => p.value).join(', ')}

          Prérequis validés:
${analysis.infraRequirements.map(req => `          - ${req}`).join('\n')}

          Sécurité:
${analysis.securityRequirements.map(req => `          - ${req}`).join('\n')}
        dest: "./deployment-report-{{ timestamp }}.txt"
`;

  return playbook;
}


/**
 * Extrait le nom du service principal du prompt
 */
function extractServiceFromPrompt(prompt: string): string {
  const normalized = prompt.toLowerCase();

  // Nginx + SSL détecté
  if ((normalized.includes("nginx") || normalized.includes("apache")) &&
      (normalized.includes("ssl") || normalized.includes("https") || normalized.includes("certif"))) {
    return "nginx+ssl";
  }

  // Services individuels
  const serviceMap: Record<string, string> = {
    "nginx": "nginx",
    "apache": "nginx",
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "mysql": "mysql",
    "docker": "docker",
    "node": "nodejs",
    "nodejs": "nodejs",
    "python": "python",
    "redis": "redis",
    "mongodb": "mongodb"
  };

  for (const [key, value] of Object.entries(serviceMap)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  return "nginx"; // Défaut
}

/**
 * Extrait la cible (serveur) du prompt
 */
function extractTargetFromPrompt(prompt: string): string | null {
  const normalized = prompt.toLowerCase();

  // Patterns pour IP
  const ipMatch = prompt.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  if (ipMatch) {
    return ipMatch[0];
  }

  // Patterns pour hostname
  const hostnameMatch = prompt.match(/(?:sur|on|to)\s+([a-z0-9.-]+)/i);
  if (hostnameMatch) {
    return hostnameMatch[1];
  }

  return null;
}

/**
 * Extrait le nom du projet du prompt
 */
function extractProjectName(prompt: string): string | null {
  const normalized = prompt.toLowerCase();

  // Chercher des patterns comme "projet X", "application X", "site X"
  const patterns = [
    /(?:projet|project|application|app|site)\s+([a-z0-9_-]+)/i,
    /pour\s+([a-z0-9_-]+)/i
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extrait les variables basiques du prompt
 */
function extractBasicVariables(prompt: string): Record<string, any> {
  const vars: Record<string, any> = {};
  const normalized = prompt.toLowerCase();

  // Domain
  const domainMatch = prompt.match(/(?:domain[e]?|site)\s*[:=]?\s*([a-z0-9.-]+\.[a-z]{2,})/i);
  if (domainMatch) {
    vars.domain = domainMatch[1];
  }

  // Port
  const portMatch = prompt.match(/port\s*[:=]?\s*(\d+)/i);
  if (portMatch) {
    vars.port = parseInt(portMatch[1]);
  }

  // Node version
  const nodeVersionMatch = prompt.match(/node\s*(?:js)?\s*(?:version)?\s*[:=]?\s*(\d+)/i);
  if (nodeVersionMatch) {
    vars.node_version = nodeVersionMatch[1];
  }

  // Python version
  const pythonVersionMatch = prompt.match(/python\s*(?:version)?\s*[:=]?\s*(\d+\.?\d*)/i);
  if (pythonVersionMatch) {
    vars.python_version = pythonVersionMatch[1];
  }

  // Database name
  const dbNameMatch = prompt.match(/(?:database|db|base)\s*[:=]?\s*([a-z0-9_-]+)/i);
  if (dbNameMatch && !["postgres", "postgresql", "mysql"].includes(dbNameMatch[1].toLowerCase())) {
    vars.db_name = dbNameMatch[1];
  }

  // Database user
  const dbUserMatch = prompt.match(/(?:user|utilisateur)\s*[:=]?\s*([a-z0-9_-]+)/i);
  if (dbUserMatch) {
    vars.db_user = dbUserMatch[1];
  }

  return vars;
}

