# Guide de Déploiement Netlify - CortexOps

## Configuration Créée

Les fichiers suivants ont été créés pour optimiser le déploiement sur Netlify :

### 1. `netlify.toml`
Configuration principale de Netlify avec :
- Commande de build : `npm run build`
- Dossier de publication : `dist`
- Redirects pour le routing React Router
- Version de Node.js : 18

### 2. `public/_redirects`
Fichier de redirects pour gérer le routing côté client de React Router.

## Étapes de Déploiement

### Option 1 : Déploiement via Interface Netlify (Recommandé)

#### A. Configuration Initiale

1. **Se connecter à Netlify**
   - Aller sur : https://app.netlify.com
   - Se connecter avec votre compte

2. **Importer le projet**
   - Cliquer sur "Add new site" → "Import an existing project"
   - Connecter votre dépôt Git (GitHub, GitLab, Bitbucket)
   - Sélectionner le repository CortexOps

3. **Configuration du Build**
   ```
   Build command: npm run build
   Publish directory: dist
   ```
   (Ces valeurs sont déjà dans netlify.toml, donc détectées automatiquement)

#### B. Variables d'Environnement (CRITIQUE)

**IMPORTANT** : Ajouter ces variables d'environnement dans Netlify :

1. Aller dans : Site settings → Environment variables
2. Ajouter les variables suivantes :

```
VITE_SUPABASE_URL=https://pkvfnmmnfwfxnwojycmp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdmZubW1uZndmeG53b2p5Y21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzgwMDEsImV4cCI6MjA3ODQ1NDAwMX0.mR2AvsZGPl3qbDDU74fbhzS5fb83ZgozTWDK5OASMXE
```

**Note** : Ces valeurs sont publiques (anon key) et doivent être dans les variables d'environnement Netlify.

#### C. Déployer

1. Cliquer sur "Deploy site"
2. Attendre la fin du build (2-5 minutes)
3. Le site sera disponible sur une URL Netlify (ex: https://cortexops.netlify.app)

### Option 2 : Déploiement via CLI Netlify

#### Installation

```bash
npm install -g netlify-cli
```

#### Connexion

```bash
netlify login
```

#### Déploiement

```bash
# Build local
npm run build

# Déployer
netlify deploy --prod --dir=dist
```

## Configuration Post-Déploiement

### 1. Domaine Personnalisé (Optionnel)

Si vous avez un domaine personnalisé :

1. Aller dans : Site settings → Domain management
2. Cliquer sur "Add custom domain"
3. Suivre les instructions pour configurer les DNS

### 2. HTTPS

- HTTPS est automatiquement activé par Netlify (Let's Encrypt)
- Aucune configuration nécessaire

### 3. Redirects et Headers

Les redirects sont configurés via `netlify.toml` et `public/_redirects`.

Pour ajouter des headers de sécurité supplémentaires, vous pouvez ajouter dans `netlify.toml` :

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

## Checklist de Déploiement

- [ ] Repository Git configuré et poussé
- [ ] `netlify.toml` présent dans le root
- [ ] `public/_redirects` présent
- [ ] Variables d'environnement configurées dans Netlify
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] Build réussi localement (`npm run build`)
- [ ] Site déployé sur Netlify
- [ ] Test du site en production
- [ ] Domaine personnalisé configuré (optionnel)

## Configuration Supabase

### Autoriser le Domaine Netlify

1. Aller dans Supabase Dashboard → Authentication → URL Configuration
2. Ajouter l'URL de votre site Netlify dans "Site URL" :
   ```
   https://votre-site.netlify.app
   ```

3. Ajouter dans "Redirect URLs" :
   ```
   https://votre-site.netlify.app/**
   ```

## Déploiement Continu

Une fois configuré, chaque push sur votre branche principale (main/master) déclenchera automatiquement :
1. Un build sur Netlify
2. Un déploiement automatique si le build réussit

### Branch Deploys (Optionnel)

Netlify peut créer des déploiements pour chaque branche :
- Site settings → Build & deploy → Branch deploys
- Activer "Deploy only the production branch" ou "Deploy all branches"

## Rollback

Si un déploiement pose problème :

1. Aller dans : Deploys
2. Trouver un déploiement précédent qui fonctionnait
3. Cliquer sur "Publish deploy" pour faire un rollback

## Monitoring et Logs

### Voir les Logs de Build

1. Aller dans : Deploys
2. Cliquer sur un déploiement
3. Voir les logs complets

### Analytics (Optionnel)

Activer Netlify Analytics pour voir :
- Nombre de visiteurs
- Pages les plus visitées
- Performances

## Dépannage

### Problème : Build Fails

**Solution** :
1. Vérifier les logs de build dans Netlify
2. S'assurer que `npm run build` fonctionne localement
3. Vérifier que toutes les dépendances sont dans `package.json`

### Problème : Page Blanche

**Solution** :
1. Vérifier que les variables d'environnement sont configurées
2. Ouvrir la console du navigateur pour voir les erreurs
3. Vérifier que le fichier `_redirects` est présent dans le build

### Problème : 404 sur les Routes

**Solution** :
1. Vérifier que `netlify.toml` contient les redirects
2. Vérifier que `public/_redirects` existe
3. Les deux fichiers doivent rediriger `/*` vers `/index.html`

### Problème : Supabase ne se connecte pas

**Solution** :
1. Vérifier que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont configurés
2. Vérifier que l'URL Netlify est autorisée dans Supabase
3. Ouvrir la console pour voir les erreurs CORS

## Performance

### Optimisations Netlify

Netlify optimise automatiquement :
- Compression Gzip/Brotli
- CDN global
- Caching des assets

### Optimisations Supplémentaires

Pour améliorer les performances :

1. **Bundle Size** : Analyser avec `npm run build -- --stats`
2. **Code Splitting** : Déjà configuré avec Vite
3. **Image Optimization** : Utiliser des formats modernes (WebP)

## Sécurité

### Headers de Sécurité

Les headers de sécurité recommandés sont dans `netlify.toml`.

### Secrets

- ⚠️ Ne JAMAIS commiter `.env` dans Git
- ✅ Utiliser les variables d'environnement Netlify
- ✅ Le fichier `.gitignore` exclut déjà `.env`

## Support

- Documentation Netlify : https://docs.netlify.com
- Support Netlify : https://answers.netlify.com
- Supabase Docs : https://supabase.com/docs

## Résumé

```bash
# 1. Push votre code sur Git
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Connecter à Netlify via interface web
# 3. Configurer les variables d'environnement
# 4. Déployer !
```

Votre application sera live en quelques minutes ! 🚀
