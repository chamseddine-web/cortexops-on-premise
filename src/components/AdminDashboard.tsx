import React, { useState, useEffect } from 'react';
import {
  Users,
  Key,
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Download,
  MoreVertical,
  Shield,
  Database,
  Zap,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  Settings,
  XCircle,
  Server
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface AdminStats {
  total_users: number;
  active_users: number;
  total_api_calls: number;
  revenue_mtd: number;
  free_users: number;
  pro_users: number;
  enterprise_users: number;
}

interface UserRecord {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  user_role: string;
  user_plan: string;
  user_status: 'active' | 'inactive' | 'suspended';
  api_calls_today?: number;
  created_at: string;
  last_login: string | null;
}

interface APIUsageRecord {
  client_name: string;
  total_calls: number;
  success_rate: number;
  avg_response_time: number;
  plan: string;
}

interface RecentActivity {
  user_email: string;
  user_name: string;
  action_type: string;
  action_description: string;
  created_at: string;
}

interface SystemHealth {
  service_name: string;
  status: string;
  uptime_percentage: number;
  last_check: string;
  response_time: number;
}

interface RevenueMetric {
  period: string;
  amount: number;
  growth_rate: number | null;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'api' | 'billing' | 'system'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [apiUsage, setApiUsage] = useState<APIUsageRecord[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([]);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.user_role !== 'admin') {
        setError('Accès refusé : Vous devez être administrateur');
        setTimeout(() => navigate('/app'), 3000);
        return;
      }

      loadAdminData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      setError('Erreur lors de la vérification des permissions');
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les statistiques principales
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_admin_stats');

      if (statsError) throw statsError;
      if (statsData && statsData.length > 0) setStats(statsData[0]);

      // Charger les utilisateurs
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (usersError) throw usersError;
      if (usersData) setUsers(usersData);

      // Charger l'utilisation API
      const { data: apiData, error: apiError } = await supabase
        .rpc('get_api_usage_stats');

      if (apiError) throw apiError;
      if (apiData) setApiUsage(apiData);

      // Charger les activités récentes
      const { data: activitiesData, error: activitiesError } = await supabase
        .rpc('get_recent_activities', { limit_count: 10 });

      if (activitiesError) throw activitiesError;
      if (activitiesData) setRecentActivities(activitiesData);

      // Charger l'état du système
      const { data: healthData, error: healthError } = await supabase
        .rpc('get_system_health');

      if (healthError) throw healthError;
      if (healthData) setSystemHealth(healthData);

      // Charger les métriques de revenu
      const { data: revenueData, error: revenueError } = await supabase
        .rpc('get_revenue_metrics');

      if (revenueError) throw revenueError;
      if (revenueData) setRevenueMetrics(revenueData);

    } catch (error: any) {
      console.error('Error loading admin data:', error);
      setError(error.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAdminData();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPlan = filterPlan === 'all' || user.user_plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement du dashboard admin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md p-8">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Erreur d'accès</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button onClick={() => navigate('/app')}>
              Retour à l'application
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
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
                  <Shield className="w-8 h-8 text-blue-500" />
                  <span>Administration CortexOps</span>
                </h1>
                <p className="text-gray-400 mt-1">Tableau de bord administrateur</p>
              </div>
            </div>

            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={Users}
              label="Utilisateurs Total"
              value={stats.total_users.toString()}
              subvalue={`${stats.active_users} actifs`}
              trend="+12%"
              trendUp={true}
              color="blue"
            />
            <StatCard
              icon={Activity}
              label="Appels API (24h)"
              value={stats.total_api_calls.toLocaleString()}
              subvalue="Moyenne: 450/min"
              trend="+8%"
              trendUp={true}
              color="green"
            />
            <StatCard
              icon={DollarSign}
              label="Revenu (MTD)"
              value={`${stats.revenue_mtd.toLocaleString()}€`}
              subvalue={`MRR: ${(stats.revenue_mtd * 1.2).toFixed(0)}€`}
              trend="+15%"
              trendUp={true}
              color="purple"
            />
            <StatCard
              icon={CheckCircle}
              label="Uptime SLA"
              value="99.98%"
              subvalue="Target: 99.9%"
              trend="Excellent"
              trendUp={true}
              color="emerald"
            />
          </div>
        )}

        {/* Plan Distribution */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <PlanCard plan="FREE" count={stats.free_users} color="gray" />
            <PlanCard plan="PRO" count={stats.pro_users} color="blue" />
            <PlanCard plan="ENTERPRISE" count={stats.enterprise_users} color="purple" />
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: Activity },
              { id: 'users', label: 'Utilisateurs', icon: Users },
              { id: 'api', label: 'API Usage', icon: Key },
              { id: 'billing', label: 'Facturation', icon: DollarSign },
              { id: 'system', label: 'Système', icon: Server },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-500'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab
            activities={recentActivities}
            health={systemHealth}
            revenue={revenueMetrics}
          />
        )}
        {activeTab === 'users' && (
          <UsersTab
            users={filteredUsers}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterPlan={filterPlan}
            setFilterPlan={setFilterPlan}
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === 'api' && <APIUsageTab usage={apiUsage} />}
        {activeTab === 'billing' && <BillingTab revenue={revenueMetrics} />}
        {activeTab === 'system' && <SystemTab health={systemHealth} />}
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  subvalue: string;
  trend: string;
  trendUp: boolean;
  color: string;
}> = ({ icon: Icon, label, value, subvalue, trend, trendUp, color }) => {
  const colors = {
    blue: 'bg-blue-600/20 text-blue-500',
    green: 'bg-green-600/20 text-green-500',
    purple: 'bg-purple-600/20 text-purple-500',
    emerald: 'bg-emerald-600/20 text-emerald-500',
  };

  return (
    <Card className="p-6 bg-gray-800 border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors[color as keyof typeof colors]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center space-x-1 text-sm ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
          {trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{trend}</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-gray-400">{label}</div>
        <div className="text-xs text-gray-500">{subvalue}</div>
      </div>
    </Card>
  );
};

const PlanCard: React.FC<{ plan: string; count: number; color: string }> = ({ plan, count, color }) => {
  const colors = {
    gray: 'bg-gray-700 border-gray-600',
    blue: 'bg-blue-600/20 border-blue-500',
    purple: 'bg-purple-600/20 border-purple-500',
  };

  return (
    <Card className={`p-8 text-center border-2 ${colors[color as keyof typeof colors]}`}>
      <div className="text-4xl font-bold mb-2 text-white">{count}</div>
      <div className="text-sm uppercase font-medium text-gray-300">{plan}</div>
    </Card>
  );
};

const OverviewTab: React.FC<{
  activities: RecentActivity[];
  health: SystemHealth[];
  revenue: RevenueMetric[];
}> = ({ activities, health, revenue }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activités récentes */}
        <Card className="p-6 bg-gray-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Activité récente
          </h3>
          <div className="space-y-3">
            {activities.length > 0 ? activities.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                <div className="flex-1">
                  <div className="font-medium text-sm text-white">{activity.user_email}</div>
                  <div className="text-xs text-gray-400">{activity.action_description || activity.action_type}</div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(activity.created_at).toLocaleTimeString('fr-FR')}
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-500 py-8">
                Aucune activité récente
              </div>
            )}
          </div>
        </Card>

        {/* État du système */}
        <Card className="p-6 bg-gray-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-green-500" />
            État du système
          </h3>
          <div className="space-y-3">
            {health.map((service, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-700/50 rounded-lg">
                {service.status === 'operational' && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                {service.status === 'degraded' && <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />}
                {service.status === 'down' && <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{service.service_name}</div>
                  <div className="text-xs text-gray-400">
                    Uptime: {service.uptime_percentage.toFixed(2)}% • Latence: {service.response_time.toFixed(0)}ms
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Graphique de revenu */}
      {revenue.length > 0 && (
        <Card className="p-6 bg-gray-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            Évolution des revenus (12 derniers mois)
          </h3>
          <div className="space-y-2">
            {revenue.map((metric, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-white w-24">{metric.period}</span>
                  <span className="text-lg font-bold text-white">{metric.amount.toLocaleString()}€</span>
                </div>
                {metric.growth_rate !== null && (
                  <span className={`text-sm flex items-center gap-1 ${
                    metric.growth_rate >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {metric.growth_rate >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(metric.growth_rate).toFixed(1)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

const UsersTab: React.FC<{
  users: UserRecord[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterPlan: string;
  setFilterPlan: (plan: string) => void;
  onRefresh: () => void;
}> = ({ users, searchTerm, setSearchTerm, filterPlan, setFilterPlan, onRefresh }) => {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
          />
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
        >
          <option value="all">Tous les plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <Button onClick={onRefresh} variant="outline">
          <Download className="w-5 h-5" />
        </Button>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Entreprise</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Inscription</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-white">{user.full_name || 'N/A'}</div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.company || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.user_plan === 'free' ? 'bg-gray-700 text-gray-300' :
                      user.user_plan === 'pro' ? 'bg-blue-700 text-blue-300' :
                      'bg-purple-700 text-purple-300'
                    }`}>
                      {user.user_plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.user_status === 'active' ? 'bg-green-700 text-green-300' :
                      user.user_status === 'inactive' ? 'bg-gray-700 text-gray-300' :
                      'bg-red-700 text-red-300'
                    }`}>
                      {user.user_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="p-1 hover:bg-gray-600 rounded transition-colors">
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {users.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Aucun utilisateur trouvé
        </div>
      )}
    </div>
  );
};

const APIUsageTab: React.FC<{ usage: APIUsageRecord[] }> = ({ usage }) => {
  return (
    <Card className="p-6 bg-gray-800">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Key className="w-5 h-5 text-blue-500" />
        Utilisation API par Client
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Client</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Total Calls</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Success Rate</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Avg Response</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {usage.map((record, idx) => (
              <tr key={idx} className="hover:bg-gray-700/50">
                <td className="px-4 py-3 text-white">{record.client_name}</td>
                <td className="px-4 py-3 text-white">{record.total_calls.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    record.success_rate > 99 ? 'bg-green-700 text-green-300' :
                    record.success_rate > 95 ? 'bg-yellow-700 text-yellow-300' :
                    'bg-red-700 text-red-300'
                  }`}>
                    {record.success_rate.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-white">{record.avg_response_time.toFixed(0)}ms</td>
                <td className="px-4 py-3 text-white capitalize">{record.plan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {usage.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Aucune donnée d'utilisation API disponible
        </div>
      )}
    </Card>
  );
};

const BillingTab: React.FC<{ revenue: RevenueMetric[] }> = ({ revenue }) => {
  const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
  const avgGrowth = revenue
    .filter(r => r.growth_rate !== null)
    .reduce((sum, r) => sum + (r.growth_rate || 0), 0) / revenue.filter(r => r.growth_rate !== null).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gray-800">
          <div className="text-sm text-gray-400 mb-2">Revenu Total (12 mois)</div>
          <div className="text-3xl font-bold text-white">{totalRevenue.toLocaleString()}€</div>
        </Card>
        <Card className="p-6 bg-gray-800">
          <div className="text-sm text-gray-400 mb-2">Croissance Moyenne</div>
          <div className={`text-3xl font-bold ${avgGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {avgGrowth.toFixed(1)}%
          </div>
        </Card>
        <Card className="p-6 bg-gray-800">
          <div className="text-sm text-gray-400 mb-2">MRR Actuel</div>
          <div className="text-3xl font-bold text-white">
            {revenue.length > 0 ? revenue[0].amount.toLocaleString() : 0}€
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-gray-800">
        <h3 className="text-lg font-semibold mb-4">Historique des revenus</h3>
        <div className="space-y-2">
          {revenue.map((metric, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-white w-24">{metric.period}</span>
                <span className="text-xl font-bold text-white">{metric.amount.toLocaleString()}€</span>
              </div>
              {metric.growth_rate !== null && (
                <span className={`text-sm flex items-center gap-1 ${
                  metric.growth_rate >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {metric.growth_rate >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(metric.growth_rate).toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const SystemTab: React.FC<{ health: SystemHealth[] }> = ({ health }) => {
  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gray-800">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-green-500" />
          État des Services
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {health.map((service, idx) => (
            <div key={idx} className="p-4 bg-gray-700/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-white">{service.service_name}</span>
                {service.status === 'operational' && <CheckCircle className="w-5 h-5 text-green-500" />}
                {service.status === 'degraded' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                {service.status === 'down' && <XCircle className="w-5 h-5 text-red-500" />}
              </div>
              <div className="space-y-1 text-sm text-gray-400">
                <div>Uptime: <span className="text-white font-medium">{service.uptime_percentage.toFixed(2)}%</span></div>
                <div>Latence: <span className="text-white font-medium">{service.response_time.toFixed(0)}ms</span></div>
                <div className="text-xs text-gray-500">
                  Dernière vérification: {new Date(service.last_check).toLocaleTimeString('fr-FR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-gray-800">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          Ressources Système
        </h3>
        <div className="space-y-4">
          {[
            { label: 'CPU', value: 45, max: 100, unit: '%', color: 'bg-blue-500' },
            { label: 'Mémoire', value: 62, max: 100, unit: '%', color: 'bg-purple-500' },
            { label: 'Disque', value: 38, max: 100, unit: '%', color: 'bg-green-500' },
            { label: 'Bande passante', value: 2.4, max: 10, unit: 'GB/s', color: 'bg-yellow-500' },
          ].map((resource, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{resource.label}</span>
                <span className="text-sm text-gray-400">{resource.value}{resource.unit} / {resource.max}{resource.unit}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`${resource.color} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${(resource.value / resource.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
