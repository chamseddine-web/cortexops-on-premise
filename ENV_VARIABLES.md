# Variables d'Environnement

## Variables Requises pour Netlify

Lors de la configuration du site sur Netlify, vous DEVEZ ajouter ces variables d'environnement :

### VITE_SUPABASE_URL
```
https://pkvfnmmnfwfxnwojycmp.supabase.co
```

### VITE_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdmZubW1uZndmeG53b2p5Y21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzgwMDEsImV4cCI6MjA3ODQ1NDAwMX0.mR2AvsZGPl3qbDDU74fbhzS5fb83ZgozTWDK5OASMXE
```

## Comment Ajouter dans Netlify

### Pendant la Configuration Initiale
1. Lors de l'import du projet, cliquer sur "Show advanced"
2. Cliquer sur "New variable"
3. Ajouter chaque variable (Key + Value)

### Après le Déploiement
1. Aller dans "Site settings"
2. Cliquer sur "Environment variables"
3. Cliquer sur "Add a variable"
4. Ajouter chaque variable
5. Redéployer le site (si nécessaire)

## Note de Sécurité

Ces valeurs sont **publiques** (anon key) et peuvent être exposées côté client. C'est normal et attendu pour une application frontend.

La sécurité est assurée par :
- Row Level Security (RLS) dans Supabase
- Policies configurées dans les migrations
- Validation côté serveur

## Variables Supabase Edge Functions

Les edge functions utilisent ces variables (déjà configurées) :
- `SMTP_USER` : contact@spectra-consulting.fr
- `SMTP_PASSWORD` : Votre mot de passe SMTP IONOS
- `ADMIN_EMAIL` : contact@spectra-consulting.fr (optionnel)

Ces variables sont gérées dans Supabase Dashboard → Edge Functions → Settings.

## Vérification

Pour vérifier que les variables sont bien configurées :
1. Après le déploiement, ouvrir la console du navigateur (F12)
2. Vérifier qu'il n'y a pas d'erreur "undefined" pour VITE_SUPABASE_URL
3. Si erreur, les variables ne sont pas configurées correctement

## Fichier .env Local

Pour le développement local, créer un fichier `.env` (NON commité dans Git) :

```bash
VITE_SUPABASE_URL=https://pkvfnmmnfwfxnwojycmp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdmZubW1uZndmeG53b2p5Y21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzgwMDEsImV4cCI6MjA3ODQ1NDAwMX0.mR2AvsZGPl3qbDDU74fbhzS5fb83ZgozTWDK5OASMXE
```

Ce fichier est déjà exclu par `.gitignore`.
