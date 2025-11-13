# 📘 CortexOps API Documentation

## 🌐 Base URL
```
Production: https://api.cortexops.com/v1
Development: http://localhost:54321/functions/v1
```

---

## 🔐 Authentification

Toutes les requêtes API nécessitent une clé API valide.

### **Headers requis**
```http
X-API-Key: ctx_live_[your_api_key]
Content-Type: application/json
```

Ou alternativement:
```http
Authorization: Bearer ctx_live_[your_api_key]
Content-Type: application/json
```

### **Obtenir une clé API**
1. Connectez-vous à [CortexOps Dashboard](https://cortexops.com/api-keys)
2. Cliquez sur "Créer une clé API"
3. Donnez un nom descriptif
4. Copiez la clé (elle ne sera plus jamais affichée)

---

## 📊 Rate Limits

Les limites dépendent de votre plan:

| Plan | Minute | Heure | Jour | Mois |
|------|--------|-------|------|------|
| Free | 10 | 100 | 1,000 | 10,000 |
| Pro | 60 | 1,000 | 10,000 | 100,000 |
| Enterprise | 300 | 10,000 | 100,000 | 1,000,000 |

### **Headers de rate limit**
Chaque réponse inclut:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 55
X-RateLimit-Reset: 2025-11-13T10:31:00Z
```

### **Dépassement de limite**
```json
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded your rate limit for this period",
  "period": "minute",
  "current": 60,
  "limit": 60,
  "reset_at": "2025-11-13T10:31:00Z"
}
```

---

## 🎯 Endpoints

### **POST /generate-playbook-api**
Génère un playbook Ansible basé sur un prompt en langage naturel.

#### **Request**
```bash
curl -X POST https://api.cortexops.com/v1/generate-playbook-api \
  -H "X-API-Key: ctx_live_xxx...xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Deploy PostgreSQL with replication",
    "environment": "production",
    "advanced_options": {
      "become": true,
      "gather_facts": true,
      "check_mode": false
    }
  }'
```

#### **Request Body**
| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| prompt | string | ✅ | Description en langage naturel |
| environment | string | ❌ | staging ou production (défaut: production) |
| advanced_options | object | ❌ | Options Ansible avancées |

**advanced_options:**
```typescript
{
  become?: boolean,           // Sudo/escalation (défaut: false)
  gather_facts?: boolean,     // Collecte facts (défaut: true)
  check_mode?: boolean        // Mode dry-run (défaut: false)
}
```

#### **Response Success (200)**
```json
{
  "success": true,
  "data": {
    "playbook": "---\n- name: Deploy PostgreSQL\n  hosts: database_servers\n  become: yes\n  tasks:\n    - name: Install PostgreSQL\n      apt:\n        name: postgresql\n        state: present\n    ...",
    "environment": "production",
    "generated_at": "2025-11-13T10:30:00Z"
  },
  "rate_limits": {
    "minute": {
      "limit": 60,
      "remaining": 55,
      "reset_at": "2025-11-13T10:31:00Z"
    }
  },
  "meta": {
    "key_name": "Production API Key",
    "plan": "pro",
    "response_time_ms": 120,
    "privacy_policy": "Zero-Data-Retention",
    "data_storage": "None - Processed in-memory only"
  }
}
```

#### **Error Responses**

**401 Unauthorized** - Clé API manquante
```json
{
  "error": "Missing API key",
  "message": "Please provide an API key using X-API-Key header or Authorization: Bearer header"
}
```

**401 Unauthorized** - Clé API invalide
```json
{
  "error": "Invalid API key",
  "message": "The provided API key is invalid, expired, or inactive"
}
```

**403 Forbidden** - Compte inactif
```json
{
  "error": "Inactive account",
  "message": "Your API key or account is inactive. Please contact support."
}
```

**429 Too Many Requests** - Rate limit dépassé
```json
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded your rate limit for this period",
  "period": "minute",
  "current": 60,
  "limit": 60,
  "reset_at": "2025-11-13T10:31:00Z"
}
```

**400 Bad Request** - Prompt manquant
```json
{
  "error": "Missing prompt",
  "message": "The 'prompt' field is required"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## 💡 Exemples d'Utilisation

### **JavaScript/TypeScript**
```typescript
const API_KEY = 'ctx_live_xxx...xxx';
const API_URL = 'https://api.cortexops.com/v1/generate-playbook-api';

async function generatePlaybook(prompt: string) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      environment: 'production',
      advanced_options: {
        become: true,
        gather_facts: true,
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();
  return data.data.playbook;
}

// Usage
generatePlaybook('Deploy NGINX with SSL')
  .then(playbook => console.log(playbook))
  .catch(error => console.error(error));
```

### **Python**
```python
import requests
import os

API_KEY = os.getenv('CORTEXOPS_API_KEY')
API_URL = 'https://api.cortexops.com/v1/generate-playbook-api'

def generate_playbook(prompt, environment='production'):
    headers = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
    }

    payload = {
        'prompt': prompt,
        'environment': environment,
        'advanced_options': {
            'become': True,
            'gather_facts': True
        }
    }

    response = requests.post(API_URL, json=payload, headers=headers)
    response.raise_for_status()

    return response.json()['data']['playbook']

# Usage
playbook = generate_playbook('Deploy PostgreSQL cluster with replication')
print(playbook)
```

### **cURL**
```bash
#!/bin/bash

API_KEY="ctx_live_xxx...xxx"
API_URL="https://api.cortexops.com/v1/generate-playbook-api"

curl -X POST "$API_URL" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Deploy Kubernetes cluster",
    "environment": "production",
    "advanced_options": {
      "become": true,
      "gather_facts": true
    }
  }' | jq -r '.data.playbook'
```

### **Go**
```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
)

const API_URL = "https://api.cortexops.com/v1/generate-playbook-api"

type GenerateRequest struct {
    Prompt      string                 `json:"prompt"`
    Environment string                 `json:"environment"`
    Options     map[string]interface{} `json:"advanced_options"`
}

type GenerateResponse struct {
    Success bool `json:"success"`
    Data    struct {
        Playbook    string `json:"playbook"`
        Environment string `json:"environment"`
        GeneratedAt string `json:"generated_at"`
    } `json:"data"`
}

func generatePlaybook(prompt string) (string, error) {
    apiKey := os.Getenv("CORTEXOPS_API_KEY")

    reqBody := GenerateRequest{
        Prompt:      prompt,
        Environment: "production",
        Options: map[string]interface{}{
            "become":       true,
            "gather_facts": true,
        },
    }

    jsonBody, _ := json.Marshal(reqBody)

    req, _ := http.NewRequest("POST", API_URL, bytes.NewBuffer(jsonBody))
    req.Header.Set("X-API-Key", apiKey)
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)

    var result GenerateResponse
    json.Unmarshal(body, &result)

    return result.Data.Playbook, nil
}

func main() {
    playbook, _ := generatePlaybook("Deploy Docker Swarm")
    fmt.Println(playbook)
}
```

---

## 🎯 Exemples de Prompts

### **Infrastructure Basique**
```
"Deploy NGINX web server with SSL certificates"
"Install Docker on Ubuntu 22.04"
"Configure PostgreSQL database with backup"
```

### **Multi-Cloud**
```
"Deploy Kubernetes cluster on AWS EKS"
"Setup Azure VM with monitoring"
"Configure GCP Load Balancer with health checks"
```

### **Sécurité**
```
"Harden Ubuntu server following CIS benchmarks"
"Configure firewall with fail2ban"
"Setup SSL certificates with Let's Encrypt auto-renewal"
```

### **CI/CD**
```
"Configure GitLab CI with Docker runners"
"Setup Jenkins with GitHub integration"
"Deploy application using GitHub Actions"
```

### **Monitoring**
```
"Install Prometheus and Grafana stack"
"Configure ELK stack for log aggregation"
"Setup Datadog agent with custom metrics"
```

---

## 🔧 Bonnes Pratiques

### **Sécurité**
✅ **Stockez les clés dans des variables d'environnement**
```bash
export CORTEXOPS_API_KEY="ctx_live_xxx...xxx"
```

✅ **Ne committez jamais vos clés dans Git**
```gitignore
.env
.env.local
*.key
```

✅ **Utilisez des clés différentes par environnement**
```
dev-key    → Développement
staging-key → Staging
prod-key   → Production
```

✅ **Rotation régulière (recommandé tous les 90 jours)**

### **Performance**
✅ **Gérez les rate limits**
```typescript
// Retry avec exponential backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const waitTime = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
}
```

✅ **Cache les résultats si possible**
```typescript
const cache = new Map();

async function getCachedPlaybook(prompt) {
  if (cache.has(prompt)) {
    return cache.get(prompt);
  }

  const playbook = await generatePlaybook(prompt);
  cache.set(prompt, playbook);
  return playbook;
}
```

### **Monitoring**
✅ **Surveillez vos headers de rate limit**
```typescript
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

if (remaining < 10) {
  console.warn(`Rate limit approaching: ${remaining} remaining`);
}
```

✅ **Loggez les erreurs**
```typescript
try {
  const result = await generatePlaybook(prompt);
} catch (error) {
  logger.error('Playbook generation failed', {
    prompt,
    error: error.message,
    timestamp: new Date().toISOString()
  });
}
```

---

## 📞 Support

### **Problèmes courants**

**Q: Ma clé API ne fonctionne pas**
- Vérifiez qu'elle commence par `ctx_live_`
- Assurez-vous qu'elle n'a pas expiré
- Vérifiez qu'elle n'a pas été révoquée dans le dashboard

**Q: J'ai dépassé ma limite**
- Attendez le reset (indiqué dans `X-RateLimit-Reset`)
- Ou passez à un plan supérieur

**Q: Les playbooks générés ne correspondent pas**
- Soyez plus précis dans vos prompts
- Utilisez le paramètre `environment` approprié
- Ajoutez des détails techniques si nécessaire

### **Contact**
- **Email**: api@cortexops.com
- **Documentation**: https://docs.cortexops.com
- **Status**: https://status.cortexops.com
- **Discord**: https://discord.gg/cortexops

---

## 📝 Changelog

### **v1.0.0** (2025-11-13)
- ✅ API commerciale opérationnelle
- ✅ Rate limiting multi-niveaux
- ✅ Analytics par clé
- ✅ Zero data retention
- ✅ Support multi-environnements

---

**Dernière mise à jour**: 13 Novembre 2025
**Version API**: v1
