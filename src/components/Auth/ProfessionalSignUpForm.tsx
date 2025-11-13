import { useState } from 'react';
import {
  Mail, Lock, User, Building2, Phone, MapPin,
  Shield, Check, AlertCircle, Eye, EyeOff,
  Briefcase, Users, CreditCard, FileText,
  ArrowRight, CheckCircle2, Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SignUpFormProps {
  onSwitchToSignIn: () => void;
}

type SignUpStep = 'account' | 'profile' | 'company' | 'preferences' | 'verification';

interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  jobTitle: string;
  phone: string;
  companyName: string;
  companySize: string;
  industry: string;
  country: string;
  useCase: string[];
  newsletter: boolean;
  terms: boolean;
}

export function ProfessionalSignUpForm({ onSwitchToSignIn }: SignUpFormProps) {
  const [step, setStep] = useState<SignUpStep>('account');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    jobTitle: '',
    phone: '',
    companyName: '',
    companySize: '',
    industry: '',
    country: '',
    useCase: [],
    newsletter: true,
    terms: false
  });

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: [] as string[]
  });

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    const feedback: string[] = [];

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Au moins 8 caractères');
    }

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Majuscules et minuscules');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Au moins un chiffre');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Caractère spécial (!@#$...)');
    }

    if (password.length >= 12) {
      score += 1;
    }

    setPasswordStrength({ score, feedback });
  };

  const handlePasswordChange = (password: string) => {
    updateFormData('password', password);
    calculatePasswordStrength(password);
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 'account':
        if (!formData.fullName.trim()) {
          setError('Le nom complet est requis');
          return false;
        }
        if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          setError('Email invalide');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Le mot de passe doit contenir au moins 8 caractères');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Les mots de passe ne correspondent pas');
          return false;
        }
        if (passwordStrength.score < 3) {
          setError('Mot de passe trop faible. Ajoutez des majuscules, chiffres et caractères spéciaux.');
          return false;
        }
        break;

      case 'profile':
        if (!formData.jobTitle.trim()) {
          setError('Le titre de poste est requis');
          return false;
        }
        if (!formData.phone.match(/^[\d\s\-\+\(\)]+$/)) {
          setError('Numéro de téléphone invalide');
          return false;
        }
        break;

      case 'company':
        if (!formData.companyName.trim()) {
          setError('Le nom de l\'entreprise est requis');
          return false;
        }
        if (!formData.companySize) {
          setError('Sélectionnez la taille de l\'entreprise');
          return false;
        }
        if (!formData.industry) {
          setError('Sélectionnez votre secteur d\'activité');
          return false;
        }
        break;

      case 'preferences':
        if (formData.useCase.length === 0) {
          setError('Sélectionnez au moins un cas d\'usage');
          return false;
        }
        if (!formData.terms) {
          setError('Vous devez accepter les conditions d\'utilisation');
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;

    const steps: SignUpStep[] = ['account', 'profile', 'company', 'preferences', 'verification'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
      setError(null);
    }
  };

  const previousStep = () => {
    const steps: SignUpStep[] = ['account', 'profile', 'company', 'preferences', 'verification'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    setError(null);

    const { error } = await signUp(formData.email, formData.password, formData.fullName, {
      job_title: formData.jobTitle,
      phone: formData.phone,
      company_name: formData.companyName,
      company_size: formData.companySize,
      industry: formData.industry,
      country: formData.country,
      use_cases: formData.useCase,
      newsletter: formData.newsletter
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setStep('verification');
      setLoading(false);
    }
  };

  const getStepProgress = () => {
    const steps: SignUpStep[] = ['account', 'profile', 'company', 'preferences', 'verification'];
    const currentIndex = steps.indexOf(step);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const StepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          {['account', 'profile', 'company', 'preferences'].map((s, idx) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                step === s ? 'w-12 bg-blue-500' :
                ['account', 'profile', 'company', 'preferences'].indexOf(step) > idx
                  ? 'w-8 bg-green-500'
                  : 'w-8 bg-gray-700'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-400">
          Étape {['account', 'profile', 'company', 'preferences'].indexOf(step) + 1}/4
        </span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
          style={{ width: `${getStepProgress()}%` }}
        />
      </div>
    </div>
  );

  if (step === 'verification') {
    return (
      <div className="w-full max-w-2xl">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl shadow-2xl p-12 backdrop-blur-md">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">
              Bienvenue, {formData.fullName.split(' ')[0]} ! 🎉
            </h2>
            <p className="text-gray-400 mb-8 text-lg">
              Votre compte professionnel a été créé avec succès.<br/>
              Vous disposez de <strong className="text-white">5 générations gratuites</strong> pour démarrer.
            </p>

            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6 mb-8">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-400 mb-1">5</div>
                  <div className="text-sm text-gray-400">Playbooks/mois</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400 mb-1">∞</div>
                  <div className="text-sm text-gray-400">Templates</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-400 mb-1">24/7</div>
                  <div className="text-sm text-gray-400">Support</div>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-left p-3 bg-gray-800/50 rounded-lg">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-gray-300">Email de confirmation envoyé à <strong className="text-white">{formData.email}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-left p-3 bg-gray-800/50 rounded-lg">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-gray-300">Accès aux rôles Ansible premium activé</span>
              </div>
              <div className="flex items-center gap-3 text-left p-3 bg-gray-800/50 rounded-lg">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-gray-300">Dashboard et analytics disponibles</span>
              </div>
            </div>

            <button
              onClick={onSwitchToSignIn}
              className="flex items-center justify-center gap-2 mx-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-purple-600/40"
            >
              <ArrowRight className="w-5 h-5" />
              Accéder à mon dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-gray-900/80 border border-gray-800 rounded-2xl shadow-2xl p-8 backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400 font-semibold">Compte Professionnel</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-2">
            {step === 'account' && 'Créez votre compte'}
            {step === 'profile' && 'Profil professionnel'}
            {step === 'company' && 'Informations entreprise'}
            {step === 'preferences' && 'Personnalisez votre expérience'}
          </h3>
          <p className="text-gray-400">
            {step === 'account' && 'Commencez avec 5 générations gratuites par mois'}
            {step === 'profile' && 'Aidez-nous à mieux vous connaître'}
            {step === 'company' && 'Parlez-nous de votre entreprise'}
            {step === 'preferences' && 'Dernière étape avant de démarrer'}
          </p>
        </div>

        <StepIndicator />

        <form onSubmit={step === 'preferences' ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {step === 'account' && (
            <>
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Nom complet *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => updateFormData('fullName', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    placeholder="Jean Dupont"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Email professionnel *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    placeholder="jean.dupont@entreprise.com"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Utilisez votre email professionnel pour accéder aux fonctionnalités premium</p>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Mot de passe *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    placeholder="••••••••••••"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {formData.password && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            level <= passwordStrength.score
                              ? passwordStrength.score <= 2 ? 'bg-red-500'
                              : passwordStrength.score === 3 ? 'bg-yellow-500'
                              : 'bg-green-500'
                              : 'bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {passwordStrength.feedback.map((fb, idx) => (
                          <span key={idx} className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                            {fb}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Confirmer le mot de passe *</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    placeholder="••••••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>
            </>
          )}

          {step === 'profile' && (
            <>
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Titre de poste *</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => updateFormData('jobTitle', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    placeholder="DevOps Engineer, SRE, System Administrator..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Téléphone professionnel *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    placeholder="+33 6 12 34 56 78"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Pour assistance prioritaire et notifications importantes</p>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Pays *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <select
                    value={formData.country}
                    onChange={(e) => updateFormData('country', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all appearance-none"
                    required
                  >
                    <option value="">Sélectionnez un pays</option>
                    <option value="FR">France</option>
                    <option value="BE">Belgique</option>
                    <option value="CH">Suisse</option>
                    <option value="CA">Canada</option>
                    <option value="LU">Luxembourg</option>
                    <option value="US">États-Unis</option>
                    <option value="UK">Royaume-Uni</option>
                    <option value="DE">Allemagne</option>
                    <option value="ES">Espagne</option>
                    <option value="IT">Italie</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 'company' && (
            <>
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Nom de l'entreprise *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    placeholder="Acme Corporation"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Taille de l'entreprise *</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <select
                    value={formData.companySize}
                    onChange={(e) => updateFormData('companySize', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all appearance-none"
                    required
                  >
                    <option value="">Sélectionnez</option>
                    <option value="1-10">1-10 employés</option>
                    <option value="11-50">11-50 employés</option>
                    <option value="51-200">51-200 employés</option>
                    <option value="201-500">201-500 employés</option>
                    <option value="501-1000">501-1000 employés</option>
                    <option value="1000+">1000+ employés</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Secteur d'activité *</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <select
                    value={formData.industry}
                    onChange={(e) => updateFormData('industry', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all appearance-none"
                    required
                  >
                    <option value="">Sélectionnez</option>
                    <option value="technology">Technologie / IT</option>
                    <option value="finance">Finance / Banque</option>
                    <option value="healthcare">Santé</option>
                    <option value="ecommerce">E-commerce / Retail</option>
                    <option value="manufacturing">Industrie</option>
                    <option value="education">Éducation</option>
                    <option value="media">Média / Communication</option>
                    <option value="consulting">Conseil</option>
                    <option value="government">Secteur public</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 'preferences' && (
            <>
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-3">Cas d'usage principaux * (plusieurs choix possibles)</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'cicd', label: 'CI/CD Automation', icon: '🚀' },
                    { value: 'infrastructure', label: 'Infrastructure as Code', icon: '🏗️' },
                    { value: 'security', label: 'Security Hardening', icon: '🔒' },
                    { value: 'monitoring', label: 'Monitoring Setup', icon: '📊' },
                    { value: 'deployment', label: 'Application Deployment', icon: '📦' },
                    { value: 'cloud', label: 'Cloud Provisioning', icon: '☁️' }
                  ].map((useCase) => (
                    <label
                      key={useCase.value}
                      className={`flex items-center gap-3 p-4 bg-gray-800 border rounded-lg cursor-pointer transition-all hover:border-blue-500 ${
                        formData.useCase.includes(useCase.value)
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.useCase.includes(useCase.value)}
                        onChange={(e) => {
                          const newUseCases = e.target.checked
                            ? [...formData.useCase, useCase.value]
                            : formData.useCase.filter(uc => uc !== useCase.value);
                          updateFormData('useCase', newUseCases);
                        }}
                        className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-gray-900"
                      />
                      <span className="flex-1 text-sm text-white">
                        <span className="mr-2">{useCase.icon}</span>
                        {useCase.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-800 pt-5">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.newsletter}
                    onChange={(e) => updateFormData('newsletter', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-gray-900 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-white text-sm font-medium block mb-1">Recevoir les nouveautés</span>
                    <span className="text-gray-400 text-xs">Restez informé des nouvelles fonctionnalités et meilleures pratiques Ansible</span>
                  </div>
                </label>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.terms}
                    onChange={(e) => updateFormData('terms', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-gray-900 mt-0.5"
                    required
                  />
                  <div className="flex-1">
                    <span className="text-white text-sm">
                      J'accepte les{' '}
                      <a href="#" className="text-blue-400 hover:text-blue-300 hover:underline">conditions d'utilisation</a>
                      {' '}et la{' '}
                      <a href="#" className="text-blue-400 hover:text-blue-300 hover:underline">politique de confidentialité</a> *
                    </span>
                  </div>
                </label>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            {step !== 'account' && (
              <button
                type="button"
                onClick={previousStep}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-300"
              >
                Précédent
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-600/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Création...
                </>
              ) : step === 'preferences' ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Créer mon compte
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Déjà un compte ?{' '}
            <button
              onClick={onSwitchToSignIn}
              className="text-blue-400 hover:text-blue-300 hover:underline font-semibold transition-colors"
            >
              Se connecter
            </button>
          </p>
        </div>

        {step === 'account' && (
          <div className="mt-6 pt-6 border-t border-gray-800">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Sécurisé SSL/TLS</p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <FileText className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">RGPD Compliant</p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <CreditCard className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Sans CB</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
