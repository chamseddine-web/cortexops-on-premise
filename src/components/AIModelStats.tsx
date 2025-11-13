import React from 'react';
import { BarChart3, Clock, DollarSign, Zap } from 'lucide-react';
import { AIGenerationResponse } from '../lib/aiModelConfig';

interface ModelStats {
  modelKey: string;
  totalGenerations: number;
  totalTokens: number;
  totalCost: number;
  avgProcessingTime: number;
  successRate: number;
}

interface AIModelStatsProps {
  stats: ModelStats[];
  recentGenerations: AIGenerationResponse[];
}

export function AIModelStats({ stats, recentGenerations }: AIModelStatsProps) {
  const totalCost = stats.reduce((sum, s) => sum + s.totalCost, 0);
  const totalGenerations = stats.reduce((sum, s) => sum + s.totalGenerations, 0);
  const avgTime = stats.reduce((sum, s) => sum + s.avgProcessingTime, 0) / stats.length;

  const sortedByUsage = [...stats].sort((a, b) => b.totalGenerations - a.totalGenerations);
  const mostUsedModel = sortedByUsage[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Statistiques des modèles AI</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-gray-400">Total générations</span>
          </div>
          <div className="text-2xl font-bold text-white">{totalGenerations.toLocaleString()}</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-400">Temps moyen</span>
          </div>
          <div className="text-2xl font-bold text-white">{avgTime.toFixed(0)}ms</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-400">Coût total</span>
          </div>
          <div className="text-2xl font-bold text-white">${totalCost.toFixed(4)}</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-gray-400">Modèle favori</span>
          </div>
          <div className="text-lg font-bold text-white truncate">
            {mostUsedModel?.modelKey || 'N/A'}
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Performance par modèle</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Modèle
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Utilisations
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Tokens
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Coût
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Temps moy.
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Succès
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sortedByUsage.map((stat) => {
                const usagePercentage = (stat.totalGenerations / totalGenerations) * 100;

                return (
                  <tr key={stat.modelKey} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-white">{stat.modelKey}</div>
                        <div className="h-2 flex-1 bg-gray-700 rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${usagePercentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {stat.totalGenerations.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {stat.totalTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-green-400">
                      ${stat.totalCost.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {stat.avgProcessingTime.toFixed(0)}ms
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`
                          px-2 py-1 rounded text-xs font-medium
                          ${stat.successRate >= 95 ? 'bg-green-500/20 text-green-400' :
                            stat.successRate >= 80 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'}
                        `}
                      >
                        {stat.successRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {recentGenerations.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Générations récentes</h3>
          </div>

          <div className="divide-y divide-gray-700">
            {recentGenerations.slice(0, 5).map((gen, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-700/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{gen.modelUsed}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">
                        {gen.tokensUsed.toLocaleString()} tokens
                      </span>
                      {gen.cost && (
                        <>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-green-400">${gen.cost.toFixed(4)}</span>
                        </>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 truncate">
                      {gen.content.substring(0, 100)}...
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {gen.processingTime}ms
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 Recommandations</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          {totalCost > 1 && (
            <li>• Votre coût dépasse $1. Envisagez mistral-nemo ou Ollama local pour économiser.</li>
          )}
          {avgTime > 5000 && (
            <li>• Temps de traitement élevé détecté. Essayez mistral-small pour plus de rapidité.</li>
          )}
          {mostUsedModel && mostUsedModel.modelKey.includes('large') && totalGenerations > 50 && (
            <li>• Vous utilisez souvent mistral-large. Pour les tâches simples, mistral-nemo suffit.</li>
          )}
          {stats.length === 1 && (
            <li>• Testez différents modèles pour trouver le meilleur compromis qualité/prix.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
