#!/bin/bash

# Script de déploiement de l'email automation IONOS pour CortexOps
# Usage: ./deploy-email-ionos.sh

set -e

echo "🚀 Déploiement de l'email automation IONOS pour CortexOps"
echo "=========================================================="
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher un message de succès
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Fonction pour afficher un avertissement
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Fonction pour afficher une erreur
error() {
    echo -e "${RED}✗${NC} $1"
}

# Fonction pour afficher une info
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    error "Supabase CLI n'est pas installé"
    echo "Installez-le avec: npm install -g supabase"
    exit 1
fi
success "Supabase CLI détecté"

# Vérifier la connexion à Supabase
echo ""
info "Vérification de la connexion Supabase..."

if ! supabase projects list &> /dev/null; then
    warning "Vous n'êtes pas connecté à Supabase"
    echo "Connectez-vous avec: supabase login"
    exit 1
fi
success "Connecté à Supabase"

# Demander les credentials email
echo ""
echo "📧 Configuration des credentials IONOS"
echo "======================================="
echo ""

read -p "Email SMTP (défaut: contact@spectra-consulting.fr): " SMTP_USER
SMTP_USER=${SMTP_USER:-contact@spectra-consulting.fr}

read -sp "Mot de passe SMTP: " SMTP_PASSWORD
echo ""

if [ -z "$SMTP_PASSWORD" ]; then
    error "Le mot de passe ne peut pas être vide"
    exit 1
fi

# Configurer les secrets
echo ""
info "Configuration des secrets Supabase..."

supabase secrets set SMTP_USER="$SMTP_USER" > /dev/null 2>&1
success "SMTP_USER configuré"

supabase secrets set SMTP_PASSWORD="$SMTP_PASSWORD" > /dev/null 2>&1
success "SMTP_PASSWORD configuré"

# Vérifier les secrets
echo ""
info "Vérification des secrets..."
SECRET_COUNT=$(supabase secrets list | grep -E "SMTP_(USER|PASSWORD)" | wc -l)

if [ "$SECRET_COUNT" -eq 2 ]; then
    success "2 secrets configurés (SMTP_USER, SMTP_PASSWORD)"
else
    warning "Nombre de secrets détectés: $SECRET_COUNT"
fi

# Déployer l'Edge Function
echo ""
info "Déploiement de l'Edge Function welcome-email..."

if supabase functions deploy welcome-email --no-verify-jwt; then
    success "Edge Function déployée avec succès"
else
    error "Échec du déploiement de l'Edge Function"
    exit 1
fi

# Récupérer l'URL du projet
echo ""
info "Récupération de l'URL du projet..."
PROJECT_REF=$(supabase projects list | grep '│' | head -1 | awk '{print $2}')

if [ -z "$PROJECT_REF" ]; then
    warning "Impossible de récupérer automatiquement l'URL du projet"
    echo "Testez manuellement avec:"
    echo "curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/welcome-email \\"
    echo "  -H \"Authorization: Bearer [ANON_KEY]\" \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{\"email\":\"test@example.com\",\"fullName\":\"Test User\"}'"
else
    FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/welcome-email"
    success "URL de l'Edge Function: $FUNCTION_URL"
fi

# Demander si l'utilisateur veut tester
echo ""
read -p "Voulez-vous tester l'envoi d'un email maintenant ? (y/n): " TEST_EMAIL

if [ "$TEST_EMAIL" = "y" ] || [ "$TEST_EMAIL" = "Y" ]; then
    echo ""
    read -p "Email de destination pour le test: " TEST_RECIPIENT

    if [ ! -z "$TEST_RECIPIENT" ]; then
        info "Envoi d'un email de test à $TEST_RECIPIENT..."

        # Récupérer l'ANON_KEY (nécessite le .env local)
        if [ -f .env ]; then
            ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY .env | cut -d '=' -f2 | tr -d '"')

            if [ ! -z "$ANON_KEY" ] && [ ! -z "$FUNCTION_URL" ]; then
                RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
                    -H "Authorization: Bearer $ANON_KEY" \
                    -H "Content-Type: application/json" \
                    -d "{\"email\":\"$TEST_RECIPIENT\",\"fullName\":\"Test User\",\"jobTitle\":\"DevOps Engineer\",\"companyName\":\"Test Corp\",\"useCases\":[\"cicd\",\"security\"]}")

                if echo "$RESPONSE" | grep -q "success"; then
                    success "Email de test envoyé avec succès !"
                    echo "Vérifiez la boîte de réception (et le spam) de $TEST_RECIPIENT"
                else
                    warning "L'envoi a échoué. Réponse:"
                    echo "$RESPONSE"
                fi
            else
                warning "Impossible de récupérer l'ANON_KEY depuis .env"
            fi
        else
            warning "Fichier .env introuvable"
        fi
    fi
fi

# Afficher les logs récents
echo ""
read -p "Afficher les logs de l'Edge Function ? (y/n): " SHOW_LOGS

if [ "$SHOW_LOGS" = "y" ] || [ "$SHOW_LOGS" = "Y" ]; then
    echo ""
    info "Derniers logs de welcome-email (10 dernières lignes):"
    echo ""
    supabase functions logs welcome-email --limit 10
fi

# Résumé final
echo ""
echo "=========================================================="
echo -e "${GREEN}✓${NC} Déploiement terminé avec succès !"
echo "=========================================================="
echo ""
echo "📋 Configuration:"
echo "   • Email SMTP: $SMTP_USER"
echo "   • Serveur: smtp.ionos.fr:465 (SSL/TLS)"
echo "   • Edge Function: welcome-email"
echo ""
echo "🔧 Commandes utiles:"
echo "   • Logs en temps réel: supabase functions logs welcome-email --follow"
echo "   • Lister les secrets: supabase secrets list"
echo "   • Redéployer: supabase functions deploy welcome-email"
echo ""
echo "📖 Documentation complète: EMAIL_IONOS_SETUP.md"
echo ""
echo -e "${BLUE}Prochaine étape:${NC} Testez la création d'un compte sur l'application !"
echo ""
