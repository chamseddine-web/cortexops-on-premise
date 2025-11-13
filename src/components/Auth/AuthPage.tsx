import { useState } from 'react';
import { SignInForm } from './SignInForm';
import { ProfessionalSignUpForm } from './ProfessionalSignUpForm';
import { Sparkles, Rocket, Cog, Users } from 'lucide-react';

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 flex items-center justify-center px-6 py-12">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

        {/* Left Section - Pricing */}
        <div className="space-y-6">
          <a href="/" className="flex items-center gap-3 mb-6 group cursor-pointer">
            <div className="relative">
              <img
                src="/ChatGPT Image 12 nov. 2025, 16_18_10 copy copy.png"
                alt="CortexOps"
                className="w-12 h-12 rounded-full shadow-lg transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse"></div>
            </div>
            <h1 className="text-3xl font-extrabold text-white transition-colors group-hover:text-blue-400">
              Cortex<span className="text-blue-400">Ops</span>
            </h1>
          </a>

          <h2 className="text-5xl font-extrabold text-white leading-tight">
            Générez vos <span className="text-blue-400" style={{ textShadow: '0 0 20px rgba(0, 136, 255, 0.4)' }}>playbooks Ansible</span>
          </h2>
          <p className="text-gray-400 text-lg">
            Du langage naturel au code de production en quelques secondes.
          </p>

          <div className="bg-green-900/30 border border-green-500 text-green-300 rounded-xl p-4 flex items-center gap-3 backdrop-blur-sm">
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Essai gratuit 7 jours</p>
              <p className="text-sm text-green-400/80">Sans carte bancaire • Annulation à tout moment</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Free Plan */}
            <div
              className="relative rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
              style={{
                background: 'linear-gradient(#111827, #1f2937) padding-box, linear-gradient(90deg, #4b5563, #6b7280) border-box',
                border: '1px solid transparent'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-gray-400" />
                  <h3 className="text-white font-semibold text-xl">Version Gratuite</h3>
                </div>
                <span className="text-gray-400">5 playbooks/mois</span>
              </div>
              <p className="text-gray-500 text-sm">🚀 Testez l'IA sans limite dès aujourd'hui</p>
            </div>

            {/* Pro Plan */}
            <div
              className="relative rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              style={{
                background: 'linear-gradient(#111827, #1f2937) padding-box, linear-gradient(90deg, #00C6FF, #0072FF) border-box',
                border: '2px solid transparent',
                boxShadow: '0 0 30px rgba(0, 114, 255, 0.2)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cog className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-semibold text-xl">Version Pro DevOps</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-bold">19,90 €/mois</span>
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-md animate-pulse">
                    🔥 Populaire
                  </span>
                </div>
              </div>
              <p className="text-gray-400 text-sm">⚙️ Playbooks illimités + Export Git + IA prédictive</p>
            </div>

            {/* Team Plan */}
            <div
              className="relative rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              style={{
                background: 'linear-gradient(#111827, #1f2937) padding-box, linear-gradient(90deg, #a855f7, #6366f1) border-box',
                border: '1px solid transparent'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white font-semibold text-xl">Version Team</h3>
                </div>
                <span className="text-purple-400 font-bold">49 €/mois</span>
              </div>
              <p className="text-gray-400 text-sm">👥 Collaboration multi-utilisateurs + CI/CD + API</p>
            </div>

            {/* Enterprise Plan */}
            <div
              className="relative rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              style={{
                background: 'linear-gradient(#111827, #1f2937) padding-box, linear-gradient(90deg, #ef4444, #f97316) border-box',
                border: '1px solid transparent'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <h3 className="text-white font-semibold text-xl">Version Entreprise</h3>
                </div>
                <span className="text-red-400 font-bold">149 €/mois</span>
              </div>
              <p className="text-gray-400 text-sm">💎 API privée + Marque blanche + Support 24/7</p>
            </div>
          </div>

          <p className="text-center text-gray-500 text-sm">
            Sans engagement — annulez en un clic depuis votre tableau de bord
          </p>
        </div>

        {/* Right Section - Auth Form */}
        <div className="flex justify-center">
          {mode === 'signin' ? (
            <SignInForm onSwitchToSignUp={() => setMode('signup')} />
          ) : (
            <ProfessionalSignUpForm onSwitchToSignIn={() => setMode('signin')} />
          )}
        </div>
      </div>
    </div>
  );
}
