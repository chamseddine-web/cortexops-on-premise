import { useState } from 'react';
import { CheckCircle, X, Sparkles, ArrowRight, Users, Zap, Shield, Crown, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface PricingPageProps {
  onGetStarted: () => void;
}

type Plan = 'free' | 'pro' | 'team' | 'enterprise';
type Interval = 'monthly' | 'quarterly' | 'yearly';

export function PricingPage({ onGetStarted }: PricingPageProps) {
  const { user } = useAuth();
  const [interval, setInterval] = useState<Interval>('monthly');
  const [loading, setLoading] = useState<Plan | null>(null);

  const handleSubscribe = async (plan: Plan, isSubscription: boolean = true) => {
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
      const intervalMap = {
        monthly: '1 month',
        quarterly: '3 months',
        yearly: '1 year'
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mollie-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plan,
            interval: intervalMap[interval],
            isSubscription
          })
        }
      );

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Erreur lors de la création du paiement. Veuillez réessayer.');
    } finally {
      setLoading(null);
    }
  };

  const getPricing = (plan: Plan) => {
    const pricing = {
      pro: {
        monthly: '19,90',
        quarterly: '54,90',
        yearly: '199,00'
      },
      team: {
        monthly: '49,00',
        quarterly: '135,00',
        yearly: '499,00'
      },
      enterprise: {
        monthly: '149,00',
        quarterly: '399,00',
        yearly: '1499,00'
      }
    };

    return pricing[plan as keyof typeof pricing]?.[interval] || '0';
  };

  const getSavings = (plan: Plan) => {
    if (interval === 'quarterly') return '-8%';
    if (interval === 'yearly') return '-17%';
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-900">
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
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all"
            >
              {user ? 'Dashboard' : 'Connexion'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-red-900/20 via-transparent to-blue-900/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Tarifs simples et transparents
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Choisissez le plan qui correspond à vos besoins. Changez ou annulez à tout moment.
            </p>

            {/* Interval Toggle */}
            <div className="inline-flex items-center gap-2 p-1 bg-slate-800 rounded-lg mb-6">
              <button
                onClick={() => setInterval('monthly')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  interval === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setInterval('quarterly')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  interval === 'quarterly'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Trimestriel
                <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded">-8%</span>
              </button>
              <button
                onClick={() => setInterval('yearly')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  interval === 'yearly'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Annuel
                <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded">-17%</span>
              </button>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-700/50 rounded-full">
              <Sparkles className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">Paiement sécurisé par Mollie</span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto mb-20">
            {/* Free Plan */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-bold text-white">Free</h3>
              </div>
              <div className="mb-6">
                <div className="text-4xl font-bold text-white mb-2">0€</div>
                <div className="text-slate-400">Pour toujours</div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">5 playbooks / mois</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Génération IA basique</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Export YAML</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Validation syntaxe</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Support communauté</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-500">Export Git</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-500">API</span>
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe('free', false)}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
              >
                Commencer gratuitement
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-blue-900/50 to-slate-800 rounded-2xl p-8 border-2 border-blue-500 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 rounded-full text-white text-sm font-bold">
                Populaire
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-bold text-white">Pro DevOps</h3>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-bold text-white">{getPricing('pro')}€</div>
                  {getSavings('pro') && (
                    <div className="text-sm text-green-400 font-medium">{getSavings('pro')}</div>
                  )}
                </div>
                <div className="text-slate-400">par {interval === 'monthly' ? 'mois' : interval === 'quarterly' ? 'trimestre' : 'an'}</div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300"><strong>Playbooks illimités</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">IA prédictive avancée</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Export Git automatique</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">CI/CD intégrations</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Analytics détaillés</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Support prioritaire</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-500">API accès</span>
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe('pro')}
                disabled={loading === 'pro'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'pro' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    Commencer maintenant
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Team Plan */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-6 h-6 text-purple-400" />
                <h3 className="text-xl font-bold text-white">Team</h3>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-bold text-white">{getPricing('team')}€</div>
                  {getSavings('team') && (
                    <div className="text-sm text-green-400 font-medium">{getSavings('team')}</div>
                  )}
                </div>
                <div className="text-slate-400">par {interval === 'monthly' ? 'mois' : interval === 'quarterly' ? 'trimestre' : 'an'}</div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Tout Pro inclus</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300"><strong>Jusqu'à 10 users</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Collaboration temps réel</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Gestion des rôles</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Audit logs</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">API accès complet</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Support dédié</span>
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe('team')}
                disabled={loading === 'team'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'team' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    Commencer maintenant
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-gradient-to-br from-amber-900/50 to-slate-800 rounded-2xl p-8 border border-amber-600">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-bold text-white">Enterprise</h3>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-bold text-white">{getPricing('enterprise')}€</div>
                  {getSavings('enterprise') && (
                    <div className="text-sm text-green-400 font-medium">{getSavings('enterprise')}</div>
                  )}
                </div>
                <div className="text-slate-400">par {interval === 'monthly' ? 'mois' : interval === 'quarterly' ? 'trimestre' : 'an'}</div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Tout Team inclus</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300"><strong>Users illimités</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">API privée dédiée</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Marque blanche</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">SLA 99.9%</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Support 24/7</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Account manager dédié</span>
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe('enterprise')}
                disabled={loading === 'enterprise'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'enterprise' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    Commencer maintenant
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
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
          </div>
        </div>
      </section>
    </div>
  );
}
