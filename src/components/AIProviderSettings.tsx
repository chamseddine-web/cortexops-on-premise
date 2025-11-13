import React, { useState, useEffect } from 'react';
import { Settings, Check, X, AlertCircle, Info } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface ProviderConfig {
  name: string;
  key: 'mistral' | 'openai' | 'ollama';
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
  description: string;
  setupUrl: string;
  cost: string;
  features: string[];
}

export function AIProviderSettings() {
  const [providers, setProviders] = useState<ProviderConfig[]>([
    {
      name: 'Mistral AI',
      key: 'mistral',
      enabled: !!import.meta.env.VITE_MISTRAL_API_KEY,
      apiKey: import.meta.env.VITE_MISTRAL_API_KEY,
      description: 'Modèles IA européens performants et économiques',
      setupUrl: 'https://console.mistral.ai/',
      cost: 'Dès 0,15€/1M tokens',
      features: [
        'Excellent rapport qualité/prix',
        'Conformité RGPD européenne',
        'Latence ultra-faible',
        'Modèles spécialisés DevOps'
      ]
    },
    {
      name: 'OpenAI',
      key: 'openai',
      enabled: !!import.meta.env.VITE_OPENAI_API_KEY,
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      description: 'GPT-4 et GPT-3.5 pour une qualité premium',
      setupUrl: 'https://platform.openai.com/api-keys',
      cost: 'Dès 0,50€/1M tokens',
      features: [
        'Qualité de génération élevée',
        'Modèles très puissants',
        'Large adoption',
        'Documentation extensive'
      ]
    },
    {
      name: 'Ollama (Local)',
      key: 'ollama',
      enabled: !!import.meta.env.VITE_OLLAMA_ENDPOINT,
      endpoint: import.meta.env.VITE_OLLAMA_ENDPOINT || 'http://localhost:11434',
      description: 'Modèles IA locaux sans connexion internet',
      setupUrl: 'https://ollama.ai/',
      cost: '100% Gratuit',
      features: [
        'Aucun coût, totalement gratuit',
        'Fonctionne hors ligne',
        'Données 100% privées',
        'Aucune limite d\'utilisation'
      ]
    }
  ]);

  const [showConfig, setShowConfig] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'error'>>({});
  const [savedConfig, setSavedConfig] = useState<Record<string, string>>({});

  const testConnection = async (provider: ProviderConfig) => {
    setTestResults(prev => ({ ...prev, [provider.key]: 'testing' }));

    try {
      const response = await fetch(`/api/test-provider/${provider.key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: provider.apiKey,
          endpoint: provider.endpoint
        })
      });

      setTestResults(prev => ({
        ...prev,
        [provider.key]: response.ok ? 'success' : 'error'
      }));
    } catch {
      setTestResults(prev => ({ ...prev, [provider.key]: 'error' }));
    }
  };

  const toggleProvider = (providerKey: string) => {
    setProviders(prev => prev.map(p =>
      p.key === providerKey
        ? { ...p, enabled: !p.enabled }
        : p
    ));
  };

  const saveProviderConfig = (providerKey: string, value: string) => {
    setSavedConfig(prev => ({ ...prev, [providerKey]: value }));
    setProviders(prev => prev.map(p => {
      if (p.key === providerKey) {
        return providerKey === 'ollama'
          ? { ...p, endpoint: value, enabled: !!value }
          : { ...p, apiKey: value, enabled: !!value };
      }
      return p;
    }));
  };

  const getStatusIcon = (provider: ProviderConfig) => {
    const testStatus = testResults[provider.key];

    if (testStatus === 'testing') {
      return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />;
    }

    if (testStatus === 'success') {
      return <Check className="w-5 h-5 text-green-600" />;
    }

    if (testStatus === 'error') {
      return <X className="w-5 h-5 text-red-600" />;
    }

    return provider.enabled
      ? <Check className="w-5 h-5 text-green-600" />
      : <X className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-7 h-7" />
            Configuration des Providers AI
          </h2>
          <p className="text-gray-600 mt-1">
            Activez ou désactivez les providers selon vos besoins
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Recommandation</p>
            <p>
              Utilisez <strong>Mistral AI</strong> comme provider principal (meilleur rapport qualité/prix).
              Configurez <strong>OpenAI</strong> comme fallback en cas de surcharge.
              Ajoutez <strong>Ollama</strong> pour un usage hors ligne.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {providers.map(provider => (
          <Card key={provider.key} className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{provider.name}</h3>
                    {getStatusIcon(provider)}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{provider.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium text-gray-700">{provider.cost}</span>
                    <a
                      href={provider.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Obtenir une clé API →
                    </a>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => testConnection(provider)}
                    disabled={!provider.enabled || testResults[provider.key] === 'testing'}
                    variant="outline"
                    size="sm"
                  >
                    Tester
                  </Button>
                  <Button
                    onClick={() => setShowConfig(showConfig === provider.key ? null : provider.key)}
                    variant="outline"
                    size="sm"
                  >
                    {showConfig === provider.key ? 'Masquer' : 'Configurer'}
                  </Button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={provider.enabled}
                      onChange={() => toggleProvider(provider.key)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {showConfig === provider.key && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="space-y-4">
                    {provider.key === 'ollama' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Endpoint Ollama
                        </label>
                        <input
                          type="text"
                          value={savedConfig[provider.key] || provider.endpoint || ''}
                          onChange={(e) => saveProviderConfig(provider.key, e.target.value)}
                          placeholder="http://localhost:11434"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                          Installez Ollama puis lancez : <code className="bg-gray-100 px-2 py-1 rounded">ollama serve</code>
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Clé API {provider.name}
                        </label>
                        <input
                          type="password"
                          value={savedConfig[provider.key] || ''}
                          onChange={(e) => saveProviderConfig(provider.key, e.target.value)}
                          placeholder={`Entrez votre clé API ${provider.name}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                          Ajoutez <code className="bg-gray-100 px-2 py-1 rounded">
                            VITE_{provider.key.toUpperCase()}_API_KEY
                          </code> dans votre fichier .env
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Fonctionnalités</h4>
                      <ul className="space-y-1">
                        {provider.features.map((feature, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {testResults[provider.key] === 'error' && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div className="text-sm text-red-900">
                    <p className="font-medium">Échec de la connexion</p>
                    <p className="mt-1">
                      {provider.key === 'ollama'
                        ? "Assurez-vous qu'Ollama est installé et lancé avec 'ollama serve'"
                        : "Vérifiez que votre clé API est valide et active"}
                    </p>
                  </div>
                </div>
              )}

              {testResults[provider.key] === 'success' && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="text-sm text-green-900">
                    <p className="font-medium">Connexion réussie</p>
                    <p className="mt-1">Le provider {provider.name} est correctement configuré</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            Stratégie de Fallback Recommandée
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p className="flex items-center gap-2">
              <span className="font-bold text-blue-600">1.</span>
              <strong>Mistral AI</strong> comme provider principal (qualité/prix optimal)
            </p>
            <p className="flex items-center gap-2">
              <span className="font-bold text-blue-600">2.</span>
              <strong>OpenAI</strong> comme fallback en cas d'indisponibilité
            </p>
            <p className="flex items-center gap-2">
              <span className="font-bold text-blue-600">3.</span>
              <strong>Ollama</strong> pour le développement hors ligne
            </p>
          </div>
        </div>
      </Card>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-900">
            <p className="font-medium mb-1">Configuration via fichier .env</p>
            <p>
              Les modifications ici sont temporaires. Pour une configuration permanente,
              modifiez le fichier <code className="bg-yellow-100 px-2 py-1 rounded">.env</code> à la racine du projet
              et redémarrez l'application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
