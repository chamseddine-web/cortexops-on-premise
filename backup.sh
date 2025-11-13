#!/bin/bash

###############################################################################
# CortexOps Backup Script
# Creates full backup of database, configurations, and data
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="cortexops_backup_${TIMESTAMP}"
RETENTION_DAYS=30

log_info() { echo -e "${BLUE}ℹ ${NC}$1"; }
log_success() { echo -e "${GREEN}✓ ${NC}$1"; }
log_error() { echo -e "${RED}✗ ${NC}$1"; }

# Create backup directory
mkdir -p "${BACKUP_DIR}"

log_info "Starting backup: ${BACKUP_NAME}"

# Create backup directory for this backup
CURRENT_BACKUP="${BACKUP_DIR}/${BACKUP_NAME}"
mkdir -p "${CURRENT_BACKUP}"

# Backup PostgreSQL database (if using local DB)
if docker compose ps | grep -q "cortexops-postgres"; then
    log_info "Backing up PostgreSQL database..."
    docker compose exec -T postgres pg_dumpall -U cortexops > "${CURRENT_BACKUP}/database.sql"
    log_success "Database backup completed"
fi

# Backup Redis data
if docker compose ps | grep -q "cortexops-redis"; then
    log_info "Backing up Redis data..."
    docker compose exec -T redis redis-cli --rdb /data/dump.rdb SAVE
    docker cp cortexops-redis:/data/dump.rdb "${CURRENT_BACKUP}/redis.rdb"
    log_success "Redis backup completed"
fi

# Backup configuration files
log_info "Backing up configuration files..."
cp .env "${CURRENT_BACKUP}/.env" 2>/dev/null || true
cp -r prometheus "${CURRENT_BACKUP}/prometheus" 2>/dev/null || true
cp -r grafana "${CURRENT_BACKUP}/grafana" 2>/dev/null || true
cp -r nginx "${CURRENT_BACKUP}/nginx" 2>/dev/null || true
log_success "Configuration backup completed"

# Backup Docker volumes
log_info "Backing up Docker volumes..."
docker compose exec -T cortexops-web tar czf /tmp/web-data.tar.gz /usr/share/nginx/html 2>/dev/null || true
docker cp cortexops-web:/tmp/web-data.tar.gz "${CURRENT_BACKUP}/web-data.tar.gz" 2>/dev/null || true
log_success "Volume backup completed"

# Create metadata file
cat > "${CURRENT_BACKUP}/metadata.json" << EOF
{
  "backup_name": "${BACKUP_NAME}",
  "timestamp": "$(date -Iseconds)",
  "version": "$(grep APP_VERSION .env | cut -d'=' -f2)",
  "hostname": "$(hostname)",
  "services": $(docker compose ps --format json | jq -s '.')
}
EOF

# Compress backup
log_info "Compressing backup..."
cd "${BACKUP_DIR}"
tar czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"
cd - > /dev/null

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
log_success "Backup completed: ${BACKUP_NAME}.tar.gz (${BACKUP_SIZE})"

# Cleanup old backups
log_info "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "cortexops_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
log_success "Cleanup completed"

echo ""
log_success "Backup stored at: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo ""
