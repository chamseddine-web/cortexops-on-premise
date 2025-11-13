import { useState, useEffect, useRef } from 'react';
import { Wand2, Copy, Check, Download, Lightbulb, Trash2, CreditCard as Edit3, History, AlertCircle, ChevronDown, FileText, Wand, Sparkles, Code, Wrench, Cpu, GitBranch, ShieldCheck, Cloud, TrendingUp, Lock, Server } from 'lucide-react';
import { generatePlaybook, validateYAML, type GeneratedPlaybook } from '../lib/playbookGenerator';
import { generateIntelligentPlaybook } from '../lib/intelligentGenerator';
import { savePlaybookToHistory, getPlaybookHistory, deletePlaybookFromHistory, exportHistory } from '../lib/storage';
import { insertSnippet } from '../lib/yamlHelper';
import { getSmartFixes, smartAutoFix, type SmartFix } from '../lib/yamlFixer';
import { validateIntent, type ValidationResult } from '../lib/intentValidator';
import { PrivacyBanner } from './PrivacyBanner';
import { GitExportModal } from './GitExportModal';

export function GeneratorSection() {
  const [input, setInput] = useState('');
  const [generatedPlaybook, setGeneratedPlaybook] = useState('');
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<GeneratedPlaybook[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [smartFixes, setSmartFixes] = useState<SmartFix[]>([]);
  const [showFixMenu, setShowFixMenu] = useState(false);
  const [snippetInserted, setSnippetInserted] = useState(false);
  const [useIntelligentMode, setUseIntelligentMode] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [showGitExport, setShowGitExport] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState({
    become: true,
    gatherFacts: true,
    checkMode: false,
    environment: 'production' as 'staging' | 'production',
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number | null>(null);
  const snippetsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(getPlaybookHistory());
  }, []);

  useEffect(() => {
    if (cursorPositionRef.current !== null && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(cursorPositionRef.current, cursorPositionRef.current);
      cursorPositionRef.current = null;
    }
  }, [generatedPlaybook]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSnippets && snippetsRef.current && !snippetsRef.current.contains(event.target as Node)) {
        const snippetsButton = document.querySelector('[title="Insérer un snippet"]');
        if (snippetsButton && !snippetsButton.contains(event.target as Node)) {
          setShowSnippets(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSnippets]);

  const examplePrompts = [
    { text: 'Pipeline DevSecOps complet avec Trivy, kube-bench, Kyverno, OPA, SOPS, Cosign, Falco et rapport HTML', tag: 'Pipeline DevSecOps', icon: ShieldCheck },
    { text: 'Créer cluster Kubernetes sur AWS EKS avec autoscaling et monitoring', tag: 'Infrastructure as Code', icon: Cloud },
    { text: 'Pipeline CI/CD Jenkins avec tests, build Docker et déploiement K8s', tag: 'CI/CD Automation', icon: GitBranch },
    { text: 'Déployer application Node.js avec Nginx reverse proxy et SSL Let\'s Encrypt', tag: 'Déploiement App', icon: Code },
    { text: 'Audit de sécurité cloud-native avec CIS benchmarks et rapport HTML', tag: 'Sécurité', icon: ShieldCheck },
    { text: 'Configuration multi-cloud AWS + Azure avec Terraform et Ansible', tag: 'Multi-Cloud', icon: Cloud },
    { text: 'Déployer stack monitoring Prometheus, Grafana, Loki sur Kubernetes', tag: 'Monitoring', icon: TrendingUp },
    { text: 'Hardening serveurs Linux selon standards CIS avec firewall UFW', tag: 'Hardening', icon: Lock },
    { text: 'Pipeline GitOps avec ArgoCD et synchronisation Git automatique', tag: 'GitOps', icon: GitBranch },
    { text: 'Déployer PostgreSQL cluster haute-disponibilité avec replication', tag: 'Base de données', icon: Server },
  ];

  const handleInputChange = (value: string) => {
    setInput(value);
    setShowValidationWarning(false);

    if (value.trim().length > 3) {
      const result = validateIntent(value);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  };

  const handleGenerate = () => {
    if (!input.trim()) return;

    const validation = validateIntent(input);
    setValidationResult(validation);

    if (!validation.isValid) {
      setShowValidationWarning(true);
      return;
    }

    if (validation.category === 'ambiguous' && validation.confidence < 80) {
      setShowValidationWarning(true);
      return;
    }

    setShowValidationWarning(false);

    let playbook: string;

    if (useIntelligentMode) {
      playbook = generateIntelligentPlaybook(input, advancedOptions.environment);
    } else {
      playbook = generatePlaybook(input);
    }

    if (advancedOptions.gatherFacts === false || advancedOptions.checkMode) {
      // Ajouter gather_facts et check_mode après become: dans chaque play
      playbook = playbook.replace(
        /^(\s*become:\s+(?:yes|no|true|false))$/gm,
        (_match, becomeStatement) => {
          let additions = becomeStatement;
          if (advancedOptions.gatherFacts === false) {
            additions += '\n  gather_facts: no';
          }
          if (advancedOptions.checkMode) {
            additions += '\n  check_mode: yes';
          }
          return additions;
        }
      );
    }

    setGeneratedPlaybook(playbook);

    // Valider automatiquement
    const yamlValidation = validateYAML(playbook);
    setValidationErrors(yamlValidation.errors);

    const newEntry: GeneratedPlaybook = {
      id: Date.now().toString(),
      prompt: input,
      playbook,
      timestamp: new Date(),
      category: 'custom'
    };

    savePlaybookToHistory(newEntry);
    setHistory(getPlaybookHistory());
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPlaybook);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedPlaybook], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'playbook.yml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    setShowValidationWarning(false);
  };

  const handleClear = () => {
    setGeneratedPlaybook('');
    setCopied(false);
    setValidationErrors([]);
  };

  const handleValidate = () => {
    if (!generatedPlaybook.trim()) return;
    const result = validateYAML(generatedPlaybook);
    setValidationErrors(result.errors);
  };

  const handlePlaybookChange = (value: string) => {
    setGeneratedPlaybook(value);
    // Valider en temps réel
    if (value.trim()) {
      const result = validateYAML(value);
      setValidationErrors(result.errors);

      // Générer les corrections intelligentes
      if (result.errors.length > 0) {
        const fixes = getSmartFixes(value, result.errors);
        setSmartFixes(fixes);
      } else {
        setSmartFixes([]);
      }
    } else {
      setValidationErrors([]);
      setSmartFixes([]);
    }
  };

  const handleAutoFix = () => {
    if (!generatedPlaybook.trim()) return;

    const fixed = smartAutoFix(generatedPlaybook, validationErrors);

    setGeneratedPlaybook(fixed);

    const result = validateYAML(fixed);
    setValidationErrors(result.errors);

    if (result.errors.length > 0) {
      const fixes = getSmartFixes(fixed, result.errors);
      setSmartFixes(fixes);
    } else {
      setSmartFixes([]);
    }
  };

  const handleApplyFix = (fix: SmartFix) => {
    try {
      const fixed = fix.apply(generatedPlaybook);

      if (!fixed || fixed === generatedPlaybook) {
        console.warn('La correction n\'a produit aucun changement');
        return;
      }

      setGeneratedPlaybook(fixed);

      setTimeout(() => {
        const result = validateYAML(fixed);
        setValidationErrors(result.errors);

        if (result.errors.length > 0) {
          const newFixes = getSmartFixes(fixed, result.errors);
          setSmartFixes(newFixes);
        } else {
          setSmartFixes([]);
          setShowFixMenu(false);
        }
      }, 0);
    } catch (error) {
      console.error('Erreur lors de l\'application de la correction:', error);
      alert(`Erreur lors de la correction: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const handleInsertSnippet = (snippetType: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const { newContent, newCursorPosition } = insertSnippet(generatedPlaybook, cursorPosition, snippetType);

    cursorPositionRef.current = newCursorPosition;
    setGeneratedPlaybook(newContent);

    // Afficher la confirmation d'insertion
    setSnippetInserted(true);
    setTimeout(() => setSnippetInserted(false), 1500);

    // Valider après insertion
    if (newContent.trim()) {
      const result = validateYAML(newContent);
      setValidationErrors(result.errors);

      if (result.errors.length > 0) {
        const fixes = getSmartFixes(newContent, result.errors);
        setSmartFixes(fixes);
      } else {
        setSmartFixes([]);
      }
    }
  };

  const handleHistorySelect = (item: GeneratedPlaybook) => {
    setInput(item.prompt);
    setGeneratedPlaybook(item.playbook);
    setShowHistory(false);
  };

  const handleDeleteHistory = (id: string) => {
    deletePlaybookFromHistory(id);
    setHistory(getPlaybookHistory());
  };

  const handleExportHistory = () => {
    exportHistory();
  };

  const handleManualCreate = () => {
    const template = `---
- name: Mon playbook personnalisé
  hosts: all
  become: yes
  tasks:
    - name: Ma première tâche
      debug:
        msg: "Remplacez cette tâche par votre propre code"`;
    setGeneratedPlaybook(template);
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-[calc(100vh-120px)] relative">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg">
              <Wand2 className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Générateur de Playbooks Ansible avec IA
              </h2>
              <p className="text-xs text-cyan-400 font-medium">Automatisation DevOps & Infrastructure as Code</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Transformez votre langage naturel en playbooks Ansible production-ready. Génération YAML automatique, pipeline DevSecOps et export Git intégré.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 rounded-lg border border-slate-700/50">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-300">IA avancée</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 rounded-lg border border-slate-700/50">
              <GitBranch className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-300">Export Git auto</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 rounded-lg border border-slate-700/50">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-300">DevSecOps</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 rounded-lg border border-slate-700/50">
              <Code className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-300">YAML fiable</span>
            </div>
          </div>
        </div>

        <PrivacyBanner />

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-300">
              Que voulez-vous automatiser ?
            </label>
            <button
              onClick={() => setUseIntelligentMode(!useIntelligentMode)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                useIntelligentMode
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Cpu className="w-3 h-3" />
              {useIntelligentMode ? 'Mode IA Avancé' : 'Mode Standard'}
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => {
              handleInputChange(e.target.value);
              // Effacer la sortie YAML quand le prompt est effacé
              if (e.target.value.trim() === '') {
                setGeneratedPlaybook('');
                setValidationErrors([]);
                setSmartFixes([]);
              }
            }}
            placeholder={useIntelligentMode
              ? "Ex: Déployer application myapp sur Kubernetes avec secrets Vault"
              : "Ex: Installer nginx sur mes serveurs web"
            }
            className={`w-full h-32 px-4 py-3 bg-slate-900 border rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-all ${
              validationResult && !validationResult.isValid
                ? 'border-red-500 focus:ring-red-500'
                : validationResult?.category === 'ambiguous'
                ? 'border-yellow-500 focus:ring-yellow-500'
                : 'border-slate-700 focus:ring-red-500'
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleGenerate();
              }
            }}
          />

          {validationResult && input.trim().length > 3 && (
            <div className={`mt-2 p-3 rounded-lg border transition-all ${
              validationResult.isValid && validationResult.category === 'technical'
                ? 'bg-green-900/10 border-green-500/40 shadow-sm shadow-green-500/10'
                : validationResult.category === 'ambiguous'
                ? 'bg-yellow-900/10 border-yellow-500/40 shadow-sm shadow-yellow-500/10'
                : 'bg-red-900/10 border-red-500/40 shadow-sm shadow-red-500/10'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-lg ${
                  validationResult.isValid && validationResult.category === 'technical'
                    ? 'bg-green-500/20'
                    : validationResult.category === 'ambiguous'
                    ? 'bg-yellow-500/20'
                    : 'bg-red-500/20'
                }`}>
                  <AlertCircle className={`w-4 h-4 ${
                    validationResult.isValid && validationResult.category === 'technical'
                      ? 'text-green-400'
                      : validationResult.category === 'ambiguous'
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`} />
                </div>
                <div className="flex-1 text-sm">
                  {validationResult.isValid && validationResult.category === 'technical' ? (
                    <>
                      <p className="text-green-400 font-semibold mb-1.5">✓ Demande technique valide</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {validationResult.detectedTerms.slice(0, 6).map((term, i) => (
                          <span key={i} className="px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-green-300 text-xs font-medium">
                            {term}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-green-500 h-full transition-all duration-500"
                            style={{ width: `${Math.min(validationResult.confidence, 100)}%` }}
                          />
                        </div>
                        <span className="text-green-400 text-xs font-medium">{Math.min(validationResult.confidence, 100)}%</span>
                      </div>
                    </>
                  ) : validationResult.category === 'ambiguous' ? (
                    <>
                      <p className="text-yellow-400 font-semibold mb-1.5">⚠ Précisions nécessaires</p>
                      <p className="text-slate-300 text-xs mb-2 leading-relaxed">{validationResult.errorMessage || 'Ajoutez des détails techniques pour améliorer la génération'}</p>
                      {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                        <div className="bg-slate-800/50 border border-yellow-500/20 rounded-lg p-2 mt-2">
                          <p className="text-yellow-300 text-xs font-medium mb-1.5">💡 Suggestions :</p>
                          <ul className="text-slate-300 text-xs space-y-1">
                            {validationResult.suggestions.map((suggestion, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-yellow-400 mt-0.5">→</span>
                                <span className="flex-1">{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-red-400 font-semibold mb-1.5">✗ {validationResult.errorMessage}</p>
                      {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                        <div className="bg-slate-800/50 border border-red-500/20 rounded-lg p-2.5 mt-2">
                          <p className="text-red-300 text-xs font-medium mb-2">Exemples de demandes valides :</p>
                          <ul className="text-slate-300 text-xs space-y-1.5">
                            {validationResult.suggestions.map((suggestion, i) => (
                              <li key={i} className="flex items-start gap-2 p-1.5 bg-slate-700/50 rounded">
                                <span className="text-red-400 font-bold">•</span>
                                <span className="flex-1">{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-slate-500">Appuyez sur Ctrl + Entrée pour générer</p>
            {useIntelligentMode && (
              <span className="text-xs text-cyan-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Détection K8s, Cloud, Vault automatique
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={!input.trim()}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-red-600/25 hover:shadow-red-600/50 hover:scale-[1.02] disabled:shadow-none disabled:scale-100 flex items-center justify-center gap-2 group"
            >
              <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>Générer Playbook</span>
            </button>
            <button
              onClick={handleManualCreate}
              className="px-4 bg-slate-700/80 hover:bg-slate-600 border border-slate-600/50 hover:border-slate-500 text-slate-200 font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 hover:shadow-lg"
              title="Créer un playbook manuellement"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 bg-slate-700/80 hover:bg-slate-600 border border-slate-600/50 hover:border-slate-500 text-slate-200 font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 hover:shadow-lg relative"
              title="Historique"
            >
              <History className="w-4 h-4" />
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-600 rounded-lg text-sm text-slate-300 hover:text-slate-200 transition-all group"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 group-hover:text-red-400 transition-colors" />
              <span className="font-medium">Options avancées</span>
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAdvanced ? 'rotate-180 text-red-400' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg space-y-3">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedOptions.become}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, become: e.target.checked})}
                    className="rounded bg-slate-700 border-slate-600 text-red-600 focus:ring-red-500"
                  />
                  <span>become: yes (privilèges sudo)</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedOptions.gatherFacts}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, gatherFacts: e.target.checked})}
                    className="rounded bg-slate-700 border-slate-600 text-red-600 focus:ring-red-500"
                  />
                  <span>Collecter les facts</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedOptions.checkMode}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, checkMode: e.target.checked})}
                    className="rounded bg-slate-700 border-slate-600 text-red-600 focus:ring-red-500"
                  />
                  <span>Mode vérification (dry-run)</span>
                </label>
              </div>

              {useIntelligentMode && (
                <div className="pt-3 border-t border-slate-700">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Environnement cible
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAdvancedOptions({...advancedOptions, environment: 'staging'})}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                        advancedOptions.environment === 'staging'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      Staging
                    </button>
                    <button
                      onClick={() => setAdvancedOptions({...advancedOptions, environment: 'production'})}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                        advancedOptions.environment === 'production'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      Production
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/50">
            <div className="p-1.5 bg-amber-500/20 rounded-lg">
              <Lightbulb className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Exemples d'instructions</h3>
            <span className="ml-auto text-xs text-slate-500">{examplePrompts.length} exemples</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {examplePrompts.map((example, index) => {
              const IconComponent = example.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example.text)}
                  className="w-full text-left p-3 bg-slate-900/60 hover:bg-slate-700 border border-slate-700/50 hover:border-cyan-500/50 rounded-lg text-sm text-slate-300 hover:text-white transition-all group hover:shadow-lg hover:shadow-cyan-500/10"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-cyan-500/10 rounded group-hover:bg-cyan-500/20 transition-colors">
                      <IconComponent className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-300 font-medium">
                          {example.tag}
                        </span>
                      </div>
                      <span className="text-sm">{example.text}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-white">Playbook généré</span>
            {generatedPlaybook && (
              <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-xs font-medium">
                Prêt
              </span>
            )}
          </div>
          {generatedPlaybook && (
            <div className="flex gap-1.5">
              <button
                onClick={handleValidate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg transition-all text-xs font-medium shadow-sm hover:shadow-md"
                title="Valider la syntaxe YAML"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Valider</span>
              </button>
              <button
                onClick={handleAutoFix}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/90 hover:bg-purple-600 text-white rounded-lg transition-all text-xs font-medium shadow-sm hover:shadow-md"
                title="Corriger automatiquement"
              >
                <Wand className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Auto-fix</span>
              </button>
              <button
                onClick={() => setShowSnippets(!showSnippets)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600/90 hover:bg-teal-600 text-white rounded-lg transition-all text-xs font-medium shadow-sm hover:shadow-md"
                title="Insérer un snippet"
              >
                <Code className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Snippets</span>
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/90 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-all text-xs font-medium shadow-sm hover:shadow-md"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copier
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-all text-xs"
              >
                <Download className="w-3 h-3" />
                Télécharger
              </button>
              <button
                onClick={() => setShowGitExport(true)}
                disabled={!generatedPlaybook.trim()}
                className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GitBranch className="w-3 h-3" />
                Exporter vers Git
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-all text-xs"
              >
                <Trash2 className="w-3 h-3" />
                Effacer
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {generatedPlaybook ? (
            <div className="h-full flex flex-col">
              {validationErrors.length > 0 && (
                <div className="mb-3 p-3 bg-red-900/20 border border-red-600 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-red-400">
                        <p className="font-semibold mb-1">
                          {validationErrors.length} erreur{validationErrors.length > 1 ? 's' : ''} détectée{validationErrors.length > 1 ? 's' : ''}
                        </p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {validationErrors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                      {smartFixes.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-red-700">
                          <button
                            onClick={() => setShowFixMenu(!showFixMenu)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-medium transition-all w-full justify-center"
                          >
                            <Wrench className="w-3 h-3" />
                            {smartFixes.length} correction{smartFixes.length > 1 ? 's' : ''} disponible{smartFixes.length > 1 ? 's' : ''}
                            <ChevronDown className={`w-3 h-3 transition-transform ${showFixMenu ? 'rotate-180' : ''}`} />
                          </button>
                          {showFixMenu && (
                            <div className="mt-2 space-y-2">
                              {smartFixes.map((fix, index) => (
                                <div key={index} className="bg-slate-800/50 rounded p-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="text-xs font-semibold text-orange-300">{fix.title}</div>
                                      <div className="text-xs text-slate-400 mt-0.5">{fix.description}</div>
                                    </div>
                                    <button
                                      onClick={() => handleApplyFix(fix)}
                                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-all flex-shrink-0"
                                    >
                                      Appliquer
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {validationErrors.length === 0 && generatedPlaybook.trim() && (
                <div className="mb-3 p-2 bg-green-900/20 border border-green-600 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <Check className="w-3 h-3" />
                    <span>Syntaxe YAML valide ✓</span>
                  </div>
                </div>
              )}
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  value={generatedPlaybook}
                  onChange={(e) => handlePlaybookChange(e.target.value)}
                  className="w-full h-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  spellCheck={false}
                  placeholder="Votre playbook apparaîtra ici..."
                />
                {showSnippets && (
                  <div ref={snippetsRef} className="absolute top-0 right-0 mt-2 mr-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 max-h-[32rem] overflow-y-auto z-20 w-80">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-white">Insérer un snippet</div>
                      <button
                        onClick={() => setShowSnippets(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Fermer"
                      >
                        <span className="text-lg leading-none">&times;</span>
                      </button>
                    </div>
                    {snippetInserted && (
                      <div className="mb-2 px-3 py-2 bg-green-500/20 border border-green-500/40 rounded text-xs text-green-400 flex items-center gap-2">
                        <Check className="w-3 h-3" />
                        <span>Snippet inséré ! Vous pouvez en ajouter d'autres.</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mb-3 px-1">
                      Cliquez pour insérer à la position du curseur. Vous pouvez insérer plusieurs snippets successifs.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-1 px-1">Base</div>
                        <div className="space-y-1">
                          {[
                            { type: 'play', label: 'Nouveau Play', icon: '🎭' },
                            { type: 'task', label: 'Tâche debug', icon: '✅' },
                          ].map((snippet) => (
                            <button
                              key={snippet.type}
                              onClick={() => handleInsertSnippet(snippet.type)}
                              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-all flex items-center gap-2"
                            >
                              <span>{snippet.icon}</span>
                              <span>{snippet.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-1 px-1">Système</div>
                        <div className="space-y-1">
                          {[
                            { type: 'apt', label: 'Installer package (apt)', icon: '📦' },
                            { type: 'yum', label: 'Installer package (yum)', icon: '📦' },
                            { type: 'service', label: 'Gérer service', icon: '⚙️' },
                            { type: 'user', label: 'Créer utilisateur', icon: '👤' },
                            { type: 'cron-job', label: 'Tâche cron', icon: '⏰' },
                          ].map((snippet) => (
                            <button
                              key={snippet.type}
                              onClick={() => handleInsertSnippet(snippet.type)}
                              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-all flex items-center gap-2"
                            >
                              <span>{snippet.icon}</span>
                              <span>{snippet.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-1 px-1">Fichiers</div>
                        <div className="space-y-1">
                          {[
                            { type: 'copy', label: 'Copier fichier', icon: '📄' },
                            { type: 'template', label: 'Déployer template', icon: '📋' },
                            { type: 'file', label: 'Gérer fichier/dossier', icon: '📁' },
                            { type: 'lineinfile', label: 'Modifier ligne config', icon: '✏️' },
                            { type: 'git-clone', label: 'Clone Git', icon: '📥' },
                          ].map((snippet) => (
                            <button
                              key={snippet.type}
                              onClick={() => handleInsertSnippet(snippet.type)}
                              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-all flex items-center gap-2"
                            >
                              <span>{snippet.icon}</span>
                              <span>{snippet.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-1 px-1">Web Services</div>
                        <div className="space-y-1">
                          {[
                            { type: 'nginx-install', label: 'Installer Nginx', icon: '🌐' },
                            { type: 'nginx-vhost', label: 'Vhost Nginx', icon: '🔧' },
                            { type: 'ssl-cert', label: 'Certificat SSL', icon: '🔒' },
                          ].map((snippet) => (
                            <button
                              key={snippet.type}
                              onClick={() => handleInsertSnippet(snippet.type)}
                              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-all flex items-center gap-2"
                            >
                              <span>{snippet.icon}</span>
                              <span>{snippet.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-1 px-1">Bases de données</div>
                        <div className="space-y-1">
                          {[
                            { type: 'postgresql-install', label: 'Installer PostgreSQL', icon: '🐘' },
                            { type: 'postgresql-db', label: 'DB PostgreSQL', icon: '💾' },
                            { type: 'mysql-install', label: 'Installer MySQL', icon: '🐬' },
                          ].map((snippet) => (
                            <button
                              key={snippet.type}
                              onClick={() => handleInsertSnippet(snippet.type)}
                              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-all flex items-center gap-2"
                            >
                              <span>{snippet.icon}</span>
                              <span>{snippet.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-1 px-1">Conteneurs & Runtime</div>
                        <div className="space-y-1">
                          {[
                            { type: 'docker-install', label: 'Installer Docker', icon: '🐳' },
                            { type: 'docker-container', label: 'Container Docker', icon: '📦' },
                            { type: 'nodejs-install', label: 'Installer Node.js', icon: '🟢' },
                          ].map((snippet) => (
                            <button
                              key={snippet.type}
                              onClick={() => handleInsertSnippet(snippet.type)}
                              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-all flex items-center gap-2"
                            >
                              <span>{snippet.icon}</span>
                              <span>{snippet.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-1 px-1">Sécurité</div>
                        <div className="space-y-1">
                          {[
                            { type: 'firewall-ufw', label: 'Configurer UFW', icon: '🛡️' },
                            { type: 'ssh-hardening', label: 'Sécuriser SSH', icon: '🔐' },
                          ].map((snippet) => (
                            <button
                              key={snippet.type}
                              onClick={() => handleInsertSnippet(snippet.type)}
                              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-all flex items-center gap-2"
                            >
                              <span>{snippet.icon}</span>
                              <span>{snippet.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-1 px-1">Avancé</div>
                        <div className="space-y-1">
                          {[
                            { type: 'systemd-service', label: 'Service systemd', icon: '🔧' },
                            { type: 'backup-script', label: 'Script backup', icon: '💾' },
                            { type: 'when-condition', label: 'Condition (when)', icon: '❓' },
                            { type: 'loop-items', label: 'Boucle (loop)', icon: '🔁' },
                            { type: 'block-rescue', label: 'Block/Rescue', icon: '🚨' },
                            { type: 'handler', label: 'Handler', icon: '🔔' },
                            { type: 'command', label: 'Commande shell', icon: '💻' },
                          ].map((snippet) => (
                            <button
                              key={snippet.type}
                              onClick={() => handleInsertSnippet(snippet.type)}
                              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-all flex items-center gap-2"
                            >
                              <span>{snippet.icon}</span>
                              <span>{snippet.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">Astuces pour éditer manuellement :</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                      <li>Respectez l'indentation YAML (2 espaces par niveau)</li>
                      <li>Utilisez <code className="text-red-400">become: yes</code> pour les privilèges sudo</li>
                      <li>Ajoutez <code className="text-red-400">when:</code> pour des conditions</li>
                      <li>Variables : <code className="text-red-400">{'{{ ma_variable }}'}</code></li>
                      <li>Boucles : <code className="text-red-400">loop:</code> ou <code className="text-red-400">with_items:</code></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500">
                <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Votre playbook apparaîtra ici</p>
                <p className="text-xs mt-1">Générez automatiquement ou créez manuellement</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="absolute top-0 right-0 w-96 h-full bg-slate-800 border-l border-slate-700 shadow-2xl z-10 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4" />
              Historique ({history.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleExportHistory}
                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-all"
                title="Exporter l'historique"
              >
                <Download className="w-3 h-3" />
              </button>
              <button
                onClick={() => setShowHistory(false)}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {history.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucun historique</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-600 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs text-slate-400 flex-1 line-clamp-2">{item.prompt}</p>
                    <button
                      onClick={() => handleDeleteHistory(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    {new Date(item.timestamp).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <button
                    onClick={() => handleHistorySelect(item)}
                    className="w-full text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-all"
                  >
                    Charger ce playbook
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <GitExportModal
        isOpen={showGitExport}
        onClose={() => setShowGitExport(false)}
        playbookContent={generatedPlaybook}
        playbookName={input.slice(0, 50).replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'playbook'}
      />
    </div>
  );
}
