# 🏢 CortexOps On-Premise Deployment Guide

## 📋 Vue d'Ensemble

Déployez **CortexOps** dans votre propre infrastructure avec Docker Compose. Solution complète incluant monitoring, cache, base de données et reverse proxy.

---

## 🚀 Démarrage Rapide (5 minutes)

### **Option 1: Clone depuis GitHub**
```bash
# Clone le repository
git clone https://github.com/cortexops/on-premise.git
cd on-premise

# Configure les variables d'environnement
cp .env.example .env
nano .env  # Édite les variables

# Lance tous les services
docker-compose up -d

# Vérifie le statut
docker-compose ps
```

### **Option 2: Télécharge le ZIP**
```bash
# Télécharge depuis https://cortexops.com/download/on-premise.zip
wget https://cortexops.com/download/on-premise.zip
unzip on-premise.zip
cd cortexops-on-premise

# Configure et lance
cp .env.example .env
nano .env
docker-compose up -d
```

---

## 📦 Contenu du Package

```
cortexops-on-premise/
├── docker-compose.yml           # ⭐ Orchestration des services
├── Dockerfile                   # Build CortexOps
├── .env.example                 # Template de configuration
├── .env                         # Configuration (à créer)
├── nginx.conf                   # Configuration Nginx principale
├── nginx/
│   ├── default.conf            # Virtual host CortexOps
│   ├── proxy.conf              # Reverse proxy config
│   └── ssl/                    # Certificats SSL (à ajouter)
├── prometheus/
│   ├── prometheus.yml          # Config Prometheus
│   └── alerts.yml              # Alertes monitoring
├── grafana/
│   ├── provisioning/           # Datasources & dashboards
│   └── dashboards/             # JSON dashboards
├── postgres/
│   └── init/                   # Scripts d'initialisation DB
├── scripts/
│   ├── setup.sh                # ⭐ Installation automatique
│   ├── backup.sh               # Backup automatique
│   ├── restore.sh              # Restore depuis backup
│   └── update.sh               # Mise à jour
└── README.md                   # Ce fichier
```

---

## ⚙️ Configuration

### **1. Variables d'Environnement (.env)**

```bash
# ============================================
# CORTEXOPS - CONFIGURATION ON-PREMISE
# ============================================

# ---- Application ----
NODE_ENV=production
WEB_PORT=80
WEB_SSL_PORT=443

# ---- Supabase (obligatoire) ----
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...xxx

# ---- Database (optionnel si Supabase) ----
POSTGRES_DB=cortexops
POSTGRES_USER=cortexops
POSTGRES_PASSWORD=CHANGEME_STRONG_PASSWORD
POSTGRES_PORT=5432

# ---- Redis Cache ----
REDIS_PASSWORD=CHANGEME_REDIS_PASSWORD

# ---- Monitoring ----
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
GRAFANA_PASSWORD=CHANGEME_ADMIN_PASSWORD

# ---- Email (optionnel) ----
RESEND_API_KEY=re_xxx...xxx
FROM_EMAIL=noreply@your-domain.com

# ---- Paiements (optionnel) ----
MOLLIE_API_KEY=test_xxx...xxx
```

### **2. Certificats SSL (Optionnel mais recommandé)**

```bash
# Génère des certificats auto-signés (dev/test)
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/cortexops.key \
  -out nginx/ssl/cortexops.crt \
  -subj "/C=FR/ST=IDF/L=Paris/O=CortexOps/CN=cortexops.local"

# OU utilise Let's Encrypt (production)
# Voir section SSL ci-dessous
```

---

## 🔧 Installation Détaillée

### **Prérequis**
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 20GB espace disque
- Ports disponibles: 80, 443, 5432, 9090, 3001

### **Vérification prérequis**
```bash
docker --version          # Docker version 20.10+
docker-compose --version  # Docker Compose version 2.0+
```

### **Installation automatique**
```bash
# Utilise le script d'installation
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Le script va:
1. ✅ Vérifier les prérequis
2. ✅ Créer `.env` depuis `.env.example`
3. ✅ Générer des mots de passe sécurisés
4. ✅ Créer les certificats SSL
5. ✅ Lancer les services
6. ✅ Vérifier la santé des services
7. ✅ Afficher les URLs d'accès

### **Installation manuelle**
```bash
# 1. Clone/télécharge le projet
git clone https://github.com/cortexops/on-premise.git
cd on-premise

# 2. Configure les variables
cp .env.example .env
nano .env  # Édite les valeurs

# 3. Build les images
docker-compose build

# 4. Lance les services
docker-compose up -d

# 5. Vérifie les logs
docker-compose logs -f cortexops-web

# 6. Vérifie la santé
docker-compose ps
```

---

## 🏗️ Architecture des Services

### **Services Inclus**

| Service | Port | Description |
|---------|------|-------------|
| **cortexops-web** | 80, 443 | Application principale |
| **redis** | 6379 (interne) | Cache & sessions |
| **prometheus** | 9090 | Monitoring & métriques |
| **grafana** | 3001 | Dashboards & visualisation |
| **postgres** | 5432 | Base de données (optionnel) |
| **nginx-proxy** | 8080, 8443 | Reverse proxy (optionnel) |

### **Network Diagram**
```
Internet
   │
   ├─→ nginx-proxy:8080/8443 (optionnel)
   │      │
   │      └─→ cortexops-web:80/443
   │             │
   │             ├─→ redis:6379
   │             ├─→ postgres:5432
   │             └─→ Supabase (cloud)
   │
   └─→ prometheus:9090
          │
          └─→ grafana:3001
```

---

## 🚀 Commandes de Gestion

### **Démarrage**
```bash
# Lance tous les services
docker-compose up -d

# Lance un service spécifique
docker-compose up -d cortexops-web

# Lance avec rebuild
docker-compose up -d --build
```

### **Arrêt**
```bash
# Arrête tous les services
docker-compose down

# Arrête et supprime les volumes
docker-compose down -v

# Arrête un service spécifique
docker-compose stop cortexops-web
```

### **Monitoring**
```bash
# Voir les logs de tous les services
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f cortexops-web

# Logs des 100 dernières lignes
docker-compose logs --tail=100 cortexops-web

# Statut des services
docker-compose ps

# Statistiques ressources
docker stats
```

### **Maintenance**
```bash
# Redémarre un service
docker-compose restart cortexops-web

# Rebuild une image
docker-compose build cortexops-web

# Pull les nouvelles images
docker-compose pull

# Nettoie les images inutilisées
docker system prune -a
```

---

## 💾 Backup & Restore

### **Backup Automatique**
```bash
# Lance un backup complet
./scripts/backup.sh

# Backups créés dans ./backups/
# cortexops-backup-2025-11-13-10-30-00.tar.gz
```

Le backup inclut:
- Base de données PostgreSQL
- Volumes Redis
- Configuration (.env)
- Certificats SSL
- Dashboards Grafana

### **Backup Manuel**
```bash
# Backup PostgreSQL
docker exec cortexops-postgres pg_dump -U cortexops cortexops > backup.sql

# Backup Redis
docker exec cortexops-redis redis-cli --rdb /data/dump.rdb

# Backup volumes
docker run --rm -v postgres-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/postgres-backup.tar.gz -C /data .
```

### **Restore**
```bash
# Restore depuis backup
./scripts/restore.sh cortexops-backup-2025-11-13-10-30-00.tar.gz

# OU manuellement
docker exec -i cortexops-postgres psql -U cortexops cortexops < backup.sql
```

---

## 🔒 SSL/TLS Configuration

### **Option 1: Let's Encrypt (Production)**
```bash
# Installe certbot
apt-get install certbot

# Génère les certificats
certbot certonly --standalone -d cortexops.yourdomain.com

# Copie les certificats
cp /etc/letsencrypt/live/cortexops.yourdomain.com/fullchain.pem nginx/ssl/cortexops.crt
cp /etc/letsencrypt/live/cortexops.yourdomain.com/privkey.pem nginx/ssl/cortexops.key

# Redémarre
docker-compose restart cortexops-web
```

### **Option 2: Certificats Auto-signés (Dev/Test)**
```bash
# Génère les certificats
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/cortexops.key \
  -out nginx/ssl/cortexops.crt \
  -subj "/C=FR/ST=IDF/L=Paris/O=CortexOps/CN=cortexops.local"

# Ajoute aux certificats système (optionnel)
sudo cp nginx/ssl/cortexops.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

### **Option 3: Certificats existants**
```bash
# Copie tes certificats existants
cp /path/to/your/cert.crt nginx/ssl/cortexops.crt
cp /path/to/your/cert.key nginx/ssl/cortexops.key

# Vérifie les permissions
chmod 644 nginx/ssl/cortexops.crt
chmod 600 nginx/ssl/cortexops.key
```

---

## 📊 Monitoring & Alertes

### **Accès Prometheus**
```
URL: http://localhost:9090
```

Métriques disponibles:
- CPU, RAM, Disk usage
- Requêtes HTTP (count, latency)
- Cache hit ratio (Redis)
- Database connections
- API rate limits

### **Accès Grafana**
```
URL: http://localhost:3001
User: admin
Password: [GRAFANA_PASSWORD from .env]
```

Dashboards inclus:
- **CortexOps Overview** - Vue générale
- **API Performance** - Stats API
- **System Resources** - CPU/RAM/Disk
- **User Activity** - Activité utilisateurs
- **Security Audit** - Logs sécurité

### **Alertes**
Configurées dans `prometheus/alerts.yml`:
- High CPU usage (>80%)
- High memory usage (>90%)
- Disk space low (<10%)
- High error rate (>5%)
- Service down

---

## 🔧 Résolution de Problèmes

### **Service ne démarre pas**
```bash
# Vérifie les logs
docker-compose logs cortexops-web

# Vérifie la config
docker-compose config

# Vérifie les ports utilisés
netstat -tulpn | grep -E '(80|443|5432|9090|3001)'
```

### **Problème de connexion DB**
```bash
# Teste la connexion
docker exec -it cortexops-postgres psql -U cortexops -d cortexops

# Vérifie les variables
docker-compose exec cortexops-web env | grep POSTGRES
```

### **Problème SSL**
```bash
# Vérifie les certificats
openssl x509 -in nginx/ssl/cortexops.crt -text -noout

# Teste SSL
curl -k https://localhost

# Logs Nginx
docker-compose logs nginx-proxy
```

### **Haute utilisation RAM**
```bash
# Vérifie l'utilisation
docker stats

# Limite Redis
# Dans docker-compose.yml, ajuste maxmemory
```

### **Reset complet**
```bash
# Arrête tout et supprime les volumes
docker-compose down -v

# Supprime les images
docker rmi $(docker images -q cortexops/*)

# Relance
docker-compose up -d --build
```

---

## 🔄 Mise à Jour

### **Automatique**
```bash
./scripts/update.sh
```

### **Manuelle**
```bash
# 1. Backup avant MAJ
./scripts/backup.sh

# 2. Pull les nouvelles images
docker-compose pull

# 3. Rebuild si nécessaire
docker-compose build --pull

# 4. Redémarre avec nouvelle version
docker-compose up -d

# 5. Vérifie les logs
docker-compose logs -f cortexops-web
```

---

## 🔐 Sécurité

### **Best Practices**

✅ **Mots de passe forts**
```bash
# Génère des mots de passe sécurisés
openssl rand -base64 32
```

✅ **Firewall**
```bash
# N'expose que les ports nécessaires
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

✅ **Updates réguliers**
```bash
# MAJ système
apt-get update && apt-get upgrade

# MAJ Docker images
docker-compose pull
docker-compose up -d
```

✅ **Backups automatiques**
```bash
# Ajoute au cron
crontab -e

# Backup quotidien à 2h du matin
0 2 * * * /path/to/cortexops/scripts/backup.sh
```

✅ **SSL obligatoire**
```nginx
# Dans nginx.conf
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

---

## 📈 Performance Tuning

### **Redis Cache**
```yaml
# Dans docker-compose.yml
redis:
  command: >
    redis-server
    --maxmemory 512mb          # Augmente si besoin
    --maxmemory-policy allkeys-lru
```

### **PostgreSQL**
```bash
# Dans postgres/init/postgresql.conf
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
```

### **Nginx**
```nginx
# Dans nginx.conf
worker_processes auto;
worker_connections 2048;
keepalive_timeout 65;
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

---

## 📞 Support

### **Documentation**
- Guide complet: https://docs.cortexops.com/on-premise
- API docs: https://docs.cortexops.com/api
- Troubleshooting: https://docs.cortexops.com/troubleshooting

### **Contact**
- Email: support@cortexops.com
- Discord: https://discord.gg/cortexops
- GitHub Issues: https://github.com/cortexops/on-premise/issues

### **Licence**
Licence On-Premise requise. Contact: sales@cortexops.com

---

## 📋 Checklist de Déploiement

### **Avant le déploiement**
- [ ] Docker & Docker Compose installés
- [ ] Ports 80, 443 disponibles
- [ ] 4GB RAM minimum
- [ ] 20GB disque disponible
- [ ] Compte Supabase créé
- [ ] Variables .env configurées
- [ ] Certificats SSL générés

### **Déploiement**
- [ ] `docker-compose up -d` réussi
- [ ] Tous services healthy (`docker-compose ps`)
- [ ] Application accessible (http://localhost)
- [ ] Login fonctionne
- [ ] Génération playbook OK
- [ ] Prometheus accessible (http://localhost:9090)
- [ ] Grafana accessible (http://localhost:3001)

### **Post-déploiement**
- [ ] Backup automatique configuré (cron)
- [ ] Monitoring alertes testées
- [ ] SSL/TLS configuré (production)
- [ ] Firewall configuré
- [ ] Documentation équipe partagée
- [ ] Contacts support sauvegardés

---

**Version**: 1.0.0
**Dernière mise à jour**: 13 Novembre 2025
**Compatibilité**: Docker 20.10+, Docker Compose 2.0+
