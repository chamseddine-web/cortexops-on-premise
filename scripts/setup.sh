#!/bin/bash

###############################################################################
# CortexOps On-Premise - Installation Automatique
# Version: 1.0.0
# Description: Script d'installation et configuration complète
###############################################################################

set -e

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions d'affichage
print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Fonction de vérification de prérequis
check_prerequisites() {
    print_header "Vérification des prérequis"

    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker n'est pas installé"
        echo "Installez Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    print_success "Docker installé ($(docker --version | cut -d ' ' -f3))"

    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose n'est pas installé"
        echo "Installez Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    print_success "Docker Compose installé ($(docker-compose --version | cut -d ' ' -f4))"

    # Vérifier les ports
    print_info "Vérification des ports disponibles..."
    PORTS=(80 443 5432 9090 3001)
    for port in "${PORTS[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "Port $port déjà utilisé"
        else
            print_success "Port $port disponible"
        fi
    done

    # Vérifier l'espace disque
    AVAILABLE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 20 ]; then
        print_warning "Espace disque faible: ${AVAILABLE_SPACE}GB (20GB recommandés)"
    else
        print_success "Espace disque: ${AVAILABLE_SPACE}GB"
    fi

    # Vérifier la RAM
    TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_RAM" -lt 4 ]; then
        print_warning "RAM faible: ${TOTAL_RAM}GB (4GB recommandés)"
    else
        print_success "RAM: ${TOTAL_RAM}GB"
    fi
}

# Fonction de génération de mot de passe sécurisé
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Fonction de configuration de .env
setup_env() {
    print_header "Configuration des variables d'environnement"

    if [ -f .env ]; then
        print_warning "Le fichier .env existe déjà"
        read -p "Voulez-vous le recréer? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Conservation du .env existant"
            return
        fi
        mv .env .env.backup.$(date +%Y%m%d-%H%M%S)
        print_info "Backup créé: .env.backup"
    fi

    cp .env.example .env
    print_success "Fichier .env créé depuis .env.example"

    # Génération des mots de passe
    POSTGRES_PASSWORD=$(generate_password)
    REDIS_PASSWORD=$(generate_password)
    GRAFANA_PASSWORD=$(generate_password)

    # Mise à jour du .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
        sed -i '' "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
        sed -i '' "s/GRAFANA_PASSWORD=.*/GRAFANA_PASSWORD=$GRAFANA_PASSWORD/" .env
    else
        # Linux
        sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
        sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
        sed -i "s/GRAFANA_PASSWORD=.*/GRAFANA_PASSWORD=$GRAFANA_PASSWORD/" .env
    fi

    print_success "Mots de passe générés automatiquement"

    # Demander les variables Supabase
    print_info "\nConfiguration Supabase (obligatoire):"
    read -p "VITE_SUPABASE_URL: " SUPABASE_URL
    read -p "VITE_SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=$SUPABASE_URL|" .env
        sed -i '' "s/VITE_SUPABASE_ANON_KEY=.*/VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY/" .env
    else
        sed -i "s|VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=$SUPABASE_URL|" .env
        sed -i "s/VITE_SUPABASE_ANON_KEY=.*/VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY/" .env
    fi

    print_success "Configuration Supabase enregistrée"

    # Afficher les credentials
    echo -e "\n${GREEN}Credentials générés:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "PostgreSQL Password: $POSTGRES_PASSWORD"
    echo "Redis Password:      $REDIS_PASSWORD"
    echo "Grafana Password:    $GRAFANA_PASSWORD"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}⚠ Sauvegardez ces mots de passe!${NC}\n"
}

# Fonction de génération de certificats SSL
setup_ssl() {
    print_header "Configuration SSL/TLS"

    mkdir -p nginx/ssl

    if [ -f nginx/ssl/cortexops.crt ] && [ -f nginx/ssl/cortexops.key ]; then
        print_warning "Certificats SSL déjà existants"
        read -p "Voulez-vous les régénérer? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Conservation des certificats existants"
            return
        fi
    fi

    print_info "Génération de certificats auto-signés..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/cortexops.key \
        -out nginx/ssl/cortexops.crt \
        -subj "/C=FR/ST=IDF/L=Paris/O=CortexOps/CN=cortexops.local" \
        2>/dev/null

    chmod 644 nginx/ssl/cortexops.crt
    chmod 600 nginx/ssl/cortexops.key

    print_success "Certificats SSL générés (auto-signés)"
    print_info "Pour la production, utilisez Let's Encrypt"
}

# Fonction de création des répertoires nécessaires
setup_directories() {
    print_header "Création des répertoires"

    DIRS=(
        "nginx/ssl"
        "nginx/conf.d"
        "prometheus"
        "grafana/provisioning"
        "grafana/dashboards"
        "postgres/init"
        "backups"
        "logs"
    )

    for dir in "${DIRS[@]}"; do
        mkdir -p "$dir"
        print_success "Répertoire créé: $dir"
    done
}

# Fonction de build des images
build_images() {
    print_header "Build des images Docker"

    print_info "Build de cortexops-web..."
    docker-compose build cortexops-web

    print_success "Images buildées avec succès"
}

# Fonction de démarrage des services
start_services() {
    print_header "Démarrage des services"

    print_info "Démarrage de tous les services..."
    docker-compose up -d

    print_info "Attente de la santé des services (60s)..."
    sleep 60

    print_success "Services démarrés"
}

# Fonction de vérification de la santé des services
check_health() {
    print_header "Vérification de la santé des services"

    SERVICES=(
        "cortexops-web:80:/health"
        "redis:6379:ping"
        "prometheus:9090:/-/healthy"
        "grafana:3000:/api/health"
        "postgres:5432:psql"
    )

    for service_info in "${SERVICES[@]}"; do
        IFS=':' read -r service port endpoint <<< "$service_info"
        container="cortexops-$service"

        if docker ps | grep -q "$container"; then
            print_success "$service est en cours d'exécution"
        else
            print_error "$service n'est pas démarré"
        fi
    done

    # Test HTTP CortexOps
    if curl -sf http://localhost:80 > /dev/null 2>&1; then
        print_success "Application web accessible"
    else
        print_warning "Application web non accessible (normal si SSL uniquement)"
    fi
}

# Fonction d'affichage des URLs d'accès
show_access_info() {
    print_header "Informations d'accès"

    echo -e "${GREEN}CortexOps est maintenant en cours d'exécution!${NC}\n"

    echo "📱 URLs d'accès:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 Application:    http://localhost"
    echo "🔒 Application SSL: https://localhost (auto-signé)"
    echo "📊 Prometheus:     http://localhost:9090"
    echo "📈 Grafana:        http://localhost:3001"
    echo "                   (admin / [voir GRAFANA_PASSWORD dans .env])"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

    echo "📋 Commandes utiles:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Voir les logs:       docker-compose logs -f"
    echo "Arrêter:             docker-compose down"
    echo "Redémarrer:          docker-compose restart"
    echo "Statut:              docker-compose ps"
    echo "Backup:              ./scripts/backup.sh"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

    echo "📚 Documentation:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Guide complet:       cat ON_PREMISE_GUIDE.md"
    echo "API docs:            cat API_DOCUMENTATION.md"
    echo "README:              cat README.md"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
}

# Main
main() {
    clear
    echo -e "${BLUE}"
    cat << "EOF"
   ____           _            ___
  / ___|___  _ __| |_ _____  _/ _ \ _ __  ___
 | |   / _ \| '__| __/ _ \ \/ / | | | '_ \/ __|
 | |__| (_) | |  | ||  __/>  <| |_| | |_) \__ \
  \____\___/|_|   \__\___/_/\_\\___/| .__/|___/
                                     |_|
     On-Premise Installation Script
EOF
    echo -e "${NC}\n"

    check_prerequisites
    setup_directories
    setup_env
    setup_ssl
    build_images
    start_services
    check_health
    show_access_info

    print_success "Installation terminée avec succès!"
    echo -e "\n${GREEN}Enjoy CortexOps! 🚀${NC}\n"
}

# Lancement du script
main
