import { useState } from 'react';
import { Shield, Play, Download, CheckCircle, AlertCircle, Brain, Activity, Zap, TrendingUp, Crown } from 'lucide-react';
import { generateSecurityCompliancePlaybook } from '../lib/securityPipelineGenerator';
import { validateYAML } from '../lib/playbookGenerator';
import { useAuth } from '../contexts/AuthContext';
import { savePlaybookGeneration } from '../lib/playbookService';

interface SecurityPipelineProps {
  setActiveTab?: (tab: 'learn' | 'generate' | 'roles' | 'security' | 'api') => void;
}

export default function SecurityPipeline({ setActiveTab }: SecurityPipelineProps) {
  const { user, profile, canGeneratePlaybook, refreshProfile } = useAuth();
  const [appName, setAppName] = useState('webapp');
  const [environment, setEnvironment] = useState<'staging' | 'production'>('production');
  const [generatedPlaybook, setGeneratedPlaybook] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleGenerate = async () => {
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
      const playbook = generateSecurityCompliancePlaybook(appName, environment);

      const result = await savePlaybookGeneration(
        user.id,
        `Pipeline DevSecOps pour ${appName} (${environment})`,
        playbook,
        'security'
      );

      if (!result.success) {
        setGenerationError(result.error || 'Erreur lors de la génération');
        setIsGenerating(false);
        return;
      }

      setGeneratedPlaybook(playbook);

      const validation = validateYAML(playbook);
      setValidationErrors(validation.errors);

      await refreshProfile();
    } catch (error) {
      console.error('Error generating security pipeline:', error);
      setGenerationError('Une erreur est survenue lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedPlaybook], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-pipeline-${appName}-${environment}.yml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-emerald-400" />
            <div>
              <h1 className="text-4xl font-bold text-white">Pipeline DevSecOps v2.0</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-semibold">
                  Intelligence Artificielle
                </span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold">
                  Auto-Healing
                </span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-semibold">
                  Production-Ready
                </span>
              </div>
            </div>
          </div>
          <p className="text-slate-300 text-lg">
            Pipeline intelligent avec Cortex IA, Auto-Healing, Prédiction 72h, et Monitoring Prometheus
          </p>
        </div>

        {/* Usage Counter - Plan Gratuit */}
        {profile && profile.subscription_plan === 'free' && (
          <div className="mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-4">
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
          <div className="mb-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-blue-200">
              {profile.subscription_plan === 'pro' ? 'Plan Pro' : 'Plan Entreprise'} - Accès Illimité
            </span>
          </div>
        )}

        {/* Generation Error */}
        {generationError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
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

        {/* Nouvelles métriques des fonctionnalités avancées */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Brain className="w-8 h-8 text-emerald-400" />
              <div>
                <div className="text-2xl font-bold text-white">35</div>
                <div className="text-sm text-slate-400">Tâches Avancées</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">+84% vs version standard</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-white">10</div>
                <div className="text-sm text-slate-400">Fonctionnalités IA</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Cortex + Auto-Healing + Adaptatif</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-2xl font-bold text-white">72h</div>
                <div className="text-sm text-slate-400">Prédiction</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Analyse prédictive incidents</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-orange-400" />
              <div>
                <div className="text-2xl font-bold text-white">100%</div>
                <div className="text-sm text-slate-400">Validé YAML</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Zéro erreur, prêt production</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Configuration
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nom de l'application
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="webapp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Environnement
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as 'staging' | 'production')}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-emerald-400 focus:outline-none"
                >
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !appName}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Générer le Pipeline
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-white font-semibold mb-4">Architecture du Pipeline Intelligent</h3>

            <div className="space-y-4">
              {/* Étapes de sécurité de base */}
              <div>
                <h4 className="text-emerald-400 text-sm font-semibold mb-3">🔒 Sécurité & Conformité (8 étapes)</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { num: 1, name: 'Trivy', desc: 'Scan vulnérabilités', parallel: true },
                    { num: 2, name: 'kube-bench', desc: 'Audit CIS', parallel: true },
                    { num: 3, name: 'Kyverno', desc: 'Politiques K8s', parallel: false },
                    { num: 4, name: 'Gatekeeper', desc: 'Contraintes OPA', parallel: false },
                    { num: 5, name: 'SOPS', desc: 'Chiffrement', parallel: false },
                    { num: 6, name: 'Cosign', desc: 'Signatures', parallel: false },
                    { num: 7, name: 'Falco', desc: 'Runtime', parallel: true },
                    { num: 8, name: 'Rapport', desc: 'HTML + SVG', parallel: false }
                  ].map((step) => (
                    <div
                      key={step.num}
                      className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 hover:border-emerald-400 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {step.num}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <h4 className="text-white font-semibold text-xs">{step.name}</h4>
                            {step.parallel && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">⚡</span>
                            )}
                          </div>
                          <p className="text-slate-400 text-[10px] mt-0.5">{step.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fonctionnalités IA */}
              <div>
                <h4 className="text-purple-400 text-sm font-semibold mb-3">🧠 Intelligence Artificielle</h4>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { icon: '🧠', name: 'Cortex Global', desc: 'Mémoire partagée JSON pour agents IA' },
                    { icon: '🤖', name: 'Auto-Healing', desc: 'Récupération autonome des pods en erreur' },
                    { icon: '🔄', name: 'IA Adaptative', desc: 'Ajustement dynamique des seuils Falco/Kyverno' },
                    { icon: '📊', name: 'Prédiction 72h', desc: 'Analyse probabilité incident + recommandations' }
                  ].map((feature, i) => (
                    <div
                      key={i}
                      className="bg-gradient-to-r from-purple-900/20 to-purple-800/20 rounded-lg p-3 border border-purple-500/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{feature.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-xs">{feature.name}</h4>
                          <p className="text-slate-400 text-[10px] mt-0.5">{feature.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visualisation & Monitoring */}
              <div>
                <h4 className="text-blue-400 text-sm font-semibold mb-3">📡 Monitoring & Visualisation</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: '📈', name: 'Prometheus', desc: '6 métriques exportées' },
                    { icon: '🗺️', name: 'Heatmap', desc: 'Carte chaleur outils' },
                    { icon: '⭕', name: 'SVG Progress', desc: 'Graphique circulaire' },
                    { icon: '🎯', name: 'Score Maturité', desc: 'Calcul /100 + alertes' }
                  ].map((feature, i) => (
                    <div
                      key={i}
                      className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 rounded-lg p-3 border border-blue-500/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{feature.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-xs">{feature.name}</h4>
                          <p className="text-slate-400 text-[10px] mt-0.5">{feature.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {generatedPlaybook && (
          <>
            {/* Section d'informations sur les fonctionnalités */}
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500/30 p-6 mb-6">
              <div className="flex items-start gap-4">
                <Brain className="w-12 h-12 text-purple-400 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-white font-bold text-xl mb-2">Pipeline v2.0 - Fonctionnalités Avancées</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span><strong>Health Check K8s</strong> - Validation cluster avant déploiement</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span><strong>Cosign Auto-Keygen</strong> - Génération automatique clés signature</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span><strong>Score Maturité</strong> - Calcul /100 avec alertes visuelles</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span><strong>Export Prometheus</strong> - 6 métriques vers Grafana</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span><strong>Cortex Global</strong> - Mémoire JSON partagée agents IA</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        <span><strong>Auto-Healing</strong> - Récupération autonome pods défaillants</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        <span><strong>IA Adaptative</strong> - Ajustement dynamique Falco/Kyverno</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        <span><strong>Prédiction 72h</strong> - Analyse probabilité incident</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        <span><strong>Visualisations SVG</strong> - Graphiques circulaires + Heatmap</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        <span><strong>Diagnostic Cortex</strong> - Recommandations intelligentes</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400">
                      <strong className="text-emerald-400">📊 Architecture:</strong> 35 tâches • 10 fonctionnalités IA •
                      3 exécutions parallèles • 7 blocs rescue • 100% validation YAML
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
              <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">Playbook Généré - DevSecOps v2.0</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {validationErrors.length === 0 ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Validation YAML réussie
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.length} erreur(s) détectée(s)
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </button>
              </div>

            <div className="p-6 max-h-[600px] overflow-y-auto">
              {validationErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-900/20 border border-red-600 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-red-400">
                        <p className="font-semibold mb-2">
                          {validationErrors.length} erreur{validationErrors.length > 1 ? 's' : ''} détectée{validationErrors.length > 1 ? 's' : ''}
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {validationErrors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-words">
                {generatedPlaybook}
              </pre>
            </div>
          </div>
          </>
        )}

        {!generatedPlaybook && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-12 text-center">
            <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">
              Configurez votre pipeline et cliquez sur "Générer le Pipeline"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
