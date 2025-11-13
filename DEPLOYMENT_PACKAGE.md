# 📦 CortexOps On-Premise - Guide de Distribution

## 🎯 Options de Distribution

Vous avez 3 options pour distribuer votre package On-Premise:

---

## **Option 1: Repository GitHub (Recommandé)**

### **Étape 1: Créer le repository**

```bash
# Sur GitHub, créez un nouveau repo (public ou privé)
# Nom suggéré: cortexops-on-premise

# Dans votre projet local
git init
git add .
git commit -m "Initial commit: CortexOps On-Premise v1.0.0"
git branch -M main
git remote add origin https://github.com/VOTRE-ORG/cortexops-on-premise.git
git push -u origin main
```

### **Étape 2: Clients peuvent installer ainsi**

```bash
# Clone et install en 2 commandes
git clone https://github.com/VOTRE-ORG/cortexops-on-premise.git
cd cortexops-on-premise
./scripts/setup.sh
```

### **Avantages:**
- ✅ Updates faciles (git pull + ./scripts/update.sh)
- ✅ Versioning automatique
- ✅ Issues/Support intégré
- ✅ Documentation visible
- ✅ Releases avec notes

---

## **Option 2: Archive ZIP Téléchargeable**

### **Étape 1: Créer l'archive**

```bash
# Depuis la racine du projet
./scripts/create-package.sh
```

Ou manuellement:

```bash
# Créer un dossier propre
mkdir cortexops-on-premise-v1.0.0

# Copier les fichiers nécessaires
cp -r docker-compose.yml Dockerfile .env.example nginx.conf \
      scripts/ nginx/ prometheus/ grafana/ postgres/ \
      *.md cortexops-on-premise-v1.0.0/

# Créer l'archive
tar czf cortexops-on-premise-v1.0.0.tar.gz cortexops-on-premise-v1.0.0/
zip -r cortexops-on-premise-v1.0.0.zip cortexops-on-premise-v1.0.0/

# Nettoyer
rm -rf cortexops-on-premise-v1.0.0/
```

### **Étape 2: Héberger l'archive**

Uploadez sur:
- Votre site web (https://cortexops.com/download/)
- AWS S3
- Google Drive
- Dropbox
- GitHub Releases

### **Étape 3: Clients installent ainsi**

```bash
# Télécharge
wget https://votresite.com/cortexops-on-premise-v1.0.0.tar.gz
# OU
curl -O https://votresite.com/cortexops-on-premise-v1.0.0.tar.gz

# Extrait
tar xzf cortexops-on-premise-v1.0.0.tar.gz
cd cortexops-on-premise-v1.0.0

# Install
chmod +x scripts/*.sh
./scripts/setup.sh
```

### **Avantages:**
- ✅ Pas de compte GitHub requis
- ✅ Contrôle total de la distribution
- ✅ Peut être vendu directement
- ✅ Offline-friendly

---

## **Option 3: Docker Hub + Docker Compose**

### **Étape 1: Build et push l'image**

```bash
# Login Docker Hub
docker login

# Build l'image
docker build -t votreorg/cortexops:latest .
docker build -t votreorg/cortexops:1.0.0 .

# Push
docker push votreorg/cortexops:latest
docker push votreorg/cortexops:1.0.0
```

### **Étape 2: Simplifier le docker-compose.yml**

```yaml
version: '3.8'

services:
  cortexops-web:
    image: votreorg/cortexops:latest  # Pas de build, juste pull
    container_name: cortexops-web
    # ... reste de la config
```

### **Étape 3: Clients installent ainsi**

```bash
# Télécharge uniquement docker-compose.yml et .env.example
wget https://votresite.com/docker-compose.yml
wget https://votresite.com/.env.example

# Configure
cp .env.example .env
nano .env

# Lance
docker-compose up -d
```

### **Avantages:**
- ✅ Installation ultra-rapide
- ✅ Images pré-buildées
- ✅ Updates simples (docker-compose pull)
- ✅ Versioning des images

---

## **📋 Checklist Avant Distribution**

### **Fichiers à Inclure**

```
cortexops-on-premise/
├── README.md                      ✅ Guide principal
├── ON_PREMISE_GUIDE.md           ✅ Guide détaillé
├── API_DOCUMENTATION.md          ✅ Doc API
├── DEPLOYMENT_PACKAGE.md         ✅ Ce fichier
├── docker-compose.yml            ✅ Orchestration
├── Dockerfile                    ✅ Build image
├── .env.example                  ✅ Template config
├── nginx.conf                    ✅ Config Nginx
├── .gitignore                    ✅ Git ignore
├── scripts/
│   ├── setup.sh                  ✅ Install auto
│   ├── backup.sh                 ✅ Backup
│   ├── restore.sh                ✅ Restore
│   └── update.sh                 ✅ Update
├── nginx/
│   ├── default.conf              ✅ Vhost
│   └── ssl/ (vide)              ✅ Pour certs
├── prometheus/
│   ├── prometheus.yml            ✅ Config
│   └── alerts.yml               ✅ Alertes
├── grafana/
│   ├── provisioning/            ✅ Datasources
│   └── dashboards/              ✅ Dashboards JSON
└── postgres/
    └── init/                     ✅ SQL init
```

### **Fichiers à EXCLURE**

```
❌ .env                   # Contient secrets
❌ node_modules/          # Trop gros
❌ dist/                  # Build artifacts
❌ .git/                  # Si ZIP
❌ backups/               # Données sensibles
❌ logs/                  # Logs locaux
❌ nginx/ssl/*.key        # Clés privées
❌ *.log
❌ .DS_Store
```

### **Vérifications**

- [ ] `.env.example` ne contient PAS de vraies credentials
- [ ] Tous les scripts sont exécutables (`chmod +x`)
- [ ] README est à jour avec la bonne version
- [ ] Documentation complète et sans erreurs
- [ ] Tests d'installation faits (clean install)
- [ ] Build Docker fonctionne
- [ ] Tous les services démarrent correctement
- [ ] Health checks passent
- [ ] Backup/restore testés
- [ ] Update testé

---

## **🔐 Sécurité**

### **Avant de Distribuer**

```bash
# Vérifier qu'il n'y a pas de secrets
grep -r "sk_live_" .
grep -r "password.*=" . | grep -v ".example"
grep -r "api.*key.*=" . | grep -v ".example"

# Nettoyer l'historique Git (si des secrets ont été commités)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all
```

### **Dans la Documentation**

- ⚠️ Avertir de TOUJOURS changer les mots de passe par défaut
- ⚠️ Recommander de générer de nouveaux secrets
- ⚠️ Conseiller SSL/TLS pour production
- ⚠️ Mentionner le firewall

---

## **💼 Modèles de Distribution Commerciale**

### **Modèle 1: Open Source + Support Payant**

```
├── Repository GitHub Public
├── Installation gratuite
├── Documentation gratuite
└── Support payant:
    ├── Email support: 500€/an
    ├── Priority support: 1,500€/an
    └── Custom deployment: 5,000€
```

### **Modèle 2: Freemium**

```
├── Version Community (gratuite)
│   ├── Toutes fonctionnalités
│   ├── Support communautaire
│   └── Self-hosted
└── Version Enterprise (payante)
    ├── Support premium
    ├── SLA garantis
    ├── Formation incluse
    └── Updates prioritaires
```

### **Modèle 3: Licence Perpétuelle**

```
├── Licence unique: 5,000€
│   ├── Installation illimitée (1 entreprise)
│   ├── Support 1 an inclus
│   └── Updates 1 an inclus
└── Renouvellement annuel: 1,000€/an
    ├── Support continu
    └── Updates
```

### **Modèle 4: Abonnement Annuel**

```
├── Starter: 1,500€/an
│   ├── Jusqu'à 10 utilisateurs
│   ├── 1 environnement
│   └── Email support
├── Professional: 3,500€/an
│   ├── Jusqu'à 50 utilisateurs
│   ├── 3 environnements
│   └── Priority support
└── Enterprise: Sur devis
    ├── Utilisateurs illimités
    ├── Environnements illimités
    ├── Support 24/7
    └── Custom features
```

---

## **📝 License Suggérée**

### **Pour Open Source: MIT License**

```text
MIT License

Copyright (c) 2025 CortexOps

Permission is hereby granted, free of charge, to any person obtaining a copy...
```

### **Pour Commercial: Proprietary License**

```text
CortexOps On-Premise License Agreement

This software is licensed, not sold.

GRANT OF LICENSE:
Subject to payment of applicable license fees, [Company] grants you a
non-exclusive, non-transferable license to use this software...

RESTRICTIONS:
- May not distribute or resell
- May not reverse engineer
- Must maintain copyright notices
...
```

---

## **🚀 Publication - Étapes Finales**

### **1. Créer le Package**

```bash
# Script automatique de packaging
cat > scripts/create-package.sh << 'EOF'
#!/bin/bash
VERSION="1.0.0"
PKG_NAME="cortexops-on-premise-v${VERSION}"

mkdir -p dist
mkdir -p "$PKG_NAME"

# Copie les fichiers essentiels
cp -r docker-compose.yml Dockerfile .env.example nginx.conf \
      scripts/ nginx/ prometheus/ grafana/ postgres/ \
      *.md "$PKG_NAME/"

# Nettoie
rm -rf "$PKG_NAME"/.env
rm -rf "$PKG_NAME"/node_modules
rm -rf "$PKG_NAME"/dist
rm -rf "$PKG_NAME"/.git

# Archive
tar czf "dist/${PKG_NAME}.tar.gz" "$PKG_NAME"
zip -r "dist/${PKG_NAME}.zip" "$PKG_NAME"

# Checksum
cd dist
sha256sum "${PKG_NAME}.tar.gz" > "${PKG_NAME}.tar.gz.sha256"
sha256sum "${PKG_NAME}.zip" > "${PKG_NAME}.zip.sha256"

echo "Package créé: dist/${PKG_NAME}.tar.gz"
echo "Package créé: dist/${PKG_NAME}.zip"
EOF

chmod +x scripts/create-package.sh
./scripts/create-package.sh
```

### **2. Créer GitHub Release**

```bash
# Tag la version
git tag -a v1.0.0 -m "CortexOps On-Premise v1.0.0"
git push origin v1.0.0

# Sur GitHub:
# - Aller dans Releases
# - New Release
# - Choisir tag v1.0.0
# - Attacher les archives .tar.gz et .zip
# - Publier
```

### **3. Documenter**

Créer une page de téléchargement avec:
- Lien vers le repository
- Lien vers les releases
- Instructions d'installation
- Prérequis système
- Support contact

---

## **📞 Support Clients**

### **Channels à Mettre en Place**

1. **Documentation**
   - Site web avec guides
   - README détaillé
   - Troubleshooting section

2. **Community Support**
   - GitHub Issues (pour bugs)
   - GitHub Discussions (pour questions)
   - Discord/Slack channel

3. **Paid Support**
   - Email dédié (support@cortexops.com)
   - Ticketing system
   - SLA définis

4. **Resources**
   - Video tutorials
   - FAQ
   - Blog posts
   - Case studies

---

## ✅ **Checklist Finale**

### Avant Publication
- [ ] Version testée de A à Z
- [ ] Documentation complète
- [ ] Scripts fonctionnels
- [ ] Pas de secrets dans le code
- [ ] License choisie et ajoutée
- [ ] README à jour
- [ ] CHANGELOG créé
- [ ] Tests d'installation faits

### Publication
- [ ] Repository GitHub créé
- [ ] Code pushé
- [ ] Release créée
- [ ] Archives uploadées
- [ ] Documentation publiée
- [ ] Annonce faite

### Post-Publication
- [ ] Support channels actifs
- [ ] Monitoring feedback
- [ ] Bug fixes rapides
- [ ] Updates régulières

---

**Le package On-Premise CortexOps est prêt à être distribué ! 🎉**
