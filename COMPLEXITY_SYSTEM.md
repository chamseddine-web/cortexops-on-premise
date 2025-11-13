# Système de Détection de Complexité à Trois Niveaux

## Vue d'ensemble

Le générateur de playbook Ansible implémente maintenant un système intelligent de détection de complexité qui adapte automatiquement la sortie au besoin réel de l'utilisateur.

## Les Trois Niveaux

### 🟢 BASIC - Playbook Simple et Direct

**Pour qui** : Débutants, tâches simples, un seul service

**Quand l'utiliser** :
- Installation d'un seul service (nginx, postgres, docker)
- Configuration simple sans logique complexe
- Pas de multi-serveurs
- Pas de monitoring/CI/CD

**Sortie générée** :
- Playbook linéaire (10-25 lignes)
- Pas de structure roles/
- Variables inline
- Handlers simples si nécessaire

**Exemples de prompts** :
```
"Installe nginx avec SSL sur Ubuntu"
"Configure PostgreSQL sur mon serveur"
"Setup Docker sur 192.168.1.100"
```

**Exemple de sortie** :
```yaml
---
# Simple Deployment - Playbook Simple
# Service: nginx+ssl
# Target: ubuntu-server

- name: "Configuration nginx+ssl"
  hosts: all
  become: yes

  tasks:
    - name: "Installer Nginx"
      apt:
        name: nginx
        state: present
        update_cache: yes

    - name: "Installer OpenSSL"
      apt:
        name: openssl
        state: present

    - name: "Générer un certificat auto-signé"
      command: >
        openssl req -x509 -nodes -days 365 -newkey rsa:2048
        -keyout /etc/nginx/ssl/example.com.key
        -out /etc/nginx/ssl/example.com.crt
        -subj "/C=FR/ST=IDF/L=Paris/O=Organization/CN=example.com"
      args:
        creates: /etc/nginx/ssl/example.com.crt

  handlers:
    - name: restart nginx
      systemd:
        name: nginx
        state: restarted
```

---

### 🟡 PRO - Playbook Structuré avec Best Practices

**Pour qui** : Utilisateurs intermédiaires, applications multi-composants

**Quand l'utiliser** :
- 2-3 services à déployer
- Configuration avec templates
- Déploiement multi-serveurs
- Besoin de validation post-déploiement

**Sortie générée** :
- Structure avec roles/
- Templates Jinja2
- Handlers organisés
- Variables séparées (group_vars/)
- Inventaires multiples
- Validation post-déploiement

**Exemples de prompts** :
```
"Déploie une application web avec nginx, nodejs et postgresql"
"Setup un cluster de 3 serveurs web avec load balancer"
"Configure une stack LAMP complète"
```

**Caractéristiques** :
- Fichiers séparés par rôle
- Idempotence garantie
- Gestion d'erreurs (block/rescue)
- Tags pour exécution sélective

---

### 🔴 ENTERPRISE - Playbook Complet avec Monitoring & CI/CD

**Pour qui** : Équipes DevOps, environnements de production

**Quand l'utiliser** :
- Infrastructure complexe (4+ services)
- Monitoring/observabilité requis
- Intégration CI/CD
- Multi-environnements (staging, production)
- Sécurité avancée
- Rapports de déploiement

**Sortie générée** :
- Structure complète roles/
- GitLab CI/CD pipeline
- Monitoring Prometheus/Grafana
- Rapports HTML/JSON
- Scripts Python pour AI Ops
- Logs centralisés
- Validation post-déploiement
- Gestion multi-OS (Debian/RedHat)

**Exemples de prompts** :
```
"Infrastructure complète avec nginx, postgresql, redis, monitoring prometheus et CI/CD GitLab"
"Déploiement multi-cloud avec haute disponibilité et alerting"
"Stack DevOps avec observabilité complète et rapports de conformité"
```

**Fonctionnalités** :
- 📊 Rapports HTML/JSON automatiques
- 📡 Métriques Prometheus Pushgateway
- 🔍 Validation automatique des services
- 📤 Logs centralisés (Graylog/Loki)
- 🧠 Scripts Python pour analyse
- 🔄 Pipeline GitLab CI/CD
- 🌐 Support multi-OS

---

## Système de Scoring

Le détecteur de complexité calcule un score basé sur :

| Facteur                      | Poids | Critères                           |
|------------------------------|-------|------------------------------------|
| Nombre de services           | 3-6   | 1 service=0, 2-3=3, 4+=6          |
| Multi-serveurs               | 2     | Cluster, HA, load balancing       |
| Monitoring                   | 2     | Prometheus, Grafana, métriques    |
| CI/CD                        | 2     | GitLab CI, GitHub Actions, Jenkins|
| Logique personnalisée        | 1     | Conditions, scripts, calculs      |
| Sécurité avancée             | 1     | Falco, Trivy, hardening           |

**Score total** :
- 0-3 → BASIC
- 4-8 → PRO
- 9+ → ENTERPRISE

## Indicateurs de Complexité

### Détecte BASIC si :
- Un seul service mentionné
- Aucun mot-clé de monitoring/CI/CD
- Pas de mention de "cluster" ou "multi-serveurs"
- Prompt simple et direct

### Détecte PRO si :
- 2-3 services
- Mention de "plusieurs serveurs" ou "load balancer"
- Besoin de templates ou configuration avancée
- Pas de monitoring explicite

### Détecte ENTERPRISE si :
- 4+ services
- Mots-clés : monitoring, prometheus, grafana, CI/CD, pipeline
- Haute disponibilité
- Sécurité avancée (Falco, Trivy)
- Logs centralisés

## Exemples Complets

### Exemple 1 : BASIC Détecté

**Prompt** :
```
Installe nginx avec SSL auto-signé sur mon serveur Ubuntu
```

**Analyse** :
```
╔════════════════════════════════════════════════════════════════╗
║           ANALYSE DE COMPLEXITÉ DU PLAYBOOK                    ║
╚════════════════════════════════════════════════════════════════╝

Niveau détecté      : 🟢 BASIC
Confiance           : 90%

Indicateurs
────────────────────────────────────────────────────────────────
  • Nombre de services     : 1
  • Multi-serveurs         : ✗
  • Monitoring             : ✗
  • CI/CD                  : ✗
  • Logique personnalisée  : ✗
  • Sécurité avancée       : ✗

Raisons
────────────────────────────────────────────────────────────────
  • Service unique (1)

Recommandation
────────────────────────────────────────────────────────────────
Playbook simple et direct (10-20 lignes), idéal pour débutants
```

**Fichiers générés** :
- `playbook.yml` (25 lignes)
- `inventory.ini` (5 lignes)
- `README.md` (15 lignes)

---

### Exemple 2 : PRO Détecté

**Prompt** :
```
Déploie une application web avec nginx, nodejs 18 et postgresql sur 3 serveurs
```

**Analyse** :
```
Niveau détecté      : 🟡 PRO
Confiance           : 85%

Indicateurs
────────────────────────────────────────────────────────────────
  • Nombre de services     : 3
  • Multi-serveurs         : ✓
  • Monitoring             : ✗
  • CI/CD                  : ✗

Recommandation
────────────────────────────────────────────────────────────────
Playbook structuré avec handlers et templates, pour utilisateurs intermédiaires
```

**Fichiers générés** :
- `site.yml`
- `inventories/production.ini`
- `group_vars/all.yml`
- `roles/nginx/tasks/main.yml`
- `roles/nodejs/tasks/main.yml`
- `roles/postgresql/tasks/main.yml`
- `roles/common/tasks/main.yml`
- Templates et handlers

---

### Exemple 3 : ENTERPRISE Détecté

**Prompt** :
```
Infrastructure complète avec nginx, postgresql, redis, monitoring prometheus et pipeline GitLab CI pour déploiement automatique
```

**Analyse** :
```
Niveau détecté      : 🔴 ENTERPRISE
Confiance           : 95%

Indicateurs
────────────────────────────────────────────────────────────────
  • Nombre de services     : 4
  • Multi-serveurs         : ✗
  • Monitoring             : ✓
  • CI/CD                  : ✓

Raisons
────────────────────────────────────────────────────────────────
  • Infrastructure complexe (4 services)
  • Monitoring/Observabilité requis
  • Intégration CI/CD

Recommandation
────────────────────────────────────────────────────────────────
Playbook complet avec monitoring, CI/CD, reporting et validation
```

**Fichiers générés** :
- Structure complète (50+ fichiers)
- Pipeline GitLab CI
- Scripts Python AI Ops
- CSS externe pour rapports
- Monitoring et alerting
- Rapports HTML/JSON
- Multi-OS support

---

## Avantages du Système

### Pour les Débutants
- 🎯 Sortie simple et compréhensible
- 📚 Apprentissage progressif
- ⚡ Démarrage rapide sans complexité inutile

### Pour les Professionnels
- 🔄 Évolutivité automatique
- 🛡️ Best practices intégrées
- 📊 Monitoring et reporting si nécessaire

### Pour les Équipes
- 🎛️ Adaptation automatique au besoin
- 📈 Cohérence des playbooks
- 🚀 Production-ready quand nécessaire

---

## Personnalisation

Vous pouvez forcer un niveau spécifique en ajoutant des mots-clés :

### Forcer BASIC :
```
Playbook simple pour installer nginx
```

### Forcer PRO :
```
Infrastructure web avec templates et validation
```

### Forcer ENTERPRISE :
```
Infrastructure production avec monitoring complet et CI/CD
```

---

## Conclusion

Le système de détection de complexité garantit que :

> **Prompt simple → Playbook simple**
> **Prompt complexe → Playbook complet**

Cela évite la **sur-ingénierie** et améliore l'**expérience utilisateur** en fournissant exactement ce qui est nécessaire, ni plus, ni moins.
