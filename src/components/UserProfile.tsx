import React, { useState, useEffect } from 'react';
import { User, Settings, Shield, CreditCard, Users, Bell, Key, LogOut, Save, X, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  company: string;
  job_title: string;
  phone: string;
  avatar_url: string;
  timezone: string;
  language: string;
  user_role: 'admin' | 'user' | 'client';
  user_plan: 'free' | 'pro' | 'enterprise';
  user_status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

interface Notification {
  email_notifications: boolean;
  slack_notifications: boolean;
  webhook_notifications: boolean;
  deployment_alerts: boolean;
  security_alerts: boolean;
  billing_alerts: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  session_timeout: number;
  allowed_ips: string[];
  api_key_rotation_days: number;
}

type TabType = 'profile' | 'settings' | 'security' | 'notifications' | 'billing' | 'team';

export const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [notifications, setNotifications] = useState<Notification>({
    email_notifications: true,
    slack_notifications: false,
    webhook_notifications: false,
    deployment_alerts: true,
    security_alerts: true,
    billing_alerts: true,
  });
  const [security, setSecurity] = useState<SecuritySettings>({
    two_factor_enabled: false,
    session_timeout: 3600,
    allowed_ips: [],
    api_key_rotation_days: 90,
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
      } else {
        const newProfile: ProfileData = {
          id: user?.id || '',
          email: user?.email || '',
          full_name: '',
          company: '',
          job_title: '',
          phone: '',
          avatar_url: '',
          timezone: 'Europe/Paris',
          language: 'fr',
          user_role: 'user',
          user_plan: 'free',
          user_status: 'active',
          created_at: new Date().toISOString(),
        };
        setProfile(newProfile);
        await supabase.from('user_profiles').insert([newProfile]);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setSaveMessage({ type: 'error', text: 'Erreur lors du chargement du profil' });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user?.id,
          ...profile,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSaveMessage({ type: 'success', text: 'Profil sauvegardé avec succès' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const saveNotifications = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user?.id,
          ...notifications,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSaveMessage({ type: 'success', text: 'Préférences sauvegardées' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving notifications:', error);
      setSaveMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile' as TabType, label: 'Profil', icon: User },
    { id: 'settings' as TabType, label: 'Paramètres', icon: Settings },
    { id: 'security' as TabType, label: 'Sécurité', icon: Shield },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
    { id: 'billing' as TabType, label: 'Facturation', icon: CreditCard },
    { id: 'team' as TabType, label: 'Équipe', icon: Users },
  ];

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Profil introuvable</h2>
          <p className="text-gray-400 mb-4">Impossible de charger votre profil.</p>
          <button
            onClick={loadProfile}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/app')}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Retour à l'application"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold">Mon Compte</h1>
                <p className="text-gray-400 mt-1">Gérez votre profil et vos préférences</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium">{profile.full_name || profile.email}</div>
                <div className="text-xs text-gray-400">{profile.user_role} · {profile.user_plan}</div>
              </div>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full border-2 border-blue-500"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            saveMessage.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            {saveMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span>{saveMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Déconnexion</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-6">
              {activeTab === 'profile' && (
                <ProfileTab profile={profile} setProfile={setProfile} onSave={saveProfile} loading={loading} />
              )}
              {activeTab === 'settings' && (
                <SettingsTab profile={profile} setProfile={setProfile} onSave={saveProfile} loading={loading} />
              )}
              {activeTab === 'security' && (
                <SecurityTab security={security} setSecurity={setSecurity} loading={loading} />
              )}
              {activeTab === 'notifications' && (
                <NotificationsTab
                  notifications={notifications}
                  setNotifications={setNotifications}
                  onSave={saveNotifications}
                  loading={loading}
                />
              )}
              {activeTab === 'billing' && <BillingTab profile={profile} />}
              {activeTab === 'team' && <TeamTab profile={profile} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileTab: React.FC<{
  profile: ProfileData;
  setProfile: (profile: ProfileData) => void;
  onSave: () => void;
  loading: boolean;
}> = ({ profile, setProfile, onSave, loading }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Informations du Profil</h2>
        <p className="text-gray-400">Gérez vos informations personnelles</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Nom complet</label>
          <input
            type="text"
            value={profile.full_name || ''}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg opacity-50 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Entreprise</label>
          <input
            type="text"
            value={profile.company || ''}
            onChange={(e) => setProfile({ ...profile, company: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Acme Corp"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Fonction</label>
          <input
            type="text"
            value={profile.job_title || ''}
            onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="DevOps Engineer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Téléphone</label>
          <input
            type="tel"
            value={profile.phone || ''}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+33 6 12 34 56 78"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Fuseau horaire</label>
          <select
            value={profile.timezone || 'Europe/Paris'}
            onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Europe/Paris">Europe/Paris (CET)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
        <button
          onClick={onSave}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Enregistrement...' : 'Enregistrer'}</span>
        </button>
      </div>
    </div>
  );
};

const SettingsTab: React.FC<{
  profile: ProfileData;
  setProfile: (profile: ProfileData) => void;
  onSave: () => void;
  loading: boolean;
}> = ({ profile, setProfile, onSave, loading }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Paramètres</h2>
        <p className="text-gray-400">Configurez vos préférences</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Langue</label>
          <select
            value={profile.language || 'fr'}
            onChange={(e) => setProfile({ ...profile, language: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
          </select>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Plan & Facturation</h3>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-lg capitalize">{profile.user_plan}</div>
                <div className="text-sm text-gray-400">Plan actuel</div>
              </div>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
                Changer de plan
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
        <button
          onClick={onSave}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Enregistrement...' : 'Enregistrer'}</span>
        </button>
      </div>
    </div>
  );
};

const SecurityTab: React.FC<{
  security: SecuritySettings;
  setSecurity: (security: SecuritySettings) => void;
  loading: boolean;
}> = ({ security, setSecurity, loading }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Sécurité</h2>
        <p className="text-gray-400">Gérez vos paramètres de sécurité</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
          <div>
            <div className="font-medium">Authentification à deux facteurs (2FA)</div>
            <div className="text-sm text-gray-400">Sécurisez votre compte avec 2FA</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={security.two_factor_enabled}
              onChange={(e) => setSecurity({ ...security, two_factor_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="p-4 bg-gray-700/50 rounded-lg">
          <label className="block text-sm font-medium mb-2">Timeout de session (secondes)</label>
          <input
            type="number"
            value={security.session_timeout}
            onChange={(e) => setSecurity({ ...security, session_timeout: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
          />
        </div>

        <div className="p-4 bg-gray-700/50 rounded-lg">
          <label className="block text-sm font-medium mb-2">Rotation des clés API (jours)</label>
          <input
            type="number"
            value={security.api_key_rotation_days}
            onChange={(e) => setSecurity({ ...security, api_key_rotation_days: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
          />
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-700">
        <button
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer</span>
        </button>
      </div>
    </div>
  );
};

const NotificationsTab: React.FC<{
  notifications: Notification;
  setNotifications: (notifications: Notification) => void;
  onSave: () => void;
  loading: boolean;
}> = ({ notifications, setNotifications, onSave, loading }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Notifications</h2>
        <p className="text-gray-400">Gérez vos préférences de notifications</p>
      </div>

      <div className="space-y-4">
        {Object.entries(notifications).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
            <div>
              <div className="font-medium capitalize">
                {key.replace(/_/g, ' ')}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-700">
        <button
          onClick={onSave}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Enregistrement...' : 'Enregistrer'}</span>
        </button>
      </div>
    </div>
  );
};

const BillingTab: React.FC<{ profile: ProfileData }> = ({ profile }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Facturation</h2>
        <p className="text-gray-400">Gérez votre abonnement et moyens de paiement</p>
      </div>

      <div className="bg-gray-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold capitalize">{profile.user_plan}</h3>
            <p className="text-gray-400">Plan actuel</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {profile.user_plan === 'free' ? '0€' : profile.user_plan === 'pro' ? '49€' : '499€'}
            </div>
            <div className="text-sm text-gray-400">/mois</div>
          </div>
        </div>

        <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">
          Changer de plan
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Historique de facturation</h3>
        <div className="text-gray-400 text-center py-8">
          Aucune facture disponible
        </div>
      </div>
    </div>
  );
};

const TeamTab: React.FC<{ profile: ProfileData }> = ({ profile }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Équipe</h2>
          <p className="text-gray-400">Gérez les membres de votre équipe</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">
          Inviter un membre
        </button>
      </div>

      <div className="bg-gray-700/50 rounded-lg p-6 text-center text-gray-400">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Aucun membre d'équipe</p>
        <p className="text-sm mt-2">Invitez des membres pour collaborer</p>
      </div>
    </div>
  );
};
