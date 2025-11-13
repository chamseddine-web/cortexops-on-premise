#!/bin/bash

###############################################################################
# CortexOps On-Premise - Update Script
# Version: 1.0.0
# Description: Mise à jour de l'installation CortexOps
###############################################################################

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 1. Vérification version actuelle
print_header "Vérification de la version actuelle"

CURRENT_VERSION=$(grep 'version:' docker-compose.yml | head -1 | cut -d'"' -f2 || echo "unknown")
print_info "Version actuelle: $CURRENT_VERSION"

# 2. Backup automatique avant MAJ
print_header "Backup automatique avant mise à jour"

print_info "Création d'un backup de sécurité..."
./scripts/backup.sh
print_success "Backup créé"

# 3. Pull des nouvelles images
print_header "Téléchargement des nouvelles images"

print_info "Pull des images Docker..."
docker-compose pull
print_success "Images téléchargées"

# 4. Arrêt des services
print_header "Arrêt des services"

print_info "Arrêt en cours..."
docker-compose down
print_success "Services arrêtés"

# 5. Backup de la configuration actuelle
print_info "Sauvegarde de la configuration actuelle..."
cp .env .env.backup.$(date +%Y%m%d-%H%M%S)
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d-%H%M%S)
print_success "Configuration sauvegardée"

# 6. Vérification des changements de configuration
print_header "Vérification des changements"

if [ -f .env.example ]; then
    print_info "Comparaison avec .env.example..."

    # Vérification des nouvelles variables
    NEW_VARS=$(comm -13 <(grep -oP '^[A-Z_]+(?==)' .env | sort) <(grep -oP '^[A-Z_]+(?==)' .env.example | sort))

    if [ -n "$NEW_VARS" ]; then
        print_warning "Nouvelles variables détectées dans .env.example:"
        echo "$NEW_VARS"
        echo ""
        print_warning "Veuillez les ajouter manuellement à votre .env"
    else
        print_success "Aucune nouvelle variable requise"
    fi
fi

# 7. Rebuild des images custom
print_header "Rebuild des images"

print_info "Build de cortexops-web..."
docker-compose build --pull cortexops-web
print_success "Images buildées"

# 8. Mise à jour des volumes (si nécessaire)
print_header "Vérification des volumes"

VOLUMES=(redis-data prometheus-data grafana-data postgres-data web-logs proxy-logs)

for volume in "${VOLUMES[@]}"; do
    if docker volume ls | grep -q "$volume"; then
        print_success "Volume $volume existe"
    else
        print_info "Création du volume $volume..."
        docker volume create "$volume"
    fi
done

# 9. Démarrage avec la nouvelle version
print_header "Démarrage de la nouvelle version"

print_info "Démarrage des services..."
docker-compose up -d
print_success "Services démarrés"

# 10. Attente de la disponibilité
print_info "Attente de la disponibilité des services (60s)..."
sleep 60

# 11. Vérification de la santé
print_header "Vérification de la santé"

SERVICES=(cortexops-web redis prometheus grafana postgres)
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    if docker ps | grep -q "cortexops-$service"; then
        if docker ps | grep -q "cortexops-$service.*healthy\|Up"; then
            print_success "$service est opérationnel"
        else
            print_warning "$service est démarré mais pas encore healthy"
        fi
    else
        print_error "$service n'est pas démarré"
        ALL_HEALTHY=false
    fi
done

# 12. Test de l'application
print_info "Test de l'application..."
if curl -sf http://localhost > /dev/null 2>&1; then
    print_success "Application web accessible"
else
    print_warning "Application web non accessible (vérifier les logs)"
fi

# 13. Migrations de base de données (si nécessaire)
print_header "Vérification des migrations"

if [ -d "supabase/migrations" ]; then
    print_info "Migrations détectées dans supabase/migrations"
    print_warning "Les migrations Supabase doivent être appliquées manuellement"
    print_info "Utilisez: supabase db push"
else
    print_success "Aucune migration à appliquer"
fi

# 14. Nettoyage des images anciennes
print_header "Nettoyage"

print_info "Suppression des images Docker inutilisées..."
docker image prune -f > /dev/null 2>&1
print_success "Images nettoyées"

# 15. Nouvelle version
NEW_VERSION=$(grep 'version:' docker-compose.yml | head -1 | cut -d'"' -f2 || echo "unknown")

# Résumé
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$ALL_HEALTHY" = true ]; then
    echo -e "${GREEN}Mise à jour terminée avec succès!${NC}"
else
    echo -e "${YELLOW}Mise à jour terminée avec des avertissements${NC}"
fi
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "🔄 Mise à jour:"
echo "  De:  $CURRENT_VERSION"
echo "  Vers: $NEW_VERSION"
echo ""
echo "📅 Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "URLs d'accès:"
echo "  🌐 Application:    http://localhost"
echo "  📊 Prometheus:     http://localhost:9090"
echo "  📈 Grafana:        http://localhost:3001"
echo ""
echo "Commandes utiles:"
echo "  Logs:        docker-compose logs -f"
echo "  Status:      docker-compose ps"
echo "  Rollback:    ./scripts/restore.sh [backup-file]"
echo ""

if [ "$ALL_HEALTHY" = false ]; then
    echo -e "${YELLOW}⚠ Certains services ont des problèmes${NC}"
    echo "Vérifier les logs: docker-compose logs -f"
    echo ""
    echo "Pour rollback:"
    LAST_BACKUP=$(ls -t backups/cortexops-backup-*.tar.gz | head -1)
    if [ -n "$LAST_BACKUP" ]; then
        echo "  ./scripts/restore.sh $LAST_BACKUP"
    fi
    echo ""
fi
