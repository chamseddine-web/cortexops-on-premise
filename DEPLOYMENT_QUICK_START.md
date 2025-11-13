# Déploiement Rapide sur Netlify

## 🚀 En 5 Minutes

### 1. Push sur Git
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Créer le Site sur Netlify
1. Aller sur [app.netlify.com](https://app.netlify.com)
2. "Add new site" → "Import an existing project"
3. Connecter votre repo Git
4. Sélectionner le repository

### 3. Configurer les Variables d'Environnement
**AVANT de déployer**, ajouter ces variables :

```
VITE_SUPABASE_URL=https://pkvfnmmnfwfxnwojycmp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdmZubW1uZndmeG53b2p5Y21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzgwMDEsImV4cCI6MjA3ODQ1NDAwMX0.mR2AvsZGPl3qbDDU74fbhzS5fb83ZgozTWDK5OASMXE
```

### 4. Déployer
Cliquer sur "Deploy site" et attendre 2-3 minutes.

### 5. Configurer Supabase
1. Supabase Dashboard → Authentication → URL Configuration
2. Ajouter l'URL Netlify dans "Site URL" et "Redirect URLs"

## ✅ C'est Tout !

Votre site est maintenant live et se redéploiera automatiquement à chaque push.

## 📚 Documentation Complète
Voir [NETLIFY_DEPLOYMENT_GUIDE.md](./NETLIFY_DEPLOYMENT_GUIDE.md) pour plus de détails.

## 🆘 Problèmes ?

**Page blanche** → Vérifier les variables d'environnement
**404 sur routes** → Vérifier que _redirects est dans dist/
**Build échoue** → Lire les logs dans Netlify Dashboard

## 📧 Note sur le Formulaire de Contact

N'oubliez pas d'appliquer la migration SQL pour la table `contact_requests` :
1. Supabase Dashboard → SQL Editor
2. Copier le SQL de `supabase/migrations/20251113060000_create_contact_requests_table.sql`
3. Exécuter

Et déployer l'edge function `contact-notification` pour l'envoi d'emails.
