/**
 * Predictive AI Analytics System
 * Machine learning-based insights for automation patterns
 */

export interface PlaybookMetrics {
  complexity_score: number;
  estimated_runtime_minutes: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  maintainability_score: number;
  security_score: number;
}

export interface PredictiveInsight {
  type: 'optimization' | 'risk' | 'best_practice' | 'performance' | 'security';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  confidence: number; // 0-100
  impact: 'low' | 'medium' | 'high';
}

export interface UsagePattern {
  common_tasks: Array<{ name: string; frequency: number }>;
  peak_usage_hours: number[];
  avg_playbook_complexity: number;
  most_used_modules: string[];
  deployment_frequency: number;
}

export interface FailurePrediction {
  probability: number; // 0-100
  risk_factors: string[];
  similar_failures: number;
  suggested_validations: string[];
}

/**
 * Predictive Analytics Engine
 */
export class PredictiveAnalytics {
  /**
   * Analyze playbook and generate metrics
   */
  static analyzePlaybook(playbookContent: string): PlaybookMetrics {
    const lines = playbookContent.split('\n').filter(l => l.trim());
    const tasks = this.extractTasks(playbookContent);

    // Calculate complexity score (0-100)
    const complexityScore = this.calculateComplexity(playbookContent, tasks);

    // Estimate runtime
    const estimatedRuntime = this.estimateRuntime(tasks);

    // Assess risk level
    const riskLevel = this.assessRisk(playbookContent, complexityScore);

    // Calculate maintainability
    const maintainabilityScore = this.calculateMaintainability(playbookContent);

    // Calculate security score
    const securityScore = this.calculateSecurityScore(playbookContent);

    return {
      complexity_score: complexityScore,
      estimated_runtime_minutes: estimatedRuntime,
      risk_level: riskLevel,
      maintainability_score: maintainabilityScore,
      security_score: securityScore
    };
  }

  /**
   * Generate predictive insights
   */
  static generateInsights(playbookContent: string, metrics: PlaybookMetrics): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];

    // Complexity insights
    if (metrics.complexity_score > 70) {
      insights.push({
        type: 'optimization',
        severity: 'warning',
        title: 'High Complexity Detected',
        description: `This playbook has a complexity score of ${metrics.complexity_score}/100, which may make it difficult to maintain.`,
        recommendation: 'Consider breaking this playbook into smaller, reusable roles or includes.',
        confidence: 85,
        impact: 'medium'
      });
    }

    // Security insights
    if (metrics.security_score < 60) {
      insights.push({
        type: 'security',
        severity: 'critical',
        title: 'Security Concerns Detected',
        description: 'This playbook may contain security vulnerabilities or use insecure practices.',
        recommendation: 'Review: Use of become without proper privilege escalation, hardcoded credentials, or insecure protocols.',
        confidence: 75,
        impact: 'high'
      });
    }

    // Performance insights
    if (metrics.estimated_runtime_minutes > 30) {
      insights.push({
        type: 'performance',
        severity: 'warning',
        title: 'Long Execution Time Expected',
        description: `This playbook is estimated to run for ${metrics.estimated_runtime_minutes} minutes.`,
        recommendation: 'Consider using async tasks, delegating to localhost, or implementing rolling updates.',
        confidence: 65,
        impact: 'medium'
      });
    }

    // Risk insights
    if (metrics.risk_level === 'high' || metrics.risk_level === 'critical') {
      insights.push({
        type: 'risk',
        severity: 'critical',
        title: `${metrics.risk_level.toUpperCase()} Risk Level`,
        description: 'This playbook performs operations that could significantly impact your infrastructure.',
        recommendation: 'Test thoroughly in staging environment. Consider implementing --check mode and --diff flags.',
        confidence: 90,
        impact: 'high'
      });
    }

    // Best practice insights
    const bestPractices = this.checkBestPractices(playbookContent);
    insights.push(...bestPractices);

    return insights;
  }

  /**
   * Predict failure probability
   */
  static predictFailure(playbookContent: string, historicalData?: any[]): FailurePrediction {
    const riskFactors: string[] = [];
    let probability = 10; // Base 10% failure probability

    // Check for common failure patterns
    if (playbookContent.includes('shell:') || playbookContent.includes('command:')) {
      riskFactors.push('Uses shell/command modules (non-idempotent)');
      probability += 15;
    }

    if (!playbookContent.includes('when:')) {
      riskFactors.push('Lacks conditional logic (may run on wrong hosts)');
      probability += 10;
    }

    if (playbookContent.includes('ignore_errors: yes')) {
      riskFactors.push('Ignores errors (may hide failures)');
      probability += 20;
    }

    if (!playbookContent.includes('become:')) {
      riskFactors.push('No privilege escalation defined');
      probability += 5;
    }

    // Check for missing error handling
    const hasHandlers = playbookContent.includes('handlers:');
    const hasTasks = playbookContent.includes('tasks:');
    if (hasTasks && !hasHandlers) {
      riskFactors.push('No error handlers defined');
      probability += 10;
    }

    // Cap probability at 95%
    probability = Math.min(probability, 95);

    return {
      probability,
      risk_factors: riskFactors,
      similar_failures: historicalData?.length || 0,
      suggested_validations: [
        'Run with --check flag first',
        'Test on non-production environment',
        'Verify all variables are defined',
        'Check connectivity to all hosts',
        'Review privilege escalation requirements'
      ]
    };
  }

  /**
   * Analyze usage patterns
   */
  static analyzeUsagePatterns(playbooks: string[]): UsagePattern {
    const allTasks: string[] = [];
    const allModules: string[] = [];

    playbooks.forEach(playbook => {
      const tasks = this.extractTasks(playbook);
      allTasks.push(...tasks.map(t => t.name));
      allModules.push(...tasks.map(t => t.module));
    });

    // Count task frequencies
    const taskFrequency = this.countFrequency(allTasks);
    const moduleFrequency = this.countFrequency(allModules);

    return {
      common_tasks: Object.entries(taskFrequency)
        .map(([name, frequency]) => ({ name, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10),
      peak_usage_hours: [9, 10, 14, 15, 16], // Mock data - would be from actual usage
      avg_playbook_complexity: playbooks.reduce((sum, pb) =>
        sum + this.calculateComplexity(pb, this.extractTasks(pb)), 0
      ) / playbooks.length,
      most_used_modules: Object.entries(moduleFrequency)
        .map(([name, frequency]) => name)
        .sort((a, b) => moduleFrequency[b] - moduleFrequency[a])
        .slice(0, 10),
      deployment_frequency: playbooks.length / 30 // Deployments per day (mock)
    };
  }

  /**
   * Generate optimization recommendations
   */
  static generateOptimizations(playbook: string, metrics: PlaybookMetrics): string[] {
    const optimizations: string[] = [];

    // Parallel execution
    if (metrics.estimated_runtime_minutes > 10) {
      optimizations.push('Enable parallel execution with "forks: 10" or higher');
      optimizations.push('Use "async" and "poll" for long-running tasks');
    }

    // Fact gathering
    if (playbook.includes('gather_facts: yes') && metrics.complexity_score < 30) {
      optimizations.push('Disable fact gathering if not needed: "gather_facts: no"');
    }

    // Task optimization
    if (playbook.includes('with_items:') && playbook.includes('package:')) {
      optimizations.push('Use package module with list directly instead of with_items');
    }

    // Caching
    if (playbook.includes('apt:') || playbook.includes('yum:')) {
      optimizations.push('Enable package cache: "update_cache: yes, cache_valid_time: 3600"');
    }

    // Delegation
    if (playbook.includes('uri:') || playbook.includes('get_url:')) {
      optimizations.push('Consider delegating API calls to localhost for better performance');
    }

    return optimizations;
  }

  // Helper methods

  private static extractTasks(playbook: string): Array<{ name: string; module: string }> {
    const tasks: Array<{ name: string; module: string }> = [];
    const lines = playbook.split('\n');

    let currentTask: any = {};

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('- name:')) {
        if (currentTask.name) tasks.push(currentTask);
        currentTask = { name: trimmed.replace('- name:', '').trim().replace(/"/g, ''), module: '' };
      } else if (currentTask.name && /^[a-z_]+:/.test(trimmed)) {
        currentTask.module = trimmed.split(':')[0];
      }
    }

    if (currentTask.name) tasks.push(currentTask);

    return tasks;
  }

  private static calculateComplexity(playbook: string, tasks: any[]): number {
    let score = 0;

    // Base complexity from task count
    score += Math.min(tasks.length * 2, 30);

    // Conditional logic
    const conditions = (playbook.match(/when:/g) || []).length;
    score += conditions * 3;

    // Loops
    const loops = (playbook.match(/with_items:|loop:/g) || []).length;
    score += loops * 5;

    // Variables
    const vars = (playbook.match(/\{\{.*?\}\}/g) || []).length;
    score += Math.min(vars, 20);

    // Handlers
    const handlers = (playbook.match(/notify:/g) || []).length;
    score += handlers * 2;

    // Nested plays
    const plays = (playbook.match(/- name:/g) || []).length;
    score += plays;

    return Math.min(score, 100);
  }

  private static estimateRuntime(tasks: any[]): number {
    let minutes = 0;

    tasks.forEach(task => {
      // Estimate based on module type
      switch (task.module) {
        case 'package':
        case 'apt':
        case 'yum':
          minutes += 2;
          break;
        case 'copy':
        case 'template':
          minutes += 0.5;
          break;
        case 'service':
        case 'systemd':
          minutes += 0.3;
          break;
        case 'shell':
        case 'command':
          minutes += 1;
          break;
        case 'git':
          minutes += 1.5;
          break;
        default:
          minutes += 0.5;
      }
    });

    return Math.ceil(minutes);
  }

  private static assessRisk(playbook: string, complexity: number): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Destructive operations
    if (playbook.includes('state: absent') || playbook.includes('force: yes')) riskScore += 30;
    if (playbook.includes('shell:') || playbook.includes('command:')) riskScore += 15;
    if (playbook.includes('become: yes')) riskScore += 10;
    if (playbook.includes('rm -rf') || playbook.includes('dd ')) riskScore += 50;

    // Complexity factor
    riskScore += complexity * 0.3;

    if (riskScore < 20) return 'low';
    if (riskScore < 40) return 'medium';
    if (riskScore < 70) return 'high';
    return 'critical';
  }

  private static calculateMaintainability(playbook: string): number {
    let score = 100;

    // Deduct for lack of documentation
    const comments = (playbook.match(/#/g) || []).length;
    if (comments < 5) score -= 20;

    // Deduct for long task names
    const longNames = playbook.split('\n').filter(l =>
      l.includes('- name:') && l.length > 100
    ).length;
    score -= longNames * 5;

    // Deduct for hardcoded values
    const hardcoded = (playbook.match(/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/g) || []).length;
    score -= hardcoded * 10;

    return Math.max(score, 0);
  }

  private static calculateSecurityScore(playbook: string): number {
    let score = 100;

    // Check for security anti-patterns
    if (playbook.includes('password:') && !playbook.includes('vault')) score -= 30;
    if (playbook.includes('ignore_errors: yes')) score -= 15;
    if (playbook.includes('validate_certs: no')) score -= 20;
    if (playbook.includes('sudo:') && !playbook.includes('become:')) score -= 10;
    if (!playbook.includes('no_log: true') && playbook.includes('password')) score -= 25;

    return Math.max(score, 0);
  }

  private static checkBestPractices(playbook: string): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];

    // Check for task names
    if (!playbook.includes('- name:')) {
      insights.push({
        type: 'best_practice',
        severity: 'warning',
        title: 'Missing Task Names',
        description: 'Tasks should have descriptive names for better readability and debugging.',
        recommendation: 'Add "name:" field to all tasks',
        confidence: 95,
        impact: 'low'
      });
    }

    // Check for idempotency
    if (playbook.includes('shell:') && !playbook.includes('creates:')) {
      insights.push({
        type: 'best_practice',
        severity: 'warning',
        title: 'Non-Idempotent Shell Command',
        description: 'Shell commands should use "creates:" or "removes:" to ensure idempotency.',
        recommendation: 'Add creates/removes parameters or switch to appropriate module',
        confidence: 80,
        impact: 'medium'
      });
    }

    return insights;
  }

  private static countFrequency(items: string[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    items.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    return frequency;
  }
}

/**
 * Generate trend analysis
 */
export function generateTrendAnalysis(historicalMetrics: PlaybookMetrics[]): {
  complexity_trend: 'improving' | 'stable' | 'declining';
  security_trend: 'improving' | 'stable' | 'declining';
  average_complexity: number;
  average_security: number;
} {
  if (historicalMetrics.length < 2) {
    return {
      complexity_trend: 'stable',
      security_trend: 'stable',
      average_complexity: historicalMetrics[0]?.complexity_score || 0,
      average_security: historicalMetrics[0]?.security_score || 0
    };
  }

  const avgComplexity = historicalMetrics.reduce((sum, m) => sum + m.complexity_score, 0) / historicalMetrics.length;
  const avgSecurity = historicalMetrics.reduce((sum, m) => sum + m.security_score, 0) / historicalMetrics.length;

  const recentComplexity = historicalMetrics.slice(-5).reduce((sum, m) => sum + m.complexity_score, 0) / 5;
  const recentSecurity = historicalMetrics.slice(-5).reduce((sum, m) => sum + m.security_score, 0) / 5;

  return {
    complexity_trend: recentComplexity < avgComplexity - 5 ? 'improving' :
                     recentComplexity > avgComplexity + 5 ? 'declining' : 'stable',
    security_trend: recentSecurity > avgSecurity + 5 ? 'improving' :
                   recentSecurity < avgSecurity - 5 ? 'declining' : 'stable',
    average_complexity: avgComplexity,
    average_security: avgSecurity
  };
}
