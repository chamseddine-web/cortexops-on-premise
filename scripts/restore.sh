#!/bin/bash

###############################################################################
# CortexOps On-Premise - Restore Script
# Version: 1.0.0
# Description: Restauration depuis un backup CortexOps
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

# Vérification argument
if [ $# -eq 0 ]; then
    print_error "Usage: $0 <backup-file.tar.gz>"
    echo ""
    echo "Backups disponibles:"
    ls -lh backups/*.tar.gz 2>/dev/null || echo "Aucun backup trouvé"
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_DIR="./backups"
RESTORE_DIR="/tmp/cortexops-restore-$$"

# Vérification du fichier de backup
if [ ! -f "$BACKUP_FILE" ]; then
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    else
        print_error "Fichier de backup non trouvé: $BACKUP_FILE"
        exit 1
    fi
fi

print_info "Restauration depuis: $BACKUP_FILE"

# Confirmation
echo ""
print_warning "ATTENTION: Cette opération va:"
echo "  - Arrêter tous les services"
echo "  - Supprimer les données actuelles"
echo "  - Restaurer depuis le backup"
echo ""
read -p "Continuer? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Restauration annulée"
    exit 0
fi

# Création du répertoire de restauration
mkdir -p "$RESTORE_DIR"

# 1. Extraction du backup
print_info "Extraction du backup..."
tar xzf "$BACKUP_FILE" -C "$RESTORE_DIR"
BACKUP_NAME=$(basename "$BACKUP_FILE" .tar.gz)
EXTRACT_DIR="$RESTORE_DIR/$BACKUP_NAME"

if [ ! -d "$EXTRACT_DIR" ]; then
    print_error "Structure de backup invalide"
    rm -rf "$RESTORE_DIR"
    exit 1
fi
print_success "Backup extrait"

# 2. Affichage des métadonnées
if [ -f "$EXTRACT_DIR/metadata.txt" ]; then
    print_info "Métadonnées du backup:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "$EXTRACT_DIR/metadata.txt"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

# 3. Arrêt des services
print_info "Arrêt des services..."
docker-compose down
print_success "Services arrêtés"

# 4. Backup des données actuelles (sécurité)
print_info "Backup de sécurité des données actuelles..."
SAFETY_BACKUP="backups/pre-restore-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
mkdir -p backups
if [ -f .env ]; then
    tar czf "$SAFETY_BACKUP" .env docker-compose.yml nginx/ grafana/ prometheus/ 2>/dev/null || true
    print_success "Backup de sécurité créé: $SAFETY_BACKUP"
fi

# 5. Restauration de la configuration
print_info "Restauration de la configuration..."
if [ -f "$EXTRACT_DIR/.env" ]; then
    cp "$EXTRACT_DIR/.env" .env
    print_success "Fichier .env restauré"
fi

if [ -f "$EXTRACT_DIR/docker-compose.yml" ]; then
    cp "$EXTRACT_DIR/docker-compose.yml" docker-compose.yml
    print_success "docker-compose.yml restauré"
fi

# 6. Restauration SSL
print_info "Restauration des certificats SSL..."
if [ -d "$EXTRACT_DIR/ssl" ]; then
    mkdir -p nginx/ssl
    cp -r "$EXTRACT_DIR/ssl/"* nginx/ssl/
    print_success "Certificats SSL restaurés"
fi

# 7. Restauration configurations
print_info "Restauration des configurations..."
if [ -d "$EXTRACT_DIR/nginx-config" ]; then
    cp -r "$EXTRACT_DIR/nginx-config/"* nginx/ 2>/dev/null || true
    print_success "Configuration Nginx restaurée"
fi

if [ -d "$EXTRACT_DIR/grafana-config" ]; then
    mkdir -p grafana
    cp -r "$EXTRACT_DIR/grafana-config/"* grafana/ 2>/dev/null || true
    print_success "Configuration Grafana restaurée"
fi

if [ -d "$EXTRACT_DIR/prometheus-config" ]; then
    mkdir -p prometheus
    cp -r "$EXTRACT_DIR/prometheus-config/"* prometheus/ 2>/dev/null || true
    print_success "Configuration Prometheus restaurée"
fi

# 8. Suppression des volumes existants
print_info "Suppression des volumes existants..."
docker volume rm redis-data prometheus-data grafana-data postgres-data web-logs proxy-logs 2>/dev/null || true
print_success "Volumes supprimés"

# 9. Restauration des volumes
print_info "Restauration des volumes..."
VOLUMES=(
    "redis-data"
    "prometheus-data"
    "grafana-data"
    "postgres-data"
    "web-logs"
    "proxy-logs"
)

for volume in "${VOLUMES[@]}"; do
    if [ -f "$EXTRACT_DIR/${volume}.tar.gz" ]; then
        docker volume create "$volume" > /dev/null
        docker run --rm -v ${volume}:/data -v ${EXTRACT_DIR}:/backup alpine \
            tar xzf /backup/${volume}.tar.gz -C /data 2>/dev/null
        print_success "Volume $volume restauré"
    fi
done

# 10. Démarrage des services
print_info "Démarrage des services..."
docker-compose up -d
print_success "Services démarrés"

# 11. Attente de la disponibilité
print_info "Attente de la disponibilité des services (60s)..."
sleep 60

# 12. Restauration PostgreSQL
if [ -f "$EXTRACT_DIR/postgres.sql" ]; then
    print_info "Restauration de PostgreSQL..."

    # Attente de PostgreSQL
    for i in {1..30}; do
        if docker exec cortexops-postgres pg_isready -U cortexops > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done

    # Drop et recréer la DB
    docker exec -i cortexops-postgres psql -U cortexops -c "DROP DATABASE IF EXISTS cortexops;" 2>/dev/null || true
    docker exec -i cortexops-postgres psql -U cortexops -c "CREATE DATABASE cortexops;" 2>/dev/null || true

    # Restauration
    docker exec -i cortexops-postgres psql -U cortexops cortexops < "$EXTRACT_DIR/postgres.sql" 2>/dev/null
    print_success "PostgreSQL restauré"
fi

# 13. Restauration Redis
if [ -f "$EXTRACT_DIR/redis.rdb" ]; then
    print_info "Restauration de Redis..."
    docker cp "$EXTRACT_DIR/redis.rdb" cortexops-redis:/data/dump.rdb
    docker-compose restart redis
    print_success "Redis restauré"
fi

# 14. Vérification de la santé
print_info "Vérification de la santé des services..."
sleep 10

SERVICES=(cortexops-web redis prometheus grafana postgres)
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    if docker ps | grep -q "cortexops-$service"; then
        print_success "$service est en cours d'exécution"
    else
        print_error "$service n'est pas démarré"
        ALL_HEALTHY=false
    fi
done

# 15. Nettoyage
print_info "Nettoyage..."
rm -rf "$RESTORE_DIR"
print_success "Fichiers temporaires supprimés"

# Résumé
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$ALL_HEALTHY" = true ]; then
    echo -e "${GREEN}Restauration terminée avec succès!${NC}"
else
    echo -e "${YELLOW}Restauration terminée avec des avertissements${NC}"
fi
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📦 Restauré depuis: $BACKUP_FILE"
echo "💾 Backup de sécurité: $SAFETY_BACKUP"
echo "📅 Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "URLs d'accès:"
echo "  🌐 Application:    http://localhost"
echo "  📊 Prometheus:     http://localhost:9090"
echo "  📈 Grafana:        http://localhost:3001"
echo ""
echo "Vérifier les logs:"
echo "  docker-compose logs -f"
echo ""
