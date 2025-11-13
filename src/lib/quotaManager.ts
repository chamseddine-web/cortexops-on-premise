import { supabase } from './supabase';

export interface PlanQuotas {
  max_playbooks_per_month: number; // -1 = unlimited
  max_api_calls_per_month: number; // -1 = unlimited
  max_storage_mb: number; // -1 = unlimited
  max_team_members: number; // -1 = unlimited
  features: {
    git_export: boolean;
    api_access: boolean;
    ci_cd_integration: boolean;
    advanced_analytics: boolean;
    priority_support: boolean;
    white_label: boolean;
    sla_guarantee: boolean;
  };
}

export const PLAN_QUOTAS: Record<string, PlanQuotas> = {
  free: {
    max_playbooks_per_month: 5,
    max_api_calls_per_month: 100,
    max_storage_mb: 100,
    max_team_members: 1,
    features: {
      git_export: false,
      api_access: false,
      ci_cd_integration: false,
      advanced_analytics: false,
      priority_support: false,
      white_label: false,
      sla_guarantee: false,
    },
  },
  pro: {
    max_playbooks_per_month: -1,
    max_api_calls_per_month: -1,
    max_storage_mb: 10000,
    max_team_members: 1,
    features: {
      git_export: true,
      api_access: true,
      ci_cd_integration: true,
      advanced_analytics: true,
      priority_support: true,
      white_label: false,
      sla_guarantee: false,
    },
  },
  enterprise: {
    max_playbooks_per_month: -1,
    max_api_calls_per_month: -1,
    max_storage_mb: -1,
    max_team_members: -1,
    features: {
      git_export: true,
      api_access: true,
      ci_cd_integration: true,
      advanced_analytics: true,
      priority_support: true,
      white_label: true,
      sla_guarantee: true,
    },
  },
};

export interface UsageCheck {
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
  percentage: number;
}

export class QuotaManager {
  private userId: string;
  private userPlan: string = 'free';

  constructor(userId: string) {
    this.userId = userId;
  }

  async initialize() {
    const { data } = await supabase
      .from('user_profiles')
      .select('user_plan')
      .eq('id', this.userId)
      .maybeSingle();

    if (data) {
      this.userPlan = data.user_plan || 'free';
    }
  }

  getPlanQuotas(): PlanQuotas {
    return PLAN_QUOTAS[this.userPlan] || PLAN_QUOTAS.free;
  }

  async checkPlaybookQuota(): Promise<UsageCheck> {
    const quotas = this.getPlanQuotas();

    if (quotas.max_playbooks_per_month === -1) {
      return { allowed: true, current: 0, limit: -1, percentage: 0 };
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('generated_playbooks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId)
      .gte('created_at', startOfMonth.toISOString());

    const current = count || 0;
    const percentage = (current / quotas.max_playbooks_per_month) * 100;

    if (current >= quotas.max_playbooks_per_month) {
      return {
        allowed: false,
        reason: `Quota mensuel atteint (${quotas.max_playbooks_per_month} playbooks). Améliorez votre plan pour continuer.`,
        current,
        limit: quotas.max_playbooks_per_month,
        percentage,
      };
    }

    return {
      allowed: true,
      current,
      limit: quotas.max_playbooks_per_month,
      percentage,
    };
  }

  async checkAPICallQuota(): Promise<UsageCheck> {
    const quotas = this.getPlanQuotas();

    if (quotas.max_api_calls_per_month === -1) {
      return { allowed: true, current: 0, limit: -1, percentage: 0 };
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('api_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId)
      .gte('timestamp', startOfMonth.toISOString());

    const current = count || 0;
    const percentage = (current / quotas.max_api_calls_per_month) * 100;

    if (current >= quotas.max_api_calls_per_month) {
      return {
        allowed: false,
        reason: `Quota d'API calls atteint (${quotas.max_api_calls_per_month.toLocaleString()}). Améliorez votre plan pour continuer.`,
        current,
        limit: quotas.max_api_calls_per_month,
        percentage,
      };
    }

    return {
      allowed: true,
      current,
      limit: quotas.max_api_calls_per_month,
      percentage,
    };
  }

  async checkStorageQuota(): Promise<UsageCheck> {
    const quotas = this.getPlanQuotas();

    if (quotas.max_storage_mb === -1) {
      return { allowed: true, current: 0, limit: -1, percentage: 0 };
    }

    // Calculer le storage utilisé (simulation pour l'instant)
    const { data } = await supabase
      .from('generated_playbooks')
      .select('playbook_yaml')
      .eq('user_id', this.userId);

    let totalBytes = 0;
    if (data) {
      data.forEach((item) => {
        if (item.playbook_yaml) {
          totalBytes += new Blob([item.playbook_yaml]).size;
        }
      });
    }

    const currentMB = totalBytes / (1024 * 1024);
    const percentage = (currentMB / quotas.max_storage_mb) * 100;

    if (currentMB >= quotas.max_storage_mb) {
      return {
        allowed: false,
        reason: `Limite de stockage atteinte (${quotas.max_storage_mb} MB). Supprimez des fichiers ou améliorez votre plan.`,
        current: Math.round(currentMB),
        limit: quotas.max_storage_mb,
        percentage,
      };
    }

    return {
      allowed: true,
      current: Math.round(currentMB),
      limit: quotas.max_storage_mb,
      percentage,
    };
  }

  hasFeature(feature: keyof PlanQuotas['features']): boolean {
    const quotas = this.getPlanQuotas();
    return quotas.features[feature];
  }

  async recordPlaybookGeneration(playbookData: any): Promise<void> {
    const check = await this.checkPlaybookQuota();

    if (!check.allowed) {
      throw new Error(check.reason);
    }

    // Enregistrer le playbook
    await supabase.from('generated_playbooks').insert({
      user_id: this.userId,
      playbook_yaml: playbookData.yaml,
      metadata: playbookData.metadata,
      created_at: new Date().toISOString(),
    });
  }

  async recordAPICall(endpoint: string, success: boolean, responseTimeMs: number): Promise<void> {
    const check = await this.checkAPICallQuota();

    if (!check.allowed) {
      throw new Error(check.reason);
    }

    // Enregistrer l'appel API
    await supabase.from('api_usage_logs').insert({
      user_id: this.userId,
      endpoint,
      success,
      response_time_ms: responseTimeMs,
      timestamp: new Date().toISOString(),
    });
  }

  async getUsageSummary() {
    const [playbookCheck, apiCheck, storageCheck] = await Promise.all([
      this.checkPlaybookQuota(),
      this.checkAPICallQuota(),
      this.checkStorageQuota(),
    ]);

    return {
      plan: this.userPlan,
      quotas: this.getPlanQuotas(),
      usage: {
        playbooks: playbookCheck,
        api_calls: apiCheck,
        storage: storageCheck,
      },
      features: this.getPlanQuotas().features,
    };
  }

  async shouldShowUpgradePrompt(): Promise<boolean> {
    const summary = await this.getUsageSummary();

    // Afficher le prompt si l'utilisateur a atteint 80% de n'importe quel quota
    return (
      summary.usage.playbooks.percentage >= 80 ||
      summary.usage.api_calls.percentage >= 80 ||
      summary.usage.storage.percentage >= 80
    );
  }

  getUpgradeRecommendation(): string {
    if (this.userPlan === 'free') {
      return 'Passez au plan Pro (49€/mois) pour des playbooks illimités et des API calls illimités.';
    } else if (this.userPlan === 'pro') {
      return 'Passez au plan Enterprise (499€/mois) pour des ressources illimitées, white label et support 24/7.';
    }
    return '';
  }
}

export async function createQuotaManager(userId: string): Promise<QuotaManager> {
  const manager = new QuotaManager(userId);
  await manager.initialize();
  return manager;
}
