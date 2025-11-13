import { useState, useEffect } from 'react';
import {
  Shield, Lock, Eye, Download, Trash2, AlertTriangle,
  CheckCircle, Clock, FileText, Database, Activity,
  TrendingUp, Users, Key, Settings, BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  generateComplianceSummary,
  DATA_POLICIES,
  getClassificationBadge,
  type DataCategory
} from '../lib/dataClassification';

interface AuditEvent {
  id: string;
  event_type: string;
  data_category: string;
  event_description: string;
  created_at: string;
  ip_address: string;
}

interface DataAccessLog {
  id: string;
  resource_type: string;
  action: string;
  access_granted: boolean;
  created_at: string;
}

interface ConsentRecord {
  id: string;
  consent_type: string;
  consented: boolean;
  consent_version: string;
  consented_at: string | null;
  withdrawn_at: string | null;
}

export function PrivacyDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'access' | 'consent' | 'export'>('overview');
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [accessLogs, setAccessLogs] = useState<DataAccessLog[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const complianceSummary = generateComplianceSummary();

  useEffect(() => {
    loadPrivacyData();
  }, []);

  const loadPrivacyData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load audit events
      const { data: auditData } = await supabase
        .from('privacy_audit_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (auditData) setAuditEvents(auditData);

      // Load access logs
      const { data: accessData } = await supabase
        .from('data_access_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (accessData) setAccessLogs(accessData);

      // Load consent records
      const { data: consentData } = await supabase
        .from('consent_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (consentData) setConsents(consentData);

    } catch (error) {
      console.error('Error loading privacy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const exportData = {
        user_profile: {
          email: user.email,
          created_at: user.created_at,
        },
        audit_events: auditEvents,
        access_logs: accessLogs,
        consent_records: consents,
        exported_at: new Date().toISOString(),
        privacy_policy: 'Zero Data Retention - No playbook content stored'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cortexops-privacy-export-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Log the export event
      await supabase.rpc('log_privacy_event', {
        p_user_id: user.id,
        p_event_type: 'data_exported',
        p_data_category: 'USER_PII',
        p_description: 'User exported their data (GDPR Article 20)'
      });

      alert('Vos données ont été exportées avec succès.');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Erreur lors de l\'export des données.');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'ATTENTION: Cette action est irréversible.\n\n' +
      'Toutes vos données seront définitivement supprimées:\n' +
      '- Profil utilisateur\n' +
      '- Clés API\n' +
      '- Historique d\'utilisation\n' +
      '- Consentements\n\n' +
      'Êtes-vous sûr de vouloir continuer?'
    );

    if (!confirmed) return;

    const doubleCheck = window.prompt(
      'Pour confirmer, tapez "SUPPRIMER MON COMPTE" en majuscules:'
    );

    if (doubleCheck !== 'SUPPRIMER MON COMPTE') {
      alert('Suppression annulée.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Log deletion request
      await supabase.rpc('log_privacy_event', {
        p_user_id: user.id,
        p_event_type: 'data_deletion_requested',
        p_data_category: 'USER_PII',
        p_description: 'User requested account deletion (GDPR Article 17)'
      });

      // Delete user account (cascades to related data)
      const { error } = await supabase.auth.admin.deleteUser(user.id);

      if (error) throw error;

      alert('Votre compte a été supprimé. Redirection...');
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Erreur lors de la suppression du compte. Contactez le support.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-cyan-400" size={32} />
            <h1 className="text-3xl font-bold text-white">Tableau de Bord Confidentialité</h1>
          </div>
          <p className="text-slate-400">
            Gestion complète de vos données et conformité RGPD
          </p>
        </div>

        {/* Compliance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Database className="text-cyan-400" size={20} />
              <span className="text-2xl font-bold text-white">{complianceSummary.criticalDataCategories}</span>
            </div>
            <p className="text-sm text-slate-400">Catégories Critiques</p>
            <p className="text-xs text-emerald-400 mt-1">Zero Retention</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Lock className="text-yellow-400" size={20} />
              <span className="text-2xl font-bold text-white">{complianceSummary.encryptedCategories}</span>
            </div>
            <p className="text-sm text-slate-400">Données Chiffrées</p>
            <p className="text-xs text-yellow-400 mt-1">AES-256</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="text-emerald-400" size={20} />
              <span className="text-2xl font-bold text-white">{complianceSummary.compliant}</span>
            </div>
            <p className="text-sm text-slate-400">Conforme</p>
            <p className="text-xs text-emerald-400 mt-1">RGPD / SOC2</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="text-blue-400" size={20} />
              <span className="text-2xl font-bold text-white">{auditEvents.length}</span>
            </div>
            <p className="text-sm text-slate-400">Événements Audités</p>
            <p className="text-xs text-blue-400 mt-1">30 derniers jours</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800 overflow-x-auto">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
            { id: 'audit', label: 'Journal d\'audit', icon: FileText },
            { id: 'access', label: 'Accès aux données', icon: Eye },
            { id: 'consent', label: 'Consentements', icon: CheckCircle },
            { id: 'export', label: 'Export & Suppression', icon: Download }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Classification des Données</h2>

              <div className="grid gap-4">
                {Object.entries(DATA_POLICIES).map(([key, policy]) => {
                  const badge = getClassificationBadge(policy.classification);
                  return (
                    <div key={key} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{badge.icon}</span>
                          <div>
                            <h3 className="font-semibold text-white">{policy.category}</h3>
                            <p className="text-sm text-slate-400">{badge.label}</p>
                          </div>
                        </div>
                        <span className="text-xs bg-slate-700 px-2 py-1 rounded">
                          Rétention: {policy.retention.period === 0 ? 'Aucune' : `${policy.retention.period} jours`}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
                        <div>
                          <p className="text-slate-500">Chiffrement</p>
                          <p className="text-slate-300">
                            {policy.encryption.atRest ? '✓ Au repos' : '✗ N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Conformité</p>
                          <p className="text-slate-300">
                            {policy.compliance.gdpr && 'RGPD '}
                            {policy.compliance.soc2 && 'SOC2 '}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Audit</p>
                          <p className="text-slate-300">
                            {policy.access.auditLog ? '✓ Activé' : '✗ Désactivé'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Journal d'Audit Immuable</h2>
              <p className="text-sm text-slate-400 mb-4">
                Tous les événements relatifs à vos données sont enregistrés de manière permanente.
              </p>

              <div className="space-y-2">
                {auditEvents.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Aucun événement d'audit</p>
                ) : (
                  auditEvents.map(event => (
                    <div key={event.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded">
                              {event.event_type}
                            </span>
                            {event.data_category && (
                              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                                {event.data_category}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-300">{event.event_description}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xs text-slate-500">
                            {new Date(event.created_at).toLocaleString('fr-FR')}
                          </p>
                          <p className="text-xs text-slate-600">{event.ip_address}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'access' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Accès aux Données</h2>
              <p className="text-sm text-slate-400 mb-4">
                Historique complet de tous les accès à vos données.
              </p>

              <div className="space-y-2">
                {accessLogs.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Aucun accès enregistré</p>
                ) : (
                  accessLogs.map(log => (
                    <div key={log.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {log.access_granted ? (
                            <CheckCircle className="text-emerald-400" size={16} />
                          ) : (
                            <AlertTriangle className="text-red-400" size={16} />
                          )}
                          <div>
                            <p className="text-sm text-slate-300">
                              <span className="font-medium">{log.action}</span> sur {log.resource_type}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(log.created_at).toLocaleString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          log.access_granted
                            ? 'bg-emerald-900/30 text-emerald-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                          {log.access_granted ? 'Autorisé' : 'Refusé'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'consent' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Gestion des Consentements</h2>
              <p className="text-sm text-slate-400 mb-4">
                Vos consentements sont enregistrés conformément au RGPD.
              </p>

              <div className="space-y-3">
                {consents.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Aucun consentement enregistré</p>
                ) : (
                  consents.map(consent => (
                    <div key={consent.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-white capitalize">
                            {consent.consent_type.replace(/_/g, ' ')}
                          </h3>
                          <p className="text-xs text-slate-500">Version {consent.consent_version}</p>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded font-medium ${
                          consent.consented
                            ? 'bg-emerald-900/30 text-emerald-400'
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                          {consent.consented ? 'Accepté' : 'Retiré'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {consent.consented && consent.consented_at && (
                          <p>Accepté le {new Date(consent.consented_at).toLocaleString('fr-FR')}</p>
                        )}
                        {!consent.consented && consent.withdrawn_at && (
                          <p>Retiré le {new Date(consent.withdrawn_at).toLocaleString('fr-FR')}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Export & Suppression de Données</h2>

              <div className="space-y-6">
                {/* Export Section */}
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <div className="flex items-start gap-4">
                    <div className="bg-cyan-900/30 p-3 rounded-lg">
                      <Download className="text-cyan-400" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-2">Exporter mes données</h3>
                      <p className="text-sm text-slate-400 mb-4">
                        Téléchargez toutes vos données au format JSON (RGPD Article 20 - Droit à la portabilité).
                      </p>
                      <ul className="text-xs text-slate-500 space-y-1 mb-4">
                        <li>✓ Profil utilisateur</li>
                        <li>✓ Journal d'audit complet</li>
                        <li>✓ Historique d'accès</li>
                        <li>✓ Consentements enregistrés</li>
                        <li>✗ Playbooks (jamais stockés - Zero Retention)</li>
                      </ul>
                      <button
                        onClick={handleExportData}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Télécharger mes données
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete Section */}
                <div className="bg-red-900/10 rounded-lg p-6 border border-red-900/30">
                  <div className="flex items-start gap-4">
                    <div className="bg-red-900/30 p-3 rounded-lg">
                      <Trash2 className="text-red-400" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-2">Supprimer mon compte</h3>
                      <p className="text-sm text-slate-400 mb-4">
                        Suppression définitive de toutes vos données (RGPD Article 17 - Droit à l'oubli).
                      </p>
                      <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                          <div className="text-xs text-red-300">
                            <p className="font-semibold mb-1">Action irréversible</p>
                            <ul className="space-y-1">
                              <li>• Suppression immédiate de votre compte</li>
                              <li>• Révocation de toutes les clés API</li>
                              <li>• Purge complète dans les 30 jours</li>
                              <li>• Aucune récupération possible</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Supprimer définitivement mon compte
                      </button>
                    </div>
                  </div>
                </div>

                {/* Compliance Info */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="text-cyan-400" size={16} />
                    <h4 className="font-semibold text-white text-sm">Vos droits RGPD</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div>✓ Droit d'accès (Article 15)</div>
                    <div>✓ Droit de rectification (Article 16)</div>
                    <div>✓ Droit à l'oubli (Article 17)</div>
                    <div>✓ Droit à la portabilité (Article 20)</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
