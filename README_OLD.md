# 🚀 CortexOps - Générateur Ansible Intelligent SaaS

## 📋 Vue d'Ensemble

**CortexOps** est une plateforme SaaS complète de génération de playbooks Ansible avec intelligence artificielle, système d'API commerciale, gestion multi-utilisateurs et analytics avancés.

---

## ✨ Fonctionnalités Principales

### 🎯 **Système d'API Keys Commercial**
- ✅ Génération sécurisée de clés API (hashées)
- ✅ Rate limiting intelligent par plan (Free/Pro/Enterprise)
- ✅ Analytics par clé en temps réel
- ✅ Révocation instantanée
- ✅ Monitoring complet des requêtes
- ✅ Headers de rate limit standardisés

### 👥 **Gestion Utilisateurs & Profils**
- ✅ Inscription multi-étapes professionnelle
- ✅ Profils complets avec métadonnées
- ✅ Plans tarifaires (Free, Pro, Enterprise)
- ✅ Authentification Supabase
- ✅ Gestion d'équipes
- ✅ Paramètres de sécurité (2FA ready)

### 📊 **Dashboard Administration**
- ✅ KPIs temps réel (users, API calls, revenus)
- ✅ Gestion utilisateurs avancée
- ✅ Stats d'usage API par client
- ✅ Monitoring système
- ✅ Export données CSV
- ✅ Filtres et recherche

### 🤖 **Génération Ansible Intelligente**
- ✅ Analyse NLP des prompts
- ✅ Détection automatique de complexité
- ✅ Multi-environnements (staging/production)
- ✅ Support multi-cloud (AWS, GCP, Azure)
- ✅ Intégration CI/CD (GitLab, GitHub, Jenkins)
- ✅ Kubernetes & Docker ready
- ✅ Hardening CIS automatique
- ✅ Rollback & versioning

### 🔐 **Sécurité Enterprise-Grade**
- ✅ Row Level Security (RLS) Supabase
- ✅ API Keys hashées
- ✅ Rate limiting multi-niveaux
- ✅ Zero data retention option
- ✅ Audit logs complets
- ✅ Permissions granulaires

### 📧 **Email Automation**
- ✅ Emails de bienvenue personnalisés
- ✅ Notifications système
- ✅ Templates responsive HTML
- ✅ Edge Functions Supabase
- ✅ Contact form avec relay

---

## 🏗️ Architecture

### **Frontend**
```
React 18 + TypeScript + Vite
├── TailwindCSS - Design system
├── Framer Motion - Animations
├── React Router - Navigation
├── Lucide Icons - Interface
└── Custom Hooks - État global
```

### **Backend**
```
Supabase (PostgreSQL)
├── Auth - Authentification
├── Database - Persistence
├── Edge Functions - API
├── Storage - Assets (ready)
└── Real-time - WebSockets (ready)
```

### **API Commerciale**
```
Edge Function: /generate-playbook-api
├── Authentification par clé API
├── Rate limiting intelligent
├── Logging détaillé
├── Analytics temps réel
└── Zero data retention
```

---

## 📁 Structure du Projet

```
CortexOps/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── AuthPage.tsx                    # Page authentification
│   │   │   ├── ProfessionalSignUpForm.tsx      # Inscription pro
│   │   │   ├── SignInForm.tsx                  # Connexion
│   │   │   └── SignUpForm.tsx                  # Inscription simple
│   │   ├── AdminDashboard.tsx                  # ⭐ Dashboard admin complet
│   │   ├── APIKeyManager.tsx                   # ⭐ Gestion clés API
│   │   ├── UserProfile.tsx                     # ⭐ Profil utilisateur
│   │   ├── GeneratorSection.tsx                # Générateur Ansible
│   │   ├── EnhancedHeader.tsx                  # Header avec menu
│   │   ├── ModernLanding.tsx                   # Landing page
│   │   ├── ProfessionalAnalytics.tsx           # Analytics admin
│   │   ├── OnboardingTour.tsx                  # Tour guidé
│   │   └── ui/                                 # Composants UI
│   ├── contexts/
│   │   └── AuthContext.tsx                     # Context authentification
│   ├── lib/
│   │   ├── supabase.ts                         # Client Supabase
│   │   ├── playbookGenerator.ts                # Générateur principal
│   │   ├── intelligentGenerator.ts             # IA & NLP
│   │   ├── professionalGenerators.ts           # Générateurs avancés
│   │   ├── nlpAnalyzer.ts                      # Analyse prompts
│   │   ├── complexityDetector.ts               # Détection complexité
│   │   ├── validation.ts                       # Validations
│   │   └── errorHandler.ts                     # Gestion erreurs
│   └── App.tsx                                 # ⭐ Routes principales
├── supabase/
│   ├── functions/
│   │   ├── generate-playbook-api/              # ⭐ API commerciale
│   │   ├── welcome-email/                      # Email bienvenue
│   │   ├── contact-notification/               # Notifications contact
│   │   ├── create-mollie-payment/              # Paiements Mollie
│   │   └── mollie-webhook/                     # Webhook Mollie
│   └── migrations/
│       ├── 20251112144456_create_monetization_tables.sql
│       ├── 20251112161024_create_api_client_management_system.sql  # ⭐ API système
│       ├── 20251113122115_create_user_profiles_system_fixed.sql    # ⭐ Profils users
│       └── ...                                 # +30 migrations
├── public/
│   └── _redirects                              # Netlify redirects
├── .env                                        # Variables environnement
├── vite.config.ts                              # Config Vite
├── tailwind.config.js                          # Config Tailwind
└── package.json                                # Dépendances
```

---

## 🛣️ Routes de l'Application

### **Routes Publiques**
```typescript
/           → Landing page (redirect si authentifié)
/auth       → Page authentification (sign-in/sign-up)
```

### **Routes Protégées** (authentification requise)
```typescript
/app        → Générateur Ansible principal
/profile    → ⭐ Profil utilisateur complet
/api-keys   → ⭐ Gestion clés API
/admin      → ⭐ Dashboard administration
```

---

## 🔑 Système de Clés API

### **Format des Clés**
```
ctx_live_[64 caractères hexadécimaux]

Exemple:
ctx_live_a1b2c3d4e5f6...xyz890
```

### **Utilisation**
```bash
# Génération de playbook via API
curl -X POST https://api.cortexops.com/v1/generate \
  -H "X-API-Key: ctx_live_xxx...xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Deploy PostgreSQL cluster with replication",
    "environment": "production",
    "advanced_options": {
      "become": true,
      "gather_facts": true
    }
  }'
```

### **Rate Limits par Plan**
```
Free Plan:
- 10 req/min
- 100 req/hour
- 1,000 req/day
- 10,000 req/month

Pro Plan:
- 60 req/min
- 1,000 req/hour
- 10,000 req/day
- 100,000 req/month

Enterprise Plan:
- 300 req/min
- 10,000 req/hour
- 100,000 req/day
- 1,000,000 req/month
```

### **Réponse API**
```json
{
  "success": true,
  "data": {
    "playbook": "---\n# Generated playbook...",
    "environment": "production",
    "generated_at": "2025-11-13T10:30:00Z"
  },
  "rate_limits": {
    "minute": {
      "limit": 60,
      "remaining": 55,
      "reset_at": "2025-11-13T10:31:00Z"
    }
  },
  "meta": {
    "key_name": "Production API Key",
    "plan": "pro",
    "response_time_ms": 120,
    "privacy_policy": "Zero-Data-Retention"
  }
}
```

---

## 📊 Base de Données

### **Tables Principales**

#### **user_profiles**
```sql
- id (uuid, FK auth.users)
- email, full_name, company, job_title
- phone, avatar_url
- user_role (admin/user/client)
- user_plan (free/pro/enterprise)
- user_status (active/inactive/suspended)
- api_calls_today
- created_at, updated_at, last_login
```

#### **api_keys** ⭐
```sql
- id (uuid)
- user_id (FK auth.users)
- name, key_hash, key_preview
- permissions (jsonb)
- active (boolean)
- last_used_at, expires_at
- created_at, updated_at
```

#### **api_key_usage** ⭐
```sql
- id (uuid)
- api_key_id, user_id
- endpoint, method, status_code
- response_time_ms, ip_address, user_agent
- error_message
- request_size_bytes, response_size_bytes
- created_at
```

#### **api_rate_limits** ⭐
```sql
- id (uuid)
- user_id, api_key_id
- period (minute/hour/day/month)
- limit_value, current_count
- window_start
- created_at, updated_at
```

#### **api_clients**
```sql
- id (uuid)
- user_id (FK)
- name, description
- status (active/inactive)
- plan (free/pro/enterprise)
- created_at, updated_at
```

### **Fonctions SQL Principales**

```sql
-- ⭐ Vérification clé API
verify_api_key(p_key_hash text)

-- ⭐ Check rate limit
check_rate_limit(p_api_key_id uuid, p_user_id uuid, p_period text)

-- ⭐ Incrémenter compteur
increment_rate_limit(p_api_key_id uuid, p_period text)

-- ⭐ Logger usage
log_api_key_usage(...)

-- ⭐ Stats par clé
get_api_key_stats(p_api_key_id uuid)

-- Admin stats
get_admin_stats()

-- API usage stats
get_api_usage_stats()
```

---

## 🚀 Déploiement

### **Variables d'Environnement**

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...xxx

# Email (Resend)
RESEND_API_KEY=re_xxx...xxx
FROM_EMAIL=noreply@cortexops.com

# Paiements (Mollie) - Optionnel
MOLLIE_API_KEY=test_xxx...xxx
```

### **Build & Deploy**

```bash
# Installation
npm install

# Développement
npm run dev

# Build production
npm run build

# Preview
npm run preview

# Deploy Netlify
netlify deploy --prod
```

### **Supabase Setup**

```bash
# Login
supabase login

# Link project
supabase link --project-ref xxx

# Apply migrations
supabase db push

# Deploy functions
# (Utiliser les outils MCP Supabase)
```

---

## 📈 Analytics & Monitoring

### **Métriques Suivies**
- Nombre total d'utilisateurs
- Utilisateurs actifs
- Appels API par jour/mois
- Revenus MTD (Month-To-Date)
- Distribution par plan
- Taux de succès API
- Temps de réponse moyen
- Endpoints populaires

### **Logs & Audit**
- Toutes requêtes API loggées
- IP, User-Agent capturés
- Erreurs trackées
- Performance monitorée
- Actions admin auditées

---

## 🎨 Design System

### **Couleurs**
```css
Primary:   Cyan-400 to Blue-500
Secondary: Slate-800 to Slate-900
Accent:    Green-400 (success)
Warning:   Yellow-500
Error:     Red-500
```

### **Typographie**
```
Heading:   Inter Bold
Body:      Inter Regular
Code:      JetBrains Mono
```

### **Composants UI**
- Button (variants: primary, secondary, outline, ghost)
- Input (avec validation inline)
- Card (avec hover effects)
- Badge (status indicators)
- Modal (avec backdrop)
- Toast (notifications)

---

## 🔒 Sécurité

### **Best Practices Implémentées**
✅ Row Level Security (RLS) sur toutes les tables
✅ API Keys hashées (jamais en clair)
✅ Rate limiting multi-niveaux
✅ CORS configuré correctement
✅ Headers de sécurité
✅ Input validation côté client et serveur
✅ SQL injection protection (Supabase)
✅ XSS prevention (React)
✅ CSRF protection

### **Audit Trail**
- Toutes actions utilisateur loggées
- Modifications admin trackées
- Accès API monitorés
- Erreurs capturées

---

## 📚 Documentation

### **Guides Disponibles**
- `PROFESSIONAL_SIGNUP.md` - Système d'inscription
- `README_PROFESSIONAL_SYSTEM.md` - Vue d'ensemble
- `MONETIZATION_GUIDE.md` - Monétisation
- `API_DOCUMENTATION.md` - Documentation API
- `DEPLOYMENT_CHECKLIST.md` - Checklist déploiement
- `SECURITY_FIXES.md` - Correctifs sécurité

---

## 🎯 Roadmap

### **Complété** ✅
- [x] Système d'authentification
- [x] Génération Ansible intelligente
- [x] API Keys commerciale
- [x] Rate limiting
- [x] Dashboard admin
- [x] Profils utilisateurs
- [x] Analytics avancés
- [x] Email automation
- [x] Multi-environnements
- [x] CI/CD integration

### **En Cours** 🚧
- [ ] Paiements Mollie/Stripe
- [ ] Webhooks GitHub/GitLab
- [ ] Export Git automatique
- [ ] Templates personnalisés
- [ ] API v2 avec GraphQL

### **Futur** 🔮
- [ ] Mobile app (React Native)
- [ ] VS Code extension
- [ ] CLI tool
- [ ] Terraform support
- [ ] Puppet/Chef generators
- [ ] Collaboration temps réel
- [ ] AI training personnalisé

---

## 🤝 Contribution

### **Setup Dev**
```bash
git clone https://github.com/your-org/cortexops.git
cd cortexops
npm install
cp .env.example .env
# Configurer les variables
npm run dev
```

### **Standards**
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- Tests unitaires (à venir)
- Documentation inline

---

## 📞 Support

- **Email**: support@cortexops.com
- **Documentation**: https://docs.cortexops.com
- **Status**: https://status.cortexops.com
- **GitHub**: https://github.com/cortexops

---

## 📄 Licence

Propriétaire - Tous droits réservés © 2025 CortexOps

---

## 🙏 Remerciements

Construit avec:
- React + TypeScript
- Supabase
- TailwindCSS
- Framer Motion
- Vite
- Et beaucoup de ☕

---

**Version**: 2.0.0
**Dernière mise à jour**: 13 Novembre 2025
**Status**: Production Ready ✅
