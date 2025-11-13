import React, { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  Clock,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  RefreshCw,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EnhancedHeader } from './EnhancedHeader';

interface UsageStats {
  current_period: {
    playbooks_generated: number;
    api_calls: number;
    storage_used_mb: number;
    execution_time_ms: number;
  };
  quota: {
    max_playbooks: number;
    max_api_calls: number;
    max_storage_mb: number;
  };
  plan: string;
  period_start: string;
  period_end: string;
}

interface DailyUsage {
  date: string;
  playbooks: number;
  api_calls: number;
  success_rate: number;
}

export const UsageDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (user) {
      loadUsageData();
    }
  }, [user, timeRange]);

  const loadUsageData = async () => {
    try {
      setLoading(true);

      // Charger les stats de la période actuelle
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('user_plan')
        .eq('id', user?.id)
        .maybeSingle();

      // Simuler les données pour démonstration (à remplacer par vraies données)
      const plan = profileData?.user_plan || 'free';
      const quotas = {
        free: { max_playbooks: 5, max_api_calls: 100, max_storage_mb: 100 },
        pro: { max_playbooks: -1, max_api_calls: 10000, max_storage_mb: 5000 },
        team: { max_playbooks: -1, max_api_calls: 50000, max_storage_mb: 20000 },
        enterprise: { max_playbooks: -1, max_api_calls: -1, max_storage_mb: -1 },
      };

      // Compter les playbooks générés ce mois
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: playbooksCount } = await supabase
        .from('generated_playbooks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('created_at', startOfMonth.toISOString());

      // Compter les API calls
      const { count: apiCallsCount } = await supabase
        .from('api_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('timestamp', startOfMonth.toISOString());

      const mockStats: UsageStats = {
        current_period: {
          playbooks_generated: playbooksCount || 0,
          api_calls: apiCallsCount || 0,
          storage_used_mb: Math.floor(Math.random() * 500),
          execution_time_ms: Math.floor(Math.random() * 5000),
        },
        quota: quotas[plan as keyof typeof quotas],
        plan,
        period_start: startOfMonth.toISOString(),
        period_end: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).toISOString(),
      };

      setStats(mockStats);

      // Générer les données journalières
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const mockDailyData: DailyUsage[] = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - i - 1));
        return {
          date: date.toISOString().split('T')[0],
          playbooks: Math.floor(Math.random() * 10),
          api_calls: Math.floor(Math.random() * 100),
          success_rate: 85 + Math.random() * 15,
        };
      });

      setDailyUsage(mockDailyData);
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-400 bg-red-900/20 border-red-500/30';
    if (percentage >= 70) return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
    return 'text-green-400 bg-green-900/20 border-green-500/30';
  };

  const exportUsageReport = () => {
    if (!stats) return;

    const report = {
      period: {
        start: new Date(stats.period_start).toLocaleDateString('fr-FR'),
        end: new Date(stats.period_end).toLocaleDateString('fr-FR'),
      },
      plan: stats.plan,
      usage: stats.current_period,
      quotas: stats.quota,
      daily_usage: dailyUsage,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cortexops-usage-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-slate-950">
        <EnhancedHeader />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const playbooksPercentage = getUsagePercentage(
    stats.current_period.playbooks_generated,
    stats.quota.max_playbooks
  );
  const apiCallsPercentage = getUsagePercentage(
    stats.current_period.api_calls,
    stats.quota.max_api_calls
  );
  const storagePercentage = getUsagePercentage(
    stats.current_period.storage_used_mb,
    stats.quota.max_storage_mb
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <EnhancedHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/app')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Retour à l'application"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-500" />
                Ma Consommation
              </h1>
              <p className="text-slate-400 mt-1">
                Période: {new Date(stats.period_start).toLocaleDateString('fr-FR')} - {new Date(stats.period_end).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadUsageData}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
            <button
              onClick={exportUsageReport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </div>

        {/* Plan Info */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-blue-400" />
              <div>
                <div className="text-sm text-slate-400">Plan actuel</div>
                <div className="text-lg font-bold text-white capitalize">{stats.plan}</div>
              </div>
            </div>
            <a
              href="/pricing"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Améliorer mon plan
            </a>
          </div>
        </div>

        {/* Quota Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Playbooks */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">Playbooks générés</h3>
              </div>
              {playbooksPercentage >= 90 && (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {stats.current_period.playbooks_generated}
                </span>
                {stats.quota.max_playbooks !== -1 && (
                  <span className="text-slate-400">/ {stats.quota.max_playbooks}</span>
                )}
                {stats.quota.max_playbooks === -1 && (
                  <span className="text-slate-400">/ ∞</span>
                )}
              </div>
            </div>

            {stats.quota.max_playbooks !== -1 && (
              <>
                <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      playbooksPercentage >= 90
                        ? 'bg-red-500'
                        : playbooksPercentage >= 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${playbooksPercentage}%` }}
                  />
                </div>
                <div className="text-sm text-slate-400">
                  {playbooksPercentage.toFixed(0)}% utilisé
                </div>
              </>
            )}
          </div>

          {/* API Calls */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-white">Appels API</h3>
              </div>
              {apiCallsPercentage >= 90 && (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {stats.current_period.api_calls.toLocaleString()}
                </span>
                {stats.quota.max_api_calls !== -1 && (
                  <span className="text-slate-400">/ {stats.quota.max_api_calls.toLocaleString()}</span>
                )}
                {stats.quota.max_api_calls === -1 && (
                  <span className="text-slate-400">/ ∞</span>
                )}
              </div>
            </div>

            {stats.quota.max_api_calls !== -1 && (
              <>
                <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      apiCallsPercentage >= 90
                        ? 'bg-red-500'
                        : apiCallsPercentage >= 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${apiCallsPercentage}%` }}
                  />
                </div>
                <div className="text-sm text-slate-400">
                  {apiCallsPercentage.toFixed(0)}% utilisé
                </div>
              </>
            )}
          </div>

          {/* Storage */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Stockage</h3>
              </div>
              {storagePercentage >= 90 && (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {stats.current_period.storage_used_mb}
                </span>
                {stats.quota.max_storage_mb !== -1 && (
                  <span className="text-slate-400">/ {stats.quota.max_storage_mb} MB</span>
                )}
                {stats.quota.max_storage_mb === -1 && (
                  <span className="text-slate-400 text-sm">/ ∞ MB</span>
                )}
              </div>
            </div>

            {stats.quota.max_storage_mb !== -1 && (
              <>
                <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      storagePercentage >= 90
                        ? 'bg-red-500'
                        : storagePercentage >= 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${storagePercentage}%` }}
                  />
                </div>
                <div className="text-sm text-slate-400">
                  {storagePercentage.toFixed(0)}% utilisé
                </div>
              </>
            )}
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            Historique d'utilisation
          </h2>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {range === '7d' ? '7 jours' : range === '30d' ? '30 jours' : '90 jours'}
              </button>
            ))}
          </div>
        </div>

        {/* Usage Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
          <div className="space-y-4">
            {dailyUsage.map((day, index) => {
              const maxPlaybooks = Math.max(...dailyUsage.map((d) => d.playbooks));
              const maxApiCalls = Math.max(...dailyUsage.map((d) => d.api_calls));

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 w-24">
                      {new Date(day.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                    <div className="flex-1 flex gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">Playbooks</span>
                          <span className="text-xs text-slate-400">{day.playbooks}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{
                              width: `${(day.playbooks / maxPlaybooks) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">API Calls</span>
                          <span className="text-xs text-slate-400">{day.api_calls}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-green-500"
                            style={{
                              width: `${(day.api_calls / maxApiCalls) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-24 justify-end">
                      <div
                        className={`text-xs font-medium ${
                          day.success_rate >= 95
                            ? 'text-green-400'
                            : day.success_rate >= 85
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}
                      >
                        {day.success_rate.toFixed(0)}%
                      </div>
                      {day.success_rate >= 95 ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Performance
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Temps de réponse moyen</span>
                <span className="text-white font-medium">{stats.current_period.execution_time_ms}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Taux de succès</span>
                <span className="text-green-400 font-medium">
                  {dailyUsage.length > 0
                    ? (dailyUsage.reduce((sum, d) => sum + d.success_rate, 0) / dailyUsage.length).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Tendances
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Évolution ce mois</span>
                <span className="text-green-400 font-medium flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  +12%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Pic d'utilisation</span>
                <span className="text-white font-medium">
                  {Math.max(...dailyUsage.map((d) => d.playbooks))} playbooks/jour
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
