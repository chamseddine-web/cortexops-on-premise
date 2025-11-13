# 🚀 CortexOps On-Premise Installation Guide

## Enterprise-Ready Deployment

CortexOps On-Premise est une solution complète pour déployer votre propre instance d'Ansible Playbook Generator dans votre infrastructure.

---

## 📋 Prérequis

### Système d'exploitation
- **Linux** : Ubuntu 20.04+, Debian 11+, RHEL 8+, CentOS 8+
- **macOS** : 11.0+ (pour développement uniquement)
- **Windows** : WSL2 avec Ubuntu

### Ressources minimales
- **CPU** : 2 cores (4+ recommandé)
- **RAM** : 4 GB (8+ recommandé)
- **Disque** : 20 GB disponible (SSD recommandé)
- **Réseau** : Accès internet pour installation initiale

### Logiciels requis
- **Docker** : 20.10+
- **Docker Compose** : 2.0+
- **Git** : 2.0+

---

## 🎯 Installation en Une Commande

### Méthode 1 : Installation automatique (Recommandée)

```bash
git clone https://github.com/chamseddine-web/cortexops-on-premise.git
cd cortexops-on-premise
chmod +x install.sh
./install.sh
```

Le script d'installation :
- ✅ Vérifie tous les prérequis
- ✅ Installe Docker si nécessaire
- ✅ Génère les configurations
- ✅ Crée les certificats SSL
- ✅ Démarre tous les services
- ✅ Configure le monitoring

### Méthode 2 : Installation manuelle

```bash
# 1. Cloner le repository
git clone https://github.com/chamseddine-web/cortexops-on-premise.git
cd cortexops-on-premise

# 2. Copier et configurer .env
cp .env.example .env
nano .env  # Éditer avec vos valeurs

# 3. Créer les répertoires nécessaires
mkdir -p prometheus grafana nginx/ssl postgres/init backups logs

# 4. Démarrer les services
docker compose up -d

# 5. Vérifier le statut
docker compose ps
```

---

## ⚙️ Configuration

### 1. Fichier .env

Le fichier `.env` contient toutes les configurations :

```env
# Application
NODE_ENV=production
APP_VERSION=2.0.0

# Web Server
WEB_PORT=80
WEB_SSL_PORT=443
DOMAIN=cortexops.votre-entreprise.com

# Supabase (Backend)
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anonyme

# Base de données locale (optionnel)
POSTGRES_DB=cortexops
POSTGRES_USER=cortexops
POSTGRES_PASSWORD=ChangeMeToStrongPassword

# Redis Cache
REDIS_PASSWORD=ChangeMeToStrongPassword

# Monitoring
GRAFANA_PASSWORD=admin
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001

# Sécurité
JWT_SECRET=ChangeMeToRandomSecret
ENCRYPTION_KEY=ChangeMeToRandomKey

# Email (optionnel)
SMTP_HOST=smtp.votre-serveur.com
SMTP_PORT=587
SMTP_USER=noreply@votre-entreprise.com
SMTP_PASSWORD=MotDePasse

# Sauvegardes
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
```

### 2. Configuration SSL (Production)

Pour activer HTTPS en production :

```bash
# Générer des certificats auto-signés (développement)
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=cortexops.local"

# Ou utiliser Let's Encrypt (production)
sudo apt-get install certbot
sudo certbot certonly --standalone -d cortexops.votre-entreprise.com
sudo cp /etc/letsencrypt/live/cortexops.votre-entreprise.com/*.pem nginx/ssl/
```

### 3. Configuration Supabase

Si vous utilisez Supabase (recommandé) :

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Copiez l'URL et la clé anonyme
3. Mettez-les dans `.env`
4. Appliquez les migrations :

```bash
# Depuis votre projet Supabase
supabase db push
```

Si vous préférez PostgreSQL local :
```bash
# Les migrations seront appliquées automatiquement
# via postgres/init/ au démarrage
```

---

## 🌐 Architecture des Services

### Services déployés

| Service | Port | Description |
|---------|------|-------------|
| **cortexops-web** | 80, 443 | Application principale |
| **postgres** | 5432 | Base de données (optionnel) |
| **redis** | 6379 | Cache et sessions |
| **prometheus** | 9090 | Monitoring des métriques |
| **grafana** | 3001 | Dashboards et alertes |
| **nginx-proxy** | 8080, 8443 | Reverse proxy (optionnel) |

### Réseau Docker

Tous les services communiquent via le réseau Docker `cortexops-network` (172.20.0.0/16).

### Volumes persistants

```
redis-data          # Données Redis
prometheus-data     # Métriques Prometheus
grafana-data        # Dashboards Grafana
postgres-data       # Base de données
web-logs            # Logs application
```

---

## 🔍 Vérification et Tests

### Vérifier le statut des services

```bash
# Voir tous les services
docker compose ps

# Voir les logs
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f cortexops-web
```

### Tests de santé

```bash
# Test application web
curl http://localhost/health

# Test Prometheus
curl http://localhost:9090/-/healthy

# Test Grafana
curl http://localhost:3001/api/health
```

### Accès aux services

- **Application** : http://localhost ou https://localhost
- **Grafana** : http://localhost:3001 (admin / voir .env)
- **Prometheus** : http://localhost:9090

---

## 📊 Monitoring et Alertes

### Grafana Dashboards

1. Accédez à http://localhost:3001
2. Login : `admin` / (mot de passe dans .env)
3. Dashboards préconfigurés :
   - **CortexOps Overview** : Vue d'ensemble
   - **System Metrics** : CPU, RAM, Disk
   - **Application Performance** : Latence, erreurs
   - **User Activity** : Connexions, génération playbooks

### Prometheus Métriques

Métriques disponibles :
- `cortexops_playbooks_generated_total`
- `cortexops_api_requests_total`
- `cortexops_response_time_seconds`
- `cortexops_users_active`
- Standard Node/Redis/Postgres metrics

### Alertes configurées

- **HighMemoryUsage** : RAM > 90%
- **HighCPUUsage** : CPU > 80%
- **ServiceDown** : Service indisponible > 2min
- **HighErrorRate** : Erreurs > 5%

---

## 💾 Sauvegardes et Restauration

### Backup automatique

```bash
# Backup manuel
./backup.sh

# Backup planifié (cron)
crontab -e
# Ajouter : 0 2 * * * /chemin/vers/cortexops/backup.sh
```

Le backup inclut :
- Base de données PostgreSQL
- Données Redis
- Configurations (nginx, prometheus, grafana)
- Volumes Docker
- Fichier .env

### Restauration

```bash
# Lister les backups disponibles
ls -lh backups/

# Restaurer depuis un backup
./restore.sh backups/cortexops_backup_20251113_020000.tar.gz
```

---

## 🔄 Mise à jour

### Mise à jour automatique

```bash
./update.sh
```

Le script de mise à jour :
1. Crée un backup automatique
2. Télécharge la dernière version
3. Met à jour les images Docker
4. Applique les migrations
5. Redémarre les services

### Mise à jour manuelle

```bash
# 1. Backup
./backup.sh

# 2. Arrêter les services
docker compose down

# 3. Mettre à jour le code
git pull origin main

# 4. Mettre à jour les images
docker compose pull
docker compose build

# 5. Redémarrer
docker compose up -d
```

---

## 🛡️ Sécurité

### Checklist de sécurité production

- [ ] Changer tous les mots de passe par défaut
- [ ] Activer HTTPS avec certificats valides
- [ ] Configurer un pare-feu (UFW, iptables)
- [ ] Limiter l'accès SSH par clé
- [ ] Activer les sauvegardes automatiques
- [ ] Configurer les alertes de monitoring
- [ ] Mettre en place un reverse proxy (nginx)
- [ ] Restreindre les ports exposés
- [ ] Activer les logs d'audit
- [ ] Configurer fail2ban

### Ports à exposer

Production minimale :
```
80/tcp   → HTTP (redirect vers HTTPS)
443/tcp  → HTTPS (application)
```

Monitoring (réseau interne uniquement) :
```
3001/tcp → Grafana
9090/tcp → Prometheus
```

### Sécurisation nginx

```nginx
# nginx/conf.d/security.conf
server_tokens off;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## 🔧 Dépannage

### Les services ne démarrent pas

```bash
# Vérifier les logs
docker compose logs

# Vérifier l'espace disque
df -h

# Vérifier la mémoire
free -h

# Vérifier Docker
docker ps -a
docker system df
```

### Problèmes de performance

```bash
# Analyser les ressources
docker stats

# Nettoyer Docker
docker system prune -a

# Augmenter les limites
# Éditer docker-compose.yml et ajouter :
mem_limit: 2g
cpus: 2
```

### Base de données corrompue

```bash
# Restaurer depuis backup
./restore.sh backups/dernier_backup.tar.gz

# Ou réparer PostgreSQL
docker compose exec postgres pg_resetwal /var/lib/postgresql/data
```

### Réinitialisation complète

```bash
# ⚠️ ATTENTION : Efface toutes les données
docker compose down -v
rm -rf postgres-data redis-data grafana-data prometheus-data
docker compose up -d
```

---

## 📞 Support et Maintenance

### Logs

Tous les logs sont dans :
```
logs/nginx/          # Logs web server
logs/application/    # Logs application
/var/log/syslog      # Logs système
```

### Commandes utiles

```bash
# Redémarrer un service
docker compose restart cortexops-web

# Voir les ressources utilisées
docker stats

# Nettoyer les anciennes images
docker image prune -a

# Voir la configuration active
docker compose config

# Exporter les métriques
curl http://localhost:9090/api/v1/query?query=up
```

### Support technique

- **Documentation** : https://docs.cortexops.com
- **GitHub Issues** : https://github.com/chamseddine-web/cortexops-on-premise/issues
- **Email** : support@cortexops.com
- **Slack** : cortexops.slack.com

---

## 📦 Packaging pour distribution

### Créer un package de distribution

```bash
# Le package inclut tout le nécessaire
./create-package.sh
```

Le package généré contient :
- Code source complet
- Scripts d'installation
- Configurations par défaut
- Documentation
- Dockerfile et docker-compose.yml

### Distribution

Vous pouvez distribuer CortexOps de plusieurs façons :

1. **GitHub Release** : Tag + Release avec archive
2. **Docker Hub** : Images prêtes à l'emploi
3. **Archive ZIP/TAR** : Package complet à déployer
4. **Git Clone** : Installation depuis source

---

## 🎓 Formation et Documentation

### Pour les administrateurs

- Guide d'installation (ce document)
- Guide de configuration avancée
- Guide de monitoring
- Procédures de backup/restore
- Troubleshooting

### Pour les utilisateurs finaux

- Guide de démarrage rapide
- Documentation API
- Tutoriels vidéo
- Base de connaissances
- FAQ

---

## 📊 Métriques de Succès

### Indicateurs clés

- **Uptime** : > 99.9%
- **Temps de réponse** : < 200ms (P95)
- **Taux d'erreur** : < 0.1%
- **Backup** : Quotidien, testé mensuellement
- **Mise à jour** : < 5 minutes downtime

---

## ✅ Checklist Post-Installation

- [ ] Tous les services sont en état "healthy"
- [ ] L'application est accessible via HTTP/HTTPS
- [ ] Les dashboards Grafana affichent des données
- [ ] Les alertes Prometheus sont configurées
- [ ] Le backup automatique est planifié
- [ ] Les certificats SSL sont valides
- [ ] Les logs sont correctement collectés
- [ ] La documentation est accessible
- [ ] Les utilisateurs admin sont créés
- [ ] Les limites de ressources sont configurées

---

**CortexOps On-Premise v2.0.0**

*Ready for Enterprise Deployment* 🚀
