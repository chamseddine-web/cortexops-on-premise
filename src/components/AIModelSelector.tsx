import React, { useState, useEffect } from 'react';
import { Zap, DollarSign, Wifi, WifiOff, CheckCircle, XCircle } from 'lucide-react';
import { AI_MODELS, getModelConfig, calculateEstimatedCost, AIModelConfig } from '../lib/aiModelConfig';
import { createAIService } from '../lib/aiService';

interface AIModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelKey: string) => void;
  estimatedTokens?: number;
}

export function AIModelSelector({ selectedModel, onModelChange, estimatedTokens = 1000 }: AIModelSelectorProps) {
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>({});
  const [isChecking, setIsChecking] = useState(false);

  const checkConnections = async () => {
    setIsChecking(true);
    const aiService = createAIService();

    const mistralOk = await aiService.testConnection('mistral');
    const openaiOk = await aiService.testConnection('openai');
    const ollamaOk = await aiService.testConnection('ollama');

    setConnectionStatus({
      mistral: mistralOk,
      openai: openaiOk,
      ollama: ollamaOk
    });
    setIsChecking(false);
  };

  useEffect(() => {
    checkConnections();
  }, []);

  const getStatusIcon = (model: AIModelConfig) => {
    if (isChecking) {
      return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    }

    const isAvailable = connectionStatus[model.provider];

    if (!model.requiresApiKey) {
      return isAvailable ?
        <CheckCircle className="w-4 h-4 text-green-500" /> :
        <XCircle className="w-4 h-4 text-red-500" />;
    }

    return isAvailable ?
      <CheckCircle className="w-4 h-4 text-green-500" /> :
      <XCircle className="w-4 h-4 text-yellow-500" />;
  };

  const groupedModels = {
    'mistral': Object.entries(AI_MODELS).filter(([_, m]) => m.provider === 'mistral'),
    'openai': Object.entries(AI_MODELS).filter(([_, m]) => m.provider === 'openai'),
    'ollama': Object.entries(AI_MODELS).filter(([_, m]) => m.provider === 'ollama')
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Modèle de génération AI</h3>
        <button
          onClick={checkConnections}
          disabled={isChecking}
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
        >
          {isChecking ? 'Vérification...' : 'Tester connexions'}
        </button>
      </div>

      {Object.entries(groupedModels).map(([provider, models]) => (
        models.length > 0 && (
          <div key={provider} className="space-y-2">
            <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide flex items-center gap-2">
              {provider === 'ollama' && <WifiOff className="w-4 h-4" />}
              {provider !== 'ollama' && <Wifi className="w-4 h-4" />}
              {provider}
            </h4>

            <div className="grid grid-cols-1 gap-2">
              {models.map(([key, model]) => {
                const cost = calculateEstimatedCost(key, estimatedTokens);
                const isSelected = selectedModel === key;
                const isAvailable = connectionStatus[model.provider];

                return (
                  <button
                    key={key}
                    onClick={() => onModelChange(key)}
                    disabled={!isAvailable && model.requiresApiKey}
                    className={`
                      p-4 rounded-lg border-2 text-left transition-all
                      ${isSelected
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }
                      ${!isAvailable && model.requiresApiKey ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(model)}
                          <h5 className="font-semibold text-white truncate">
                            {model.model}
                          </h5>
                        </div>

                        <p className="text-sm text-gray-400 mb-2">
                          {model.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-2">
                          {model.useCases.map((useCase, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-gray-700/50 text-gray-300 rounded"
                            >
                              {useCase}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {model.maxTokens.toLocaleString()} tokens max
                          </div>
                          {model.costPerToken && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              ~${cost.toFixed(4)} / requête
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                      )}
                    </div>

                    {!isAvailable && model.requiresApiKey && (
                      <div className="mt-2 text-xs text-yellow-500">
                        ⚠️ Clé API manquante - Configurez VITE_{provider.toUpperCase()}_API_KEY
                      </div>
                    )}

                    {!isAvailable && !model.requiresApiKey && (
                      <div className="mt-2 text-xs text-red-500">
                        ⚠️ Ollama non disponible - Installez et démarrez avec 'ollama serve'
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )
      ))}

      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 Recommandations</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <strong>mistral-large-latest</strong> : Génération de playbooks complexes</li>
          <li>• <strong>mistral-small-latest</strong> : Audit et corrections rapides</li>
          <li>• <strong>open-mistral-nemo</strong> : Meilleur rapport qualité/prix</li>
          <li>• <strong>mistral:7b (Ollama)</strong> : Mode offline sans coût</li>
        </ul>
      </div>
    </div>
  );
}
