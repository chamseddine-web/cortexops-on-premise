export interface VersionSpec {
  name: string;
  version: string;
  minVersion?: string;
  reason?: string;
}

export interface VersionCatalog {
  os: VersionSpec[];
  languages: VersionSpec[];
  webservers: VersionSpec[];
  databases: VersionSpec[];
  tools: VersionSpec[];
  kubernetes: VersionSpec[];
  cloud: VersionSpec[];
}

export const DEFAULT_VERSIONS: VersionCatalog = {
  os: [
    { name: 'ubuntu', version: '22.04', reason: 'LTS with 5 years support' },
    { name: 'debian', version: '12', reason: 'Stable release' },
    { name: 'centos', version: '9', reason: 'Stream for continuous updates' },
    { name: 'rhel', version: '9', reason: 'Enterprise Linux' },
    { name: 'rocky', version: '9', reason: 'RHEL compatible' },
  ],
  languages: [
    { name: 'python', version: '3.11', minVersion: '3.9', reason: 'Modern features and performance' },
    { name: 'nodejs', version: '20', minVersion: '18', reason: 'LTS version' },
    { name: 'php', version: '8.2', minVersion: '8.1', reason: 'Performance improvements' },
    { name: 'java', version: '17', minVersion: '11', reason: 'LTS version' },
    { name: 'go', version: '1.21', minVersion: '1.20', reason: 'Latest stable' },
    { name: 'ruby', version: '3.2', minVersion: '3.0', reason: 'Modern Ruby' },
  ],
  webservers: [
    { name: 'nginx', version: '1.24', minVersion: '1.22', reason: 'Stable with HTTP/3 support' },
    { name: 'apache', version: '2.4.57', minVersion: '2.4.50', reason: 'Stable release' },
    { name: 'caddy', version: '2.7', reason: 'Automatic HTTPS' },
  ],
  databases: [
    { name: 'postgresql', version: '15', minVersion: '14', reason: 'Performance improvements' },
    { name: 'mysql', version: '8.0', minVersion: '8.0.30', reason: 'Modern MySQL' },
    { name: 'mariadb', version: '10.11', minVersion: '10.6', reason: 'LTS version' },
    { name: 'mongodb', version: '7.0', minVersion: '6.0', reason: 'Latest stable' },
    { name: 'redis', version: '7.2', minVersion: '7.0', reason: 'Performance improvements' },
  ],
  tools: [
    { name: 'docker', version: '24.0', minVersion: '23.0', reason: 'Stable version' },
    { name: 'docker-compose', version: '2.23', reason: 'Latest v2' },
    { name: 'ansible', version: '2.15', minVersion: '2.14', reason: 'Latest stable' },
    { name: 'terraform', version: '1.6', minVersion: '1.5', reason: 'Production ready' },
    { name: 'helm', version: '3.13', minVersion: '3.12', reason: 'Kubernetes package manager' },
  ],
  kubernetes: [
    { name: 'kubernetes', version: '1.28', minVersion: '1.27', reason: 'Stable K8s version' },
    { name: 'kubectl', version: '1.28', reason: 'Match cluster version' },
    { name: 'argocd', version: '2.9', minVersion: '2.8', reason: 'GitOps stable' },
    { name: 'prometheus', version: '2.48', reason: 'Monitoring standard' },
    { name: 'grafana', version: '10.2', reason: 'Latest stable' },
  ],
  cloud: [
    { name: 'aws-cli', version: '2', reason: 'Latest AWS CLI' },
    { name: 'azure-cli', version: '2.54', reason: 'Latest Azure CLI' },
    { name: 'gcloud', version: '455', reason: 'Latest Google Cloud SDK' },
  ],
};

export function detectVersionsFromPrompt(prompt: string): VersionSpec[] {
  const detected: VersionSpec[] = [];
  const normalized = prompt.toLowerCase();

  const versionPatterns = [
    { pattern: /ubuntu\s+(\d+\.\d+)/i, name: 'ubuntu' },
    { pattern: /debian\s+(\d+)/i, name: 'debian' },
    { pattern: /python\s+(\d+\.\d+)/i, name: 'python' },
    { pattern: /node(?:js)?\s+(\d+)/i, name: 'nodejs' },
    { pattern: /php\s+(\d+\.\d+)/i, name: 'php' },
    { pattern: /nginx\s+(\d+\.\d+)/i, name: 'nginx' },
    { pattern: /postgres(?:ql)?\s+(\d+)/i, name: 'postgresql' },
    { pattern: /mysql\s+(\d+\.\d+)/i, name: 'mysql' },
    { pattern: /docker\s+(\d+\.\d+)/i, name: 'docker' },
    { pattern: /kubernetes?\s+(\d+\.\d+)/i, name: 'kubernetes' },
    { pattern: /k8s\s+(\d+\.\d+)/i, name: 'kubernetes' },
  ];

  for (const { pattern, name } of versionPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      detected.push({
        name,
        version: match[1],
        reason: 'User specified',
      });
    }
  }

  return detected;
}

export function getVersionForTool(tool: string, userSpecified?: string): VersionSpec {
  if (userSpecified) {
    return {
      name: tool,
      version: userSpecified,
      reason: 'User specified',
    };
  }

  for (const category of Object.values(DEFAULT_VERSIONS)) {
    const found = category.find(v => v.name === tool.toLowerCase());
    if (found) {
      return found;
    }
  }

  return {
    name: tool,
    version: 'latest',
    reason: 'No specific version found',
  };
}

export function generateVersionComment(versions: VersionSpec[]): string {
  if (versions.length === 0) return '';

  const lines = [
    '# Versions spécifiées',
    '#',
  ];

  for (const v of versions) {
    const minVersionText = v.minVersion ? ` (≥ ${v.minVersion})` : '';
    const reasonText = v.reason ? ` - ${v.reason}` : '';
    lines.push(`# ${v.name}: ${v.version}${minVersionText}${reasonText}`);
  }

  lines.push('#');

  return lines.join('\n');
}

export function generateVersionVars(versions: VersionSpec[]): string {
  if (versions.length === 0) return '';

  const vars: string[] = [];

  for (const v of versions) {
    const varName = `${v.name.replace(/-/g, '_')}_version`;
    vars.push(`    ${varName}: "${v.version}"`);
  }

  return vars.join('\n');
}

export function injectVersionsIntoPlaybook(playbook: string, prompt: string): string {
  const detectedVersions = detectVersionsFromPrompt(prompt);

  if (detectedVersions.length === 0) {
    return playbook;
  }

  const versionComment = generateVersionComment(detectedVersions);
  const versionVars = generateVersionVars(detectedVersions);

  const lines = playbook.split('\n');
  const result: string[] = [];
  let varsFound = false;
  let varsIndented = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i === 0 && line.startsWith('---')) {
      result.push(line);
      result.push(versionComment);
      continue;
    }

    if (!varsFound && /^\s*vars:\s*$/i.test(line)) {
      varsFound = true;
      result.push(line);
      result.push(versionVars);
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

export function generateVersionMatrix(): string {
  let output = '# Matrice de versions recommandées\n\n';

  for (const [category, specs] of Object.entries(DEFAULT_VERSIONS)) {
    output += `## ${category.toUpperCase()}\n\n`;
    output += '| Outil | Version | Min Version | Raison |\n';
    output += '|-------|---------|-------------|--------|\n';

    for (const spec of specs) {
      const minVer = spec.minVersion || 'N/A';
      const reason = spec.reason || '';
      output += `| ${spec.name} | ${spec.version} | ${minVer} | ${reason} |\n`;
    }

    output += '\n';
  }

  return output;
}
