import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      verifySubscription(sessionId);
    } else {
      setError('Session ID manquant');
      setLoading(false);
    }
  }, [searchParams]);

  const verifySubscription = async (sessionId: string) => {
    try {
      // Wait a bit for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh user session to get updated plan
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.refreshSession();
      }

      setLoading(false);
    } catch (err) {
      console.error('Error verifying subscription:', err);
      setError('Erreur lors de la vérification de l\'abonnement');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Vérification de votre abonnement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-red-500/30 rounded-lg p-8 text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Erreur</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => navigate('/pricing')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retour aux tarifs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-800 border border-green-500/30 rounded-lg p-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mb-6 relative">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-green-500/20 rounded-full mx-auto animate-ping"></div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-4">
            Abonnement Confirmé! 🎉
          </h1>

          <p className="text-xl text-slate-300 mb-8">
            Bienvenue dans CortexOps Pro! Votre abonnement est maintenant actif.
          </p>

          {/* What's Next */}
          <div className="bg-slate-900/50 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Ce qui change pour vous:
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  <strong>API calls illimités</strong> - Plus de limite quotidienne
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  <strong>Playbooks illimités</strong> - Générez autant que vous voulez
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  <strong>Export Git automatique</strong> - Push direct vers vos repos
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  <strong>Analytics avancés</strong> - Métriques détaillées
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  <strong>Support prioritaire</strong> - Réponse sous 24h
                </span>
              </li>
            </ul>
          </div>

          {/* Invoice Info */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-8">
            <p className="text-sm text-slate-300">
              📧 Votre facture a été envoyée par email. Vous pouvez la consulter à tout moment depuis votre tableau de bord.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/app')}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-all"
            >
              Commencer à Créer
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Voir Mon Abonnement
            </button>
          </div>

          {/* Help */}
          <p className="text-sm text-slate-400 mt-8">
            Besoin d'aide? Contactez-nous à{' '}
            <a href="mailto:support@cortexops.com" className="text-blue-400 hover:underline">
              support@cortexops.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
