#!/bin/bash

# Script pour pousser CortexOps vers GitHub
# Usage: ./push-to-github.sh <github-repo-url>

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   CortexOps - Push vers GitHub            ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo ""

# Vérifier si un remote est déjà configuré
if git remote | grep -q 'origin'; then
    echo -e "${YELLOW}⚠️  Un remote 'origin' existe déjà${NC}"
    echo "Remote actuel:"
    git remote -v
    echo ""
    read -p "Voulez-vous le remplacer ? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
        echo -e "${GREEN}✓ Remote supprimé${NC}"
    else
        echo "Utilisation du remote existant"
    fi
fi

# Si pas de remote, demander l'URL
if ! git remote | grep -q 'origin'; then
    if [ -z "$1" ]; then
        echo -e "${YELLOW}Usage: $0 <github-repo-url>${NC}"
        echo ""
        echo "Étapes pour créer un dépôt GitHub:"
        echo "1. Allez sur https://github.com/new"
        echo "2. Nommez votre dépôt (ex: cortexops)"
        echo "3. Choisissez Public ou Private"
        echo "4. Ne pas initialiser avec README, .gitignore ou license"
        echo "5. Copiez l'URL du dépôt"
        echo ""
        read -p "Entrez l'URL de votre dépôt GitHub: " REPO_URL
    else
        REPO_URL=$1
    fi
    
    if [ -z "$REPO_URL" ]; then
        echo -e "${YELLOW}❌ URL manquante. Abandon.${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}📡 Ajout du remote origin...${NC}"
    git remote add origin "$REPO_URL"
    echo -e "${GREEN}✓ Remote ajouté${NC}"
fi

# Afficher l'état
echo ""
echo -e "${BLUE}📊 État du dépôt:${NC}"
git log --oneline -1
echo ""
git status -s | head -5
echo ""

# Renommer la branche master en main (convention moderne)
if git rev-parse --verify master &>/dev/null; then
    echo -e "${BLUE}🔄 Renommage de master vers main...${NC}"
    git branch -m master main
    echo -e "${GREEN}✓ Branche renommée${NC}"
fi

# Pousser vers GitHub
echo ""
echo -e "${BLUE}🚀 Push vers GitHub...${NC}"
git push -u origin main

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ CortexOps poussé avec succès !        ║${NC}"
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo ""
echo "Votre dépôt est maintenant sur GitHub:"
REPO_URL=$(git remote get-url origin)
echo -e "${BLUE}${REPO_URL}${NC}"
echo ""
echo "Prochaines étapes:"
echo "  • Configurez les GitHub Actions pour CI/CD"
echo "  • Ajoutez des secrets pour les clés API"
echo "  • Activez GitHub Pages si désiré"
echo "  • Invitez des collaborateurs"
