import React, { useState } from 'react';
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Rocket,
  Target,
  Zap,
  Users,
  Settings,
  Play,
  X,
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    role: '',
    company_size: '',
    use_case: '',
    experience_level: '',
    goals: [] as string[],
  });

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Bienvenue sur CortexOps! 🎉',
      description: 'Configurons votre compte en quelques étapes simples',
      icon: <Rocket className="w-12 h-12 text-blue-500" />,
    },
    {
      id: 'role',
      title: 'Quel est votre rôle?',
      description: 'Aidez-nous à personnaliser votre expérience',
      icon: <Target className="w-12 h-12 text-green-500" />,
    },
    {
      id: 'goals',
      title: 'Quels sont vos objectifs?',
      description: 'Sélectionnez ce qui vous intéresse',
      icon: <Zap className="w-12 h-12 text-yellow-500" />,
    },
    {
      id: 'ready',
      title: 'Tout est prêt! 🚀',
      description: 'Commençons à créer des playbooks',
      icon: <Sparkles className="w-12 h-12 text-purple-500" />,
    },
  ];

  const roles = [
    { value: 'devops', label: 'DevOps Engineer', icon: '⚙️' },
    { value: 'sysadmin', label: 'System Administrator', icon: '🖥️' },
    { value: 'developer', label: 'Developer', icon: '💻' },
    { value: 'manager', label: 'Team Manager', icon: '👔' },
    { value: 'other', label: 'Autre', icon: '🎯' },
  ];

  const companySizes = [
    { value: 'solo', label: '1-10 employés', icon: '👤' },
    { value: 'small', label: '11-50 employés', icon: '👥' },
    { value: 'medium', label: '51-200 employés', icon: '🏢' },
    { value: 'large', label: '200+ employés', icon: '🏙️' },
  ];

  const goals = [
    { id: 'automation', label: 'Automatiser le déploiement', icon: '🤖' },
    { id: 'ci_cd', label: 'Intégration CI/CD', icon: '🔄' },
    { id: 'infrastructure', label: 'Gérer l\'infrastructure', icon: '🏗️' },
    { id: 'security', label: 'Améliorer la sécurité', icon: '🔒' },
    { id: 'monitoring', label: 'Monitoring & Alertes', icon: '📊' },
    { id: 'cloud', label: 'Migration cloud', icon: '☁️' },
  ];

  const experienceLevels = [
    { value: 'beginner', label: 'Débutant', description: 'Je découvre Ansible' },
    { value: 'intermediate', label: 'Intermédiaire', description: 'J\'ai quelques connaissances' },
    { value: 'advanced', label: 'Avancé', description: 'J\'utilise Ansible régulièrement' },
    { value: 'expert', label: 'Expert', description: 'Je maîtrise Ansible' },
  ];

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      await completeOnboarding();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleGoal = (goalId: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter((g) => g !== goalId)
        : [...prev.goals, goalId],
    }));
  };

  const completeOnboarding = async () => {
    try {
      // Sauvegarder les données d'onboarding
      await supabase.from('user_profiles').upsert({
        id: user?.id,
        job_title: formData.role,
        company_size: formData.company_size,
        onboarding_completed: true,
        onboarding_data: {
          use_case: formData.use_case,
          experience_level: formData.experience_level,
          goals: formData.goals,
          completed_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      onComplete(); // Continue même en cas d'erreur
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-6">
              {steps[currentStep].icon}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Bienvenue sur CortexOps!
              </h2>
              <p className="text-xl text-slate-300 mb-8">
                La plateforme intelligente pour générer vos playbooks Ansible
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                <div className="text-4xl mb-3">🤖</div>
                <h3 className="font-semibold text-white mb-2">IA Avancée</h3>
                <p className="text-sm text-slate-400">
                  Génération intelligente de playbooks adaptés à vos besoins
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="font-semibold text-white mb-2">Rapide</h3>
                <p className="text-sm text-slate-400">
                  Créez des playbooks professionnels en quelques secondes
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="font-semibold text-white mb-2">Sécurisé</h3>
                <p className="text-sm text-slate-400">
                  Validation automatique et bonnes pratiques intégrées
                </p>
              </div>
            </div>
          </div>
        );

      case 'role':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                {steps[currentStep].icon}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{steps[currentStep].title}</h2>
              <p className="text-slate-400">{steps[currentStep].description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Votre rôle
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => setFormData({ ...formData, role: role.value })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      formData.role === role.value
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{role.icon}</span>
                      <span className="font-medium text-white">{role.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Taille de votre entreprise
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {companySizes.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setFormData({ ...formData, company_size: size.value })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.company_size === size.value
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">{size.icon}</div>
                    <div className="text-sm font-medium text-white">{size.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Votre niveau d'expérience avec Ansible
              </label>
              <div className="space-y-2">
                {experienceLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setFormData({ ...formData, experience_level: level.value })}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      formData.experience_level === level.value
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-medium text-white mb-1">{level.label}</div>
                    <div className="text-sm text-slate-400">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'goals':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                {steps[currentStep].icon}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{steps[currentStep].title}</h2>
              <p className="text-slate-400">{steps[currentStep].description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const isSelected = formData.goals.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={`p-6 rounded-lg border-2 transition-all text-left relative ${
                      isSelected
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-5 h-5 text-blue-400" />
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{goal.icon}</span>
                      <span className="font-medium text-white">{goal.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-300">
                <strong className="text-white">Astuce:</strong> Sélectionnez tous les objectifs qui vous intéressent.
                Nous personnaliserons votre expérience en conséquence.
              </div>
            </div>
          </div>
        );

      case 'ready':
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-6">
              {steps[currentStep].icon}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Vous êtes prêt! 🎉
              </h2>
              <p className="text-xl text-slate-300 mb-8">
                Votre compte est configuré. Commençons à créer des playbooks!
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 max-w-md mx-auto">
              <h3 className="font-semibold text-white mb-4">Votre configuration:</h3>
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Rôle:</span>
                  <span className="text-white font-medium capitalize">
                    {roles.find((r) => r.value === formData.role)?.label || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Entreprise:</span>
                  <span className="text-white font-medium">
                    {companySizes.find((s) => s.value === formData.company_size)?.label || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Niveau:</span>
                  <span className="text-white font-medium capitalize">
                    {experienceLevels.find((l) => l.value === formData.experience_level)?.label || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Objectifs:</span>
                  <span className="text-white font-medium">{formData.goals.length} sélectionné(s)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                <div className="text-2xl mb-2">📚</div>
                <div className="text-sm font-medium text-white mb-1">Documentation</div>
                <div className="text-xs text-slate-400">Consultez nos guides</div>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                <div className="text-2xl mb-2">🎓</div>
                <div className="text-sm font-medium text-white mb-1">Tutoriels</div>
                <div className="text-xs text-slate-400">Apprenez les bases</div>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                <div className="text-2xl mb-2">💬</div>
                <div className="text-sm font-medium text-white mb-1">Support</div>
                <div className="text-xs text-slate-400">Nous sommes là pour vous</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-800">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img
                src="/ChatGPT Image 12 nov. 2025, 16_18_10 copy copy.png"
                alt="CortexOps"
                className="w-8 h-8"
              />
              <span className="font-bold text-white text-xl">CortexOps</span>
            </div>
            <button
              onClick={onSkip}
              className="text-slate-400 hover:text-white transition-colors"
              title="Ignorer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 h-2 rounded-full transition-all ${
                  index <= currentStep ? 'bg-blue-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <div className="mt-2 text-sm text-slate-400">
            Étape {currentStep + 1} sur {steps.length}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">{renderStepContent()}</div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-6 flex items-center justify-between">
          <button
            onClick={currentStep === 0 ? onSkip : handleBack}
            className="px-6 py-2 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            {currentStep === 0 ? (
              'Ignorer'
            ) : (
              <>
                <ArrowLeft className="w-4 h-4" />
                Retour
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={
              (currentStep === 1 &&
                (!formData.role || !formData.company_size || !formData.experience_level)) ||
              (currentStep === 2 && formData.goals.length === 0)
            }
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            {currentStep === steps.length - 1 ? (
              <>
                <Play className="w-4 h-4" />
                Commencer
              </>
            ) : (
              <>
                Suivant
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
