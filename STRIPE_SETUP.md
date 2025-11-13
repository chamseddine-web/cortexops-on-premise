# 💳 Stripe Integration Guide

## Configuration Stripe

### 1. Créer compte Stripe

1. Allez sur [stripe.com](https://stripe.com)
2. Créez un compte
3. Activez le mode test pour développement

### 2. Récupérer les clés API

Dans le Dashboard Stripe → Developers → API Keys :

```env
# Mode Test (développement)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Mode Live (production)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Créer les produits dans Stripe

**Dashboard Stripe → Products → Create Product**

#### Plan Pro - 49€/mois
```
Name: CortexOps Pro
Description: Playbooks illimités + Analytics + Export Git
Price: 49 EUR/month
Recurring: Monthly
Product ID: prod_xxx (noter l'ID)
Price ID: price_xxx (noter l'ID)
```

#### Plan Enterprise - 499€/mois
```
Name: CortexOps Enterprise
Description: Tout Pro + API illimitée + Support prioritaire + SLA
Price: 499 EUR/month
Recurring: Monthly
Product ID: prod_yyy (noter l'ID)
Price ID: price_yyy (noter l'ID)
```

### 4. Configuration Webhooks

**Dashboard Stripe → Developers → Webhooks → Add Endpoint**

```
URL: https://votre-projet.supabase.co/functions/v1/stripe-webhook
Events à écouter:
  - checkout.session.completed
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed
```

**Récupérer le Webhook Secret** et l'ajouter à `.env`

---

## Plans Tarifaires

### Free - 0€
```
✅ 100 API calls / jour
✅ 5 playbooks / mois
✅ Génération IA basique
✅ Export YAML
✅ Support communauté
❌ Export Git
❌ API accès
❌ Analytics avancés
```

### Pro - 49€/mois
```
✅ API calls illimités
✅ Playbooks illimités
✅ IA avancée + prédictions
✅ Export Git automatique
✅ CI/CD intégrations
✅ Analytics détaillés
✅ Support prioritaire
❌ API externe
❌ SLA
```

### Enterprise - 499€/mois
```
✅ Tout Pro inclus
✅ API externe complète
✅ Users illimités
✅ White label
✅ SLA 99.9%
✅ Support 24/7
✅ Account manager dédié
✅ Custom features
```

---

## Variables d'environnement

Ajoutez à `.env` :

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Product IDs (depuis votre Dashboard)
STRIPE_PRICE_ID_PRO=price_xxx
STRIPE_PRICE_ID_ENTERPRISE=price_yyy

# URLs
STRIPE_SUCCESS_URL=https://votre-domaine.com/success
STRIPE_CANCEL_URL=https://votre-domaine.com/pricing
```

---

## Migration Supabase

La migration pour gérer les abonnements Stripe est déjà créée dans :
`supabase/migrations/20251113160000_create_stripe_subscriptions.sql`

Elle créera automatiquement :
- Table `stripe_customers`
- Table `stripe_subscriptions`
- Fonctions de synchronisation
- Triggers automatiques

---

## Test Flow

### 1. Mode Test Stripe

Utilisez les cartes de test Stripe :

```
✅ Success: 4242 4242 4242 4242
❌ Declined: 4000 0000 0000 0002
🔄 3D Secure: 4000 0027 6000 3184

Expiry: N'importe quelle date future
CVC: N'importe quel 3 chiffres
ZIP: N'importe quel code postal
```

### 2. Tester l'abonnement

1. Allez sur `/pricing`
2. Cliquez "Commencer" sur plan Pro
3. Remplissez avec carte test
4. Validez le paiement
5. Vérifiez Dashboard Stripe → Payments
6. Vérifiez l'upgrade dans votre app

### 3. Tester les webhooks

```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks en local
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Déclencher un événement test
stripe trigger checkout.session.completed
```

---

## Gestion TVA

Stripe Billing gère automatiquement :

✅ TVA UE (reverse charge)
✅ Numéros TVA validation
✅ Factures conformes
✅ Déclarations fiscales

Configuration :
1. Dashboard Stripe → Settings → Tax
2. Activez "Automatic tax calculation"
3. Configurez vos produits avec tax codes

---

## Go Live

### Checklist avant production

- [ ] Stripe account fully verified
- [ ] Business details completed
- [ ] Bank account connected
- [ ] Tax settings configured
- [ ] Products created in Live mode
- [ ] Webhook endpoint configured (Live)
- [ ] Environment variables updated (Live keys)
- [ ] Test complete payment flow
- [ ] Test webhook delivery
- [ ] Legal pages (Terms, Privacy) published

### Passer en Live

1. **Stripe Dashboard → Switch to Live Mode**
2. Récupérer les nouvelles clés Live
3. Mettre à jour `.env` avec clés Live
4. Reconfigurer webhook endpoint avec URL production
5. Tester avec vraie carte (puis remboursement test)

---

## Support

### Documentation Stripe
- [Billing Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Webhooks](https://stripe.com/docs/webhooks)
- [Testing](https://stripe.com/docs/testing)

### Stripe CLI
```bash
# Voir logs webhooks
stripe listen

# Trigger events
stripe trigger <event_name>

# View events
stripe events list --limit 10
```

---

**Stripe Integration Ready!** 💳✨
