# Exemples de Classification Automatique

Ce document démontre comment le système détecte automatiquement le niveau de complexité requis.

---

## 🟢 Niveau BASIC - Exemples

### Exemple 1 : Installation Simple

**Prompt** :
```
Installe et configure Nginx sur Ubuntu
```

**Détection Automatique** :
```
═══════════════════════════════════════════════════════════
ANALYSE DE COMPLEXITÉ DU PLAYBOOK
═══════════════════════════════════════════════════════════

Niveau détecté      : 🟢 BASIC
Confiance           : 90%

Indicateurs
───────────────────────────────────────────────────────────
  • Nombre de services     : 1
  • Multi-serveurs         : ✗
  • Monitoring             : ✗
  • CI/CD                  : ✗
  • Logique personnalisée  : ✗
  • Sécurité avancée       : ✗

Raisons
───────────────────────────────────────────────────────────
  • Service unique (1)

Recommandation
───────────────────────────────────────────────────────────
Playbook simple et direct (10-20 lignes), idéal pour débutants
```

**Playbook Généré** :
```yaml
---
# Simple Deployment - Playbook Simple
# Service: nginx
# Target: localhost

- name: "Configuration nginx"
  hosts: all
  become: yes

  tasks:
    - name: "Installer Nginx"
      apt:
        name: nginx
        state: present
        update_cache: yes

    - name: "Démarrer et activer Nginx"
      systemd:
        name: nginx
        state: started
        enabled: yes

  handlers:
    - name: restart nginx
      systemd:
        name: nginx
        state: restarted
```

**Fichiers** : 3 fichiers, ~40 lignes total

---

### Exemple 2 : Setup Docker

**Prompt** :
```
Setup Docker sur mon serveur 192.168.1.100
```

**Détection** :
- Services : 1 (docker)
- Action simple : "setup"
- Pas de complexité additionnelle
- **→ BASIC**

**Playbook** : Installation Docker en 20 lignes

---

### Exemple 3 : PostgreSQL Simple

**Prompt** :
```
Configure PostgreSQL sur Ubuntu 22.04
```

**Détection** :
- Services : 1 (postgresql)
- OS spécifique mentionné
- Action basique : "configure"
- **→ BASIC**

---

## 🟡 Niveau PRO - Exemples

### Exemple 1 : Stack Web Simple

**Prompt** :
```
Installe Nginx avec SSL et PostgreSQL
```

**Détection Automatique** :
```
═══════════════════════════════════════════════════════════
ANALYSE DE COMPLEXITÉ DU PLAYBOOK
═══════════════════════════════════════════════════════════

Niveau détecté      : 🟡 PRO
Confiance           : 85%

Indicateurs
───────────────────────────────────────────────────────────
  • Nombre de services     : 2
  • Multi-serveurs         : ✗
  • Monitoring             : ✗
  • CI/CD                  : ✗
  • Logique personnalisée  : ✗
  • Sécurité avancée       : ✗

Raisons
───────────────────────────────────────────────────────────
  • Services multiples (2)

Recommandation
───────────────────────────────────────────────────────────
Playbook structuré avec handlers et templates, pour utilisateurs intermédiaires
```

**Structure Générée** :
```
ansible-playbook/
├── site.yml
├── ansible.cfg
├── inventories/
│   └── production.ini
├── group_vars/
│   └── all.yml
├── roles/
│   ├── common/
│   │   └── tasks/main.yml
│   ├── nginx/
│   │   ├── tasks/main.yml
│   │   ├── handlers/main.yml
│   │   └── templates/nginx.conf.j2
│   ├── ssl/
│   │   └── tasks/main.yml
│   └── postgresql/
│       ├── tasks/main.yml
│       └── handlers/main.yml
└── README.md
```

**Fichiers** : ~18 fichiers, ~400 lignes total

---

### Exemple 2 : Application Node.js

**Prompt** :
```
Déploie une application Node.js 18 avec Nginx reverse proxy et Redis
```

**Détection** :
- Services : 3 (nodejs, nginx, redis)
- Reverse proxy (config avancée)
- **Score : 3 → PRO**

**Inclus** :
- Structure roles/
- Templates pour Nginx reverse proxy
- Configuration Redis
- Handlers pour services
- Variables séparées

---

### Exemple 3 : Stack LAMP

**Prompt** :
```
Configure une stack LAMP complète sur 2 serveurs web
```

**Détection** :
- Services : 3 (Linux, Apache, MySQL, PHP)
- Multi-serveurs : Oui ("2 serveurs")
- **Score : 3 + 2 = 5 → PRO**

**Inclus** :
- Inventaire multi-serveurs
- Load balancing
- Validation post-déploiement

---

## 🔴 Niveau ENTERPRISE - Exemples

### Exemple 1 : Infrastructure Complète

**Prompt** :
```
Déploie une stack complète web + DB + monitoring avec reporting
```

**Détection Automatique** :
```
═══════════════════════════════════════════════════════════
ANALYSE DE COMPLEXITÉ DU PLAYBOOK
═══════════════════════════════════════════════════════════

Niveau détecté      : 🔴 ENTERPRISE
Confiance           : 95%

Indicateurs
───────────────────────────────────────────────────────────
  • Nombre de services     : 4
  • Multi-serveurs         : ✗
  • Monitoring             : ✓
  • CI/CD                  : ✗
  • Logique personnalisée  : ✗
  • Sécurité avancée       : ✗

Raisons
───────────────────────────────────────────────────────────
  • Infrastructure complexe (4 services)
  • Monitoring/Observabilité requis

Recommandation
───────────────────────────────────────────────────────────
Playbook complet avec monitoring, CI/CD, reporting et validation
```

**Structure Générée** :
```
ansible-playbook/
├── site.yml
├── ansible.cfg
├── .gitlab-ci.yml                    # CI/CD Pipeline
├── inventories/
│   ├── production.ini
│   └── staging.ini
├── group_vars/
│   └── all.yml                       # Variables avancées
├── roles/
│   ├── common/
│   ├── nginx/
│   ├── postgresql/
│   ├── redis/
│   ├── monitoring/                   # Prometheus/Grafana
│   ├── security/
│   └── reporting/
├── files/
│   ├── ai_ops_calculator.py         # Script Python AI Ops
│   └── report.css                    # CSS pour rapports HTML
├── templates/
├── vault.yml                         # Secrets chiffrés
└── README.md
```

**Fonctionnalités Incluses** :
- ✅ Monitoring Prometheus/Grafana
- ✅ Rapports HTML/JSON automatiques
- ✅ Validation post-déploiement
- ✅ Scripts Python pour analyse
- ✅ Pipeline GitLab CI/CD
- ✅ Support multi-OS (Debian/RedHat)
- ✅ Logs centralisés
- ✅ Métriques temps réel

**Fichiers** : 50+ fichiers, 2000+ lignes total

---

### Exemple 2 : DevOps Full Stack

**Prompt** :
```
Infrastructure production avec Nginx, PostgreSQL, Redis, monitoring Prometheus, alerting Grafana et pipeline GitLab CI pour déploiement automatique
```

**Détection** :
- Services : 5+ (nginx, postgresql, redis, prometheus, grafana)
- Monitoring : Oui (prometheus, grafana)
- CI/CD : Oui (gitlab ci)
- Alerting : Oui
- **Score : 6 + 2 + 2 = 10 → ENTERPRISE**

**Inclus Tout** : Monitoring, CI/CD, Alerting, Rapports, Validation, Multi-OS

---

### Exemple 3 : Haute Disponibilité

**Prompt** :
```
Cluster haute disponibilité avec load balancer, 4 serveurs web, database master-slave, monitoring complet et sécurité avancée avec Falco
```

**Détection** :
- Services : 5+ (load balancer, nginx, postgresql, monitoring, falco)
- Multi-serveurs : Oui ("cluster", "4 serveurs", "master-slave")
- Monitoring : Oui ("monitoring complet")
- Sécurité avancée : Oui ("Falco")
- **Score : 6 + 2 + 2 + 1 = 11 → ENTERPRISE**

**Inclus** :
- Tout ENTERPRISE standard
- + Configuration HA
- + Master-Slave replication
- + Falco pour détection d'intrusion
- + Scripts d'analyse de sécurité

---

## 📊 Tableau Récapitulatif

| Niveau | Services | Multi-Serveurs | Monitoring | CI/CD | Fichiers | Lignes |
|--------|----------|----------------|------------|-------|----------|--------|
| 🟢 BASIC | 1 | ✗ | ✗ | ✗ | 3 | ~40 |
| 🟡 PRO | 2-3 | ✓/✗ | ✗ | ✗ | 15-20 | ~400 |
| 🔴 ENTERPRISE | 4+ | ✓ | ✓ | ✓ | 50+ | 2000+ |

---

## 🎯 Mots-Clés de Détection

### Déclencheurs BASIC
- Verbes simples : "installe", "configure", "setup"
- Un seul service mentionné
- Aucun mot-clé complexe

### Déclencheurs PRO
- "avec" + 2-3 services
- "reverse proxy", "load balancer"
- "plusieurs serveurs" sans monitoring
- "stack" (LAMP, MEAN, etc.)

### Déclencheurs ENTERPRISE
- "monitoring", "prometheus", "grafana"
- "CI/CD", "pipeline", "automated deploy"
- "reporting", "rapports", "dashboards"
- "haute disponibilité", "cluster"
- "sécurité avancée", "falco", "trivy"
- "logs centralisés"
- 4+ services mentionnés

---

## 💡 Astuces pour Forcer un Niveau

### Pour obtenir BASIC :
```
Playbook simple pour installer nginx
```

### Pour obtenir PRO :
```
Infrastructure web avec validation et templates
```

### Pour obtenir ENTERPRISE :
```
Infrastructure production avec monitoring complet et CI/CD
```

---

## ✅ Validation

Le système garantit :

1. **Pas de sur-ingénierie** : Un prompt simple ne génère jamais 50 fichiers
2. **Scalabilité** : Un prompt complexe obtient tout ce dont il a besoin
3. **Apprentissage progressif** : Les utilisateurs découvrent Ansible par étapes
4. **Production-ready** : Les infrastructures complexes sont complètes dès le départ

---

## 🚀 Test Rapide

Essayez ces prompts et observez la détection :

```bash
# Devrait détecter BASIC
"Installe Docker sur Ubuntu"

# Devrait détecter PRO
"Déploie une app web avec Nginx et PostgreSQL"

# Devrait détecter ENTERPRISE
"Infrastructure complète avec monitoring Prometheus et CI/CD"
```

Le système analyse automatiquement et génère le playbook adapté ! ✨
