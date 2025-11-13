import { useState, useEffect } from 'react';
import { LogOut, User, Settings, Shield, Activity, Key, LayoutDashboard, BarChart3, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from './ui/Toast';

export function EnhancedHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie', 'À bientôt!');
      navigate('/');
    } catch (error) {
      toast.error('Erreur', 'Impossible de se déconnecter');
    }
  };

  return (
    <header
      className={`
        sticky top-0 z-40 w-full border-b transition-all duration-300
        ${scrolled
          ? 'bg-slate-900/95 backdrop-blur-lg border-slate-800 shadow-lg'
          : 'bg-slate-900/80 backdrop-blur-md border-slate-800/50'
        }
      `}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/app')}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-2 rounded-lg border border-slate-700">
                <Shield className="text-cyan-400" size={24} />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                CORTEXOPS
              </h1>
              <p className="text-xs text-slate-400">Infrastructure-Aware Generator</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
              <Activity className="text-green-400" size={16} />
              <span className="text-sm text-slate-300">
                Tous les systèmes opérationnels
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-cyan-500/50 transition-all group"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                  <User size={18} className="text-white" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                    {user?.email?.split('@')[0] || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {user?.email}
                  </p>
                </div>
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-50 animate-slide-up">
                    <div className="p-4 border-b border-slate-800">
                      <p className="text-sm font-medium text-white">
                        {user?.email?.split('@')[0] || 'Utilisateur'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {user?.email}
                      </p>
                    </div>

                    <div className="p-2">
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/profile');
                        }}
                      >
                        <User size={18} />
                        <span className="text-sm">Mon Profil</span>
                      </button>

                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/usage');
                        }}
                      >
                        <BarChart3 size={18} />
                        <span className="text-sm">Ma Consommation</span>
                      </button>

                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/api-keys');
                        }}
                      >
                        <Key size={18} />
                        <span className="text-sm">Clés API</span>
                      </button>

                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/pricing');
                        }}
                      >
                        <CreditCard size={18} />
                        <span className="text-sm">Plans & Tarifs</span>
                      </button>

                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/admin');
                        }}
                      >
                        <LayoutDashboard size={18} />
                        <span className="text-sm">Administration</span>
                      </button>
                    </div>

                    <div className="p-2 border-t border-slate-800">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Déconnexion</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
