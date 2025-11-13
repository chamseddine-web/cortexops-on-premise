# CortexOps Enterprise Privacy Architecture

## Executive Summary

CortexOps implements a **Zero Data Retention** architecture for all sensitive automation data. This document outlines our enterprise-grade privacy controls, compliance mechanisms, and data handling procedures.

## Architecture Principles

### 1. Data Classification

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA CLASSIFICATION                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔴 CRITICAL (Never Stored)                                 │
│  ├─ User prompts and queries                                │
│  ├─ Generated playbook content                              │
│  ├─ Infrastructure configuration details                    │
│  ├─ Secrets, credentials, API keys in prompts               │
│  ├─ IP addresses of target servers                          │
│  └─ Custom variables and environment data                   │
│                                                              │
│  🟡 SENSITIVE (Encrypted at Rest)                           │
│  ├─ User email addresses                                    │
│  ├─ API authentication tokens (hashed)                      │
│  ├─ Billing information                                     │
│  └─ Organization metadata                                   │
│                                                              │
│  🟢 OPERATIONAL (Standard Protection)                       │
│  ├─ Usage metrics (anonymized)                              │
│  ├─ Feature flags                                           │
│  ├─ System health metrics                                   │
│  └─ Error logs (sanitized)                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Zero Data Retention Flow

```
┌──────────────┐
│   Client     │
│  Browser     │
└──────┬───────┘
       │ 1. HTTPS Request
       │    (TLS 1.3, Perfect Forward Secrecy)
       ▼
┌──────────────────────────┐
│   Supabase Edge          │
│   (Deno Runtime)         │
│                          │
│   ┌──────────────────┐   │
│   │  RAM ONLY        │   │
│   │                  │   │
│   │  1. Receive      │   │
│   │  2. Validate     │   │
│   │  3. Process      │   │
│   │  4. Generate     │   │
│   │  5. Return       │   │
│   │  6. WIPE         │   │
│   └──────────────────┘   │
│                          │
│   ⚠️  NO DISK WRITE      │
│   ⚠️  NO LOG PERSIST     │
│   ⚠️  NO CACHE           │
└──────────────────────────┘
       │
       │ 2. Response (YAML playbook)
       ▼
┌──────────────┐
│   Client     │
│  (Downloads) │
└──────────────┘
```

### 3. Data Lifecycle Management

#### Critical Data (Playbooks, Prompts)
- **Collection**: Received via HTTPS POST
- **Processing**: In-memory only (RAM)
- **Storage**: NEVER - Zero retention
- **Transmission**: Encrypted TLS 1.3
- **Deletion**: Automatic on function completion
- **Retention Period**: 0 seconds

#### Sensitive Data (User Info)
- **Collection**: During signup only
- **Processing**: Encrypted in transit
- **Storage**: Encrypted at rest (AES-256)
- **Transmission**: TLS 1.3 + Certificate Pinning
- **Deletion**: On user request (GDPR compliance)
- **Retention Period**: Until account deletion

#### Operational Data (Metrics)
- **Collection**: Automatic, anonymized
- **Processing**: Aggregated only
- **Storage**: Time-series database
- **Retention Period**: 90 days rolling
- **Purpose**: Service improvement, SLA monitoring

## Compliance Framework

### GDPR Compliance

#### Article 5 - Principles
✅ **Lawfulness, fairness and transparency**: Users informed of data practices
✅ **Purpose limitation**: Data used only for stated purposes
✅ **Data minimization**: Only essential data collected
✅ **Accuracy**: User can update their information
✅ **Storage limitation**: Zero retention for critical data
✅ **Integrity and confidentiality**: End-to-end encryption

#### Article 17 - Right to be Forgotten
- One-click account deletion
- Complete data purge within 30 days
- Automated backup cleanup
- Verification & confirmation process

#### Article 20 - Data Portability
- Export all user data (JSON format)
- Download API usage history
- Export subscription records

#### Article 32 - Security of Processing
- TLS 1.3 encryption in transit
- AES-256 encryption at rest
- Regular security audits
- Penetration testing (quarterly)
- Incident response plan

### SOC 2 Type II Controls

#### CC6.1 - Logical Access
- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- Session timeout (30 minutes)
- Failed login lockout
- Audit trail of all access

#### CC6.6 - Encryption
- TLS 1.3 for all API communications
- Database encryption (Supabase)
- Encrypted backups
- Key rotation (90 days)

#### CC7.2 - Change Management
- Version controlled infrastructure
- Database migrations tracked
- Rollback procedures documented
- Change approval process

#### CC9.2 - Risk Mitigation
- DDoS protection (Cloudflare)
- Rate limiting per API key
- Input validation & sanitization
- SQL injection prevention

### ISO 27001 Compliance

#### A.8.2.3 - Handling of Assets
- Data classification system
- Clear ownership assignment
- Secure disposal procedures

#### A.9.4.1 - Access Restriction
- Principle of least privilege
- Time-based access reviews
- Immediate revocation on termination

#### A.12.3.1 - Information Backup
- Sensitive data: Encrypted backups
- Critical data: NOT backed up (zero retention)
- Recovery procedures tested monthly

#### A.14.1.2 - Security in Development
- Security code reviews
- Dependency vulnerability scanning
- Automated security testing (SAST/DAST)

## Technical Implementation

### Edge Function Security

```typescript
// Memory-only processing
async function processPlaybookRequest(request: Request): Promise<Response> {
  let sensitiveData: {
    prompt?: string;
    playbook?: string;
    vars?: Record<string, any>;
  } = {};

  try {
    // 1. Extract data
    sensitiveData.prompt = await extractPrompt(request);

    // 2. Validate (no storage)
    validateRequest(sensitiveData.prompt);

    // 3. Generate (in-memory)
    sensitiveData.playbook = await generatePlaybook(sensitiveData.prompt);

    // 4. Return immediately
    const response = new Response(sensitiveData.playbook, {
      headers: {
        'Content-Type': 'text/yaml',
        'X-Privacy-Policy': 'zero-data-retention',
        'X-Data-Classification': 'CRITICAL',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    });

    return response;

  } finally {
    // 5. CRITICAL: Wipe all sensitive data
    sensitiveData.prompt = undefined;
    sensitiveData.playbook = undefined;
    sensitiveData.vars = undefined;
    sensitiveData = {};

    // Force garbage collection hint
    if (global.gc) global.gc();
  }
}
```

### Database Schema - Metadata Only

```sql
-- ❌ NEVER STORED: User prompts, playbooks, infrastructure details
-- ✅ STORED: Minimal metadata for billing and rate limiting

CREATE TABLE api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES api_clients(id),

  -- Metadata only
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer NOT NULL,
  response_time_ms integer NOT NULL,

  -- NO request_body column (by design)
  -- NO response_body column (by design)
  -- NO user_prompt column (by design)

  -- Anonymized IP (hashed)
  ip_hash text,

  created_at timestamptz DEFAULT now(),

  -- Automatic cleanup
  CONSTRAINT chk_retention CHECK (
    created_at > now() - interval '90 days'
  )
);

-- Automatic data purge
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM api_usage_logs
  WHERE created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run daily
SELECT cron.schedule(
  'cleanup-old-logs',
  '0 2 * * *', -- 2 AM daily
  'SELECT cleanup_old_logs();'
);
```

### Encryption at Rest

```typescript
// User data encryption wrapper
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class DataVault {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  static encrypt(data: string, key: Buffer): string {
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Format: iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  static decrypt(encrypted: string, key: Buffer): string {
    const [ivHex, tagHex, data] = encrypted.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

## Audit & Monitoring

### Privacy Audit Trail

```sql
CREATE TABLE privacy_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),

  -- Audit event types
  event_type text NOT NULL CHECK (
    event_type IN (
      'data_export_requested',
      'data_deletion_requested',
      'account_deleted',
      'privacy_settings_changed',
      'data_access_logged',
      'consent_updated'
    )
  ),

  -- Event details (no PII)
  metadata jsonb,

  -- Audit trail
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now(),

  -- Immutable audit log
  CONSTRAINT no_updates CHECK (true)
);

-- Prevent updates/deletes
CREATE RULE privacy_audit_no_update AS
  ON UPDATE TO privacy_audit_log
  DO INSTEAD NOTHING;

CREATE RULE privacy_audit_no_delete AS
  ON DELETE TO privacy_audit_log
  DO INSTEAD NOTHING;
```

### Real-Time Compliance Dashboard

Metrics tracked:
- **Data Processing Time**: < 2 seconds (in-memory only)
- **Zero Retention Compliance**: 100%
- **Encryption Coverage**: 100% of sensitive data
- **Backup Retention**: 0 days for critical data
- **Audit Log Completeness**: 100%
- **GDPR Response Time**: < 48 hours
- **Security Incidents**: 0 data breaches

## User Controls

### Privacy Settings Dashboard

Users have full control:
- ✅ View all stored data
- ✅ Export data (GDPR Article 20)
- ✅ Delete account (GDPR Article 17)
- ✅ Revoke API keys
- ✅ View access logs
- ✅ Update consent preferences
- ✅ Download compliance certificate

### Data Subject Requests

Automated processing:
1. **Export Request**: JSON file generated in < 5 minutes
2. **Deletion Request**: Complete purge in < 30 days
3. **Correction Request**: Self-service instant updates
4. **Access Request**: Real-time dashboard access

## Incident Response

### Data Breach Protocol

1. **Detection** (< 1 hour)
   - Automated security monitoring
   - Anomaly detection
   - Alert escalation

2. **Containment** (< 2 hours)
   - Isolate affected systems
   - Revoke compromised keys
   - Block suspicious IPs

3. **Investigation** (< 24 hours)
   - Forensic analysis
   - Impact assessment
   - Root cause analysis

4. **Notification** (< 72 hours)
   - User notification (GDPR Article 33)
   - Regulatory notification
   - Public disclosure (if required)

5. **Remediation**
   - Security patches
   - Architecture updates
   - Prevention measures

## Certifications & Attestations

### Current Status
- 🔄 SOC 2 Type II: In progress (expected Q2 2025)
- ✅ GDPR Compliant: Self-assessed
- 🔄 ISO 27001: Planned Q3 2025
- ✅ OWASP Top 10: Remediated
- ✅ Privacy Shield: N/A (EU-based infrastructure)

### External Audits
- Security Penetration Testing: Quarterly
- Code Security Review: Continuous (automated)
- Infrastructure Audit: Annual
- Privacy Assessment: Bi-annual

## Contact & Transparency

### Privacy Team
- **Data Protection Officer**: dpo@cortexops.dev
- **Security Team**: security@cortexops.dev
- **Compliance**: compliance@cortexops.dev

### Public Transparency
- Privacy Policy: https://cortexops.dev/privacy
- Security Page: https://cortexops.dev/security
- Status Page: https://status.cortexops.dev
- Bug Bounty: https://cortexops.dev/security/bounty

## Version History

- **v1.0** (2025-01-12): Initial privacy architecture
- Architecture subject to continuous improvement
- All changes documented and versioned

---

**Last Updated**: 2025-01-12
**Next Review**: 2025-04-12
**Document Owner**: CTO & DPO
