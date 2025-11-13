#!/bin/bash

# Script de déploiement automatisé pour Netlify
# Ce script prépare et pousse le code sur Git

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║         🚀 SCRIPT DE DÉPLOIEMENT NETLIFY AUTOMATISÉ          ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher des messages
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Vérifier si Git est initialisé
info "Vérification de Git..."
if [ ! -d .git ]; then
    error "Dossier .git non trouvé. Initialisation de Git..."
    git init
    success "Git initialisé"
fi

# Vérifier la configuration Git
if ! git config user.name > /dev/null 2>&1; then
    warning "Configuration Git manquante"
    echo ""
    read -p "Entrez votre nom Git (ex: John Doe): " git_name
    git config user.name "$git_name"
    read -p "Entrez votre email Git (ex: john@example.com): " git_email
    git config user.email "$git_email"
    success "Configuration Git ajoutée"
fi

# Vérifier si un remote existe
info "Vérification du remote Git..."
if ! git remote | grep -q origin; then
    warning "Aucun remote 'origin' trouvé"
    echo ""
    echo "Vous devez ajouter un remote Git. Options:"
    echo "1. GitHub: https://github.com/votre-username/votre-repo.git"
    echo "2. GitLab: https://gitlab.com/votre-username/votre-repo.git"
    echo "3. Bitbucket: https://bitbucket.org/votre-username/votre-repo.git"
    echo ""
    read -p "Entrez l'URL de votre repository Git: " remote_url
    git remote add origin "$remote_url"
    success "Remote ajouté: $remote_url"
else
    remote_url=$(git remote get-url origin)
    success "Remote existant: $remote_url"
fi

# Vérifier les fichiers critiques
info "Vérification des fichiers..."
critical_files=("netlify.toml" "package.json" "public/_redirects")
all_present=true

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        success "$file présent"
    else
        error "$file manquant!"
        all_present=false
    fi
done

if [ "$all_present" = false ]; then
    error "Fichiers critiques manquants. Arrêt."
    exit 1
fi

# Vérifier que .env n'est pas versionné
info "Vérification .gitignore..."
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    warning ".env pas dans .gitignore, ajout..."
    echo ".env" >> .gitignore
fi
success ".env exclu du versionnement"

# Afficher le statut
echo ""
info "État actuel du repository:"
git status --short

# Confirmation
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    PRÊT À DÉPLOYER                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Remote: $remote_url"
echo ""
read -p "Voulez-vous continuer? (o/n): " confirm

if [ "$confirm" != "o" ] && [ "$confirm" != "O" ]; then
    warning "Déploiement annulé"
    exit 0
fi

# Git add
echo ""
info "Ajout des fichiers..."
git add .
success "Fichiers ajoutés"

# Git commit
info "Création du commit..."
git commit -m "Deploy to Netlify with optimized database and security fixes" || {
    warning "Aucun changement à commiter ou commit échoué"
    if git log -1 > /dev/null 2>&1; then
        info "Repository déjà à jour"
    fi
}

# Git push
echo ""
info "Push vers le remote..."
echo ""

# Détecter la branche actuelle
current_branch=$(git branch --show-current)
if [ -z "$current_branch" ]; then
    current_branch="main"
    git branch -M main
fi

success "Branche: $current_branch"

# Push
if git push origin "$current_branch"; then
    echo ""
    success "✓ Push réussi!"
    echo ""
else
    echo ""
    error "Échec du push. Causes possibles:"
    echo "  1. Authentification requise"
    echo "  2. Repository distant non créé"
    echo "  3. Pas de permission"
    echo ""
    info "Pour GitHub, créez d'abord le repository sur github.com"
    info "Puis réessayez: git push -u origin $current_branch"
    echo ""
    exit 1
fi

# Prochaines étapes
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║                   ✓ PUSH GIT RÉUSSI !                        ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "🎯 PROCHAINES ÉTAPES:"
echo ""
echo "1️⃣  Aller sur Netlify"
echo "   👉 https://app.netlify.com"
echo ""
echo "2️⃣  Importer le projet"
echo "   • Add new site → Import existing project"
echo "   • Connecter votre Git provider"
echo "   • Sélectionner ce repository"
echo ""
echo "3️⃣  Configurer les variables (IMPORTANT !)"
echo "   • Cliquer 'Show advanced'"
echo "   • Ajouter les 2 variables depuis NETLIFY_VARIABLES.txt"
echo ""
echo "4️⃣  Déployer"
echo "   • Cliquer 'Deploy site'"
echo "   • Attendre 2-3 minutes"
echo ""
echo "5️⃣  Configurer Supabase"
echo "   • https://supabase.com/dashboard"
echo "   • Authentication → URL Configuration"
echo "   • Ajouter l'URL Netlify"
echo ""
echo "📁 Fichier aide: NETLIFY_VARIABLES.txt (variables à copier)"
echo "📖 Guide complet: DEPLOYMENT_QUICK_START.md"
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Temps restant: ~10 minutes (configuration Netlify/Supabase) ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
