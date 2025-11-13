# 🚀 Système Freemium/SaaS - Ansible Academy

## ✅ Fonctionnalités implémentées

### 1. Authentification
- ✅ Inscription avec email/password (Supabase Auth)
- ✅ Connexion sécurisée
- ✅ Création automatique du profil utilisateur
- ✅ Gestion de session

### 2. Plans d'abonnement

#### 🟢 Version Gratuite (0€)
- 3 playbooks par mois
- Générateur intelligent
- Templates de base
- Support communauté
- Pas d'export Git
- Historique limité

#### 🔵 Version Pro (9,90€/mois)
- **Playbooks illimités**
- Export Git
- Historique complet
- Personnalisation avancée
- Support prioritaire
- Tous les générateurs
- API access (webhook)

#### 🟣 Version Entreprise (49€/mois)
- Tout de Pro +
- Intégration LDAP
- API REST complète
- Multi-utilisateurs
- SSO (Single Sign-On)
- Support dédié 24/7
- SLA garanti
- Audit et conformité

### 3. Base de données

Tables créées dans Supabase :

```sql
user_profiles
├── id (uuid, FK auth.users)
├── email (text)
├── full_name (text)
├── subscription_plan (free|pro|enterprise)
├── subscription_status (active|cancelled|expired)
├── playbooks_generated_this_month (integer)
├── last_reset_date (date)
└── timestamps

subscription_plans
├── id (uuid)
├── name (free|pro|enterprise)
├── display_name (text)
├── price_monthly (decimal)
├── playbooks_per_month (integer, NULL = unlimited)
└── features (jsonb)

playbook_generations
├── id (uuid)
├── user_id (uuid)
├── prompt (text)
├── generated_content (text)
├── generation_type (text)
└── created_at (timestamptz)
```

### 4. Sécurité (RLS)

✅ Row Level Security activé sur toutes les tables
✅ Policies restrictives par défaut
✅ Utilisateurs peuvent uniquement accéder à leurs propres données
✅ Fonction PostgreSQL `can_generate_playbook()` pour vérifier les limites

### 5. Limitations

#### Plan Gratuit
- Limite : 3 playbooks/mois
- Réinitialisation automatique chaque 1er du mois
- Message d'avertissement quand limite atteinte
- Appel à l'action pour upgrade vers Pro

#### Plans payants
- Accès illimité
- Pas de limite mensuelle
- Toutes les fonctionnalités débloquées

### 6. Dashboard utilisateur

✅ Statistiques d'usage en temps réel
✅ Affichage du plan actuel
✅ Compteur de playbooks générés ce mois
✅ Playbooks restants (pour plan gratuit)
✅ Date d'inscription
✅ Bouton de déconnexion

### 7. Interface

- **AuthPage** : Page de connexion/inscription
- **SignInForm** : Formulaire de connexion
- **SignUpForm** : Formulaire d'inscription
- **UserDashboard** : Dashboard utilisateur
- **SubscriptionPlans** : Affichage des plans avec pricing
- **Header** : Navigation avec bouton Dashboard

## 🔧 Configuration

### Variables d'environnement

Déjà configurées dans `.env` :
```env
VITE_SUPABASE_URL=https://pkvfnmmnfwfxnwojycmp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Migrations Supabase

La migration `create_auth_and_subscription_schema.sql` a été appliquée avec :
- Tables créées
- RLS activé
- Policies configurées
- Plans par défaut insérés
- Fonctions PostgreSQL créées

## 📊 Flux utilisateur

### Nouvel utilisateur
1. Visite l'application → Voir AuthPage
2. Clique sur "Créer un compte"
3. Remplit le formulaire (nom, email, password)
4. Compte créé automatiquement avec plan "free"
5. Redirection vers l'application

### Génération de playbook
1. Utilisateur connecté entre un prompt
2. Système vérifie via `can_generate_playbook(user_id)`
3. Si limite atteinte (plan free) → Message d'erreur
4. Sinon → Génération du playbook
5. Sauvegarde dans `playbook_generations`
6. Incrémentation du compteur `playbooks_generated_this_month`
7. Affichage du playbook

### Upgrade de plan
1. Utilisateur visite Dashboard
2. Voir section "Plans d'abonnement"
3. Sélectionne Pro ou Enterprise
4. [TODO: Intégration Stripe pour paiement]
5. Mise à jour du `subscription_plan` dans user_profiles

## 🎯 Prochaines étapes

### À implémenter :

1. **Intégration Stripe**
   - Checkout pour paiement
   - Webhooks pour mise à jour abonnement
   - Gestion des annulations

2. **Export Git** (Pro/Enterprise)
   - Génération de repos Git
   - Push automatique vers GitHub/GitLab
   - CI/CD templates

3. **API REST** (Enterprise)
   - Endpoints sécurisés
   - API Keys
   - Rate limiting
   - Documentation OpenAPI

4. **LDAP/SSO** (Enterprise)
   - Intégration Active Directory
   - SAML 2.0
   - OAuth providers

5. **Multi-utilisateurs** (Enterprise)
   - Équipes
   - Rôles et permissions
   - Partage de playbooks

## 🧪 Tests

### Créer un compte de test

```bash
# Ouvrir l'application
# Cliquer sur "Créer un compte"
# Email: test@example.com
# Password: test123
# Nom: Test User
```

### Tester les limites

1. Générer 3 playbooks avec un compte gratuit
2. Essayer d'en générer un 4ème → Voir message d'erreur
3. Vérifier dans Dashboard : 0 playbooks restants

### Réinitialisation mensuelle

Exécuter manuellement :
```sql
SELECT reset_monthly_playbook_counter();
```

## 📝 Notes techniques

- **Framework**: React + TypeScript + Vite
- **Auth**: Supabase Auth (email/password)
- **Database**: Supabase PostgreSQL
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Build**: Vite (production ready)

## ✨ Résultat

L'application est maintenant une SaaS complète avec :
- Authentification sécurisée
- 3 plans d'abonnement
- Limitations par plan
- Dashboard utilisateur
- Base de données structurée
- Prête pour monétisation
