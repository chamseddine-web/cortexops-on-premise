import { useState, useEffect } from 'react';
import {
  Users, Building2, Globe, Briefcase, TrendingUp,
  Download, RefreshCw, BarChart3, PieChart,
  Activity, Target, Zap, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AnalyticsStats {
  total_profiles: number;
  by_industry: Record<string, number>;
  by_company_size: Record<string, number>;
  by_country: Record<string, number>;
  top_use_cases: Record<string, number>;
}

interface ProfileDetail {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  job_title: string;
  company_name: string;
  company_size: string;
  industry: string;
  country: string;
  use_cases: string[];
  created_at: string;
}

export function ProfessionalAnalytics() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [profiles, setProfiles] = useState<ProfileDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'overview' | 'details'>('overview');

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_professional_profiles_stats');

      if (error) throw error;
      setStats(data[0]);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('professional_profiles')
        .select(`
          id,
          user_id,
          job_title,
          company_name,
          company_size,
          industry,
          country,
          use_cases,
          created_at,
          user_profiles!inner(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedProfiles = data?.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.user_profiles.full_name,
        email: p.user_profiles.email,
        job_title: p.job_title,
        company_name: p.company_name,
        company_size: p.company_size,
        industry: p.industry,
        country: p.country,
        use_cases: p.use_cases,
        created_at: p.created_at
      })) || [];

      setProfiles(formattedProfiles);
    } catch (err) {
      console.error('Error loading profiles:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadProfiles()]);
      setLoading(false);
    };
    load();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadProfiles()]);
    setRefreshing(false);
  };

  const handleExportCSV = () => {
    if (profiles.length === 0) return;

    const headers = [
      'Full Name', 'Email', 'Job Title', 'Company', 'Company Size',
      'Industry', 'Country', 'Use Cases', 'Created At'
    ];

    const rows = profiles.map(p => [
      p.full_name,
      p.email,
      p.job_title || '',
      p.company_name || '',
      p.company_size || '',
      p.industry || '',
      p.country || '',
      (p.use_cases || []).join(', '),
      new Date(p.created_at).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `professional_profiles_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getIndustryLabel = (key: string) => {
    const labels: Record<string, string> = {
      technology: 'Technologie / IT',
      finance: 'Finance / Banque',
      healthcare: 'Santé',
      ecommerce: 'E-commerce',
      manufacturing: 'Industrie',
      education: 'Éducation',
      media: 'Média',
      consulting: 'Conseil',
      government: 'Public',
      other: 'Autre'
    };
    return labels[key] || key;
  };

  const getUseCaseLabel = (key: string) => {
    const labels: Record<string, string> = {
      cicd: 'CI/CD Automation',
      infrastructure: 'Infrastructure as Code',
      security: 'Security Hardening',
      monitoring: 'Monitoring Setup',
      deployment: 'Application Deployment',
      cloud: 'Cloud Provisioning'
    };
    return labels[key] || key;
  };

  const getUseCaseIcon = (key: string) => {
    const icons: Record<string, string> = {
      cicd: '🚀',
      infrastructure: '🏗️',
      security: '🔒',
      monitoring: '📊',
      deployment: '📦',
      cloud: '☁️'
    };
    return icons[key] || '🔧';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Aucune donnée disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Analytics Professionnels
            </h1>
            <p className="text-gray-400">
              Statistiques et insights sur les profils utilisateurs
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              view === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Vue d'ensemble
          </button>
          <button
            onClick={() => setView('details')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              view === 'details'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Détails des profils
          </button>
        </div>

        {view === 'overview' ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-blue-400" />
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {stats.total_profiles.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Profils professionnels</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <Building2 className="w-8 h-8 text-purple-400" />
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {Object.keys(stats.by_industry || {}).length}
                </div>
                <div className="text-sm text-gray-400">Secteurs représentés</div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <Globe className="w-8 h-8 text-green-400" />
                  <Target className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {Object.keys(stats.by_country || {}).length}
                </div>
                <div className="text-sm text-gray-400">Pays actifs</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <Zap className="w-8 h-8 text-orange-400" />
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {Object.keys(stats.top_use_cases || {}).length}
                </div>
                <div className="text-sm text-gray-400">Cas d'usage</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Industry Distribution */}
              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Distribution par secteur</h2>
                </div>
                <div className="space-y-3">
                  {Object.entries(stats.by_industry || {})
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([industry, count]) => {
                      const percentage = ((count / stats.total_profiles) * 100).toFixed(1);
                      return (
                        <div key={industry} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">{getIndustryLabel(industry)}</span>
                            <span className="text-gray-400">{count} ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Company Size */}
              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">Taille des entreprises</h2>
                </div>
                <div className="space-y-3">
                  {Object.entries(stats.by_company_size || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([size, count]) => {
                      const percentage = ((count / stats.total_profiles) * 100).toFixed(1);
                      return (
                        <div key={size} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">{size} employés</span>
                            <span className="text-gray-400">{count} ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Use Cases */}
              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Target className="w-6 h-6 text-green-400" />
                  <h2 className="text-xl font-bold text-white">Cas d'usage populaires</h2>
                </div>
                <div className="space-y-3">
                  {Object.entries(stats.top_use_cases || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([useCase, count]) => (
                      <div
                        key={useCase}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getUseCaseIcon(useCase)}</span>
                          <span className="text-gray-300">{getUseCaseLabel(useCase)}</span>
                        </div>
                        <span className="text-green-400 font-semibold">{count}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Geographic Distribution */}
              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="w-6 h-6 text-orange-400" />
                  <h2 className="text-xl font-bold text-white">Distribution géographique</h2>
                </div>
                <div className="space-y-3">
                  {Object.entries(stats.by_country || {})
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([country, count]) => {
                      const percentage = ((count / stats.total_profiles) * 100).toFixed(1);
                      return (
                        <div key={country} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">{country}</span>
                            <span className="text-gray-400">{count} ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Profiles Table */
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800/50 border-b border-gray-700">
                    <th className="text-left p-4 text-gray-400 font-semibold">Nom</th>
                    <th className="text-left p-4 text-gray-400 font-semibold">Email</th>
                    <th className="text-left p-4 text-gray-400 font-semibold">Poste</th>
                    <th className="text-left p-4 text-gray-400 font-semibold">Entreprise</th>
                    <th className="text-left p-4 text-gray-400 font-semibold">Secteur</th>
                    <th className="text-left p-4 text-gray-400 font-semibold">Pays</th>
                    <th className="text-left p-4 text-gray-400 font-semibold">Inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr
                      key={profile.id}
                      className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="text-white font-medium">{profile.full_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-400">{profile.email}</td>
                      <td className="p-4 text-gray-300">{profile.job_title || '-'}</td>
                      <td className="p-4">
                        <div>
                          <div className="text-white">{profile.company_name || '-'}</div>
                          {profile.company_size && (
                            <div className="text-xs text-gray-500">{profile.company_size} employés</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">
                        {profile.industry ? getIndustryLabel(profile.industry) : '-'}
                      </td>
                      <td className="p-4 text-gray-300">{profile.country || '-'}</td>
                      <td className="p-4 text-gray-400 text-sm">
                        {new Date(profile.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {profiles.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Aucun profil trouvé</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
