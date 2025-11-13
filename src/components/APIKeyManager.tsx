import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Calendar,
  Shield,
  TrendingUp,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface APIKey {
  id: string;
  name: string;
  key_hash: string;
  key_preview: string;
  permissions: any;
  active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface APIKeyStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
  last_24h_requests: number;
  most_used_endpoint: string;
}

export const APIKeyManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [selectedKeyStats, setSelectedKeyStats] = useState<{id: string; stats: APIKeyStats} | null>(null);

  useEffect(() => {
    if (user) {
      loadAPIKeys();
    }
  }, [user]);

  const loadAPIKeys = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setKeys(data);
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAPIKey = () => {
    const prefix = 'ctx_live_';
    const randomString = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return prefix + randomString;
  };

  const createAPIKey = async () => {
    if (!newKeyName.trim()) {
      alert('Veuillez entrer un nom pour la clé API');
      return;
    }

    try {
      setLoading(true);
      const apiKey = generateAPIKey();
      const keyHash = btoa(apiKey);
      const keyPreview = apiKey.substring(0, 20) + '...' + apiKey.substring(apiKey.length - 4);

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user?.id,
          name: newKeyName,
          key_hash: keyHash,
          key_preview: keyPreview,
          permissions: {},
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setGeneratedKey(apiKey);
      setNewKeyName('');
      await loadAPIKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Erreur lors de la création de la clé API');
    } finally {
      setLoading(false);
    }
  };

  const revokeAPIKey = async (keyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer cette clé API ?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('api_keys')
        .update({ active: false })
        .eq('id', keyId);

      if (error) throw error;

      await loadAPIKeys();
    } catch (error) {
      console.error('Error revoking API key:', error);
      alert('Erreur lors de la révocation de la clé API');
    } finally {
      setLoading(false);
    }
  };

  const deleteAPIKey = async (keyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette clé API ?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      await loadAPIKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('Erreur lors de la suppression de la clé API');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copié dans le presse-papiers !');
  };

  const loadKeyStats = async (keyId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_api_key_stats', { p_api_key_id: keyId });

      if (error) throw error;
      if (data && data[0]) {
        setSelectedKeyStats({ id: keyId, stats: data[0] });
      }
    } catch (error) {
      console.error('Error loading key stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/app')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Retour à l'application"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold flex items-center space-x-2">
                <Key className="w-8 h-8 text-blue-500" />
                <span>Clés API</span>
              </h1>
              <p className="text-gray-400 mt-1">Gérez vos clés d'accès à l'API CortexOps</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Créer une clé API</span>
          </button>
        </div>

        {/* API Keys List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : keys.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucune clé API</h3>
            <p className="text-gray-400 mb-6">Créez votre première clé API pour commencer à utiliser l'API CortexOps</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
            >
              Créer une clé API
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {keys.map((key) => (
              <div key={key.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{key.name}</h3>
                      {key.active ? (
                        <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs font-medium rounded-full flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-900/50 text-red-400 text-xs font-medium rounded-full flex items-center space-x-1">
                          <XCircle className="w-3 h-3" />
                          <span>Révoquée</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Créée le {new Date(key.created_at).toLocaleDateString('fr-FR')}</span>
                      </span>
                      {key.last_used_at && (
                        <span className="flex items-center space-x-1">
                          <Activity className="w-4 h-4" />
                          <span>Dernière utilisation: {new Date(key.last_used_at).toLocaleDateString('fr-FR')}</span>
                        </span>
                      )}
                      {key.expires_at && (
                        <span className="flex items-center space-x-1">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          <span>Expire le {new Date(key.expires_at).toLocaleDateString('fr-FR')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => loadKeyStats(key.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Voir les statistiques"
                    >
                      <TrendingUp className="w-5 h-5 text-gray-400" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(key.key_preview)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Copier l'aperçu"
                    >
                      <Copy className="w-5 h-5 text-gray-400" />
                    </button>
                    {key.active && (
                      <button
                        onClick={() => revokeAPIKey(key.id)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Révoquer"
                      >
                        <Shield className="w-5 h-5 text-yellow-400" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteAPIKey(key.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-gray-400">{key.key_preview}</code>
                    <button
                      onClick={() => copyToClipboard(key.key_preview)}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center space-x-1"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copier</span>
                    </button>
                  </div>
                </div>

                {selectedKeyStats && selectedKeyStats.id === key.id && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Total Requêtes</div>
                      <div className="text-2xl font-bold">{selectedKeyStats.stats.total_requests.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Success Rate</div>
                      <div className="text-2xl font-bold text-green-400">
                        {selectedKeyStats.stats.total_requests > 0
                          ? ((selectedKeyStats.stats.successful_requests / selectedKeyStats.stats.total_requests) * 100).toFixed(1)
                          : 0}%
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Temps Réponse Moyen</div>
                      <div className="text-2xl font-bold">{selectedKeyStats.stats.avg_response_time_ms?.toFixed(0) || 0}ms</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create API Key Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">Créer une clé API</h2>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Nom de la clé</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Production API Key"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Donnez un nom descriptif pour identifier facilement cette clé
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewKeyName('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={createAPIKey}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generated Key Modal */}
        {generatedKey && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <h2 className="text-2xl font-bold">Clé API créée avec succès !</h2>
              </div>

              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold mb-1">Important : Copiez cette clé maintenant</p>
                    <p className="text-gray-300">
                      Cette clé ne sera plus jamais affichée. Assurez-vous de la copier et de la stocker en sécurité.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Votre clé API</span>
                  <button
                    onClick={() => copyToClipboard(generatedKey)}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center space-x-1"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copier</span>
                  </button>
                </div>
                <code className="text-sm font-mono break-all text-green-400">{generatedKey}</code>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">Exemple d'utilisation :</h3>
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-xs text-gray-300 overflow-x-auto">
{`curl -X POST https://api.cortexops.com/v1/generate \\
  -H "X-API-Key: ${generatedKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Deploy PostgreSQL cluster",
    "environment": "production"
  }'`}
                  </pre>
                </div>
              </div>

              <button
                onClick={() => setGeneratedKey(null)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
              >
                J'ai copié ma clé
              </button>
            </div>
          </div>
        )}

        {/* Documentation Section */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Shield className="w-6 h-6 text-blue-500" />
            <span>Sécurité et bonnes pratiques</span>
          </h2>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Ne partagez jamais vos clés API publiquement</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Stockez vos clés dans des variables d'environnement</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Utilisez des clés différentes pour dev/staging/production</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Révoquez immédiatement toute clé compromise</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Rotation régulière des clés recommandée (tous les 90 jours)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
