# ⚡ CortexOps On-Premise - Quick Start

## Installation en 2 minutes

```bash
# Télécharger
git clone https://github.com/chamseddine-web/cortexops-on-premise.git
cd cortexops-on-premise

# Installer
chmod +x install.sh
./install.sh
```

**C'est tout!** 🎉

---

## Accès

- **Application** : http://localhost
- **Monitoring** : http://localhost:3001 (Grafana)
- **Métriques** : http://localhost:9090 (Prometheus)

---

## Configuration Supabase

1. Créez un compte sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Copiez URL + clé anonyme
4. Éditez `.env` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anonyme
```

5. Redémarrez :

```bash
docker compose restart
```

---

## Commandes Utiles

```bash
# Voir les services
docker compose ps

# Logs en temps réel
docker compose logs -f

# Backup
./backup.sh

# Mise à jour
./update.sh

# Arrêter
docker compose down

# Redémarrer
docker compose restart
```

---

## Problèmes?

### Services qui ne démarrent pas

```bash
# Vérifier Docker
docker ps

# Voir les erreurs
docker compose logs

# Redémarrer proprement
docker compose down
docker compose up -d
```

### Port déjà utilisé

```bash
# Changer le port dans .env
WEB_PORT=8080

# Redémarrer
docker compose up -d
```

### Problème de permissions

```bash
# Ajouter votre user au groupe docker
sudo usermod -aG docker $USER

# Se déconnecter/reconnecter
```

---

## Documentation Complète

- [Installation détaillée](ON_PREMISE_INSTALLATION.md)
- [Documentation API](API_DOCUMENTATION.md)
- [Guide de déploiement](DEPLOYMENT_QUICK_START.md)

---

## Support

- **Email** : support@cortexops.com
- **GitHub** : [Issues](https://github.com/chamseddine-web/cortexops-on-premise/issues)
- **Documentation** : https://docs.cortexops.com

---

**Version 2.0.0** | Enterprise-Ready 🚀
