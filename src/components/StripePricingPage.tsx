import { useState } from 'react';
import { CheckCircle, X, Sparkles, ArrowRight, Zap, Shield, Crown, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface StripePricingPageProps {
  onGetStarted: () => void;
}

type Plan = 'free' | 'pro' | 'enterprise';

export function StripePricingPage({ onGetStarted }: StripePricingPageProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<Plan | null>(null);

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      onGetStarted();
      return;
    }

    if (plan === 'free') {
      onGetStarted();
      return;
    }

    setLoading(plan);

    try {
      // Get price ID based on plan
      const priceIds: Record<Plan, string> = {
        free: '',
        pro: import.meta.env.VITE_STRIPE_PRICE_ID_PRO || '',
        enterprise: import.meta.env.VITE_STRIPE_PRICE_ID_ENTERPRISE || '',
      };

      const priceId = priceIds[plan];
      if (!priceId) {
        throw new Error('Price ID not configured');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId,
            successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/pricing`,
          })
        }
      );

      const data = await response.json();

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Erreur lors de la création du paiement. Veuillez réessayer.');
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      id: 'free' as Plan,
      name: 'Free',
      icon: Zap,
      price: '0',
      period: 'Pour toujours',
      description: 'Parfait pour découvrir CortexOps',
      color: 'from-green-500 to-emerald-500',
      features: [
        { text: '100 API calls / jour', included: true },
        { text: '5 playbooks / mois', included: true },
        { text: 'Génération IA basique', included: true },
        { text: 'Export YAML', included: true },
        { text: 'Validation syntaxe', included: true },
        { text: 'Support communauté', included: true },
        { text: 'Export Git', included: false },
        { text: 'API accès', included: false },
      ],
      cta: 'Commencer Gratuitement',
      popular: false,
    },
    {
      id: 'pro' as Plan,
      name: 'Pro DevOps',
      icon: Shield,
      price: '49',
      period: '/ mois',
      description: 'Pour les professionnels DevOps',
      color: 'from-blue-500 to-cyan-500',
      features: [
        { text: 'API calls illimités', included: true },
        { text: 'Playbooks illimités', included: true },
        { text: 'IA avancée + prédictions', included: true },
        { text: 'Export Git automatique', included: true },
        { text: 'CI/CD intégrations', included: true },
        { text: 'Analytics détaillés', included: true },
        { text: 'Support prioritaire', included: true },
        { text: 'API externe complète', included: false },
      ],
      cta: 'Commencer Maintenant',
      popular: true,
    },
    {
      id: 'enterprise' as Plan,
      name: 'Enterprise',
      icon: Crown,
      price: '499',
      period: '/ mois',
      description: 'Pour les grandes organisations',
      color: 'from-amber-500 to-orange-500',
      features: [
        { text: 'Tout Pro inclus', included: true },
        { text: 'API externe illimitée', included: true },
        { text: 'Users illimités', included: true },
        { text: 'White label', included: true },
        { text: 'SLA 99.9%', included: true },
        { text: 'Support 24/7', included: true },
        { text: 'Account manager dédié', included: true },
        { text: 'Custom features', included: true },
      ],
      cta: 'Contactez-nous',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <img
                  src="/ChatGPT Image 12 nov. 2025, 16_18_10 copy copy.png"
                  alt="CortexOps"
                  className="w-10 h-10 object-contain transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <span className="text-xl font-bold text-white transition-colors group-hover:text-blue-400">CortexOps</span>
            </a>
            <button
              onClick={onGetStarted}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all"
            >
              {user ? 'Dashboard' : 'Connexion'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Choisissez votre plan
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Tarifs simples et transparents. Passez à un plan supérieur à tout moment.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-700/50 rounded-full">
              <Sparkles className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">Paiement sécurisé par Stripe</span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isLoading = loading === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border-2 transition-all hover:scale-105 ${
                    plan.popular
                      ? 'border-blue-500 shadow-2xl shadow-blue-500/20'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full text-white text-sm font-bold">
                      Plus Populaire
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${plan.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-5xl font-bold text-white">{plan.price}€</span>
                      <span className="text-slate-400">{plan.period}</span>
                    </div>
                    <p className="text-slate-400 text-sm">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        {feature.included ? (
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={feature.included ? 'text-slate-300' : 'text-slate-500'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isLoading}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      plan.popular
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        {plan.cta}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span>Paiement sécurisé SSL</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>Annulation à tout moment</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-400" />
              <span>Conformité RGPD</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>Facturation automatique</span>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-10">
              Questions Fréquentes
            </h2>
            <div className="space-y-6">
              <div className="bg-slate-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Puis-je changer de plan à tout moment?
                </h3>
                <p className="text-slate-400">
                  Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment. Les changements prennent effet immédiatement.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Comment fonctionne la facturation?
                </h3>
                <p className="text-slate-400">
                  La facturation est mensuelle et automatique via Stripe. Vous recevez une facture par email à chaque paiement. TVA incluse pour l'UE.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Puis-je annuler mon abonnement?
                </h3>
                <p className="text-slate-400">
                  Oui, vous pouvez annuler à tout moment depuis votre tableau de bord. L'accès reste actif jusqu'à la fin de la période payée.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
