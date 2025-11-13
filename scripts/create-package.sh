#!/bin/bash

###############################################################################
# CortexOps On-Premise - Package Creation Script
# Version: 1.0.0
# Description: Crée des archives prêtes à distribuer
###############################################################################

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VERSION="1.0.0"
PKG_NAME="cortexops-on-premise-v${VERSION}"
DIST_DIR="dist"

# Fonctions d'affichage
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_header "CortexOps On-Premise - Package Creator v${VERSION}"

# 1. Vérification des prérequis
print_info "Vérification des prérequis..."

if ! command -v tar &> /dev/null; then
    print_error "tar n'est pas installé"
    exit 1
fi

if ! command -v zip &> /dev/null; then
    print_warning "zip n'est pas installé (uniquement .tar.gz sera créé)"
    HAS_ZIP=false
else
    HAS_ZIP=true
fi

# 2. Nettoyage
print_info "Nettoyage des anciens packages..."
rm -rf "$PKG_NAME" 2>/dev/null || true
mkdir -p "$DIST_DIR"
print_success "Nettoyage terminé"

# 3. Création du dossier de package
print_info "Création de la structure du package..."
mkdir -p "$PKG_NAME"

# 4. Copie des fichiers essentiels
print_info "Copie des fichiers..."

# Fichiers racine
FILES=(
    "docker-compose.yml"
    "Dockerfile"
    ".env.example"
    "nginx.conf"
    ".gitignore"
    "README.md"
    "ON_PREMISE_GUIDE.md"
    "API_DOCUMENTATION.md"
    "DEPLOYMENT_PACKAGE.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$PKG_NAME/"
        print_success "Copié: $file"
    else
        print_warning "Fichier non trouvé: $file"
    fi
done

# Dossiers
DIRS=(
    "scripts"
    "nginx"
    "prometheus"
    "grafana"
    "postgres"
)

for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        cp -r "$dir" "$PKG_NAME/"
        print_success "Copié: $dir/"
    else
        print_warning "Dossier non trouvé: $dir"
    fi
done

# 5. Nettoyage du package
print_info "Nettoyage du package..."

# Supprimer les fichiers sensibles
rm -f "$PKG_NAME/.env" 2>/dev/null || true
rm -rf "$PKG_NAME/node_modules" 2>/dev/null || true
rm -rf "$PKG_NAME/dist" 2>/dev/null || true
rm -rf "$PKG_NAME/.git" 2>/dev/null || true
rm -rf "$PKG_NAME/backups" 2>/dev/null || true
rm -rf "$PKG_NAME/logs" 2>/dev/null || true
rm -f "$PKG_NAME/nginx/ssl/*.key" 2>/dev/null || true
rm -f "$PKG_NAME"/**/*.log 2>/dev/null || true
rm -f "$PKG_NAME"/**/.DS_Store 2>/dev/null || true

# Créer les dossiers vides nécessaires
mkdir -p "$PKG_NAME/nginx/ssl"
mkdir -p "$PKG_NAME/backups"
mkdir -p "$PKG_NAME/logs"

print_success "Package nettoyé"

# 6. Vérification de sécurité
print_info "Vérification de sécurité..."

SECRETS_FOUND=false

# Recherche de secrets potentiels
if grep -r "sk_live_\|password\s*=\s*[^C]" "$PKG_NAME" 2>/dev/null | grep -v ".example"; then
    print_error "SECRETS DÉTECTÉS! Vérifiez les fichiers ci-dessus"
    SECRETS_FOUND=true
fi

if [ "$SECRETS_FOUND" = true ]; then
    print_error "Annulation: des secrets ont été détectés"
    rm -rf "$PKG_NAME"
    exit 1
fi

print_success "Aucun secret détecté"

# 7. Création du fichier VERSION
print_info "Création du fichier VERSION..."
cat > "$PKG_NAME/VERSION" << EOF
CortexOps On-Premise
Version: ${VERSION}
Build Date: $(date '+%Y-%m-%d %H:%M:%S')
Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")
EOF
print_success "VERSION créé"

# 8. Création du fichier INSTALLATION.txt
print_info "Création du guide d'installation rapide..."
cat > "$PKG_NAME/INSTALLATION.txt" << 'EOF'
╔════════════════════════════════════════════════════════╗
║                                                        ║
║           CortexOps On-Premise Installation            ║
║                                                        ║
╚════════════════════════════════════════════════════════╝

🚀 DÉMARRAGE RAPIDE (5 minutes)

1. Prérequis:
   - Docker 20.10+
   - Docker Compose 2.0+
   - 4GB RAM minimum
   - 20GB espace disque

2. Installation:

   chmod +x scripts/*.sh
   ./scripts/setup.sh

3. Accès:

   Application:  http://localhost
   Prometheus:   http://localhost:9090
   Grafana:      http://localhost:3001

4. Configuration:

   - Éditez .env avec vos valeurs
   - Relancez: docker-compose restart

📚 DOCUMENTATION COMPLÈTE

   - README.md              - Vue d'ensemble
   - ON_PREMISE_GUIDE.md   - Guide détaillé
   - API_DOCUMENTATION.md  - Documentation API

🆘 SUPPORT

   - Email: support@cortexops.com
   - Documentation: https://docs.cortexops.com
   - GitHub Issues: https://github.com/cortexops/on-premise

═══════════════════════════════════════════════════════════
Profitez de CortexOps! 🎉
EOF
print_success "INSTALLATION.txt créé"

# 9. Création des checksums
print_info "Calcul de la taille..."
PKG_SIZE=$(du -sh "$PKG_NAME" | cut -f1)
print_success "Taille du package: $PKG_SIZE"

# 10. Création de l'archive .tar.gz
print_info "Création de l'archive .tar.gz..."
tar czf "$DIST_DIR/${PKG_NAME}.tar.gz" "$PKG_NAME"
TAR_SIZE=$(du -h "$DIST_DIR/${PKG_NAME}.tar.gz" | cut -f1)
print_success "Archive créée: ${PKG_NAME}.tar.gz ($TAR_SIZE)"

# 11. Création de l'archive .zip (si disponible)
if [ "$HAS_ZIP" = true ]; then
    print_info "Création de l'archive .zip..."
    zip -r -q "$DIST_DIR/${PKG_NAME}.zip" "$PKG_NAME"
    ZIP_SIZE=$(du -h "$DIST_DIR/${PKG_NAME}.zip" | cut -f1)
    print_success "Archive créée: ${PKG_NAME}.zip ($ZIP_SIZE)"
fi

# 12. Génération des checksums
print_info "Génération des checksums..."
cd "$DIST_DIR"

sha256sum "${PKG_NAME}.tar.gz" > "${PKG_NAME}.tar.gz.sha256"
print_success "Checksum créé: ${PKG_NAME}.tar.gz.sha256"

if [ "$HAS_ZIP" = true ]; then
    sha256sum "${PKG_NAME}.zip" > "${PKG_NAME}.zip.sha256"
    print_success "Checksum créé: ${PKG_NAME}.zip.sha256"
fi

cd - > /dev/null

# 13. Nettoyage du dossier temporaire
print_info "Nettoyage..."
rm -rf "$PKG_NAME"
print_success "Dossier temporaire supprimé"

# 14. Résumé
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Package créé avec succès!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📦 Archives créées dans: $DIST_DIR/"
echo ""
echo "   📄 ${PKG_NAME}.tar.gz ($TAR_SIZE)"
echo "   🔐 ${PKG_NAME}.tar.gz.sha256"

if [ "$HAS_ZIP" = true ]; then
echo "   📄 ${PKG_NAME}.zip ($ZIP_SIZE)"
echo "   🔐 ${PKG_NAME}.zip.sha256"
fi

echo ""
echo "📋 Contenu du package:"
echo "   - Application CortexOps"
echo "   - Docker Compose configuration"
echo "   - Scripts d'installation/maintenance"
echo "   - Configuration Nginx, Prometheus, Grafana"
echo "   - Documentation complète"
echo ""
echo "🚀 Prochaines étapes:"
echo "   1. Tester l'installation:"
echo "      tar xzf $DIST_DIR/${PKG_NAME}.tar.gz"
echo "      cd $PKG_NAME"
echo "      ./scripts/setup.sh"
echo ""
echo "   2. Distribuer:"
echo "      - Upload sur votre site web"
echo "      - GitHub Release"
echo "      - Cloud storage (S3, Drive, etc.)"
echo ""
echo "   3. Documenter:"
echo "      - Créer page de téléchargement"
echo "      - Annoncer la release"
echo "      - Setup support channels"
echo ""
