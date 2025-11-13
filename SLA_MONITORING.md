# CortexOps SLA & Monitoring System

## Service Level Agreements

### Standard (Included with Pro - $49/month)
- **Uptime SLA:** 99.5%
- **Response Time:** <500ms (p95)
- **Support Response:** 48 hours
- **Downtime Credits:** No compensation
- **Status Page:** https://status.cortexops.com

### Business ($199/month)
- **Uptime SLA:** 99.7%
- **Response Time:** <300ms (p95)
- **Support Response:** 12 hours (business hours)
- **Phone Support:** Business hours only
- **Monthly Reviews:** Yes
- **Downtime Credits:** 10% monthly fee per 1% missed
- **Dedicated Support:** Email + Phone

### Enterprise ($999/month)
- **Uptime SLA:** 99.9%
- **Response Time:** <200ms (p95)
- **Support Response:** 2 hours (24/7)
- **Phone Support:** 24/7 emergency line
- **TAM:** Dedicated Technical Account Manager
- **Quarterly Reviews:** Executive business reviews
- **Downtime Credits:** 25% monthly fee per 0.1% missed
- **Custom Integrations:** Included
- **On-site Training:** Available

## Uptime Calculation

```
Monthly Uptime % = (Total Minutes - Downtime Minutes) / Total Minutes * 100

Example (99.9% SLA):
- Total minutes in month: 43,200
- Allowed downtime: 43.2 minutes (~43 minutes)
- If downtime > 43 minutes: SLA breach
```

## SLA Credits

### Business Plan
```
Missed SLA     | Credit
99.5% - 99.7%  | 10% of monthly fee
99.0% - 99.5%  | 25% of monthly fee
< 99.0%        | 50% of monthly fee
```

### Enterprise Plan
```
Missed SLA     | Credit
99.8% - 99.9%  | 25% of monthly fee
99.5% - 99.8%  | 50% of monthly fee
99.0% - 99.5%  | 100% of monthly fee
< 99.0%        | 150% of monthly fee + escalation
```

## Monitoring Stack

### Real-time Monitoring

```yaml
# Prometheus Configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - '/etc/prometheus/alerts.yml'

scrape_configs:
  # API Monitoring
  - job_name: 'cortexops-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['api:3000']

  # Web Monitoring
  - job_name: 'cortexops-web'
    static_configs:
      - targets: ['web:80']

  # Database Monitoring
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis Monitoring
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Alert Rules

```yaml
# /etc/prometheus/alerts.yml
groups:
  - name: sla_alerts
    interval: 30s
    rules:
      # API Availability
      - alert: APIDown
        expr: up{job="cortexops-api"} == 0
        for: 1m
        labels:
          severity: critical
          sla_impact: high
        annotations:
          summary: "API is down"
          description: "CortexOps API has been down for {{ $value }}s"
          impact: "Complete service outage"
          action: "Immediate investigation required"

      # Response Time SLA
      - alert: ResponseTimeSLABreach
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
          sla_impact: medium
        annotations:
          summary: "Response time SLA breach"
          description: "P95 response time is {{ $value }}s (SLA: 500ms)"

      # Error Rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
          sla_impact: high
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% (threshold: 5%)"

      # Database Issues
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
          sla_impact: high
        annotations:
          summary: "Database is down"
          description: "PostgreSQL database is unreachable"

      # Rate Limit Approaching
      - alert: RateLimitHigh
        expr: rate_limit_used / rate_limit_total > 0.9
        for: 5m
        labels:
          severity: warning
          sla_impact: low
        annotations:
          summary: "Rate limit usage high"
          description: "Client {{ $labels.client }} using {{ $value }}% of rate limit"

      # Cache Miss Rate
      - alert: HighCacheMissRate
        expr: redis_cache_miss_rate > 0.5
        for: 10m
        labels:
          severity: warning
          sla_impact: low
        annotations:
          summary: "High cache miss rate"
          description: "Cache miss rate is {{ $value }}%"

      # Disk Space
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: warning
          sla_impact: medium
        annotations:
          summary: "Disk space low"
          description: "Only {{ $value }}% disk space remaining"

      # Memory Usage
      - alert: MemoryHigh
        expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) < 0.1
        for: 5m
        labels:
          severity: warning
          sla_impact: medium
        annotations:
          summary: "Memory usage high"
          description: "Only {{ $value }}% memory available"
```

## Incident Response

### Severity Levels

#### P0 - Critical (Complete Outage)
- **Response Time:** <15 minutes
- **Resolution Target:** <2 hours
- **Notification:** SMS + Email + Phone + Slack
- **Escalation:** Immediate to CTO
- **Example:** API completely down

#### P1 - High (Significant Impact)
- **Response Time:** <1 hour
- **Resolution Target:** <4 hours
- **Notification:** Email + Slack
- **Escalation:** After 2 hours to Engineering Manager
- **Example:** Response time >2s

#### P2 - Medium (Limited Impact)
- **Response Time:** <4 hours
- **Resolution Target:** <24 hours
- **Notification:** Email
- **Escalation:** After 24 hours
- **Example:** Single region slow

#### P3 - Low (Minimal Impact)
- **Response Time:** <24 hours
- **Resolution Target:** <1 week
- **Notification:** Ticket system
- **Escalation:** None
- **Example:** Documentation typo

### Incident Process

```
1. Detection (Automatic or Manual)
   ↓
2. Triage & Classification (P0-P3)
   ↓
3. Notification (Based on severity)
   ↓
4. Investigation & Diagnosis
   ↓
5. Mitigation & Fix
   ↓
6. Verification & Monitoring
   ↓
7. Post-Mortem (P0 & P1 only)
   ↓
8. Follow-up Actions
```

### Escalation Matrix

| Time Elapsed | P0 | P1 | P2 | P3 |
|--------------|----|----|----|----|
| 0 minutes | On-call Engineer | On-call Engineer | Ticket assigned | Ticket created |
| 15 minutes | + Team Lead | | | |
| 30 minutes | + Engineering Manager | | | |
| 1 hour | + CTO | + Team Lead | | |
| 2 hours | + CEO | + Engineering Manager | | |
| 4 hours | | + CTO | + Team Lead | |
| 24 hours | | | + Engineering Manager | + Engineer |

## Status Page

### Public Status Page
URL: https://status.cortexops.com

**Components:**
- ✅ API Service
- ✅ Web Application
- ✅ Authentication System
- ✅ Database
- ✅ Cache Layer
- ✅ Edge Functions

**Regions:**
- 🌍 EU-West (Ireland)
- 🌎 US-East (Virginia)
- 🌏 Asia-Pacific (Singapore)

**Metrics Displayed:**
- Uptime (last 90 days)
- Response time (last 24 hours)
- Incident history
- Scheduled maintenance

### Status API

```bash
# Check overall status
curl https://status.cortexops.com/api/v1/status

Response:
{
  "status": "operational",
  "components": [
    {
      "name": "API Service",
      "status": "operational",
      "uptime_percentage": 99.98
    },
    {
      "name": "Web Application",
      "status": "operational",
      "uptime_percentage": 99.99
    }
  ],
  "incidents": [],
  "maintenance": []
}

# Subscribe to status updates
curl -X POST https://status.cortexops.com/api/v1/subscribe \
  -d '{"email": "ops@company.com"}'
```

## Health Checks

### API Health Endpoint

```bash
curl https://api.cortexops.com/health

Response:
{
  "status": "healthy",
  "version": "1.2.0",
  "timestamp": "2025-11-13T10:30:00Z",
  "uptime_seconds": 2592000,
  "checks": {
    "database": {
      "status": "ok",
      "response_time_ms": 12
    },
    "cache": {
      "status": "ok",
      "response_time_ms": 3
    },
    "storage": {
      "status": "ok",
      "response_time_ms": 8
    },
    "external_apis": {
      "status": "ok",
      "response_time_ms": 45
    }
  },
  "metrics": {
    "requests_per_second": 450,
    "average_response_time_ms": 120,
    "p95_response_time_ms": 250,
    "p99_response_time_ms": 500,
    "error_rate": 0.001,
    "cache_hit_rate": 0.85
  },
  "sla": {
    "current_month_uptime_percentage": 99.98,
    "target_uptime_percentage": 99.9,
    "status": "meeting_sla"
  }
}
```

### Detailed Health Check

```bash
curl https://api.cortexops.com/health/detailed \
  -H "X-Admin-Key: admin_xxx"

Response:
{
  "status": "healthy",
  "detailed_checks": {
    "database": {
      "status": "healthy",
      "connections": {
        "active": 12,
        "idle": 8,
        "max": 100
      },
      "queries": {
        "slow_queries": 0,
        "failed_queries": 0
      }
    },
    "cache": {
      "status": "healthy",
      "memory": {
        "used_mb": 156,
        "max_mb": 256,
        "percentage": 60.9
      },
      "keys": 1543,
      "hit_rate": 0.85
    },
    "disk": {
      "status": "healthy",
      "usage": {
        "total_gb": 100,
        "used_gb": 45,
        "free_gb": 55,
        "percentage": 45
      }
    },
    "cpu": {
      "status": "healthy",
      "usage_percentage": 35,
      "load_average": [1.2, 1.5, 1.8]
    },
    "memory": {
      "status": "healthy",
      "total_mb": 8192,
      "used_mb": 5120,
      "free_mb": 3072,
      "percentage": 62.5
    }
  }
}
```

## Performance Metrics

### Key Performance Indicators (KPIs)

```yaml
# Target SLIs (Service Level Indicators)
availability:
  target: 99.9%
  current: 99.98%

response_time:
  p50: <100ms
  p95: <200ms
  p99: <500ms
  current:
    p50: 85ms
    p95: 180ms
    p99: 420ms

error_rate:
  target: <0.1%
  current: 0.05%

throughput:
  target: 1000 req/s
  current: 450 req/s
  peak: 1200 req/s
```

### Grafana Dashboards

Access: https://grafana.cortexops.com

**Dashboards:**
1. **SLA Overview**
   - Real-time uptime
   - Response time trends
   - Error rate tracking
   - SLA compliance status

2. **API Performance**
   - Request rate
   - Response times (p50, p95, p99)
   - Error rates by endpoint
   - Cache performance

3. **Infrastructure Health**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

4. **Business Metrics**
   - Active users
   - API calls per customer
   - Revenue impact
   - Feature usage

## Maintenance Windows

### Scheduled Maintenance
- **Frequency:** Monthly
- **Duration:** <2 hours
- **Window:** Sundays 02:00-04:00 UTC
- **Notification:** 7 days advance
- **SLA Impact:** Excluded from uptime calculation

### Emergency Maintenance
- **Approval:** CTO + 1 Engineer
- **Notification:** As soon as possible
- **SLA Impact:** Counted toward downtime
- **Post-mortem:** Required

## Support Channels

### Enterprise Support (24/7)

**Emergency Hotline:**
- Phone: +33 1 XX XX XX XX
- SMS: +33 6 XX XX XX XX
- Email: emergency@cortexops.com

**Response Times:**
- P0 (Critical): <15 minutes
- P1 (High): <1 hour
- P2 (Medium): <4 hours
- P3 (Low): <24 hours

**Dedicated Slack Channel:**
- Direct access to engineering team
- Real-time updates
- Screen sharing sessions

**TAM (Technical Account Manager):**
- Weekly check-ins
- Quarterly business reviews
- Architecture guidance
- Optimization recommendations

### Business Support (Business Hours)

**Email:** support@cortexops.com
**Phone:** +33 1 XX XX XX XX (Mon-Fri 9am-6pm CET)
**Response Time:** <12 hours

### Standard Support

**Email:** support@cortexops.com
**Forum:** community.cortexops.com
**Response Time:** <48 hours

## Monitoring Dashboard

```bash
# Access your monitoring dashboard
https://portal.cortexops.com/monitoring

Features:
- Real-time metrics
- Historical data (90 days)
- Custom alerts
- Usage analytics
- Cost tracking
- Performance reports
```

## Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]

**Date:** YYYY-MM-DD
**Duration:** X hours Y minutes
**Severity:** P0/P1/P2/P3
**Impact:** X users affected

## Summary
Brief description of the incident

## Timeline
- HH:MM - Incident detected
- HH:MM - Team notified
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Service restored
- HH:MM - Post-mortem complete

## Root Cause
Detailed explanation

## Impact
- Users affected: X
- Requests failed: Y
- Revenue impact: €Z
- SLA breach: Yes/No

## Resolution
Steps taken to resolve

## Action Items
1. [ ] Improve monitoring (Owner: X, Due: YYYY-MM-DD)
2. [ ] Add automated failover (Owner: Y, Due: YYYY-MM-DD)
3. [ ] Update documentation (Owner: Z, Due: YYYY-MM-DD)

## Lessons Learned
What we learned from this incident
```

## Compliance & Auditing

### SOC 2 Compliance
- Annual audit
- Continuous monitoring
- Access logs retained 1 year
- Encryption at rest and in transit

### GDPR Compliance
- Data processing agreement
- Right to erasure
- Data portability
- Breach notification <72h

### ISO 27001
- Information security management
- Risk assessment
- Incident management
- Business continuity

## Contact Information

**Support:** support@cortexops.com
**Emergency:** emergency@cortexops.com
**Status Page:** https://status.cortexops.com
**Documentation:** https://docs.cortexops.com/sla
