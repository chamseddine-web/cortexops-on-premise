export type AIProvider = 'openai' | 'mistral' | 'ollama';

export interface AIModelConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  endpoint?: string;
  description: string;
  useCases: string[];
  costPerToken?: number;
  maxTokens: number;
  temperature: number;
  requiresApiKey: boolean;
}

export const AI_MODELS: Record<string, AIModelConfig> = {
  'mistral-large': {
    provider: 'mistral',
    model: 'mistral-large-latest',
    description: 'Meilleur pour la génération de playbooks complexes avec structure parfaite',
    useCases: ['Génération de playbooks', 'Projets complexes', 'Production-ready'],
    costPerToken: 0.000008,
    maxTokens: 32000,
    temperature: 0.7,
    requiresApiKey: true
  },
  'mistral-small': {
    provider: 'mistral',
    model: 'mistral-small-latest',
    description: 'Idéal pour audit, correction et validation - très rapide',
    useCases: ['Audit de playbooks', 'Corrections YAML', 'Validation syntaxe'],
    costPerToken: 0.000002,
    maxTokens: 32000,
    temperature: 0.3,
    requiresApiKey: true
  },
  'mistral-nemo': {
    provider: 'mistral',
    model: 'open-mistral-nemo',
    description: 'Performances optimales avec coût réduit (4× moins cher)',
    useCases: ['Usage quotidien', 'Prototypage', 'Tests'],
    costPerToken: 0.000002,
    maxTokens: 16000,
    temperature: 0.7,
    requiresApiKey: true
  },
  'mistral-7b-local': {
    provider: 'ollama',
    model: 'mistral:7b',
    endpoint: 'http://localhost:11434',
    description: 'Version locale sans coût - fonctionne offline',
    useCases: ['On-premise', 'Sans connexion', 'Données sensibles'],
    maxTokens: 8000,
    temperature: 0.7,
    requiresApiKey: false
  },
  'gpt-4': {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    description: 'OpenAI GPT-4 pour comparaison',
    useCases: ['Référence qualité', 'Tâches complexes'],
    costPerToken: 0.00001,
    maxTokens: 128000,
    temperature: 0.7,
    requiresApiKey: true
  },
  'gpt-3.5': {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    description: 'OpenAI GPT-3.5 rapide et économique',
    useCases: ['Tâches simples', 'Budget limité'],
    costPerToken: 0.0000005,
    maxTokens: 16000,
    temperature: 0.7,
    requiresApiKey: true
  }
};

export const DEFAULT_MODEL = 'mistral-large';

export function getModelConfig(modelKey: string): AIModelConfig {
  return AI_MODELS[modelKey] || AI_MODELS[DEFAULT_MODEL];
}

export function getModelsByUseCase(useCase: string): AIModelConfig[] {
  return Object.values(AI_MODELS).filter(model =>
    model.useCases.some(uc => uc.toLowerCase().includes(useCase.toLowerCase()))
  );
}

export function getAvailableModels(hasApiKeys: { openai?: boolean; mistral?: boolean }): AIModelConfig[] {
  return Object.values(AI_MODELS).filter(model => {
    if (!model.requiresApiKey) return true;
    if (model.provider === 'openai') return hasApiKeys.openai;
    if (model.provider === 'mistral') return hasApiKeys.mistral;
    return false;
  });
}

export function calculateEstimatedCost(modelKey: string, estimatedTokens: number): number {
  const model = getModelConfig(modelKey);
  if (!model.costPerToken) return 0;
  return model.costPerToken * estimatedTokens;
}

export interface AIGenerationRequest {
  prompt: string;
  modelKey: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerationResponse {
  content: string;
  modelUsed: string;
  tokensUsed: number;
  cost?: number;
  processingTime: number;
}
