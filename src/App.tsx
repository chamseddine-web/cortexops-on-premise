import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { EnhancedHeader } from './components/EnhancedHeader';
import { GeneratorSection } from './components/GeneratorSection';
import { AuthPage } from './components/Auth/AuthPage';
import ModernLanding from './components/ModernLanding';
import { MarketingLanding } from './components/MarketingLanding';
import { UserProfile } from './components/UserProfile';
import { AdminDashboard } from './components/AdminDashboard';
import { APIKeyManager } from './components/APIKeyManager';
import { UsageDashboard } from './components/UsageDashboard';
import { OnboardingWizard } from './components/OnboardingWizard';
import { PricingPage } from './components/PricingPage';
import { StripePricingPage } from './components/StripePricingPage';
import { SubscriptionSuccess } from './components/SubscriptionSuccess';
import { useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingState } from './components/LoadingState';
import { offlineManager, createOfflineIndicator } from './lib/offlineDetection';
import { errorHandler } from './lib/errorHandler';
import { supabase } from './lib/supabase';

function App() {
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    createOfflineIndicator();

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      errorHandler.logError(event.error?.message || 'Une erreur est survenue', 'high');
      setError(event.error?.message || 'Une erreur est survenue');
    };

    window.addEventListener('error', handleError);

    const unsubscribe = offlineManager.addListener((status) => {
      console.log('Network status:', status);
    });

    return () => {
      window.removeEventListener('error', handleError);
      offlineManager.removeListener(unsubscribe);
    };
  }, []);

  useEffect(() => {
    if (user && !onboardingChecked) {
      checkOnboardingStatus();
    }
  }, [user, onboardingChecked]);

  const checkOnboardingStatus = async () => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', user?.id)
        .maybeSingle();

      if (!data?.onboarding_completed) {
        setShowOnboarding(true);
      }
      setOnboardingChecked(true);
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setOnboardingChecked(true);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    navigate('/app');
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  const handleGetStarted = () => {
    navigate('/auth');
  };

  if (loading) {
    return <LoadingState message="Chargement de l'application..." fullScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-slate-800 border border-red-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-400 mb-4">Erreur</h2>
          <p className="text-slate-300 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {showOnboarding && user && (
        <OnboardingWizard
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
      <Routes>
        {/* Public routes */}
        <Route path="/" element={user ? <Navigate to="/app" /> : <MarketingLanding />} />
        <Route path="/auth" element={user ? <Navigate to="/app" /> : <AuthPage />} />
        <Route
          path="/pricing"
          element={<StripePricingPage onGetStarted={handleGetStarted} />}
        />
        <Route
          path="/success"
          element={<SubscriptionSuccess />}
        />

        {/* Protected routes */}
        <Route
          path="/app"
          element={
            user ? (
              <ErrorBoundary>
                <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                  <EnhancedHeader />
                  <main className="container mx-auto px-4 py-8">
                    <GeneratorSection />
                  </main>
                </div>
              </ErrorBoundary>
            ) : (
              <Navigate to="/auth" />
            )
          }
        />

        <Route
          path="/profile"
          element={
            user ? (
              <ErrorBoundary>
                <UserProfile />
              </ErrorBoundary>
            ) : (
              <Navigate to="/auth" />
            )
          }
        />

        <Route
          path="/api-keys"
          element={
            user ? (
              <ErrorBoundary>
                <APIKeyManager />
              </ErrorBoundary>
            ) : (
              <Navigate to="/auth" />
            )
          }
        />

        <Route
          path="/admin"
          element={
            user ? (
              <ErrorBoundary>
                <AdminDashboard />
              </ErrorBoundary>
            ) : (
              <Navigate to="/auth" />
            )
          }
        />

        <Route
          path="/usage"
          element={
            user ? (
              <ErrorBoundary>
                <UsageDashboard />
              </ErrorBoundary>
            ) : (
              <Navigate to="/auth" />
            )
          }
        />

        {/* Redirect all unknown routes */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
