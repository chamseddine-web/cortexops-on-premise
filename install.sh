#!/bin/bash

###############################################################################
# CortexOps On-Premise Installation Script
# Version: 2.0.0
# Description: One-command installation for enterprise deployment
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CORTEXOPS_VERSION="2.0.0"
MIN_DOCKER_VERSION="20.10"
MIN_COMPOSE_VERSION="2.0"
REQUIRED_DISK_GB=20
REQUIRED_RAM_GB=4

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓ ${NC}$1"
}

log_warning() {
    echo -e "${YELLOW}⚠ ${NC}$1"
}

log_error() {
    echo -e "${RED}✗ ${NC}$1"
}

print_banner() {
    cat << "EOF"
    ____            __            ____
   / __ \___  _____/ /____  _  __/ __ \____  _____
  / / / / _ \/ ___/ __/ _ \| |/_/ / / / __ \/ ___/
 / /_/ /  __/ /  / /_/  __/>  </ /_/ / /_/ (__  )
 \____/\___/_/   \__/\___/_/|_|\____/ .___/____/
                                   /_/
   On-Premise Installation - Enterprise Edition
EOF
    echo ""
    echo -e "${GREEN}Version ${CORTEXOPS_VERSION}${NC}"
    echo ""
}

check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        log_info "Please run as a regular user with sudo privileges"
        exit 1
    fi
}

check_os() {
    log_info "Checking operating system..."

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_success "Linux detected"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log_success "macOS detected"
    else
        log_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
}

check_docker() {
    log_info "Checking Docker installation..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        log_info "Installing Docker..."

        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            rm get-docker.sh
            log_success "Docker installed successfully"
            log_warning "Please log out and log back in for group changes to take effect"
        else
            log_error "Please install Docker Desktop manually: https://www.docker.com/products/docker-desktop"
            exit 1
        fi
    else
        DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+' | head -1)
        log_success "Docker $DOCKER_VERSION is installed"
    fi
}

check_docker_compose() {
    log_info "Checking Docker Compose installation..."

    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    else
        COMPOSE_VERSION=$(docker compose version --short)
        log_success "Docker Compose $COMPOSE_VERSION is installed"
    fi
}

check_system_resources() {
    log_info "Checking system resources..."

    # Check available disk space
    AVAILABLE_DISK=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_DISK" -lt "$REQUIRED_DISK_GB" ]; then
        log_error "Insufficient disk space. Required: ${REQUIRED_DISK_GB}GB, Available: ${AVAILABLE_DISK}GB"
        exit 1
    fi
    log_success "Disk space: ${AVAILABLE_DISK}GB available"

    # Check available RAM
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        AVAILABLE_RAM=$(free -g | awk '/^Mem:/{print $2}')
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        AVAILABLE_RAM=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024)}')
    fi

    if [ "$AVAILABLE_RAM" -lt "$REQUIRED_RAM_GB" ]; then
        log_warning "Low RAM detected. Recommended: ${REQUIRED_RAM_GB}GB, Available: ${AVAILABLE_RAM}GB"
    else
        log_success "RAM: ${AVAILABLE_RAM}GB available"
    fi
}

generate_env_file() {
    log_info "Generating .env configuration file..."

    if [ -f .env ]; then
        log_warning ".env file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Keeping existing .env file"
            return
        fi
    fi

    cat > .env << EOF
###############################################################################
# CortexOps On-Premise Configuration
# Version: ${CORTEXOPS_VERSION}
# Generated: $(date)
###############################################################################

# Application
NODE_ENV=production
APP_NAME=CortexOps
APP_VERSION=${CORTEXOPS_VERSION}

# Web Server
WEB_PORT=80
WEB_SSL_PORT=443
DOMAIN=localhost

# Supabase Configuration
VITE_SUPABASE_URL=${SUPABASE_URL:-https://your-project.supabase.co}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-your-anon-key}

# Database (if not using Supabase)
POSTGRES_DB=cortexops
POSTGRES_USER=cortexops
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=$(openssl rand -base64 32)
REDIS_PORT=6379

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
GRAFANA_PASSWORD=$(openssl rand -base64 16)

# Security
JWT_SECRET=$(openssl rand -base64 64)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Email (Optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@cortexops.local

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30

# Features
ENABLE_ANALYTICS=true
ENABLE_MONITORING=true
ENABLE_AUTO_UPDATES=false

# Limits
MAX_UPLOAD_SIZE=50MB
MAX_PLAYBOOKS_PER_USER=1000
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

EOF

    log_success ".env file generated"
    log_warning "Please edit .env and add your Supabase credentials"
}

create_directories() {
    log_info "Creating required directories..."

    mkdir -p prometheus grafana/provisioning grafana/dashboards
    mkdir -p nginx/ssl nginx/conf.d postgres/init
    mkdir -p backups logs data

    log_success "Directories created"
}

generate_prometheus_config() {
    log_info "Generating Prometheus configuration..."

    cat > prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'cortexops-on-premise'
    environment: 'production'

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

rule_files:
  - 'alerts.yml'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'cortexops-web'
    static_configs:
      - targets: ['cortexops-web:80']
    metrics_path: '/metrics'

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
EOF

    cat > prometheus/alerts.yml << 'EOF'
groups:
  - name: cortexops_alerts
    interval: 30s
    rules:
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 90%"

      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80%"

      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.job }} has been down for more than 2 minutes"
EOF

    log_success "Prometheus configuration generated"
}

generate_grafana_config() {
    log_info "Generating Grafana configuration..."

    mkdir -p grafana/provisioning/datasources grafana/provisioning/dashboards

    cat > grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
EOF

    cat > grafana/provisioning/dashboards/default.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'CortexOps Dashboards'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    log_success "Grafana configuration generated"
}

pull_images() {
    log_info "Pulling Docker images..."

    docker compose pull

    log_success "Docker images pulled"
}

start_services() {
    log_info "Starting CortexOps services..."

    docker compose up -d

    log_success "Services started"
}

wait_for_services() {
    log_info "Waiting for services to be healthy..."

    local max_attempts=60
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker compose ps | grep -q "healthy"; then
            log_success "All services are healthy"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done

    log_warning "Some services may not be healthy yet. Check with: docker compose ps"
}

display_info() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}✓ CortexOps On-Premise Installation Complete!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${BLUE}📊 Access Points:${NC}"
    echo "  • CortexOps Web:    http://localhost"
    echo "  • Grafana:          http://localhost:3001"
    echo "  • Prometheus:       http://localhost:9090"
    echo ""
    echo -e "${BLUE}🔑 Credentials:${NC}"
    echo "  • Grafana admin password: Check .env file (GRAFANA_PASSWORD)"
    echo ""
    echo -e "${BLUE}📝 Useful Commands:${NC}"
    echo "  • View logs:        docker compose logs -f"
    echo "  • Check status:     docker compose ps"
    echo "  • Stop services:    docker compose stop"
    echo "  • Start services:   docker compose start"
    echo "  • Restart:          docker compose restart"
    echo "  • Update:           ./update.sh"
    echo "  • Backup:           ./backup.sh"
    echo ""
    echo -e "${YELLOW}⚠ Next Steps:${NC}"
    echo "  1. Edit .env and configure your Supabase credentials"
    echo "  2. Restart services: docker compose restart"
    echo "  3. Configure SSL certificates in nginx/ssl/"
    echo "  4. Set up backups: crontab -e"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

###############################################################################
# Main Installation Flow
###############################################################################

main() {
    print_banner

    log_info "Starting CortexOps On-Premise installation..."
    echo ""

    # Pre-flight checks
    check_root
    check_os
    check_docker
    check_docker_compose
    check_system_resources

    echo ""
    log_info "Pre-flight checks passed!"
    echo ""

    # Setup
    generate_env_file
    create_directories
    generate_prometheus_config
    generate_grafana_config

    echo ""
    read -p "Do you want to start the installation now? (Y/n): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        pull_images
        start_services
        wait_for_services

        display_info
    else
        log_info "Installation prepared. Run 'docker compose up -d' when ready."
    fi
}

# Run main function
main "$@"
