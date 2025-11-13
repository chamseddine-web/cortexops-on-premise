#!/bin/bash

###############################################################################
# CortexOps Restore Script
# Restores from backup created by backup.sh
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ ${NC}$1"; }
log_success() { echo -e "${GREEN}✓ ${NC}$1"; }
log_error() { echo -e "${RED}✗ ${NC}$1"; }
log_warning() { echo -e "${YELLOW}⚠ ${NC}$1"; }

# Check if backup file is provided
if [ -z "$1" ]; then
    log_error "Usage: $0 <backup-file.tar.gz>"
    log_info "Available backups:"
    ls -lh backups/*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log_warning "This will restore CortexOps from backup: $BACKUP_FILE"
log_warning "Current data will be replaced!"
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [ "$REPLY" != "yes" ]; then
    log_info "Restore cancelled"
    exit 0
fi

# Stop services
log_info "Stopping services..."
docker compose stop

# Extract backup
TEMP_DIR=$(mktemp -d)
log_info "Extracting backup to ${TEMP_DIR}..."
tar xzf "$BACKUP_FILE" -C "$TEMP_DIR"

BACKUP_NAME=$(basename "$BACKUP_FILE" .tar.gz)
BACKUP_PATH="${TEMP_DIR}/${BACKUP_NAME}"

# Restore database
if [ -f "${BACKUP_PATH}/database.sql" ]; then
    log_info "Restoring PostgreSQL database..."
    docker compose start postgres
    sleep 5
    docker compose exec -T postgres psql -U cortexops -d postgres < "${BACKUP_PATH}/database.sql"
    log_success "Database restored"
fi

# Restore Redis
if [ -f "${BACKUP_PATH}/redis.rdb" ]; then
    log_info "Restoring Redis data..."
    docker compose start redis
    docker cp "${BACKUP_PATH}/redis.rdb" cortexops-redis:/data/dump.rdb
    docker compose restart redis
    log_success "Redis restored"
fi

# Restore configurations
if [ -f "${BACKUP_PATH}/.env" ]; then
    log_info "Restoring configuration files..."
    cp "${BACKUP_PATH}/.env" .env
    [ -d "${BACKUP_PATH}/prometheus" ] && cp -r "${BACKUP_PATH}/prometheus" .
    [ -d "${BACKUP_PATH}/grafana" ] && cp -r "${BACKUP_PATH}/grafana" .
    [ -d "${BACKUP_PATH}/nginx" ] && cp -r "${BACKUP_PATH}/nginx" .
    log_success "Configurations restored"
fi

# Restore web data
if [ -f "${BACKUP_PATH}/web-data.tar.gz" ]; then
    log_info "Restoring web data..."
    docker compose start cortexops-web
    docker cp "${BACKUP_PATH}/web-data.tar.gz" cortexops-web:/tmp/web-data.tar.gz
    docker compose exec -T cortexops-web tar xzf /tmp/web-data.tar.gz -C /
    log_success "Web data restored"
fi

# Cleanup
rm -rf "$TEMP_DIR"

# Start all services
log_info "Starting all services..."
docker compose up -d

log_success "Restore completed!"
log_info "Check service status: docker compose ps"
