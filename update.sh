#!/bin/bash

###############################################################################
# CortexOps Update Script
# Updates CortexOps to the latest version
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

REPO_URL="https://github.com/chamseddine-web/cortexops-on-premise"
CURRENT_VERSION=$(grep APP_VERSION .env 2>/dev/null | cut -d'=' -f2 || echo "unknown")

log_info "Current version: ${CURRENT_VERSION}"
log_info "Checking for updates..."

# Create backup before update
log_warning "Creating backup before update..."
./backup.sh

# Pull latest changes
log_info "Pulling latest changes..."
git fetch origin
git pull origin main

# Pull new Docker images
log_info "Pulling new Docker images..."
docker compose pull

# Update dependencies
log_info "Updating dependencies..."
docker compose build --no-cache

# Run database migrations (if any)
if [ -d "supabase/migrations" ]; then
    log_info "Checking for database migrations..."
    # Add migration logic here if needed
fi

# Restart services
log_info "Restarting services..."
docker compose down
docker compose up -d

# Wait for services
log_info "Waiting for services to be healthy..."
sleep 10

# Check service health
if docker compose ps | grep -q "healthy"; then
    NEW_VERSION=$(grep APP_VERSION .env 2>/dev/null | cut -d'=' -f2 || echo "unknown")
    log_success "Update completed successfully!"
    log_info "Updated from ${CURRENT_VERSION} to ${NEW_VERSION}"
else
    log_error "Some services are not healthy"
    log_warning "Check logs: docker compose logs"
    exit 1
fi

log_success "CortexOps has been updated!"
