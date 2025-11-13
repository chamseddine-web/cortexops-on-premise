#!/bin/bash

###############################################################################
# CortexOps On-Premise - Backup Script
# Version: 1.0.0
# Description: Backup complet de l'installation CortexOps
###############################################################################

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="cortexops-backup-$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Fonctions d'affichage
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Création du répertoire de backup
mkdir -p "$BACKUP_PATH"

print_info "Démarrage du backup: $BACKUP_NAME"

# 1. Backup PostgreSQL
print_info "Backup de PostgreSQL..."
if docker ps | grep -q cortexops-postgres; then
    docker exec cortexops-postgres pg_dump -U cortexops cortexops > "$BACKUP_PATH/postgres.sql"
    print_success "PostgreSQL backup créé"
else
    print_warning "PostgreSQL non démarré, skip"
fi

# 2. Backup Redis
print_info "Backup de Redis..."
if docker ps | grep -q cortexops-redis; then
    docker exec cortexops-redis redis-cli --rdb /data/dump.rdb > /dev/null 2>&1
    docker cp cortexops-redis:/data/dump.rdb "$BACKUP_PATH/redis.rdb"
    print_success "Redis backup créé"
else
    print_warning "Redis non démarré, skip"
fi

# 3. Backup volumes Docker
print_info "Backup des volumes Docker..."
VOLUMES=(
    "redis-data"
    "prometheus-data"
    "grafana-data"
    "postgres-data"
    "web-logs"
    "proxy-logs"
)

for volume in "${VOLUMES[@]}"; do
    if docker volume ls | grep -q "$volume"; then
        docker run --rm -v ${volume}:/data -v $(pwd)/${BACKUP_PATH}:/backup alpine \
            tar czf /backup/${volume}.tar.gz -C /data . 2>/dev/null
        print_success "Volume $volume sauvegardé"
    fi
done

# 4. Backup configuration
print_info "Backup de la configuration..."
cp .env "$BACKUP_PATH/.env" 2>/dev/null || print_warning "Fichier .env non trouvé"
cp docker-compose.yml "$BACKUP_PATH/docker-compose.yml"
print_success "Configuration sauvegardée"

# 5. Backup SSL certificates
print_info "Backup des certificats SSL..."
if [ -d nginx/ssl ]; then
    cp -r nginx/ssl "$BACKUP_PATH/ssl"
    print_success "Certificats SSL sauvegardés"
fi

# 6. Backup configurations Nginx
print_info "Backup de la configuration Nginx..."
if [ -d nginx ]; then
    cp -r nginx "$BACKUP_PATH/nginx-config"
    print_success "Configuration Nginx sauvegardée"
fi

# 7. Backup Grafana dashboards
print_info "Backup des dashboards Grafana..."
if [ -d grafana ]; then
    cp -r grafana "$BACKUP_PATH/grafana-config"
    print_success "Dashboards Grafana sauvegardés"
fi

# 8. Backup Prometheus config
print_info "Backup de la configuration Prometheus..."
if [ -d prometheus ]; then
    cp -r prometheus "$BACKUP_PATH/prometheus-config"
    print_success "Configuration Prometheus sauvegardée"
fi

# 9. Créer un fichier de métadonnées
print_info "Création des métadonnées..."
cat > "$BACKUP_PATH/metadata.txt" << EOF
CortexOps Backup Metadata
=========================
Backup Name: $BACKUP_NAME
Date: $(date '+%Y-%m-%d %H:%M:%S')
Hostname: $(hostname)
Docker Version: $(docker --version)
Docker Compose Version: $(docker-compose --version)

Services Status:
$(docker-compose ps)

Volumes:
$(docker volume ls | grep cortexops)

EOF
print_success "Métadonnées créées"

# 10. Compression finale
print_info "Compression du backup..."
cd "$BACKUP_DIR"
tar czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME/"
rm -rf "$BACKUP_NAME"
cd - > /dev/null

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
print_success "Backup compressé: ${BACKUP_NAME}.tar.gz ($BACKUP_SIZE)"

# 11. Nettoyage des vieux backups (garde les 7 derniers)
print_info "Nettoyage des anciens backups..."
cd "$BACKUP_DIR"
ls -t cortexops-backup-*.tar.gz | tail -n +8 | xargs -r rm
cd - > /dev/null
print_success "Anciens backups nettoyés (garde les 7 derniers)"

# Résumé
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Backup terminé avec succès!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📦 Fichier: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "📊 Taille: $BACKUP_SIZE"
echo "📅 Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "Pour restaurer:"
echo "  ./scripts/restore.sh ${BACKUP_NAME}.tar.gz"
echo ""
