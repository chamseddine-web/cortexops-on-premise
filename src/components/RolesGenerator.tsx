import { useState } from 'react';
import { Download, FolderTree, Package, Shield, Database, Activity, Lock, Cloud, Box, Boxes, GitBranch, Crown, Zap, AlertCircle } from 'lucide-react';
import { generateRoleStructure, generateInventoryStructure, generateMainPlaybook } from '../lib/rolesGenerator';
import { useAuth } from '../contexts/AuthContext';
import { savePlaybookGeneration } from '../lib/playbookService';

interface RolesGeneratorProps {
  setActiveTab?: (tab: 'learn' | 'generate' | 'roles' | 'security' | 'api') => void;
}

export function RolesGenerator({ setActiveTab }: RolesGeneratorProps) {
  const { user, profile, canGeneratePlaybook, refreshProfile } = useAuth();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [environment, setEnvironment] = useState<'staging' | 'production'>('production');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableRoles = [
    { id: 'security', name: 'Security', icon: Shield, description: 'Fail2ban, SSH hardening, UFW', category: 'Infrastructure' },
    { id: 'web', name: 'Web Server', icon: Package, description: 'Nginx avec configuration', category: 'Infrastructure' },
    { id: 'db', name: 'Database', icon: Database, description: 'PostgreSQL avec Vault', category: 'Infrastructure' },
    { id: 'backup', name: 'Backup', icon: Download, description: 'Sauvegardes automatisées', category: 'Infrastructure' },
    { id: 'monitoring', name: 'Monitoring', icon: Activity, description: 'Prometheus + Grafana', category: 'Infrastructure' },
    { id: 'vault', name: 'Vault', icon: Lock, description: 'HashiCorp Vault', category: 'Infrastructure' },
    { id: 'aws', name: 'AWS EC2', icon: Cloud, description: 'Provisioning EC2', category: 'Cloud' },
    { id: 'eks', name: 'AWS EKS', icon: Cloud, description: 'Cluster Kubernetes managé', category: 'Cloud' },
    { id: 'kubernetes', name: 'Kubernetes', icon: Box, description: 'Déploiement K8s natif', category: 'Kubernetes' },
    { id: 'helm', name: 'Helm Charts', icon: Boxes, description: 'Gestion via Helm', category: 'Kubernetes' },
    { id: 'prometheus-helm', name: 'Prometheus Stack', icon: Activity, description: 'Monitoring K8s complet', category: 'Kubernetes' },
    { id: 'cicd', name: 'CI/CD GitLab', icon: GitBranch, description: 'Pipelines & rollback', category: 'DevOps' }
  ];

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const generateStructure = async () => {
    if (selectedRoles.length === 0) {
      alert('Veuillez sélectionner au moins un rôle');
      return;
    }

    if (!user) return;

    if (!canGeneratePlaybook()) {
      setGenerationError(
        `Limite atteinte ! Vous avez utilisé vos ${profile?.playbooks_generated_this_month} playbooks ce mois-ci. Passez à Pro pour un accès illimité !`
      );
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const mainPlaybook = generateMainPlaybook(selectedRoles, environment);

      const result = await savePlaybookGeneration(
        user.id,
        `Génération de rôles: ${selectedRoles.join(', ')} pour ${environment}`,
        mainPlaybook,
        'roles'
      );

      if (!result.success) {
        setGenerationError(result.error || 'Erreur lors de la génération');
        setIsGenerating(false);
        return;
      }

      await refreshProfile();

      const structure: Record<string, any> = {
        'site.yml': mainPlaybook,
      'ansible.cfg': `[defaults]
inventory = inventories/${environment}/hosts.yml
host_key_checking = False
retry_files_enabled = False
roles_path = roles

[privilege_escalation]
become = True
become_method = sudo
become_user = root
become_ask_pass = False`,
      roles: {},
      inventories: {
        [environment]: generateInventoryStructure(environment)
      }
    };

    // Générer chaque rôle sélectionné
    selectedRoles.forEach(roleId => {
      const role = generateRoleStructure(roleId, environment);
      structure.roles[role.name] = {
        'tasks': { 'main.yml': role.tasks },
        'handlers': role.handlers ? { 'main.yml': role.handlers } : undefined,
        'defaults': role.defaults ? { 'main.yml': role.defaults } : undefined,
        'templates': role.templates,
        'files': role.files
      };
    });

      downloadStructure(structure);
    } catch (error) {
      console.error('Error generating roles:', error);
      setGenerationError('Une erreur est survenue lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadStructure = (structure: any) => {
    const zip = generateZipContent(structure);
    const blob = new Blob([JSON.stringify(structure, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ansible-structure-${environment}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateZipContent = (structure: any): string => {
    let content = '# Structure Ansible générée\n\n';
    content += `Environnement: ${environment}\n`;
    content += `Rôles inclus: ${selectedRoles.join(', ')}\n\n`;
    content += '## Instructions d\'utilisation\n\n';
    content += '1. Extraire les fichiers dans votre répertoire Ansible\n';
    content += '2. Configurer vos inventaires dans inventories/\n';
    content += '3. Exécuter: `ansible-playbook -i inventories/' + environment + '/hosts.yml site.yml`\n';
    return content;
  };

  const previewStructure = () => {
    if (selectedRoles.length === 0) {
      return null;
    }

    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h4 className="text-sm font-semibold text-white mb-3">Arborescence générée</h4>
        <div className="font-mono text-xs text-slate-300 space-y-1">
          <div>📁 ansible-project/</div>
          <div className="ml-4">📄 site.yml</div>
          <div className="ml-4">📄 ansible.cfg</div>
          <div className="ml-4">📁 roles/</div>
          {selectedRoles.map(role => (
            <div key={role}>
              <div className="ml-8">📁 {role}/</div>
              <div className="ml-12">📁 tasks/</div>
              <div className="ml-16">📄 main.yml</div>
              <div className="ml-12">📁 handlers/</div>
              <div className="ml-16">📄 main.yml</div>
              <div className="ml-12">📁 defaults/</div>
              <div className="ml-16">📄 main.yml</div>
              <div className="ml-12">📁 templates/</div>
            </div>
          ))}
          <div className="ml-4">📁 inventories/</div>
          <div className="ml-8">📁 {environment}/</div>
          <div className="ml-12">📄 hosts.yml</div>
          <div className="ml-12">📁 group_vars/</div>
          <div className="ml-16">📄 all.yml</div>
          <div className="ml-16">📄 webservers.yml</div>
          <div className="ml-16">📄 databases.yml</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <FolderTree className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Générateur de Structure en Rôles</h2>
            <p className="text-blue-100 text-sm">Infrastructure cloud hybride prête pour la production</p>
          </div>
        </div>
      </div>

      {/* Usage Counter - Plan Gratuit */}
      {profile && profile.subscription_plan === 'free' && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-200">
                Plan Gratuit
              </span>
            </div>
            <span className="text-xs text-amber-300">
              {3 - profile.playbooks_generated_this_month}/3 restants ce mois
            </span>
          </div>
          <div className="w-full bg-slate-900/50 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all"
              style={{
                width: `${((3 - profile.playbooks_generated_this_month) / 3) * 100}%`,
              }}
            />
          </div>
          {profile.playbooks_generated_this_month >= 3 && (
            <p className="text-xs text-amber-300 mt-2">
              Limite atteinte ! <button onClick={() => setActiveTab?.('dashboard')} className="underline hover:text-amber-200">Passez à Pro</button> pour un accès illimité
            </p>
          )}
        </div>
      )}

      {/* Pro Badge */}
      {profile && profile.subscription_plan !== 'free' && (
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-2">
          <Crown className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-blue-200">
            {profile.subscription_plan === 'pro' ? 'Plan Pro' : 'Plan Entreprise'} - Accès Illimité
          </span>
        </div>
      )}

      {/* Generation Error */}
      {generationError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-200 text-sm mb-2">{generationError}</p>
              {profile && profile.subscription_plan === 'free' && (
                <button
                  onClick={() => setActiveTab?.('dashboard')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                >
                  <Crown className="w-4 h-4 inline mr-1" />
                  Passer à Pro (9,90€/mois)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Environnement</h3>
        <div className="flex gap-4">
          <button
            onClick={() => setEnvironment('staging')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              environment === 'staging'
                ? 'bg-yellow-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Staging
          </button>
          <button
            onClick={() => setEnvironment('production')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              environment === 'production'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Production
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Sélectionnez les rôles</h3>

        {['Infrastructure', 'Cloud', 'Kubernetes', 'DevOps'].map(category => {
          const categoryRoles = availableRoles.filter(r => r.category === category);
          if (categoryRoles.length === 0) return null;

          return (
            <div key={category} className="mb-6">
              <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-cyan-400 rounded"></div>
                {category}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryRoles.map(role => {
                  const Icon = role.icon;
                  const isSelected = selectedRoles.includes(role.id);

                  return (
                    <button
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-6 h-6 mt-0.5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                        <div className="flex-1">
                          <h5 className={`font-semibold ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                            {role.name}
                          </h5>
                          <p className="text-xs text-slate-400 mt-1">{role.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 hidden">
          {availableRoles.map(role => {
            const Icon = role.icon;
            const isSelected = selectedRoles.includes(role.id);

            return (
              <button
                key={role.id}
                onClick={() => toggleRole(role.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-6 h-6 mt-0.5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                  <div className="flex-1">
                    <h4 className={`font-semibold ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                      {role.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">{role.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedRoles.length > 0 && (
        <>
          {previewStructure()}

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Fonctionnalités incluses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Structure en rôles modulaires</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Gestion multi-environnements</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Intégration HashiCorp Vault</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Pre_tasks et Post_tasks</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Handlers automatiques</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Templates Jinja2</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Kubernetes native (k8s module)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Helm charts integration</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>AWS EKS provisioning</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Prometheus stack (kube-prometheus)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>GitLab CI/CD pipelines</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Rollback automatisé</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Secrets dynamiques depuis Vault</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Rapports de déploiement</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Inventaires dynamiques</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={generateStructure}
              disabled={isGenerating || selectedRoles.length === 0}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Download className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Génération...' : 'Télécharger la structure complète'}
            </button>
          </div>
        </>
      )}

      {selectedRoles.length === 0 && (
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
          <FolderTree className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Sélectionnez des rôles pour voir la structure générée</p>
        </div>
      )}
    </div>
  );
}
