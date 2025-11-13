# Guide de Monétisation CortexOps

## Vue d'ensemble

CortexOps propose 3 modèles économiques complémentaires pour maximiser les revenus :

1. **SaaS Web Freemium** - Interface web pour utilisateurs individuels
2. **CLI / Extension VS Code** - Outil pour développeurs professionnels
3. **API Enterprise** - Solution pour intégrations CI/CD

---

## 🎯 Modèle A : SaaS Web (Freemium)

### Architecture

L'interface web permet de générer des playbooks via une interface intuitive.

### Plans et tarifs

| Plan | Prix | Playbooks/jour | Fonctionnalités |
|------|------|----------------|-----------------|
| **Gratuit** | 0€ | 3 | Génération basique, Templates standards, Export YAML |
| **Pro** | 15€/mois ou 150€/an | Illimité | Tout Gratuit + Templates avancés, Export multi-format, Support prioritaire, CLI Access |
| **Enterprise** | 300€/mois ou 3000€/an | Illimité | Tout Pro + API REST, Webhooks, Multi-users, SLA 99.9%, Support dédié |

### Fonctionnalités implémentées

#### 1. Système de plans (`/src/components/PricingPlans.tsx`)
- Affichage des 3 plans avec tarification mensuelle/annuelle
- Toggle monthly/yearly avec réduction de 17% sur l'annuel
- Mise en avant du plan Pro (populaire)
- Boutons d'upgrade avec gestion du plan actuel

#### 2. Gestion des quotas
- Table `subscription_plans` avec limites par plan
- Colonnes `playbooks_per_day` et `api_calls_per_day`
- Réinitialisation automatique quotidienne
- Fonction `check_api_quota()` pour validation

#### 3. Suivi des paiements
- Table `payment_history` avec historique complet
- Intégration Stripe (colonnes `stripe_customer_id`, `stripe_subscription_id`)
- Métadonnées pour tracking avancé

### Implémentation Stripe (à compléter)

Pour activer les paiements réels :

```typescript
// 1. Installer Stripe
npm install @stripe/stripe-js

// 2. Créer un checkout Stripe
const handleUpgrade = async (planId: string) => {
  const response = await fetch('/api/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });
  const { url } = await response.json();
  window.location.href = url;
};
```

---

## 🛠️ Modèle B : CLI / Extension VS Code

### CLI Tool

Un outil en ligne de commande pour les développeurs :

```bash
# Installation
npm install -g cortexops-cli

# Configuration
cortexops login --api-key YOUR_KEY

# Utilisation
cortexops generate "Deploy Kubernetes with Prometheus"

# Options avancées
cortexops generate "Setup LAMP stack" --format json --output playbook.yml
```

### Architecture suggérée

```
cortexops-cli/
├── bin/
│   └── cortexops.js          # Point d'entrée
├── src/
│   ├── commands/
│   │   ├── login.ts
│   │   ├── generate.ts
│   │   └── list.ts
│   ├── api/
│   │   └── client.ts         # API REST client
│   └── utils/
│       ├── config.ts
│       └── output.ts
└── package.json
```

### Exemple d'implémentation

```typescript
// src/commands/generate.ts
import { ApiClient } from '../api/client';

export async function generateCommand(prompt: string, options: any) {
  const client = new ApiClient();

  const result = await client.generatePlaybook({
    prompt,
    format: options.format || 'yaml'
  });

  if (options.output) {
    fs.writeFileSync(options.output, result.playbook);
  } else {
    console.log(result.playbook);
  }
}
```

### Extension VS Code

Structure de base :

```json
{
  "name": "cortexops-vscode",
  "displayName": "CortexOps Ansible Generator",
  "description": "Générez des playbooks Ansible avec l'IA",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.80.0"
  },
  "activationEvents": [
    "onCommand:cortexops.generate"
  ],
  "contributes": {
    "commands": [
      {
        "command": "cortexops.generate",
        "title": "CortexOps: Générer un Playbook"
      }
    ]
  }
}
```

### Tarification CLI/VS Code

- **Licence à vie** : 99€ (usage illimité)
- **Abonnement annuel** : 150€/an (inclus dans le plan Pro)

---

## 🏢 Modèle C : API Enterprise

### Architecture complète

L'API REST est déjà implémentée et déployée.

### Endpoint principal

**POST** `/functions/v1/generate-playbook-api`

**Headers requis :**
```
X-API-Key: cortex_your_api_key
Content-Type: application/json
```

**Body :**
```json
{
  "prompt": "Install Nginx with SSL on Ubuntu 22",
  "format": "yaml"
}
```

**Réponse :**
```json
{
  "success": true,
  "prompt": "Install Nginx with SSL on Ubuntu 22",
  "playbook": "---\n# Playbook généré...\n",
  "format": "yaml",
  "generated_at": "2025-01-12T10:30:00Z",
  "usage": {
    "calls_today": 15,
    "limit": 100
  }
}
```

### Gestion des API Keys

#### Composant `APIKeysManager` (`/src/components/APIKeysManager.tsx`)

Fonctionnalités :
- Création de clés API avec nom personnalisé
- Format : `cortex_` + 48 caractères aléatoires
- Aperçu masqué (premiers 15 + derniers 4 caractères)
- Suppression de clés
- Copie dans le presse-papiers
- Suivi de la dernière utilisation

#### Table `api_keys`

Colonnes :
- `id` : UUID unique
- `user_id` : Référence utilisateur
- `name` : Nom descriptif
- `key_hash` : Hash de la clé (sécurité)
- `key_preview` : Aperçu pour l'UI
- `permissions` : JSON des permissions
- `active` : Statut actif/inactif
- `last_used_at` : Dernière utilisation
- `expires_at` : Date d'expiration (optionnel)

### Quotas et rate limiting

| Plan | Appels API/jour | Prix |
|------|-----------------|------|
| Gratuit | 0 (API désactivée) | 0€ |
| Pro | 100 | 15€/mois |
| Enterprise | Illimité | 300€/mois |

### Fonctionnalités de sécurité

#### 1. Validation de clé
```typescript
const keyHash = btoa(apiKey);
const { data: keyData } = await supabase
  .from("api_keys")
  .select("id, user_id, active")
  .eq("key_hash", keyHash)
  .eq("active", true)
  .maybeSingle();
```

#### 2. Vérification des quotas
```typescript
if (profile.subscription_plan === "pro" && profile.api_calls_today >= 100) {
  return new Response(
    JSON.stringify({ error: "Limite quotidienne atteinte" }),
    { status: 429 }
  );
}
```

#### 3. Audit trail
Table `api_usage` avec :
- Endpoint appelé
- Méthode HTTP
- Status code
- Temps de réponse
- Tokens utilisés
- Timestamp

### Documentation API

Composant complet : `/src/components/APIDocumentation.tsx`

Inclut :
- Guide d'authentification
- URL de base
- Exemples de code (cURL, Python, Node.js, Go)
- Codes d'erreur
- Quotas par plan
- Support

---

## 📊 Dashboard Admin

### Fonctionnalités (`/src/components/AdminDashboard.tsx`)

1. **Statistiques globales**
   - Total utilisateurs
   - Répartition par plan (Free/Pro/Enterprise)
   - Playbooks générés ce mois
   - Utilisateurs actifs

2. **Liste des utilisateurs**
   - Email et nom complet
   - Plan d'abonnement
   - Statut (Actif/Annulé/Expiré)
   - Nombre de playbooks générés
   - Date d'inscription
   - Badge admin

3. **Filtres**
   - Par plan d'abonnement
   - Compteurs en temps réel

### Sécurité admin

```sql
-- Policy RLS
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );
```

---

## 🔄 Intégrations CI/CD

### Exemple GitLab CI

```yaml
generate-playbook:
  stage: deploy
  script:
    - |
      curl -X POST '${CORTEXOPS_API_URL}/generate-playbook-api' \
        -H "X-API-Key: ${CORTEXOPS_API_KEY}" \
        -H "Content-Type: application/json" \
        -d '{"prompt": "Deploy production infrastructure"}' \
        -o playbook.yml
    - ansible-playbook playbook.yml
```

### Exemple GitHub Actions

```yaml
- name: Generate Ansible Playbook
  run: |
    curl -X POST "${{ secrets.CORTEXOPS_API_URL }}/generate-playbook-api" \
      -H "X-API-Key: ${{ secrets.CORTEXOPS_API_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{"prompt": "Setup Kubernetes cluster"}' \
      -o k8s-playbook.yml

- name: Run Playbook
  run: ansible-playbook k8s-playbook.yml
```

---

## 💰 Projections de revenus

### Scénario conservateur (6 mois)

| Segment | Utilisateurs | Prix mensuel | MRR |
|---------|--------------|--------------|-----|
| Gratuit | 1000 | 0€ | 0€ |
| Pro | 50 | 15€ | 750€ |
| Enterprise | 5 | 300€ | 1500€ |
| **Total MRR** | | | **2250€** |

### Scénario optimiste (12 mois)

| Segment | Utilisateurs | Prix mensuel | MRR |
|---------|--------------|--------------|-----|
| Gratuit | 5000 | 0€ | 0€ |
| Pro | 200 | 15€ | 3000€ |
| Enterprise | 20 | 300€ | 6000€ |
| CLI (one-time) | 100 | - | +9900€ (one-time) |
| **Total MRR** | | | **9000€** |
| **ARR** | | | **108 000€** |

---

## 🚀 Prochaines étapes

### Court terme (1-2 semaines)
- [ ] Intégrer Stripe Checkout pour paiements réels
- [ ] Créer webhooks Stripe pour gestion automatique
- [ ] Implémenter emails transactionnels (confirmation, reçus)

### Moyen terme (1-2 mois)
- [ ] Développer la CLI npm
- [ ] Créer l'extension VS Code
- [ ] Ajouter analytics avancées (Mixpanel/Amplitude)
- [ ] Système de référencement (20% de commission)

### Long terme (3-6 mois)
- [ ] Mode multi-tenant pour entreprises
- [ ] Webhooks pour notifications temps réel
- [ ] Intégration ArgoCD / Terraform Cloud
- [ ] Version on-premise pour grands comptes

---

## 📞 Support

- **Email** : support@cortexops.dev
- **Documentation** : https://docs.cortexops.dev
- **API Status** : https://status.cortexops.dev
- **GitHub** : https://github.com/cortexops/api-examples
