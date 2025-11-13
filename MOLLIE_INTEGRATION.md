# 💳 Intégration Mollie - Système de Paiement Professionnel

## Vue d'ensemble

Système de paiement complet avec **Mollie API** pour gérer les abonnements récurrents et paiements one-time. Support complet des webhooks, synchronisation automatique des abonnements et gestion du cycle de vie des paiements.

---

## 📋 Fonctionnalités

### **Paiements**
- ✅ One-time payments (achats ponctuels)
- ✅ Abonnements récurrents (monthly/quarterly/yearly)
- ✅ Checkout hébergé Mollie
- ✅ Multiples méthodes de paiement (CB, PayPal, Bancontact, iDEAL...)
- ✅ Gestion des remboursements

### **Abonnements**
- ✅ 4 plans : Free, Pro, Team, Enterprise
- ✅ 3 intervalles : Mensuel, Trimestriel, Annuel
- ✅ Synchronisation automatique avec `user_profiles`
- ✅ Webhook pour mises à jour status
- ✅ Annulation à tout moment

### **Tracking**
- ✅ Historique complet des paiements
- ✅ Logs webhooks pour audit
- ✅ Analytics et reporting
- ✅ Customer management Mollie

---

## 🗄️ Architecture Base de Données

### **Tables créées**

```sql
-- 1. mollie_customers
CREATE TABLE mollie_customers (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  mollie_customer_id text UNIQUE,
  name text,
  email text,
  metadata jsonb
);

-- 2. mollie_payments
CREATE TABLE mollie_payments (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  mollie_payment_id text UNIQUE,
  amount_value numeric(10,2),
  status text, -- 'open', 'paid', 'failed', etc.
  method text,
  checkout_url text,
  metadata jsonb
);

-- 3. mollie_subscriptions
CREATE TABLE mollie_subscriptions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  mollie_subscription_id text UNIQUE,
  plan_name text, -- 'pro', 'team', 'enterprise'
  amount_value numeric(10,2),
  interval text, -- '1 month', '3 months', '1 year'
  status text, -- 'active', 'canceled', etc.
  next_payment_date timestamptz
);

-- 4. mollie_webhooks
CREATE TABLE mollie_webhooks (
  id uuid PRIMARY KEY,
  mollie_payment_id text,
  payload jsonb,
  processed boolean,
  created_at timestamptz
);
```

### **RLS Policies**
- ✅ Users peuvent voir leurs propres paiements/abonnements
- ✅ Service role (Edge Functions) peut CRUD complet
- ✅ Admins peuvent tout voir pour analytics

### **Triggers**
- ✅ `sync_user_subscription_plan()` : Sync automatique `user_profiles.subscription_plan` quand status abonnement change
- ✅ `update_updated_at_column()` : Timestamps automatiques

---

## ⚡ Edge Functions

### **1. create-mollie-payment** (Créer paiements)

**Endpoint** : `/functions/v1/create-mollie-payment`

**Request** :
```json
{
  "plan": "pro",
  "interval": "1 month",
  "isSubscription": true
}
```

**Response** :
```json
{
  "success": true,
  "checkoutUrl": "https://www.mollie.com/checkout/...",
  "paymentId": "tr_xxx",
  "subscriptionId": "sub_xxx",
  "type": "subscription"
}
```

**Flow** :
1. Récupère/crée customer Mollie
2. Crée premier paiement (si abonnement)
3. Crée subscription Mollie
4. Sauvegarde en DB
5. Retourne checkout URL

### **2. mollie-webhook** (Webhooks Mollie)

**Endpoint** : `/functions/v1/mollie-webhook`

**Request** (Mollie) :
```json
{
  "id": "tr_xxx"
}
```

**Flow** :
1. Log le webhook dans `mollie_webhooks`
2. Fetch détails depuis Mollie API
3. Update status dans `mollie_payments`
4. Si abonnement, sync `mollie_subscriptions`
5. Trigger `sync_user_subscription_plan()` automatiquement

---

## 💰 Plans & Tarifs

```typescript
const PLANS = {
  pro: {
    name: 'Pro DevOps',
    monthly: 19.90,
    quarterly: 54.90,
    yearly: 199.00
  },
  team: {
    name: 'Team',
    monthly: 49.00,
    quarterly: 135.00,
    yearly: 499.00
  },
  enterprise: {
    name: 'Enterprise',
    monthly: 149.00,
    quarterly: 399.00,
    yearly: 1499.00
  }
};
```

**Réductions** :
- Trimestriel : -8%
- Annuel : -17%

---

## 🎨 Frontend - PricingPage

### **Composant** : `src/components/PricingPage.tsx`

**Features** :
- ✅ Toggle interval (Mensuel/Trimestriel/Annuel)
- ✅ 4 cards pricing (Free, Pro, Team, Enterprise)
- ✅ Badges "Populaire", savings
- ✅ Loading states sur boutons
- ✅ Redirection automatique vers Mollie checkout
- ✅ Trust badges (SSL, RGPD, Annulation)

**Intégration** :
```tsx
import { PricingPage } from './components/PricingPage';

<PricingPage onGetStarted={() => navigate('/auth')} />
```

---

## 🚀 Déploiement

### **1. Configuration Mollie**

#### **Créer compte Mollie**
1. Aller sur [mollie.com](https://www.mollie.com)
2. S'inscrire (test mode gratuit)
3. Vérifier l'email et business info
4. Obtenir API Keys (Dashboard > Developers)

#### **API Keys**
```
Test Mode:
  test_xxxxxxxxxxxxx

Live Mode:
  live_xxxxxxxxxxxxx
```

### **2. Configuration Supabase**

```bash
# Configurer les secrets
supabase secrets set MOLLIE_API_KEY="test_xxxxxxxxxxxxx"
supabase secrets set APP_URL="https://cortexops.dev"

# Vérifier
supabase secrets list
```

### **3. Déployer les migrations**

```bash
# Appliquer la migration
supabase db push

# Vérifier les tables
supabase db list-tables | grep mollie
```

### **4. Déployer les Edge Functions**

```bash
# Déployer create-mollie-payment
supabase functions deploy create-mollie-payment

# Déployer mollie-webhook
supabase functions deploy mollie-webhook --no-verify-jwt

# Vérifier
supabase functions list
```

### **5. Configurer webhooks dans Mollie**

**Dashboard Mollie > Developers > Webhooks** :

```
Webhook URL: https://[PROJECT_ID].supabase.co/functions/v1/mollie-webhook
```

**Test** :
```bash
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/mollie-webhook \
  -H "Content-Type: application/json" \
  -d '{"id":"tr_test123"}'
```

---

## 🧪 Tests

### **Test 1: Créer un paiement**

```bash
# Via curl
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/create-mollie-payment \
  -H "Authorization: Bearer [ACCESS_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "pro",
    "interval": "1 month",
    "isSubscription": true
  }'
```

**Vérifier** :
1. Réponse contient `checkoutUrl`
2. Paiement créé dans `mollie_payments`
3. Abonnement créé dans `mollie_subscriptions`

### **Test 2: Compléter un paiement**

1. Cliquer bouton "Commencer maintenant" (Pro)
2. Redirection vers Mollie checkout
3. Compléter paiement (test cards)
4. Webhook déclenché automatiquement
5. Vérifier DB :
   ```sql
   SELECT * FROM mollie_payments ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM mollie_subscriptions ORDER BY created_at DESC LIMIT 1;
   SELECT subscription_plan FROM user_profiles WHERE id = '[user_id]';
   ```

**Test Cards Mollie** :
```
Success: 3782 8224 6310 005
Failure: 5555 5555 5555 4444
```

### **Test 3: Webhook**

```bash
# Simuler webhook Mollie
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/mollie-webhook \
  -H "Content-Type: application/json" \
  -d '{"id":"tr_[PAYMENT_ID]"}'

# Vérifier logs
supabase functions logs mollie-webhook --limit 10
```

### **Test 4: Synchronisation user_profiles**

```sql
-- 1. Créer abonnement (via Edge Function)
-- 2. Compléter paiement
-- 3. Vérifier sync :

SELECT
  ms.status as subscription_status,
  ms.plan_name,
  up.subscription_plan,
  up.subscription_status
FROM mollie_subscriptions ms
JOIN user_profiles up ON ms.user_id = up.id
WHERE ms.user_id = '[USER_ID]';

-- Doit montrer:
-- ms.status = 'active'
-- ms.plan_name = up.subscription_plan
```

---

## 📊 Analytics & Reporting

### **Fonction SQL : get_payment_stats()**

```sql
SELECT * FROM get_payment_stats('30 days');
```

**Retour** :
```json
{
  "total_revenue": 5489.70,
  "total_transactions": 127,
  "successful_payments": 119,
  "failed_payments": 8,
  "active_subscriptions": 89,
  "new_customers": 34
}
```

### **Queries utiles**

```sql
-- Revenue mensuel
SELECT
  DATE_TRUNC('month', paid_at) as month,
  SUM(amount_value) as revenue,
  COUNT(*) as transactions
FROM mollie_payments
WHERE status = 'paid'
GROUP BY month
ORDER BY month DESC;

-- Top plans
SELECT
  plan_name,
  COUNT(*) as subscriptions,
  SUM(amount_value) as mrr
FROM mollie_subscriptions
WHERE status = 'active'
GROUP BY plan_name;

-- Taux de conversion
SELECT
  COUNT(DISTINCT user_id) FILTER (WHERE status = 'paid') * 100.0 /
  COUNT(DISTINCT user_id) as conversion_rate
FROM mollie_payments;

-- Churn rate
SELECT
  COUNT(*) FILTER (WHERE canceled_at IS NOT NULL) * 100.0 /
  COUNT(*) as churn_rate
FROM mollie_subscriptions
WHERE created_at > now() - interval '30 days';
```

---

## 🔐 Sécurité

### **API Keys**
- ✅ **Jamais** dans le code source
- ✅ Stockées dans Supabase secrets
- ✅ Accessible uniquement par Edge Functions
- ✅ Utiliser `test_` mode en développement

### **Webhooks**
- ✅ Vérifier signature Mollie (optionnel)
- ✅ Idempotence (traiter chaque webhook une seule fois)
- ✅ Log tous les webhooks pour audit

### **Paiements**
- ✅ SSL/TLS obligatoire (Mollie)
- ✅ PCI DSS compliant (géré par Mollie)
- ✅ 3D Secure supporté
- ✅ RLS sur toutes les tables

---

## 🔄 Workflow Complet

```
1. User clique "Commencer maintenant" (Pro)
   ├─ Frontend : PricingPage.handleSubscribe()
   │
2. Appel Edge Function create-mollie-payment
   ├─ Récupère/crée customer Mollie
   ├─ Crée premier paiement (subscription)
   ├─ Crée subscription Mollie
   ├─ Sauvegarde DB (mollie_payments, mollie_subscriptions)
   └─ Retourne checkoutUrl
   │
3. Redirection vers Mollie checkout
   ├─ User choisit méthode (CB, PayPal, etc.)
   └─ Complete paiement
   │
4. Mollie envoie webhook
   ├─ POST /functions/v1/mollie-webhook
   │
5. Edge Function mollie-webhook
   ├─ Log webhook
   ├─ Fetch détails payment depuis Mollie API
   ├─ Update mollie_payments.status = 'paid'
   ├─ Fetch détails subscription depuis Mollie API
   ├─ Update mollie_subscriptions.status = 'active'
   │
6. Trigger sync_user_subscription_plan()
   ├─ Update user_profiles.subscription_plan = 'pro'
   ├─ Update user_profiles.subscription_status = 'active'
   │
7. User retourne sur site
   ├─ Accès premium débloqué
   └─ Dashboard mis à jour
```

---

## 🛠️ Troubleshooting

### **Problème : Webhook non reçu**

**Diagnostic** :
```sql
SELECT * FROM mollie_webhooks
ORDER BY created_at DESC LIMIT 10;
```

**Solutions** :
1. Vérifier URL webhook dans Mollie dashboard
2. Tester manuellement :
   ```bash
   curl -X POST [WEBHOOK_URL] -d '{"id":"tr_xxx"}'
   ```
3. Vérifier logs :
   ```bash
   supabase functions logs mollie-webhook
   ```

### **Problème : Payment reste "open"**

**Causes** :
- User a fermé checkout sans payer
- Paiement a expiré (default: 1h)
- Méthode de paiement refusée

**Solution** :
```sql
-- Vérifier le status
SELECT
  mp.mollie_payment_id,
  mp.status,
  mp.created_at,
  mp.expired_at
FROM mollie_payments mp
WHERE mp.user_id = '[USER_ID]'
ORDER BY mp.created_at DESC;

-- Si expiré, créer nouveau paiement
```

### **Problème : Subscription pas synchronisée**

**Diagnostic** :
```sql
SELECT
  ms.mollie_subscription_id,
  ms.status,
  ms.plan_name,
  up.subscription_plan
FROM mollie_subscriptions ms
JOIN user_profiles up ON ms.user_id = up.id
WHERE ms.user_id = '[USER_ID]';
```

**Solution** :
```sql
-- Forcer sync manuellement
UPDATE user_profiles
SET
  subscription_plan = (
    SELECT plan_name
    FROM mollie_subscriptions
    WHERE user_id = '[USER_ID]'
    AND status = 'active'
    LIMIT 1
  ),
  subscription_status = 'active'
WHERE id = '[USER_ID]';
```

---

## 📈 Métriques de Succès

| Métrique | Objectif | Comment mesurer |
|----------|----------|-----------------|
| **Conversion rate** | >3% | (Paid / Total visits) |
| **Payment success rate** | >95% | (Paid / (Paid + Failed)) |
| **Webhook latency** | <5s | Mollie dashboard |
| **Churn rate** | <5%/mois | Canceled / Active |
| **MRR** | Croissance | SUM(amount_value) active subs |

---

## 🎉 Résumé

**Système de paiement Mollie production-ready avec :**

- ✅ 4 plans d'abonnement (Free, Pro, Team, Enterprise)
- ✅ 3 intervalles (Mensuel, Trimestriel, Annuel)
- ✅ Paiements one-time et récurrents
- ✅ Webhooks automatiques
- ✅ Synchronisation auto avec user_profiles
- ✅ RLS et sécurité enterprise-grade
- ✅ Analytics et reporting complets
- ✅ PricingPage avec intégration Mollie
- ✅ Documentation exhaustive

**Prêt pour production ! 💳✨**

---

## 📞 Support

### **Mollie**
- 📧 Email: support@mollie.com
- 📖 Docs: https://docs.mollie.com
- 💬 Support: https://help.mollie.com

### **Supabase**
- 📧 Email: support@supabase.com
- 📖 Docs: https://supabase.com/docs
- 💬 Discord: https://discord.supabase.com

---

**Last updated**: 2025-01-12
**Version**: 1.0.0
**Status**: ✅ Production Ready
