import { Code, Key, BookOpen, Zap, Shield, CheckCircle, AlertCircle } from 'lucide-react';

export function APIDocumentation() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 rounded-lg border border-red-700/30 p-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
          <BookOpen className="w-7 h-7" />
          Documentation API CortexOps
        </h2>
        <p className="text-slate-300">
          API REST pour la génération automatique de playbooks Ansible
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-5">
          <Zap className="w-10 h-10 text-yellow-400 mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Rapide</h3>
          <p className="text-slate-400 text-sm">
            Générez des playbooks en quelques millisecondes avec notre API optimisée
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-5">
          <Shield className="w-10 h-10 text-green-400 mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Sécurisée</h3>
          <p className="text-slate-400 text-sm">
            Authentification par clé API avec rate limiting et monitoring complet
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-5">
          <Code className="w-10 h-10 text-blue-400 mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Simple</h3>
          <p className="text-slate-400 text-sm">
            API RESTful intuitive avec des exemples dans plusieurs langages
          </p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Key className="w-6 h-6" />
          Authentification
        </h3>
        <p className="text-slate-300 mb-4">
          Toutes les requêtes API nécessitent une clé API valide. Utilisez le header <code className="bg-slate-900 px-2 py-1 rounded text-red-400">X-API-Key</code>.
        </p>
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <pre className="text-sm text-green-400 overflow-x-auto">
{`curl -X POST https://your-project.supabase.co/functions/v1/generate-playbook-api \\
  -H "X-API-Key: ck_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Install and configure Nginx web server",
    "environment": "production"
  }'`}
          </pre>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Endpoints</h3>

        <div className="space-y-6">
          <div className="border-l-4 border-green-500 pl-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded font-mono text-sm">POST</span>
              <code className="text-white">/generate-playbook-api</code>
            </div>
            <p className="text-slate-400 mb-3">Génère un playbook Ansible basé sur un prompt en langage naturel</p>

            <h4 className="font-semibold text-white mb-2">Paramètres</h4>
            <div className="bg-slate-900 rounded p-4 mb-3">
              <pre className="text-sm text-slate-300">
{`{
  "prompt": "string (requis)",
  "environment": "staging | production (optionnel, défaut: production)",
  "advanced_options": {
    "become": boolean,
    "gather_facts": boolean,
    "check_mode": boolean
  }
}`}
              </pre>
            </div>

            <h4 className="font-semibold text-white mb-2">Réponse (200 OK)</h4>
            <div className="bg-slate-900 rounded p-4">
              <pre className="text-sm text-slate-300 overflow-x-auto">
{`{
  "success": true,
  "data": {
    "playbook": "---\\n# Generated playbook YAML...",
    "prompt": "Install and configure Nginx",
    "environment": "production",
    "generated_at": "2024-11-12T10:30:00Z"
  },
  "usage": {
    "minute": 5,
    "hour": 42,
    "day": 180,
    "month": 2450
  },
  "limits": {
    "minute": 100,
    "hour": 2000,
    "day": 20000,
    "month": 200000
  },
  "meta": {
    "client": "Your Company",
    "plan": "pro",
    "response_time_ms": 145
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Codes d'Erreur</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-slate-900 rounded">
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded font-mono text-sm">401</span>
            <div>
              <div className="font-semibold text-white">Unauthorized</div>
              <div className="text-sm text-slate-400">Clé API manquante ou invalide</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-900 rounded">
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded font-mono text-sm">403</span>
            <div>
              <div className="font-semibold text-white">Forbidden</div>
              <div className="text-sm text-slate-400">Compte inactif ou suspendu</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-900 rounded">
            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded font-mono text-sm">429</span>
            <div>
              <div className="font-semibold text-white">Too Many Requests</div>
              <div className="text-sm text-slate-400">Limite de débit dépassée. Consultez les headers X-RateLimit-*</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-900 rounded">
            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded font-mono text-sm">500</span>
            <div>
              <div className="font-semibold text-white">Internal Server Error</div>
              <div className="text-sm text-slate-400">Erreur serveur inattendue</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Exemples de Code</h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">JavaScript / Node.js</h4>
            <div className="bg-slate-900 rounded p-4 border border-slate-700">
              <pre className="text-sm text-green-400 overflow-x-auto">
{`const response = await fetch('https://your-project.supabase.co/functions/v1/generate-playbook-api', {
  method: 'POST',
  headers: {
    'X-API-Key': 'ck_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Install and configure PostgreSQL',
    environment: 'production'
  })
});

const data = await response.json();
console.log(data.data.playbook);`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-2">Python</h4>
            <div className="bg-slate-900 rounded p-4 border border-slate-700">
              <pre className="text-sm text-green-400 overflow-x-auto">
{`import requests

url = "https://your-project.supabase.co/functions/v1/generate-playbook-api"
headers = {
    "X-API-Key": "ck_your_api_key",
    "Content-Type": "application/json"
}
data = {
    "prompt": "Install and configure PostgreSQL",
    "environment": "production"
}

response = requests.post(url, json=data, headers=headers)
playbook = response.json()["data"]["playbook"]
print(playbook)`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-2">Go</h4>
            <div className="bg-slate-900 rounded p-4 border border-slate-700">
              <pre className="text-sm text-green-400 overflow-x-auto">
{`package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

func main() {
    url := "https://your-project.supabase.co/functions/v1/generate-playbook-api"
    payload := map[string]interface{}{
        "prompt": "Install and configure PostgreSQL",
        "environment": "production",
    }

    jsonData, _ := json.Marshal(payload)
    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    req.Header.Set("X-API-Key", "ck_your_api_key")
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Rate Limiting</h3>
        <p className="text-slate-300 mb-4">
          Les limites de débit varient selon votre plan d'abonnement:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-white mb-2">Free Plan</h4>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>• 10 requêtes / minute</li>
              <li>• 100 requêtes / heure</li>
              <li>• 1,000 requêtes / jour</li>
              <li>• 10,000 requêtes / mois</li>
            </ul>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 border border-green-700">
            <h4 className="font-semibold text-white mb-2">Starter Plan</h4>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>• 30 requêtes / minute</li>
              <li>• 500 requêtes / heure</li>
              <li>• 5,000 requêtes / jour</li>
              <li>• 50,000 requêtes / mois</li>
            </ul>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 border border-blue-700">
            <h4 className="font-semibold text-white mb-2">Pro Plan</h4>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>• 100 requêtes / minute</li>
              <li>• 2,000 requêtes / heure</li>
              <li>• 20,000 requêtes / jour</li>
              <li>• 200,000 requêtes / mois</li>
            </ul>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 border border-purple-700">
            <h4 className="font-semibold text-white mb-2">Enterprise Plan</h4>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>• 500 requêtes / minute</li>
              <li>• 10,000 requêtes / heure</li>
              <li>• 100,000 requêtes / jour</li>
              <li>• 1,000,000 requêtes / mois</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
          <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Headers de Rate Limit
          </h4>
          <p className="text-sm text-slate-300">
            Chaque réponse inclut des headers pour suivre votre utilisation:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-400 font-mono">
            <li>• X-RateLimit-Limit-Minute</li>
            <li>• X-RateLimit-Remaining-Minute</li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-lg border border-green-700/30 p-6">
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-400" />
          Bonnes Pratiques
        </h3>
        <ul className="space-y-2 text-slate-300">
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">•</span>
            <span>Stockez vos clés API de manière sécurisée (variables d'environnement)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">•</span>
            <span>Implémentez un système de retry avec backoff exponentiel</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">•</span>
            <span>Surveillez les headers de rate limit pour éviter les erreurs 429</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">•</span>
            <span>Utilisez HTTPS pour toutes les requêtes API</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">•</span>
            <span>Révoquez immédiatement les clés compromises</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
