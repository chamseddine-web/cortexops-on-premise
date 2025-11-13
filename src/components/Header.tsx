import { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Header() {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };
  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/ChatGPT Image 12 nov. 2025, 16_18_10 copy copy.png"
              alt="CortexOps Logo"
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-white">CORTEXOPS</h1>
              <p className="text-xs text-slate-400">Infrastructure-Aware Ansible Generator</p>
            </div>
          </div>

          <nav className="flex gap-3 items-center">
            {user && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700/50">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-slate-400 font-medium">{user.email}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-slate-300 hover:bg-red-900/30 hover:text-red-400 border border-slate-700/50 hover:border-red-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Déconnexion"
                >
                  {isSigningOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  <span className="hidden md:inline">
                    {isSigningOut ? 'Déconnexion...' : 'Déconnexion'}
                  </span>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
