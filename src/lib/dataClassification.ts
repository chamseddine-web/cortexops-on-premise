/**
 * Data Classification System for CortexOps
 * Implements enterprise-grade data handling policies
 */

export enum DataClassification {
  CRITICAL = 'CRITICAL',      // Never stored - Zero retention
  SENSITIVE = 'SENSITIVE',    // Encrypted at rest
  CONFIDENTIAL = 'CONFIDENTIAL', // Protected, access-controlled
  INTERNAL = 'INTERNAL',      // Standard protection
  PUBLIC = 'PUBLIC'           // No protection required
}

export enum DataCategory {
  PLAYBOOK_CONTENT = 'PLAYBOOK_CONTENT',
  USER_PROMPT = 'USER_PROMPT',
  INFRASTRUCTURE_CONFIG = 'INFRASTRUCTURE_CONFIG',
  CREDENTIALS = 'CREDENTIALS',
  USER_PII = 'USER_PII',
  BILLING_INFO = 'BILLING_INFO',
  API_KEYS = 'API_KEYS',
  USAGE_METRICS = 'USAGE_METRICS',
  SYSTEM_LOGS = 'SYSTEM_LOGS'
}

export interface DataHandlingPolicy {
  classification: DataClassification;
  category: DataCategory;
  retention: {
    period: number; // in days, 0 = zero retention
    autoDelete: boolean;
  };
  encryption: {
    atRest: boolean;
    inTransit: boolean;
    algorithm?: string;
  };
  access: {
    requiresMFA: boolean;
    allowedRoles: string[];
    auditLog: boolean;
  };
  compliance: {
    gdpr: boolean;
    soc2: boolean;
    iso27001: boolean;
  };
}

/**
 * Data Handling Policies Registry
 */
export const DATA_POLICIES: Record<DataCategory, DataHandlingPolicy> = {
  [DataCategory.PLAYBOOK_CONTENT]: {
    classification: DataClassification.CRITICAL,
    category: DataCategory.PLAYBOOK_CONTENT,
    retention: {
      period: 0, // Zero retention
      autoDelete: true
    },
    encryption: {
      atRest: false, // Never stored
      inTransit: true,
      algorithm: 'TLS-1.3'
    },
    access: {
      requiresMFA: true,
      allowedRoles: ['user', 'admin'],
      auditLog: true
    },
    compliance: {
      gdpr: true,
      soc2: true,
      iso27001: true
    }
  },

  [DataCategory.USER_PROMPT]: {
    classification: DataClassification.CRITICAL,
    category: DataCategory.USER_PROMPT,
    retention: {
      period: 0, // Zero retention
      autoDelete: true
    },
    encryption: {
      atRest: false, // Never stored
      inTransit: true,
      algorithm: 'TLS-1.3'
    },
    access: {
      requiresMFA: true,
      allowedRoles: ['user'],
      auditLog: true
    },
    compliance: {
      gdpr: true,
      soc2: true,
      iso27001: true
    }
  },

  [DataCategory.INFRASTRUCTURE_CONFIG]: {
    classification: DataClassification.CRITICAL,
    category: DataCategory.INFRASTRUCTURE_CONFIG,
    retention: {
      period: 0, // Zero retention
      autoDelete: true
    },
    encryption: {
      atRest: false, // Never stored
      inTransit: true,
      algorithm: 'TLS-1.3'
    },
    access: {
      requiresMFA: true,
      allowedRoles: ['user', 'admin'],
      auditLog: true
    },
    compliance: {
      gdpr: true,
      soc2: true,
      iso27001: true
    }
  },

  [DataCategory.CREDENTIALS]: {
    classification: DataClassification.CRITICAL,
    category: DataCategory.CREDENTIALS,
    retention: {
      period: 0, // Never stored in plain text
      autoDelete: true
    },
    encryption: {
      atRest: false, // Never stored
      inTransit: true,
      algorithm: 'TLS-1.3'
    },
    access: {
      requiresMFA: true,
      allowedRoles: [],
      auditLog: true
    },
    compliance: {
      gdpr: true,
      soc2: true,
      iso27001: true
    }
  },

  [DataCategory.USER_PII]: {
    classification: DataClassification.SENSITIVE,
    category: DataCategory.USER_PII,
    retention: {
      period: 365, // 1 year or until deletion request
      autoDelete: false
    },
    encryption: {
      atRest: true,
      inTransit: true,
      algorithm: 'AES-256-GCM'
    },
    access: {
      requiresMFA: true,
      allowedRoles: ['user', 'admin', 'support'],
      auditLog: true
    },
    compliance: {
      gdpr: true,
      soc2: true,
      iso27001: true
    }
  },

  [DataCategory.BILLING_INFO]: {
    classification: DataClassification.SENSITIVE,
    category: DataCategory.BILLING_INFO,
    retention: {
      period: 2555, // 7 years (legal requirement)
      autoDelete: false
    },
    encryption: {
      atRest: true,
      inTransit: true,
      algorithm: 'AES-256-GCM'
    },
    access: {
      requiresMFA: true,
      allowedRoles: ['user', 'admin', 'billing'],
      auditLog: true
    },
    compliance: {
      gdpr: true,
      soc2: true,
      iso27001: true
    }
  },

  [DataCategory.API_KEYS]: {
    classification: DataClassification.SENSITIVE,
    category: DataCategory.API_KEYS,
    retention: {
      period: 365, // Until revoked
      autoDelete: false
    },
    encryption: {
      atRest: true,
      inTransit: true,
      algorithm: 'bcrypt' // Hashed, not encrypted
    },
    access: {
      requiresMFA: true,
      allowedRoles: ['user', 'admin'],
      auditLog: true
    },
    compliance: {
      gdpr: false,
      soc2: true,
      iso27001: true
    }
  },

  [DataCategory.USAGE_METRICS]: {
    classification: DataClassification.INTERNAL,
    category: DataCategory.USAGE_METRICS,
    retention: {
      period: 90, // 90 days
      autoDelete: true
    },
    encryption: {
      atRest: false,
      inTransit: true,
      algorithm: 'TLS-1.3'
    },
    access: {
      requiresMFA: false,
      allowedRoles: ['admin', 'analytics'],
      auditLog: false
    },
    compliance: {
      gdpr: false,
      soc2: true,
      iso27001: true
    }
  },

  [DataCategory.SYSTEM_LOGS]: {
    classification: DataClassification.INTERNAL,
    category: DataCategory.SYSTEM_LOGS,
    retention: {
      period: 30, // 30 days
      autoDelete: true
    },
    encryption: {
      atRest: false,
      inTransit: true,
      algorithm: 'TLS-1.3'
    },
    access: {
      requiresMFA: false,
      allowedRoles: ['admin', 'devops'],
      auditLog: false
    },
    compliance: {
      gdpr: false,
      soc2: true,
      iso27001: true
    }
  }
};

/**
 * Check if data should be stored based on classification
 */
export function shouldStoreData(category: DataCategory): boolean {
  const policy = DATA_POLICIES[category];
  return policy.retention.period > 0;
}

/**
 * Check if data requires encryption
 */
export function requiresEncryption(category: DataCategory): boolean {
  const policy = DATA_POLICIES[category];
  return policy.encryption.atRest;
}

/**
 * Get retention period for data category
 */
export function getRetentionPeriod(category: DataCategory): number {
  return DATA_POLICIES[category].retention.period;
}

/**
 * Check if user has access to data category
 */
export function hasAccess(category: DataCategory, userRole: string): boolean {
  const policy = DATA_POLICIES[category];
  return policy.access.allowedRoles.includes(userRole);
}

/**
 * Check if access should be audited
 */
export function requiresAudit(category: DataCategory): boolean {
  return DATA_POLICIES[category].access.auditLog;
}

/**
 * Get data classification for display
 */
export function getClassificationBadge(classification: DataClassification): {
  color: string;
  icon: string;
  label: string;
} {
  switch (classification) {
    case DataClassification.CRITICAL:
      return {
        color: 'red',
        icon: '🔴',
        label: 'CRITICAL - Zero Retention'
      };
    case DataClassification.SENSITIVE:
      return {
        color: 'orange',
        icon: '🟡',
        label: 'SENSITIVE - Encrypted'
      };
    case DataClassification.CONFIDENTIAL:
      return {
        color: 'yellow',
        icon: '🟠',
        label: 'CONFIDENTIAL - Protected'
      };
    case DataClassification.INTERNAL:
      return {
        color: 'green',
        icon: '🟢',
        label: 'INTERNAL - Standard'
      };
    case DataClassification.PUBLIC:
      return {
        color: 'blue',
        icon: '🔵',
        label: 'PUBLIC - No Protection'
      };
  }
}

/**
 * Sanitize sensitive data from logs
 */
export function sanitizeForLogging(data: any, category: DataCategory): any {
  const policy = DATA_POLICIES[category];

  if (policy.classification === DataClassification.CRITICAL) {
    return '[REDACTED - CRITICAL DATA]';
  }

  if (policy.classification === DataClassification.SENSITIVE) {
    return '[REDACTED - SENSITIVE DATA]';
  }

  return data;
}

/**
 * Compliance check for data handling
 */
export interface ComplianceReport {
  compliant: boolean;
  violations: string[];
  recommendations: string[];
}

export function checkCompliance(category: DataCategory): ComplianceReport {
  const policy = DATA_POLICIES[category];
  const violations: string[] = [];
  const recommendations: string[] = [];

  // Check GDPR compliance
  if (policy.compliance.gdpr) {
    if (policy.retention.period > 0 && !policy.encryption.atRest) {
      violations.push('GDPR: Sensitive data stored without encryption');
    }
    if (!policy.access.auditLog) {
      recommendations.push('GDPR: Consider enabling audit logs for access transparency');
    }
  }

  // Check SOC 2 compliance
  if (policy.compliance.soc2) {
    if (!policy.encryption.inTransit) {
      violations.push('SOC 2: Data transmitted without encryption');
    }
    if (policy.classification === DataClassification.SENSITIVE && !policy.access.requiresMFA) {
      violations.push('SOC 2: Sensitive data access without MFA');
    }
  }

  // Check ISO 27001 compliance
  if (policy.compliance.iso27001) {
    if (policy.retention.period > 365 && !policy.retention.autoDelete) {
      recommendations.push('ISO 27001: Long retention period without auto-delete');
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
    recommendations
  };
}

/**
 * Generate compliance summary for all categories
 */
export function generateComplianceSummary(): {
  totalCategories: number;
  compliant: number;
  violations: number;
  criticalDataCategories: number;
  encryptedCategories: number;
} {
  let compliant = 0;
  let violations = 0;
  let criticalDataCategories = 0;
  let encryptedCategories = 0;

  Object.values(DATA_POLICIES).forEach(policy => {
    const report = checkCompliance(policy.category);
    if (report.compliant) {
      compliant++;
    } else {
      violations++;
    }

    if (policy.classification === DataClassification.CRITICAL) {
      criticalDataCategories++;
    }

    if (policy.encryption.atRest) {
      encryptedCategories++;
    }
  });

  return {
    totalCategories: Object.keys(DATA_POLICIES).length,
    compliant,
    violations,
    criticalDataCategories,
    encryptedCategories
  };
}
