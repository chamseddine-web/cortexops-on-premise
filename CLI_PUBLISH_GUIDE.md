# Guide de Publication du CLI CortexOps sur npm

## Structure Créée

Le CLI CortexOps est maintenant complet avec:

```
bin/
  └── cortexops.js          # Point d'entrée du CLI
cli/
  └── src/
      ├── commands/
      │   ├── init.js       # Initialisation
      │   ├── auth.js       # Login/logout
      │   ├── generate.js   # Génération de playbooks
      │   ├── validate.js   # Validation
      │   ├── deploy.js     # Déploiement
      │   ├── history.js    # Historique
      │   ├── export.js     # Export Git
      │   ├── cicd.js       # CI/CD generation
      │   ├── batch.js      # Batch generation
      │   ├── stats.js      # Statistiques
      │   ├── update.js     # Mise à jour
      │   ├── config.js     # Configuration
      │   └── interactive.js # Mode interactif
      └── utils/
          ├── config.js     # Gestion config
          └── api.js        # Client API
cli-package.json            # Package.json pour npm
CLI_README.md               # Documentation CLI
```

## Étapes de Publication

### 1. Préparer le Package

```bash
# Créer un dossier dédié pour le CLI
mkdir -p cortexops-cli
cd cortexops-cli

# Copier les fichiers nécessaires
cp -r ../bin .
cp -r ../cli .
cp ../cli-package.json package.json
cp ../CLI_README.md README.md
```

### 2. Installer les Dépendances

```bash
npm install
```

### 3. Tester en Local

```bash
# Lien global pour test
npm link

# Tester les commandes
cortexops --version
cortexops --help
cortexops init
```

### 4. Créer un Compte npm (si nécessaire)

```bash
# Créer un compte sur npmjs.com
# Puis se connecter
npm login
```

### 5. Publier sur npm

```bash
# Vérifier le package avant publication
npm pack

# Publier (première fois)
npm publish --access public

# Pour les mises à jour futures
npm version patch  # ou minor, major
npm publish
```

## Configuration Requise

### package.json Clé

Le fichier `cli-package.json` contient déjà:

```json
{
  "name": "@cortexops/cli",
  "version": "1.0.0",
  "bin": {
    "cortexops": "./bin/cortexops.js"
  },
  "files": [
    "bin/",
    "cli/",
    "README.md"
  ]
}
```

### Permissions

Le fichier `bin/cortexops.js` doit être exécutable:

```bash
chmod +x bin/cortexops.js
```

Et commencer par le shebang:
```javascript
#!/usr/bin/env node
```

## Utilisation Post-Publication

Une fois publié, les utilisateurs peuvent installer avec:

```bash
# Installation globale
npm install -g @cortexops/cli

# Utilisation
cortexops init
cortexops login ctx_live_xxxxxxxxxxxx
cortexops generate "Install nginx" -o nginx.yml
```

## API Backend Requise

Le CLI nécessite ces endpoints API:

```
POST /api/generate-playbook
  Body: { prompt, environment, become, gather_facts, complexity }

POST /api/auth/verify
  Headers: { X-API-Key }

GET /api/history?limit=10&filter=

GET /api/stats?period=month
```

## Variables d'Environnement

Les utilisateurs peuvent configurer:

```bash
export CORTEXOPS_API_KEY=ctx_live_xxxxxxxxxxxx
export CORTEXOPS_API_URL=https://api.cortexops.com/v1
export CORTEXOPS_ENVIRONMENT=production
export CORTEXOPS_OUTPUT_DIR=./playbooks
```

## Maintenance

### Mises à Jour

```bash
# Patch (1.0.0 → 1.0.1)
npm version patch

# Minor (1.0.0 → 1.1.0)
npm version minor

# Major (1.0.0 → 2.0.0)
npm version major

# Publier
npm publish
```

### Dépublier (attention!)

```bash
# Dépublier une version spécifique (72h max)
npm unpublish @cortexops/cli@1.0.0

# Dépublier complètement (déconseillé)
npm unpublish @cortexops/cli --force
```

## Distribution Alternative

### Via GitHub Releases

```bash
# Créer un tarball
npm pack

# Upload sur GitHub Releases
# Les utilisateurs peuvent installer avec:
npm install -g https://github.com/cortexops/cli/releases/download/v1.0.0/cortexops-cli-1.0.0.tgz
```

### Via Script d'Installation

Créer `install.sh`:

```bash
#!/bin/bash
npm install -g @cortexops/cli
cortexops init
echo "CortexOps CLI installed successfully!"
```

Les utilisateurs peuvent installer avec:

```bash
curl -sSL https://install.cortexops.com | bash
```

## Checklist Avant Publication

- [ ] Toutes les commandes sont implémentées
- [ ] Les dépendances sont installées
- [ ] Le CLI fonctionne en local (`npm link`)
- [ ] README.md est complet
- [ ] package.json est correct
- [ ] Compte npm créé et connecté
- [ ] API backend déployée
- [ ] Tests effectués

## Commande de Publication Rapide

```bash
# Tout en une seule fois
cd cortexops-cli && \
npm install && \
npm link && \
cortexops --version && \
npm publish --access public
```

## Résultat Final

Après publication, le CLI sera disponible sur:
- npm: https://www.npmjs.com/package/@cortexops/cli
- Installation: `npm install -g @cortexops/cli`
- Documentation: Affichée sur npmjs.com depuis README.md

## Support Utilisateurs

Créer ces ressources pour les utilisateurs:

1. **Documentation**: https://docs.cortexops.com/cli
2. **Issues**: https://github.com/cortexops/cli/issues
3. **Discussions**: https://github.com/cortexops/cli/discussions
4. **Examples**: https://github.com/cortexops/cli/tree/main/examples

## Monitoring

Après publication, surveiller:
- Téléchargements: npmjs.com/package/@cortexops/cli
- Issues GitHub
- Retours utilisateurs
- Compatibilité versions Node.js
