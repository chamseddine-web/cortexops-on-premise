# Guide de Publication du Plugin VSCode CortexOps

## Structure Créée

L'extension VSCode complète est maintenant prête:

```
vscode-extension/
├── package.json              # Manifest de l'extension
├── tsconfig.json             # Configuration TypeScript
├── README.md                 # Documentation utilisateur
├── .vscodeignore            # Fichiers à exclure du package
├── src/
│   └── extension.ts         # Code principal de l'extension
└── snippets/
    └── ansible.json         # 20+ snippets Ansible
```

## Fonctionnalités Implémentées

### Commandes
- ✅ `cortexops.generatePlaybook` - Génération depuis prompt
- ✅ `cortexops.generateFromSelection` - Génération depuis sélection
- ✅ `cortexops.generateRole` - Génération de rôles
- ✅ `cortexops.validatePlaybook` - Validation YAML
- ✅ `cortexops.formatPlaybook` - Formatage
- ✅ `cortexops.deployPlaybook` - Déploiement
- ✅ `cortexops.showHistory` - Historique
- ✅ `cortexops.exportToGit` - Export Git
- ✅ `cortexops.showStats` - Statistiques
- ✅ `cortexops.openDocs` - Documentation

### Raccourcis Clavier
- `Ctrl+Alt+G` - Générer playbook
- `Ctrl+Alt+Shift+G` - Générer depuis sélection
- `Ctrl+Alt+V` - Valider
- `Ctrl+Alt+F` - Formater
- `Ctrl+Alt+D` - Déployer

### Snippets (20+)
- `ansible-task`, `ansible-playbook`, `ansible-service`
- `ansible-package`, `ansible-handler`, `ansible-block`
- `ansible-loop`, `ansible-when`, `ansible-copy`
- Et 11 autres...

## Étapes de Publication

### 1. Préparer l'Environnement

```bash
cd vscode-extension

# Installer les dépendances
npm install

# Installer vsce (VSCode Extension Manager)
npm install -g @vscode/vsce
```

### 2. Compiler l'Extension

```bash
# Compiler TypeScript
npm run compile

# Vérifier que out/extension.js existe
ls -la out/
```

### 3. Créer un Compte Publisher

#### Créer un Personal Access Token (PAT) Azure DevOps

1. Aller sur https://dev.azure.com
2. Créer un compte Microsoft si nécessaire
3. Aller dans User Settings → Personal Access Tokens
4. Cliquer "New Token"
5. Configuration:
   - Name: `vscode-marketplace`
   - Organization: `All accessible organizations`
   - Scopes: `Marketplace → Manage`
6. Copier le token (IMPORTANT: ne sera montré qu'une fois!)

#### Créer le Publisher

```bash
# Se connecter avec le PAT
vsce login cortexops

# Ou créer directement
vsce create-publisher cortexops
# Email: votre@email.com
# Display Name: CortexOps
# Description: AI-powered DevOps automation tools
```

### 4. Package l'Extension

```bash
# Créer le fichier .vsix
vsce package

# Vérifie que cortexops-ansible-generator-1.0.0.vsix est créé
ls -la *.vsix
```

### 5. Tester en Local

```bash
# Installer l'extension localement
code --install-extension cortexops-ansible-generator-1.0.0.vsix

# Tester toutes les fonctionnalités:
# 1. Ctrl+Alt+G pour générer
# 2. Tester les snippets
# 3. Vérifier la validation
# 4. Tester le preview
```

### 6. Publier sur le Marketplace

```bash
# Publier
vsce publish

# Ou avec version spécifique
vsce publish 1.0.0

# Ou avec bump automatique
vsce publish patch  # 1.0.0 → 1.0.1
vsce publish minor  # 1.0.0 → 1.1.0
vsce publish major  # 1.0.0 → 2.0.0
```

### 7. Vérifier la Publication

Après publication (5-10 minutes):
1. Aller sur https://marketplace.visualstudio.com
2. Rechercher "CortexOps Ansible Generator"
3. Vérifier que l'extension apparaît
4. Tester l'installation depuis VSCode

## Configuration Requise

### package.json Essentiel

Déjà configuré dans `vscode-extension/package.json`:

```json
{
  "name": "cortexops-ansible-generator",
  "displayName": "CortexOps Ansible Generator",
  "publisher": "cortexops",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.80.0"
  }
}
```

### Images Requises

Créer ces images avant publication:

```bash
# Dans vscode-extension/images/
mkdir -p images

# icon.png - 128x128px - Icône de l'extension
# sidebar-icon.svg - Icône de la barre latérale
```

**Note**: L'extension fonctionnera sans images, mais c'est recommandé.

## Commandes Utiles

### Gestion de Versions

```bash
# Voir la version actuelle
vsce show cortexops.cortexops-ansible-generator

# Publier une mise à jour
vsce publish patch

# Dépublier (attention!)
vsce unpublish cortexops.cortexops-ansible-generator
```

### Vérifications Avant Publication

```bash
# Vérifier le package
vsce ls

# Vérifier la taille
vsce package --out test.vsix
ls -lh test.vsix

# Lister les fichiers inclus
unzip -l cortexops-ansible-generator-1.0.0.vsix
```

## Post-Publication

### 1. Créer un Repository GitHub

```bash
cd vscode-extension
git init
git add .
git commit -m "Initial VSCode extension"
git remote add origin https://github.com/cortexops/vscode-extension.git
git push -u origin main
```

### 2. Ajouter un Badge README

Dans le README principal du projet:

```markdown
[![VSCode Extension](https://img.shields.io/visual-studio-marketplace/v/cortexops.cortexops-ansible-generator)](https://marketplace.visualstudio.com/items?itemName=cortexops.cortexops-ansible-generator)
```

### 3. Créer une Landing Page

Sur cortexops.com, créer `/vscode` avec:
- Screenshots de l'extension
- Vidéo démo
- Guide d'installation
- FAQ

### 4. Annoncer sur les Réseaux

- Dev.to
- Reddit r/vscode
- Twitter
- LinkedIn
- VSCode Discord

## Statistiques

Après publication, suivre sur:
- https://marketplace.visualstudio.com/manage/publishers/cortexops
- Voir: téléchargements, notes, reviews

## Mises à Jour Futures

### Ajouter des Fonctionnalités

```typescript
// Dans src/extension.ts
context.subscriptions.push(
    vscode.commands.registerCommand('cortexops.newFeature', async () => {
        // Nouvelle fonctionnalité
    })
);
```

### Publier une Mise à Jour

```bash
# Modifier le code
# Compiler
npm run compile

# Bump version et publier
vsce publish minor

# Ou manuellement
# 1. Modifier version dans package.json
# 2. vsce package
# 3. vsce publish
```

## Troubleshooting

### Erreur: "Publisher not found"

```bash
# Recréer le publisher
vsce create-publisher cortexops
```

### Erreur: "Invalid credentials"

```bash
# Se reconnecter avec un nouveau PAT
vsce login cortexops
```

### Erreur: "Missing icon"

Créer `images/icon.png` (128x128) ou supprimer la référence dans package.json:

```json
{
  "icon": "images/icon.png"  // ← Supprimer cette ligne
}
```

### Extension ne se compile pas

```bash
# Vérifier TypeScript
npx tsc --version

# Nettoyer et recompiler
rm -rf out/
npm run compile
```

## Distribution Alternative

### GitHub Releases

```bash
# Créer une release
git tag v1.0.0
git push --tags

# Sur GitHub, créer une Release et uploader le .vsix
```

Les utilisateurs peuvent installer avec:
```bash
code --install-extension cortexops-ansible-generator-1.0.0.vsix
```

### Open VSX Registry

Pour les utilisateurs non-VSCode (VSCodium, etc.):

```bash
# Publier sur Open VSX
npx ovsx publish cortexops-ansible-generator-1.0.0.vsix -p YOUR_TOKEN
```

## Checklist Finale

Avant publication:

- [ ] Extension compile sans erreurs
- [ ] Tous les tests passent
- [ ] README.md complet
- [ ] CHANGELOG.md créé
- [ ] Version correcte dans package.json
- [ ] PAT Azure DevOps créé
- [ ] Publisher créé
- [ ] Extension testée localement
- [ ] Screenshots préparés (optionnel)
- [ ] Icon créé (optionnel)

## Commande de Publication Rapide

```bash
cd vscode-extension && \
npm install && \
npm run compile && \
vsce package && \
code --install-extension *.vsix && \
echo "Test l'extension, puis lance: vsce publish"
```

## Résultat Final

Après publication réussie:
- Extension visible sur https://marketplace.visualstudio.com
- Installation via: `code --install-extension cortexops.cortexops-ansible-generator`
- Ou depuis VSCode: Extensions → Search "CortexOps"
- 100,000+ développeurs peuvent découvrir votre outil

## Analytics & Monitoring

Suivre les métriques:
1. Téléchargements journaliers
2. Notes et reviews
3. Installations actives
4. Version usage
5. Crash reports

Accessible sur: https://marketplace.visualstudio.com/manage

## Support Utilisateurs

Répondre aux:
- Issues GitHub
- Q&A Marketplace
- Emails support@cortexops.com
- Discord/Slack community
