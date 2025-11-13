# CortexOps - 7 Modes de Déploiement Professionnels

## Vue d'ensemble

CortexOps peut s'intégrer dans votre infrastructure de 7 façons différentes, adaptées aux besoins réels des équipes DevOps/SRE en production.

---

## 1. ✅ Mode API (SaaS) - Production Ready

### Endpoint Principal
```
POST https://api.cortexops.com/v1/generate
```

### Authentification
```bash
curl -X POST https://api.cortexops.com/v1/generate \
  -H "X-API-Key: ctx_live_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Déployer cluster PostgreSQL HA avec Patroni",
    "environment": "production",
    "advanced_options": {
      "become": true,
      "gather_facts": true
    }
  }'
```

### Réponse
```json
{
  "success": true,
  "data": {
    "playbook": "---\n# Generated playbook...",
    "environment": "production",
    "generated_at": "2025-11-13T10:30:00Z"
  },
  "usage": {
    "minute": 5,
    "hour": 120,
    "day": 850
  },
  "limits": {
    "minute": 60,
    "hour": 1000,
    "day": 10000
  },
  "meta": {
    "client": "Acme Corp",
    "plan": "enterprise",
    "response_time_ms": 450,
    "privacy_policy": "Zero-Data-Retention"
  }
}
```

### Tarification SaaS
- **Free**: 100 requêtes/jour
- **Pro**: 10,000 requêtes/jour - 49€/mois
- **Enterprise**: Illimité - 499€/mois + SLA

### Rate Limits
- Free: 10/min, 100/hour, 1000/day
- Pro: 60/min, 1000/hour, 10000/day
- Enterprise: 300/min, 10000/hour, illimité/day

---

## 2. ✅ Mode Docker (On-Premise)

### Dockerfile Complet
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml Production
```yaml
version: '3.8'

services:
  cortexops-api:
    image: cortexops/api:latest
    container_name: cortexops-api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - API_PORT=3000
      - RATE_LIMIT_ENABLED=true
    ports:
      - "3000:3000"
    volumes:
      - ./logs:/app/logs
    networks:
      - cortexops-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  cortexops-web:
    image: cortexops/web:latest
    container_name: cortexops-web
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - cortexops-api
    networks:
      - cortexops-network

  redis:
    image: redis:7-alpine
    container_name: cortexops-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - cortexops-network

  prometheus:
    image: prom/prometheus:latest
    container_name: cortexops-prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'
    ports:
      - "9090:9090"
    networks:
      - cortexops-network

networks:
  cortexops-network:
    driver: bridge

volumes:
  redis-data:
  prometheus-data:
```

### Déploiement
```bash
# Clone repository
git clone https://github.com/cortexops/cortexops-onpremise.git
cd cortexops-onpremise

# Configure environment
cp .env.example .env
nano .env  # Edit with your values

# Deploy
docker-compose up -d

# Verify
docker-compose ps
docker-compose logs -f cortexops-api
```

### Configuration SSL
```bash
# Generate SSL certificates with Let's Encrypt
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d cortexops.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos
```

---

## 3. ✅ Mode CI/CD Integration

### 3.1 GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - generate
  - validate
  - deploy

variables:
  CORTEXOPS_API: "https://api.cortexops.com/v1"
  CORTEXOPS_API_KEY: $CORTEXOPS_API_KEY

generate-playbook:
  stage: generate
  image: curlimages/curl:latest
  script:
    - |
      curl -X POST ${CORTEXOPS_API}/generate \
        -H "X-API-Key: ${CORTEXOPS_API_KEY}" \
        -H "Content-Type: application/json" \
        -d '{
          "prompt": "Déployer application Node.js avec Nginx reverse proxy",
          "environment": "production"
        }' \
        -o playbook.yml
    - cat playbook.yml
  artifacts:
    paths:
      - playbook.yml
    expire_in: 1 hour

validate-playbook:
  stage: validate
  image: cytopia/ansible:latest
  dependencies:
    - generate-playbook
  script:
    - ansible-playbook --syntax-check playbook.yml
    - ansible-lint playbook.yml || true
    - yamllint playbook.yml || true
  artifacts:
    reports:
      junit: test-results.xml

deploy-production:
  stage: deploy
  image: cytopia/ansible:latest
  dependencies:
    - generate-playbook
    - validate-playbook
  only:
    - main
  when: manual
  script:
    - echo "$ANSIBLE_VAULT_PASSWORD" > vault-pass
    - ansible-playbook -i inventory/production playbook.yml --vault-password-file vault-pass
    - rm vault-pass
  environment:
    name: production
    url: https://app.example.com
```

### 3.2 Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        CORTEXOPS_API = 'https://api.cortexops.com/v1'
        CORTEXOPS_API_KEY = credentials('cortexops-api-key')
    }

    stages {
        stage('Generate Playbook') {
            steps {
                script {
                    sh '''
                        curl -X POST ${CORTEXOPS_API}/generate \
                            -H "X-API-Key: ${CORTEXOPS_API_KEY}" \
                            -H "Content-Type: application/json" \
                            -d '{
                                "prompt": "Pipeline CI/CD Jenkins avec tests et déploiement K8s",
                                "environment": "production"
                            }' \
                            -o playbook.yml
                    '''
                }
            }
        }

        stage('Validate') {
            steps {
                sh 'ansible-playbook --syntax-check playbook.yml'
                sh 'ansible-lint playbook.yml || true'
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                withCredentials([file(credentialsId: 'ansible-vault-pass', variable: 'VAULT_PASS')]) {
                    sh 'ansible-playbook -i inventory/production playbook.yml --vault-password-file $VAULT_PASS'
                }
            }
        }

        stage('Verify') {
            steps {
                sh 'ansible-playbook -i inventory/production verify.yml'
            }
        }
    }

    post {
        success {
            slackSend(
                color: 'good',
                message: "✅ Deployment successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
        failure {
            slackSend(
                color: 'danger',
                message: "❌ Deployment failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
        always {
            archiveArtifacts artifacts: 'playbook.yml', fingerprint: true
            junit 'test-results.xml'
        }
    }
}
```

### 3.3 GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: CortexOps Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  CORTEXOPS_API: https://api.cortexops.com/v1
  CORTEXOPS_API_KEY: ${{ secrets.CORTEXOPS_API_KEY }}

jobs:
  generate-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Generate Ansible Playbook
        run: |
          curl -X POST ${CORTEXOPS_API}/generate \
            -H "X-API-Key: ${CORTEXOPS_API_KEY}" \
            -H "Content-Type: application/json" \
            -d '{
              "prompt": "Déployer stack monitoring Prometheus/Grafana sur K8s",
              "environment": "production"
            }' \
            -o playbook.yml

      - name: Setup Ansible
        run: |
          pip install ansible ansible-lint yamllint

      - name: Validate Playbook
        run: |
          ansible-playbook --syntax-check playbook.yml
          ansible-lint playbook.yml
          yamllint playbook.yml

      - name: Deploy to Production
        env:
          ANSIBLE_VAULT_PASSWORD: ${{ secrets.ANSIBLE_VAULT_PASSWORD }}
        run: |
          echo "$ANSIBLE_VAULT_PASSWORD" > vault-pass
          ansible-playbook -i inventory/production playbook.yml --vault-password-file vault-pass
          rm vault-pass

      - name: Upload Playbook
        uses: actions/upload-artifact@v3
        with:
          name: ansible-playbook
          path: playbook.yml
          retention-days: 30

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "${{ job.status == 'success' && '✅' || '❌' }} Deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*CortexOps Deployment*\nStatus: ${{ job.status }}\nCommit: ${{ github.sha }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 4. ✅ Mode CLI (Local)

### Installation

```bash
# Via npm
npm install -g @cortexops/cli

# Via binary
curl -sSL https://install.cortexops.com | bash

# Verify
cortexops --version
# cortexops CLI v1.2.0
```

### Configuration

```bash
# Initialize
cortexops init

# Configure API key
cortexops config set api-key ctx_live_xxxxxxxxxxxx

# Set default environment
cortexops config set environment production
```

### Utilisation

```bash
# Generate playbook
cortexops generate "Déployer PostgreSQL HA" -o playbook.yml

# Generate with options
cortexops generate "Hardening serveurs Linux CIS" \
  --environment staging \
  --become \
  --output hardening.yml

# Interactive mode
cortexops interactive

# Validate playbook
cortexops validate playbook.yml

# Deploy directly
cortexops deploy playbook.yml -i inventory/hosts

# List history
cortexops history

# Export to Git
cortexops export playbook.yml --git-repo https://github.com/company/playbooks

# Generate CI/CD config
cortexops cicd generate --provider gitlab

# Batch generation
cortexops batch generate prompts.txt --output-dir ./playbooks

# Show stats
cortexops stats

# Update CLI
cortexops update
```

### Configuration File (~/.cortexops/config.yml)

```yaml
api:
  base_url: https://api.cortexops.com/v1
  api_key: ctx_live_xxxxxxxxxxxx
  timeout: 30s

defaults:
  environment: production
  become: true
  gather_facts: true

output:
  format: yaml
  directory: ./playbooks
  filename_pattern: "{timestamp}_{prompt_slug}.yml"

validation:
  ansible_lint: true
  yamllint: true
  syntax_check: true

git:
  auto_commit: false
  repo: https://github.com/company/playbooks
  branch: main

logging:
  level: info
  file: ~/.cortexops/logs/cli.log
```

---

## 5. ✅ Mode Plugin VSCode

### Installation

```bash
# Via VSCode Marketplace
code --install-extension cortexops.ansible-generator

# Or search "CortexOps" in VSCode Extensions
```

### Fonctionnalités

1. **Quick Generate**: `Ctrl+Shift+P` → "CortexOps: Generate Playbook"
2. **Inline Generation**: Sélectionner texte → Click droit → "Generate Ansible from Selection"
3. **Snippet Library**: Auto-complétion avec `ansible-` prefix
4. **Validation en temps réel**: Ansible Lint intégré
5. **Preview**: Split view avant génération
6. **Export**: Git integration directe

### Configuration VSCode (settings.json)

```json
{
  "cortexops.apiKey": "ctx_live_xxxxxxxxxxxx",
  "cortexops.defaultEnvironment": "production",
  "cortexops.autoValidate": true,
  "cortexops.autoFormat": true,
  "cortexops.showPreview": true,
  "cortexops.enableSnippets": true,
  "cortexops.lintOnSave": true,
  "cortexops.gitIntegration": true
}
```

### Keybindings

```json
{
  "key": "ctrl+alt+g",
  "command": "cortexops.generatePlaybook",
  "when": "editorTextFocus"
},
{
  "key": "ctrl+alt+v",
  "command": "cortexops.validatePlaybook",
  "when": "resourceExtname == .yml || resourceExtname == .yaml"
}
```

---

## 6. ✅ Mode Hybride IA (Cloud + Local)

### Architecture

```
┌─────────────────┐
│  Local VSCode   │
│   Extension     │
└────────┬────────┘
         │
         ├─────────────┐
         │             │
    ┌────▼────┐   ┌────▼────────┐
    │ Local   │   │ Cloud API   │
    │ Engine  │   │ (CortexOps) │
    │ (Lite)  │   └─────────────┘
    └─────────┘
         │
    ┌────▼─────────────────┐
    │ Local Models (Ollama)│
    │ - codellama:7b       │
    │ - mistral:7b         │
    └──────────────────────┘
```

### Modes de Fonctionnement

#### Mode 1: Full Cloud (Default)
- Toutes les requêtes vers API CortexOps
- Modèles GPT-4 / Claude
- Latence: ~500ms
- Précision maximale

#### Mode 2: Hybride Intelligent
- Requêtes simples: Local
- Requêtes complexes: Cloud
- Décision automatique basée sur complexité
- Latence: 100-500ms

#### Mode 3: Full Local
- 100% offline
- Ollama + modèles locaux
- Latence: ~100ms
- Pas de coût API

### Configuration Hybride

```yaml
# ~/.cortexops/hybrid-config.yml
mode: hybrid

local:
  enabled: true
  engine: ollama
  models:
    - codellama:7b
    - mistral:7b
  host: http://localhost:11434
  max_complexity: 5

cloud:
  enabled: true
  api_url: https://api.cortexops.com/v1
  api_key: ctx_live_xxxxxxxxxxxx
  fallback: true
  min_complexity: 6

routing:
  strategy: automatic
  complexity_threshold: 5
  keywords_local:
    - nginx
    - apache
    - basic
    - simple
  keywords_cloud:
    - kubernetes
    - terraform
    - devsecops
    - multicloud

cache:
  enabled: true
  ttl: 3600
  storage: ~/.cortexops/cache/

analytics:
  track_usage: true
  track_performance: true
  report_errors: true
```

### Installation Ollama

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
ollama pull codellama:7b
ollama pull mistral:7b

# Verify
ollama list

# Test
cortexops hybrid test
```

---

## 7. ✅ Support/SLA Enterprise

### Niveaux de Support

#### Standard (inclus Pro)
- Email support: 48h response
- Documentation complète
- Community forum
- Bug fixes

#### Business ($199/mois)
- Email support: 12h response
- Phone support: Business hours
- Monthly review calls
- Priority bug fixes
- Uptime SLA: 99.5%

#### Enterprise ($999/mois)
- Email support: 2h response
- Phone support: 24/7
- Dedicated Slack channel
- Dedicated TAM (Technical Account Manager)
- Quarterly business reviews
- Custom integrations
- On-site training
- Uptime SLA: 99.9%
- Downtime compensation

### SLA Monitoring Dashboard

```bash
# Access monitoring
https://status.cortexops.com

# API Health
curl https://api.cortexops.com/health

Response:
{
  "status": "healthy",
  "version": "1.2.0",
  "uptime": 2592000,
  "checks": {
    "database": "ok",
    "cache": "ok",
    "api": "ok"
  },
  "metrics": {
    "requests_per_second": 450,
    "average_response_time_ms": 120,
    "error_rate": 0.001
  },
  "sla": {
    "current_month_uptime": 99.98,
    "target": 99.9
  }
}
```

### Incident Response

1. **Detection**: Automatic monitoring
2. **Notification**: Email + SMS + Slack
3. **Response**: <15min acknowledgment
4. **Resolution**: <2h for critical
5. **Post-mortem**: Within 48h

### Support Contacts

- Email: support@cortexops.com
- Phone: +33 1 XX XX XX XX
- Slack: cortexops.slack.com
- Emergency: emergency@cortexops.com (Enterprise only)

---

## Pricing Summary

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| API Requests/day | 100 | 10,000 | Unlimited |
| Docker On-Premise | ❌ | ✅ | ✅ |
| CLI | ✅ | ✅ | ✅ |
| VSCode Plugin | ✅ | ✅ | ✅ |
| CI/CD Integration | ✅ | ✅ | ✅ |
| Hybrid Mode | ❌ | ✅ | ✅ |
| Support Response | 48h | 12h | 2h |
| SLA | - | 99.5% | 99.9% |
| Price | 0€ | 49€/mois | 499€/mois |

---

## Getting Started

```bash
# 1. Create account
curl -X POST https://api.cortexops.com/v1/auth/register \
  -d '{"email":"you@company.com","company":"Acme Corp"}'

# 2. Get API key
# Check email for API key

# 3. Test API
curl https://api.cortexops.com/v1/generate \
  -H "X-API-Key: YOUR_KEY" \
  -d '{"prompt":"Install nginx"}'

# 4. Install CLI
npm install -g @cortexops/cli

# 5. Configure
cortexops init
cortexops config set api-key YOUR_KEY

# 6. Generate first playbook
cortexops generate "Deploy my app"

# 🎉 Ready to automate!
```
