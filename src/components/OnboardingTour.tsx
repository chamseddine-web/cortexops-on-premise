import { useState, useEffect } from 'react';
import {
  X, ChevronRight, ChevronLeft, Check,
  Sparkles, Zap, Target, Book, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
  action?: () => void;
}

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Bienvenue sur CortexOps ! 🎉',
      description: 'Vous êtes sur le point de découvrir comment générer des playbooks Ansible professionnels en quelques secondes avec l\'intelligence artificielle.',
      icon: <Sparkles className="w-8 h-8 text-blue-400" />
    },
    {
      id: 'generator',
      title: 'Générateur Intelligent',
      description: 'Décrivez simplement votre infrastructure en langage naturel. Notre IA comprend vos besoins et génère un playbook Ansible complet, prêt pour la production.',
      icon: <Zap className="w-8 h-8 text-purple-400" />,
      target: 'generator-section'
    },
    {
      id: 'templates',
      title: 'Bibliothèque de Templates',
      description: 'Accédez à des dizaines de templates prêts à l\'emploi : CI/CD, monitoring, sécurité, déploiement d\'applications et bien plus encore.',
      icon: <Book className="w-8 h-8 text-green-400" />,
      target: 'templates-section'
    },
    {
      id: 'learning',
      title: 'Centre d\'Apprentissage',
      description: 'Améliorez vos compétences Ansible avec nos tutoriels interactifs, guides et meilleures pratiques. De débutant à expert !',
      icon: <Target className="w-8 h-8 text-orange-400" />,
      target: 'learning-section'
    },
    {
      id: 'ready',
      title: 'Vous êtes prêt ! 🚀',
      description: 'Votre compte est configuré et vous disposez de 5 générations gratuites. Commencez dès maintenant à créer vos playbooks !',
      icon: <Check className="w-8 h-8 text-green-400" />
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    // Scroll to target element if specified
    if (currentStepData.target) {
      const element = document.getElementById(currentStepData.target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight effect
        element.classList.add('onboarding-highlight');
        return () => {
          element.classList.remove('onboarding-highlight');
        };
      }
    }
  }, [currentStep, currentStepData.target]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(() => {
      onSkip();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Background Animation */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Content */}
          <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  {currentStepData.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {currentStepData.title}
                  </h2>
                  <p className="text-sm text-gray-400">
                    Étape {currentStep + 1} sur {steps.length}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="px-6 pt-4">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Description */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-gray-300 text-lg leading-relaxed">
                    {currentStepData.description}
                  </p>

                  {/* Special content for specific steps */}
                  {currentStep === 0 && (
                    <div className="mt-6 grid grid-cols-3 gap-4">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-blue-400 mb-1">5</div>
                        <div className="text-sm text-gray-400">Playbooks gratuits</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-purple-400 mb-1">∞</div>
                        <div className="text-sm text-gray-400">Templates</div>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-green-400 mb-1">24/7</div>
                        <div className="text-sm text-gray-400">Support</div>
                      </div>
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-2">💡 Exemple de prompt :</p>
                      <p className="text-gray-200 italic">
                        "Configure un serveur web avec Nginx, SSL/TLS, et un firewall UFW pour mon application Node.js"
                      </p>
                    </div>
                  )}

                  {isLastStep && (
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">Compte configuré et prêt à l'emploi</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">Accès à tous les templates premium</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">5 générations gratuites disponibles</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-800">
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-300 transition-colors text-sm"
              >
                Passer le tutoriel
              </button>

              <div className="flex gap-3">
                {!isFirstStep && (
                  <button
                    onClick={handlePrevious}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Précédent
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-600/40"
                >
                  {isLastStep ? (
                    <>
                      Commencer
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Suivant
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step Dots */}
            <div className="flex justify-center gap-2 pb-6">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-gradient-to-r from-blue-500 to-purple-500'
                      : index < currentStep
                      ? 'w-2 bg-green-500'
                      : 'w-2 bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
