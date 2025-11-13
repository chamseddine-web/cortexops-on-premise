# 🚀 Checklist de Déploiement - CortexOps Email System

## Vue d'ensemble

Ce document fournit la checklist complète pour déployer le système d'email automatisé avec IONOS SMTP.

---

## ✅ Prérequis

### **Outils installés**
- [ ] Node.js (v18+)
- [ ] npm ou yarn
- [ ] Supabase CLI (`npm install -g supabase`)
- [ ] Git

### **Comptes et accès**
- [ ] Compte Supabase avec projet créé
- [ ] Compte IONOS avec email contact@spectra-consulting.fr
- [ ] Accès au mot de passe de l'email IONOS
- [ ] Variables d'environnement locales (.env)

---

## 📋 Étapes de déploiement

### **1. Configuration Supabase** 🗄️

#### **1.1 Se connecter à Supabase**
```bash
# Connexion
supabase login

# Lier le projet
supabase link --project-ref [YOUR_PROJECT_ID]

# Vérifier la connexion
supabase projects list
```

**Résultat attendu** :
```
✓ Connecté à Supabase
✓ Projet lié: [PROJECT_NAME]
```

#### **1.2 Appliquer les migrations**
```bash
# Pousser toutes les migrations vers la DB
supabase db push

# Vérifier les tables créées
supabase db list-tables
```

**Vérifier** :
- [ ] Table `professional_profiles` existe
- [ ] Table `user_profiles` existe
- [ ] Table `user_roles` existe
- [ ] Fonction `get_professional_profiles_stats()` existe

#### **1.3 Configurer les secrets email**
```bash
# Méthode automatique (recommandé)
./deploy-email-ionos.sh

# OU méthode manuelle
supabase secrets set SMTP_USER="contact@spectra-consulting.fr"
supabase secrets set SMTP_PASSWORD="[VOTRE_PASSWORD]"

# Vérifier
supabase secrets list
```

**Vérifier** :
- [ ] SMTP_USER configuré
- [ ] SMTP_PASSWORD configuré

---

### **2. Edge Function** ⚡

#### **2.1 Déployer welcome-email**
```bash
# Déployer la fonction
supabase functions deploy welcome-email --no-verify-jwt

# Vérifier le déploiement
supabase functions list
```

**Résultat attendu** :
```
✓ welcome-email deployed
   Version: [timestamp]
   Status: ACTIVE
```

#### **2.2 Tester l'Edge Function**
```bash
# Test basique
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/welcome-email \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "votre-email@test.com",
    "fullName": "Test User",
    "jobTitle": "DevOps",
    "companyName": "Test Corp",
    "useCases": ["cicd", "security"]
  }'
```

**Vérifier** :
- [ ] Réponse `{"success": true, "message": "Welcome email sent to ..."}`
- [ ] Email reçu dans la boîte (vérifier spam aussi)
- [ ] HTML bien formaté dans l'email

#### **2.3 Vérifier les logs**
```bash
# Logs temps réel
supabase functions logs welcome-email --follow

# Derniers logs
supabase functions logs welcome-email --limit 20
```

**Messages attendus** :
```
Email sent successfully to test@example.com
```

---

### **3. Frontend** 🎨

#### **3.1 Build production**
```bash
# Installer les dépendances
npm install

# Build
npm run build

# Vérifier le build
ls -lh dist/
```

**Vérifier** :
- [ ] Dossier `dist/` créé
- [ ] `dist/index.html` existe
- [ ] `dist/assets/` contient JS et CSS
- [ ] Pas d'erreurs TypeScript

#### **3.2 Variables d'environnement**

Fichier `.env` ou `.env.production` :
```env
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
```

**Vérifier** :
- [ ] URL Supabase correcte
- [ ] ANON_KEY correcte (depuis Supabase dashboard)

#### **3.3 Déployer le frontend**

**Option A: Netlify**
```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Déployer
netlify deploy --prod --dir=dist
```

**Option B: Vercel**
```bash
# Installer Vercel CLI
npm install -g vercel

# Login
vercel login

# Déployer
vercel --prod
```

**Vérifier** :
- [ ] Déploiement réussi
- [ ] URL de production fonctionnelle
- [ ] Page d'accueil charge correctement

---

### **4. Intégration Email** 📧

#### **4.1 Modifier ProfessionalSignUpForm**

Fichier: `src/components/Auth/ProfessionalSignUpForm.tsx`

Ajouter après `signUp()` réussi :

```typescript
// Dans handleSubmit(), après signUp() sans erreur
if (data.user) {
  // Envoyer l'email de bienvenue
  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/welcome-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: formData.email,
      fullName: formData.fullName,
      jobTitle: formData.jobTitle,
      companyName: formData.companyName,
      useCases: formData.useCase
    })
  }).catch(err => {
    console.error('Email sending failed:', err);
    // Ne pas bloquer l'inscription
  });

  // Continuer vers page de succès
  setStep('verification');
}
```

#### **4.2 Rebuild et redéployer**
```bash
# Rebuild
npm run build

# Redéployer
netlify deploy --prod --dir=dist
# OU
vercel --prod
```

---

### **5. Tests End-to-End** 🧪

#### **Test 1: Création de compte complet**

1. **Aller sur le site** : https://[votre-domaine].com/auth
2. **Cliquer "S'inscrire"**
3. **Remplir les 4 étapes** :
   - Étape 1: Email + password
   - Étape 2: Poste + téléphone + pays
   - Étape 3: Entreprise + taille + secteur
   - Étape 4: Use cases + newsletter + CGU
4. **Soumettre**

**Vérifier** :
- [ ] Redirection vers page de succès
- [ ] Message "Bienvenue, [prénom] !"
- [ ] Email de bienvenue reçu (dans inbox ou spam)
- [ ] Email bien formaté avec HTML
- [ ] Prénom, poste, entreprise affichés correctement
- [ ] Use cases listés avec icons

#### **Test 2: Vérifier la base de données**

```sql
-- Connexion Supabase
supabase db execute

-- Vérifier le profil créé
SELECT * FROM professional_profiles
ORDER BY created_at DESC
LIMIT 1;

-- Vérifier le user_profile
SELECT * FROM user_profiles
ORDER BY created_at DESC
LIMIT 1;
```

**Vérifier** :
- [ ] Profil professionnel créé avec toutes les données
- [ ] User profile créé avec subscription_plan = 'free'
- [ ] Timestamps corrects

#### **Test 3: Dashboard Analytics (Admin)**

Si vous avez un compte admin :

1. **Se connecter en admin**
2. **Aller sur /analytics**
3. **Vérifier** :
   - [ ] KPIs affichés (total profils, secteurs, pays, use cases)
   - [ ] Graphiques chargés
   - [ ] Vue détails accessible
   - [ ] Export CSV fonctionne

#### **Test 4: Logs et Monitoring**

```bash
# Vérifier les logs Edge Function
supabase functions logs welcome-email --limit 50

# Chercher les erreurs
supabase functions logs welcome-email --limit 100 | grep -i error
```

**Vérifier** :
- [ ] Aucune erreur SMTP
- [ ] Messages "Email sent successfully"
- [ ] Latence < 2 secondes

---

## 🔒 Sécurité

### **Checklist sécurité**

- [ ] Secrets SMTP jamais dans le code
- [ ] Variables d'environnement configurées
- [ ] RLS activée sur toutes les tables
- [ ] Policies restrictives (users own data only)
- [ ] CORS configuré correctement
- [ ] SSL/TLS pour SMTP (port 465)
- [ ] HTTPS obligatoire pour le site
- [ ] Rate limiting activé (Supabase)

### **Vérification RLS**

```sql
-- Tester RLS (depuis user non-admin)
SELECT * FROM professional_profiles;
-- Doit retourner: 0 ou 1 ligne (son propre profil)

-- Tester avec admin
SELECT * FROM professional_profiles;
-- Doit retourner: toutes les lignes
```

---

## 📊 Monitoring Post-Déploiement

### **Jour 1**

- [ ] Vérifier les logs toutes les 2h
- [ ] Surveiller les erreurs SMTP
- [ ] Tester avec plusieurs créations de comptes
- [ ] Vérifier la réception des emails

### **Semaine 1**

- [ ] Analyser les métriques :
  - Taux de création de comptes
  - Taux de réception d'emails (>98%)
  - Latence moyenne Edge Function (<2s)
  - Erreurs SMTP (devrait être 0)

### **Mois 1**

- [ ] Surveiller les KPIs :
  - Email open rate (objectif >30%)
  - Activation rate (1ère génération, >50%)
  - Retention J+7 (>40%)
- [ ] Optimiser si nécessaire

### **Alertes à configurer**

```bash
# Exemple: Email sur erreurs SMTP
# À configurer dans Supabase Dashboard > Functions > Alerts

Condition: Status Code 500 OR "SMTP Error" in logs
Action: Send email to admin@cortexops.dev
Threshold: 3 errors in 10 minutes
```

---

## 🐛 Troubleshooting

### **Problème: Email non envoyé**

**Diagnostic** :
```bash
supabase functions logs welcome-email --limit 20
```

**Solutions** :
1. Vérifier que SMTP_PASSWORD est correct
2. Tester credentials IONOS manuellement
3. Vérifier que le port 465 n'est pas bloqué
4. Consulter IONOS dashboard (quota, réputation)

### **Problème: Email en spam**

**Solutions** :
1. Configurer SPF, DKIM, DMARC (voir EMAIL_IONOS_SETUP.md)
2. Demander à IONOS de vérifier la réputation
3. Réduire la fréquence d'envoi temporairement

### **Problème: Base de données lente**

**Diagnostic** :
```sql
EXPLAIN ANALYZE SELECT * FROM get_professional_profiles_stats();
```

**Solutions** :
1. Vérifier que les indexes existent
2. Optimiser la requête si nécessaire
3. Augmenter les ressources DB (Supabase plan)

---

## 📈 Métriques de Succès

| Métrique | Objectif | Actuel | Status |
|----------|----------|--------|--------|
| **Email delivery rate** | >98% | - | À mesurer |
| **Email open rate** | >30% | - | À mesurer |
| **Signup completion** | >70% | - | À mesurer |
| **Edge Function latency** | <2s | - | À mesurer |
| **Error rate** | <1% | - | À mesurer |

---

## ✅ Validation Finale

### **Avant de déclarer le déploiement terminé**

- [ ] Tous les tests E2E passent
- [ ] Au moins 3 comptes créés en production
- [ ] Tous les emails reçus avec succès
- [ ] Dashboard analytics accessible
- [ ] Export CSV fonctionne
- [ ] Aucune erreur dans les logs
- [ ] Documentation à jour
- [ ] Équipe informée

### **Communication**

- [ ] Notifier l'équipe du déploiement
- [ ] Partager les URLs :
  - Site: https://[domaine].com
  - Dashboard: https://[domaine].com/analytics
  - Supabase: https://app.supabase.com/project/[id]
- [ ] Documenter les credentials (password manager)
- [ ] Planifier review J+7

---

## 🎉 Déploiement Réussi !

Une fois toutes les étapes complétées et validées :

```
╔════════════════════════════════════════════╗
║                                            ║
║   ✅ Système d'Email Automation Déployé  ║
║                                            ║
║   • SMTP IONOS configuré                  ║
║   • Edge Function active                  ║
║   • Email professionnel personnalisé      ║
║   • Dashboard analytics opérationnel      ║
║   • Monitoring en place                   ║
║                                            ║
║   Production ready! 🚀                    ║
║                                            ║
╚════════════════════════════════════════════╝
```

**Prochain objectif** : Surveiller les métriques pendant 7 jours et optimiser ! 📊
