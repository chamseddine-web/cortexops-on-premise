# 🚀 CortexOps On-Premise

> **Enterprise-Ready Ansible Playbook Generator** - Deploy on your infrastructure

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/chamseddine-web/cortexops-on-premise)
[![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)

CortexOps On-Premise est une solution complète et auto-hébergée pour générer des playbooks Ansible professionnels avec intelligence artificielle, monitoring intégré et gestion complète du cycle de vie.

---

## ✨ Fonctionnalités

### 🎯 Génération Intelligente
- **IA Multi-Provider** : Mistral AI (recommandé), OpenAI, Ollama local
- **6 Modèles AI** : Du plus économique au plus puissant
- **Multi-environnement** : Dev, Staging, Production
- **Multi-cloud** : AWS, Azure, GCP, On-Premise
- **Templates** : Bibliothèque de templates prêts à l'emploi
- **Validation** : Vérification syntaxique automatique

### 💼 Fonctionnalités SaaS
- **Onboarding** : Assistant interactif pour nouveaux utilisateurs
- **Dashboard Consommation** : Monitoring en temps réel
- **Quotas** : 4 plans (Free, Pro, Team, Enterprise)
- **API Keys** : Gestion complète des accès API
- **Analytics** : Métriques détaillées d'utilisation

### 🔒 Sécurité Enterprise
- **Authentification** : Supabase Auth avec 2FA
- **RLS** : Row Level Security sur toutes les données
- **Encryption** : Chiffrement des données sensibles
- **Audit Logs** : Traçabilité complète
- **Conformité** : RGPD, SOC2 ready

### 📊 Monitoring & Observabilité
- **Prometheus** : Collecte de métriques
- **Grafana** : Dashboards personnalisés
- **Alertes** : Notifications en temps réel
- **Health Checks** : Surveillance de tous les services

### 🔄 CI/CD Ready
- **Git Export** : Push automatique vers GitHub/GitLab
- **Webhooks** : Intégrations externes
- **API REST** : Automatisation complète
- **CLI** : Ligne de commande

---

## 🎯 Quick Start

### Installation en une commande

```bash
git clone https://github.com/chamseddine-web/cortexops-on-premise.git
cd cortexops-on-premise
chmod +x install.sh
./install.sh
```

**C'est tout! Votre instance est prête en 2 minutes** ⚡

### Accès aux services

| Service | URL | Identifiants |
|---------|-----|--------------|
| **Application** | http://localhost | Créer un compte |
| **Grafana** | http://localhost:3001 | admin / (voir .env) |
| **Prometheus** | http://localhost:9090 | - |

---

## 📋 Prérequis

### Système
- **OS** : Linux (Ubuntu 20.04+), macOS 11+, Windows WSL2
- **CPU** : 2 cores (4+ recommandé)
- **RAM** : 4 GB (8+ recommandé)
- **Disk** : 20 GB SSD

### Logiciels
- **Docker** : 20.10+
- **Docker Compose** : 2.0+
- **Git** : 2.0+

### Compte Supabase
- Créez un compte gratuit sur [supabase.com](https://supabase.com)
- Créez un nouveau projet
- Notez l'URL et la clé anonyme

### Provider AI (au moins un requis)
- **Mistral AI** (Recommandé) : [console.mistral.ai](https://console.mistral.ai/) - 0,15€/1M tokens
- **OpenAI** (Alternatif) : [platform.openai.com](https://platform.openai.com/) - 0,50€/1M tokens
- **Ollama** (Gratuit) : [ollama.ai](https://ollama.ai/) - 100% gratuit, local

Voir [SWITCH_OPENAI_TO_MISTRAL.md](SWITCH_OPENAI_TO_MISTRAL.md) pour comparer les providers.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│                  Nginx (Port 80/443)                     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              CortexOps Web App (React)                   │
└───┬─────────────┬──────────────┬──────────────┬─────────┘
    │             │              │              │
    ▼             ▼              ▼              ▼
┌────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐
│Supabase│  │PostgreSQL│  │   Redis   │  │Prometheus│
│ (Auth) │  │ (Local)  │  │  (Cache)  │  │(Metrics) │
└────────┘  └──────────┘  └───────────┘  └──────────┘
                                              │
                                              ▼
                                         ┌──────────┐
                                         │ Grafana  │
                                         │(Dashboard)│
                                         └──────────┘
```

---

## 📦 Ce qui est inclus

### Code Source
- **214 fichiers** de code production
- **77,500+ lignes** de TypeScript/React
- **87 composants** React
- **46 migrations** Supabase
- **6 Edge Functions**

### Infrastructure
- **Docker Compose** : Orchestration complète
- **Nginx** : Reverse proxy et SSL
- **PostgreSQL** : Base de données (optionnel)
- **Redis** : Cache et sessions
- **Prometheus** : Métriques
- **Grafana** : Monitoring

### Scripts
- `install.sh` - Installation automatique
- `backup.sh` - Backup complet
- `restore.sh` - Restauration
- `update.sh` - Mise à jour
- `create-package.sh` - Packaging

### Documentation
- Guide d'installation détaillé
- Documentation API complète
- Procédures de maintenance
- Troubleshooting
- Best practices

---

## 🔧 Configuration

### 1. Configuration de base (.env)

```bash
# Copier le template
cp .env.example .env

# Éditer avec vos valeurs
nano .env
```

### 2. Configuration Supabase (obligatoire)

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Configuration SSL (production)

```bash
# Let's Encrypt
sudo certbot certonly --standalone -d cortexops.votre-domaine.com
sudo cp /etc/letsencrypt/live/cortexops.votre-domaine.com/*.pem nginx/ssl/

# Ou auto-signé (dev)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem
```

---

## 🎓 Documentation

### Guides d'installation
- [⚡ Quick Start](QUICK_START.md) - Démarrage rapide
- [📖 Installation détaillée](ON_PREMISE_INSTALLATION.md) - Guide complet
- [🚀 Déploiement](DEPLOYMENT_QUICK_START.md) - Production

### Documentation technique
- [📡 API Documentation](API_DOCUMENTATION.md) - REST API
- [🔧 Configuration](ENV_VARIABLES.md) - Variables d'environnement
- [🐳 Docker](docker-compose.yml) - Configuration Docker

### Fonctionnalités
- [💰 SaaS Features](SAAS_FEATURES_COMPLETE.md) - Fonctionnalités SaaS
- [🔒 Sécurité](SECURITY_FIXES.md) - Fixes de sécurité
- [📊 Monitoring](SLA_MONITORING.md) - SLA et monitoring

---

## 💾 Backup et Restauration

### Backup automatique

```bash
# Backup manuel immédiat
./backup.sh

# Backup planifié (cron)
crontab -e
# Ajouter: 0 2 * * * /chemin/vers/backup.sh
```

### Restauration

```bash
# Lister les backups
ls -lh backups/

# Restaurer
./restore.sh backups/cortexops_backup_20251113_020000.tar.gz
```

---

## 🔄 Mise à jour

```bash
# Mise à jour automatique (recommandée)
./update.sh

# Ou manuelle
git pull origin main
docker compose pull
docker compose up -d --build
```

---

## 🛡️ Sécurité

### Checklist Production

- [x] Changer tous les mots de passe par défaut
- [x] Activer HTTPS avec certificats valides
- [x] Configurer le pare-feu
- [x] Activer les sauvegardes automatiques
- [x] Configurer les alertes
- [x] Restreindre les ports exposés
- [x] Activer les logs d'audit
- [x] Configurer fail2ban

### Ports à exposer

**Production minimale:**
```
80/tcp   → HTTP (redirect)
443/tcp  → HTTPS
```

**Monitoring (interne uniquement):**
```
3001/tcp → Grafana
9090/tcp → Prometheus
```

---

## 📊 Métriques et KPIs

### Performance
- **Uptime** : 99.9%+
- **Latence** : < 200ms (P95)
- **Throughput** : 1000+ req/s

### Capacité
- **Utilisateurs** : Illimités
- **Playbooks** : Stockage configurable
- **API Calls** : Par plan utilisateur

### Monitoring
- CPU, RAM, Disk en temps réel
- Taux d'erreur et success rate
- Temps de réponse API
- Activité utilisateurs

---

## 🤝 Support

### Community
- **GitHub Issues** : [Signaler un bug](https://github.com/chamseddine-web/cortexops-on-premise/issues)
- **Discussions** : [Q&A et Feature Requests](https://github.com/chamseddine-web/cortexops-on-premise/discussions)

### Enterprise Support
- **Email** : support@cortexops.com
- **Documentation** : https://docs.cortexops.com
- **SLA** : Support 24/7 pour Enterprise

---

## 📝 Licence

CortexOps On-Premise est un logiciel propriétaire.

### Utilisation
- ✅ Déploiement interne dans votre entreprise
- ✅ Personnalisation et modification du code
- ✅ Nombre illimité d'utilisateurs
- ❌ Revente ou redistribution interdite
- ❌ Utilisation comme service SaaS public interdit

Pour les licences commerciales : sales@cortexops.com

---

## 🎯 Roadmap

### v2.1 (Q1 2026)
- [x] Support Mistral AI (Fait ✅)
- [x] Support OpenAI (Fait ✅)
- [x] Support Ollama local (Fait ✅)
- [ ] Support Kubernetes natif
- [ ] Plugin VSCode
- [ ] Templates marketplace
- [ ] Multi-language support

### v2.2 (Q2 2026)
- [ ] Collaboration temps réel
- [ ] Version control intégré
- [ ] CI/CD templates
- [ ] Advanced RBAC

### v3.0 (Q3 2026)
- [ ] AI-powered playbook optimization
- [ ] Predictive analytics
- [ ] Auto-scaling recommendations
- [ ] Cost optimization

---

## 🙏 Remerciements

Construit avec les technologies open-source suivantes :
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Supabase](https://supabase.com/)
- [Docker](https://www.docker.com/)
- [Prometheus](https://prometheus.io/)
- [Grafana](https://grafana.com/)

---

## 📞 Contact

- **Website** : https://cortexops.com
- **Email** : contact@cortexops.com
- **GitHub** : https://github.com/chamseddine-web/cortexops-on-premise
- **Twitter** : @cortexops

---

<div align="center">

**Made with ❤️ for DevOps Engineers**

[Documentation](https://docs.cortexops.com) • [Blog](https://blog.cortexops.com) • [Status](https://status.cortexops.com)

</div>
