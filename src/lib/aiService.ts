import {
  AIGenerationRequest,
  AIGenerationResponse,
  getModelConfig
} from './aiModelConfig';

export class AIService {
  private openaiKey?: string;
  private mistralKey?: string;

  constructor(openaiKey?: string, mistralKey?: string) {
    this.openaiKey = openaiKey;
    this.mistralKey = mistralKey;
  }

  async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const startTime = Date.now();
    const modelConfig = getModelConfig(request.modelKey);

    try {
      let response: AIGenerationResponse;

      switch (modelConfig.provider) {
        case 'mistral':
          response = await this.generateMistral(request, modelConfig);
          break;
        case 'openai':
          response = await this.generateOpenAI(request, modelConfig);
          break;
        case 'ollama':
          response = await this.generateOllama(request, modelConfig);
          break;
        default:
          throw new Error(`Provider non supporté: ${modelConfig.provider}`);
      }

      response.processingTime = Date.now() - startTime;
      return response;
    } catch (error) {
      throw new Error(`Erreur lors de la génération AI: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  private async generateMistral(
    request: AIGenerationRequest,
    modelConfig: any
  ): Promise<AIGenerationResponse> {
    if (!this.mistralKey) {
      throw new Error('Clé API Mistral manquante. Configurez VITE_MISTRAL_API_KEY dans .env');
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.mistralKey}`
      },
      body: JSON.stringify({
        model: modelConfig.model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? modelConfig.temperature,
        max_tokens: request.maxTokens ?? modelConfig.maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mistral API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const tokensUsed = data.usage.total_tokens;

    return {
      content,
      modelUsed: modelConfig.model,
      tokensUsed,
      cost: modelConfig.costPerToken ? tokensUsed * modelConfig.costPerToken : undefined,
      processingTime: 0
    };
  }

  private async generateOpenAI(
    request: AIGenerationRequest,
    modelConfig: any
  ): Promise<AIGenerationResponse> {
    if (!this.openaiKey) {
      throw new Error('Clé API OpenAI manquante. Configurez VITE_OPENAI_API_KEY dans .env');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiKey}`
      },
      body: JSON.stringify({
        model: modelConfig.model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? modelConfig.temperature,
        max_tokens: request.maxTokens ?? modelConfig.maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const tokensUsed = data.usage.total_tokens;

    return {
      content,
      modelUsed: modelConfig.model,
      tokensUsed,
      cost: modelConfig.costPerToken ? tokensUsed * modelConfig.costPerToken : undefined,
      processingTime: 0
    };
  }

  private async generateOllama(
    request: AIGenerationRequest,
    modelConfig: any
  ): Promise<AIGenerationResponse> {
    const endpoint = modelConfig.endpoint || 'http://localhost:11434';

    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelConfig.model,
        prompt: `${request.systemPrompt ? request.systemPrompt + '\n\n' : ''}${request.prompt}`,
        stream: false,
        options: {
          temperature: request.temperature ?? modelConfig.temperature,
          num_predict: request.maxTokens ?? modelConfig.maxTokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}. Assurez-vous qu'Ollama est démarré avec 'ollama serve'`);
    }

    const data = await response.json();

    return {
      content: data.response,
      modelUsed: modelConfig.model,
      tokensUsed: data.eval_count || 0,
      processingTime: 0
    };
  }

  async testConnection(provider: 'mistral' | 'openai' | 'ollama'): Promise<boolean> {
    try {
      switch (provider) {
        case 'mistral':
          if (!this.mistralKey) return false;
          const mistralRes = await fetch('https://api.mistral.ai/v1/models', {
            headers: { 'Authorization': `Bearer ${this.mistralKey}` }
          });
          return mistralRes.ok;

        case 'openai':
          if (!this.openaiKey) return false;
          const openaiRes = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${this.openaiKey}` }
          });
          return openaiRes.ok;

        case 'ollama':
          const ollamaRes = await fetch('http://localhost:11434/api/tags');
          return ollamaRes.ok;

        default:
          return false;
      }
    } catch {
      return false;
    }
  }
}

export const createAIService = () => {
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const mistralKey = import.meta.env.VITE_MISTRAL_API_KEY;
  return new AIService(openaiKey, mistralKey);
};
