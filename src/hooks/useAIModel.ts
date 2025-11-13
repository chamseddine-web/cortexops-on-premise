import { useState, useCallback } from 'react';
import { createAIService } from '../lib/aiService';
import { AIGenerationRequest, AIGenerationResponse } from '../lib/aiModelConfig';

interface UseAIModelOptions {
  defaultModel?: string;
  onError?: (error: Error) => void;
  onSuccess?: (response: AIGenerationResponse) => void;
}

export function useAIModel(options: UseAIModelOptions = {}) {
  const [selectedModel, setSelectedModel] = useState(options.defaultModel || 'mistral-large');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResponse, setLastResponse] = useState<AIGenerationResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(async (
    prompt: string,
    systemPrompt?: string,
    overrideOptions?: Partial<AIGenerationRequest>
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      const aiService = createAIService();

      const request: AIGenerationRequest = {
        prompt,
        modelKey: selectedModel,
        systemPrompt,
        ...overrideOptions
      };

      const response = await aiService.generate(request);
      setLastResponse(response);

      if (options.onSuccess) {
        options.onSuccess(response);
      }

      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur inconnue');
      setError(error);

      if (options.onError) {
        options.onError(error);
      }

      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [selectedModel, options]);

  const changeModel = useCallback((modelKey: string) => {
    setSelectedModel(modelKey);
    setError(null);
  }, []);

  return {
    selectedModel,
    setSelectedModel: changeModel,
    isGenerating,
    generate,
    lastResponse,
    error
  };
}
