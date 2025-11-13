import { useState, useEffect } from 'react';
import { Users, Plus, Key, Trash2, Edit, Shield, Activity, TrendingUp, BarChart3, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface APIClient {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface APIKey {
  id: string;
  client_id: string;
  key_prefix: string;
  name: string;
  status: 'active' | 'revoked' | 'expired';
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface UsageStats {
  total_requests: number;
  requests_today: number;
  requests_this_month: number;
  avg_response_time: number;
}

export function APIClientManager() {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState<APIClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<APIClient | null>(null);
  const [clientKeys, setClientKeys] = useState<APIKey[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (isAdmin()) {
      loadClients();
    }
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadClientKeys(selectedClient.id);
      loadUsageStats(selectedClient.id);
    }
  }, [selectedClient]);

  const loadClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading clients:', error);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  const loadClientKeys = async (clientId: string) => {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading keys:', error);
    } else {
      setClientKeys(data || []);
    }
  };

  const loadUsageStats = async (clientId: string) => {
    const { data, error } = await supabase
      .from('api_usage_logs')
      .select('status_code, response_time_ms, created_at')
      .eq('client_id', clientId);

    if (error) {
      console.error('Error loading stats:', error);
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats: UsageStats = {
      total_requests: data?.length || 0,
      requests_today: data?.filter(d => new Date(d.created_at) >= today).length || 0,
      requests_this_month: data?.filter(d => new Date(d.created_at) >= thisMonth).length || 0,
      avg_response_time: data?.length
        ? Math.round(data.reduce((sum, d) => sum + (d.response_time_ms || 0), 0) / data.length)
        : 0
    };

    setUsageStats(stats);
  };

  const createClient = async (name: string, email: string, plan: string) => {
    const { data, error } = await supabase
      .from('api_clients')
      .insert([{ name, email, plan }])
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      alert('Erreur lors de la création du client');
      return;
    }

    setClients([data, ...clients]);
    setShowCreateModal(false);
  };

  const generateAPIKey = async (clientId: string, keyName: string) => {
    const key = `ck_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const keyHash = btoa(key);
    const keyPrefix = key.substring(0, 8);

    const { data, error } = await supabase
      .from('api_keys')
      .insert([{
        client_id: clientId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: keyName,
        status: 'active'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error generating key:', error);
      alert('Erreur lors de la génération de la clé');
      return;
    }

    setGeneratedKey(key);
    setShowKeyModal(false);
    if (selectedClient) {
      loadClientKeys(selectedClient.id);
    }
  };

  const revokeAPIKey = async (keyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer cette clé API ?')) return;

    const { error } = await supabase
      .from('api_keys')
      .update({ status: 'revoked' })
      .eq('id', keyId);

    if (error) {
      console.error('Error revoking key:', error);
      alert('Erreur lors de la révocation de la clé');
      return;
    }

    if (selectedClient) {
      loadClientKeys(selectedClient.id);
    }
  };

  const updateClientStatus = async (clientId: string, newStatus: string) => {
    const { error } = await supabase
      .from('api_clients')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', clientId);

    if (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise à jour du statut');
      return;
    }

    loadClients();
    if (selectedClient?.id === clientId) {
      setSelectedClient({ ...selectedClient, status: newStatus as any });
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'all' || client.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Accès refusé</h2>
          <p className="text-slate-400">Vous devez être administrateur pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-7 h-7" />
            Gestion des Clients API
          </h2>
          <p className="text-slate-400 mt-1">Gérer les clients, clés API et usage</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Nouveau Client
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-red-500 focus:outline-none"
          />
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-red-500 focus:outline-none"
        >
          <option value="all">Tous les plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-red-500 focus:outline-none"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="suspended">Suspendu</option>
          <option value="cancelled">Annulé</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="font-semibold text-white mb-3">Clients ({filteredClients.length})</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <p className="text-slate-400 text-sm">Chargement...</p>
              ) : filteredClients.length === 0 ? (
                <p className="text-slate-400 text-sm">Aucun client trouvé</p>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedClient?.id === client.id
                        ? 'bg-red-900/20 border-red-600'
                        : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-medium text-white">{client.name}</div>
                    <div className="text-sm text-slate-400">{client.email}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        client.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                        client.plan === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                        client.plan === 'starter' ? 'bg-green-500/20 text-green-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {client.plan}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        client.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        client.status === 'suspended' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {client.status}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedClient ? (
            <>
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedClient.name}</h3>
                    <p className="text-slate-400">{selectedClient.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedClient.status}
                      onChange={(e) => updateClientStatus(selectedClient.id, e.target.value)}
                      className="px-3 py-1 bg-slate-700 text-white rounded border border-slate-600 text-sm"
                    >
                      <option value="active">Actif</option>
                      <option value="suspended">Suspendu</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </div>
                </div>

                {usageStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <div className="text-slate-400 text-sm">Total</div>
                      <div className="text-2xl font-bold text-white">{usageStats.total_requests}</div>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <div className="text-slate-400 text-sm">Aujourd'hui</div>
                      <div className="text-2xl font-bold text-white">{usageStats.requests_today}</div>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <div className="text-slate-400 text-sm">Ce mois</div>
                      <div className="text-2xl font-bold text-white">{usageStats.requests_this_month}</div>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <div className="text-slate-400 text-sm">Avg. Response</div>
                      <div className="text-2xl font-bold text-white">{usageStats.avg_response_time}ms</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white">Clés API</h4>
                  <button
                    onClick={() => setShowKeyModal(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Nouvelle Clé
                  </button>
                </div>

                <div className="space-y-2">
                  {clientKeys.length === 0 ? (
                    <p className="text-slate-400 text-sm">Aucune clé API</p>
                  ) : (
                    clientKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-white">{key.name}</div>
                          <div className="text-sm text-slate-400 font-mono">{key.key_prefix}...</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Dernière utilisation: {key.last_used_at
                              ? new Date(key.last_used_at).toLocaleString('fr-FR')
                              : 'Jamais'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            key.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            key.status === 'expired' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {key.status}
                          </span>
                          {key.status === 'active' && (
                            <button
                              onClick={() => revokeAPIKey(key.id)}
                              className="p-2 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                              title="Révoquer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Sélectionnez un client pour voir les détails</p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateClientModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createClient}
        />
      )}

      {showKeyModal && selectedClient && (
        <CreateKeyModal
          clientName={selectedClient.name}
          onClose={() => setShowKeyModal(false)}
          onCreate={(name) => generateAPIKey(selectedClient.id, name)}
        />
      )}

      {generatedKey && (
        <GeneratedKeyModal
          apiKey={generatedKey}
          onClose={() => setGeneratedKey(null)}
        />
      )}
    </div>
  );
}

function CreateClientModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, email: string, plan: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('free');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(name, email, plan);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-white mb-4">Nouveau Client API</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nom
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-red-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-red-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Plan
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-red-500 focus:outline-none"
            >
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateKeyModal({ clientName, onClose, onCreate }: {
  clientName: string;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [keyName, setKeyName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(keyName);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-white mb-2">Nouvelle Clé API</h3>
        <p className="text-slate-400 text-sm mb-4">Pour {clientName}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nom de la clé
            </label>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="ex: Production Key"
              className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-red-500 focus:outline-none"
              required
            />
          </div>
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Générer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GeneratedKeyModal({ apiKey, onClose }: {
  apiKey: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-2xl w-full">
        <h3 className="text-xl font-bold text-white mb-2">Clé API Générée</h3>
        <p className="text-yellow-400 text-sm mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Attention: Cette clé ne sera affichée qu'une seule fois. Copiez-la maintenant!
        </p>
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-600 mb-4">
          <code className="text-green-400 font-mono text-sm break-all">{apiKey}</code>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyKey}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" />
            {copied ? 'Copié!' : 'Copier la clé'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
