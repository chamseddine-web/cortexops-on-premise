# 🛡️ Guide de Configuration Admin - CortexOps

Guide complet pour créer un utilisateur administrateur et tester le dashboard.

---

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Création de l'utilisateur admin](#création-de-lutilisateur-admin)
3. [Configuration des données de test](#configuration-des-données-de-test)
4. [Accès au dashboard](#accès-au-dashboard)
5. [Exploration des fonctionnalités](#exploration-des-fonctionnalités)
6. [Dépannage](#dépannage)

---

## 🎯 Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ Un projet Supabase créé
- ✅ Les migrations de base de données appliquées
- ✅ L'application CortexOps déployée ou lancée localement
- ✅ Accès au dashboard Supabase

---

## 👤 Création de l'utilisateur admin

### Méthode 1 : Via le Dashboard Supabase (Recommandée)

#### Étape 1 : Créer l'utilisateur dans Supabase Auth

1. Connectez-vous à votre [dashboard Supabase](https://app.supabase.com/)
2. Sélectionnez votre projet CortexOps
3. Allez dans **Authentication** → **Users**
4. Cliquez sur **Add user** → **Create new user**
5. Remplissez les informations :
   ```
   Email: admin@cortexops.com
   Password: [choisissez un mot de passe sécurisé, min. 6 caractères]
   Auto Confirm User: ✅ (cochez cette case)
   ```
6. Cliquez sur **Create user**
7. **IMPORTANT** : Copiez l'UUID de l'utilisateur créé (format : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

#### Étape 2 : Créer le profil admin dans la base de données

1. Dans Supabase, allez dans **SQL Editor**
2. Cliquez sur **New query**
3. Collez et exécutez cette requête (en remplaçant `YOUR_USER_UUID_HERE`) :

```sql
-- Remplacez YOUR_USER_UUID_HERE par l'UUID copié à l'étape 1
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  company,
  user_role,
  user_plan,
  user_status,
  created_at,
  last_login
) VALUES (
  'YOUR_USER_UUID_HERE'::uuid,  -- ⚠️ REMPLACER ICI
  'admin@cortexops.com',
  'Administrateur CortexOps',
  'CortexOps',
  'admin',                        -- 🔑 Rôle admin
  'enterprise',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  user_role = 'admin',
  user_plan = 'enterprise',
  user_status = 'active';
```

4. Cliquez sur **Run** (ou appuyez sur `Ctrl+Enter`)
5. Vérifiez que le message de succès apparaît

#### Étape 3 : Vérifier la création

Exécutez cette requête pour vérifier :

```sql
SELECT
  id,
  email,
  full_name,
  user_role,
  user_plan,
  user_status
FROM user_profiles
WHERE email = 'admin@cortexops.com';
```

Vous devriez voir :
```
✅ user_role: admin
✅ user_plan: enterprise
✅ user_status: active
```

### Méthode 2 : Via le script createAdmin.ts

Si vous préférez utiliser le script :

```bash
# 1. Configurez les variables d'environnement
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export ADMIN_EMAIL="admin@cortexops.com"
export ADMIN_PASSWORD="your-secure-password"

# 2. Exécutez le script
npm run create-admin
```

---

## 📊 Configuration des données de test

Pour voir le dashboard en action avec des données réalistes :

### Option A : Migration automatique (Recommandée)

1. Ouvrez le fichier `supabase/migrations/20251113210000_create_admin_user_and_test_data.sql`
2. Remplacez `PASTE_ADMIN_USER_ID_HERE` par l'UUID de votre admin (ligne 28)
3. Appliquez la migration :

```bash
# Via Supabase CLI
supabase db push

# Ou via le SQL Editor de Supabase
# Copiez-collez tout le contenu du fichier et exécutez
```

### Option B : Insertion manuelle via SQL Editor

Exécutez ces requêtes dans le SQL Editor de Supabase :

```sql
-- 1. Créer des utilisateurs de test
INSERT INTO user_profiles (
  id, email, full_name, company, user_role, user_plan, user_status, created_at
)
VALUES
  (gen_random_uuid(), 'john.doe@acme.com', 'John Doe', 'Acme Corp', 'user', 'free', 'active', NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), 'sarah.wilson@startup.io', 'Sarah Wilson', 'Startup.io', 'user', 'free', 'active', NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), 'lisa.martin@techcorp.fr', 'Lisa Martin', 'TechCorp', 'user', 'pro', 'active', NOW() - INTERVAL '60 days'),
  (gen_random_uuid(), 'david.lee@devops.cloud', 'David Lee', 'DevOps Cloud', 'user', 'pro', 'active', NOW() - INTERVAL '120 days'),
  (gen_random_uuid(), 'emma.taylor@enterprise.com', 'Emma Taylor', 'Enterprise Solutions', 'user', 'enterprise', 'active', NOW() - INTERVAL '180 days');

-- 2. Créer des abonnements (pour les revenus)
INSERT INTO subscriptions (user_id, plan, status, amount, currency, interval, created_at)
SELECT id, user_plan, 'active',
  CASE user_plan
    WHEN 'pro' THEN 49.00
    WHEN 'enterprise' THEN 299.00
    ELSE 0
  END,
  'EUR', 'month', NOW() - INTERVAL '3 months'
FROM user_profiles
WHERE user_plan IN ('pro', 'enterprise')
AND email != 'admin@cortexops.com';

-- 3. Vérifier les données créées
SELECT
  COUNT(*) FILTER (WHERE user_plan = 'free') as free_users,
  COUNT(*) FILTER (WHERE user_plan = 'pro') as pro_users,
  COUNT(*) FILTER (WHERE user_plan = 'enterprise') as enterprise_users,
  COUNT(*) as total_users
FROM user_profiles;
```

### Données de test créées

La migration crée automatiquement :

| Type | Quantité | Description |
|------|----------|-------------|
| **Utilisateurs** | 7 | 1 admin + 3 free + 2 pro + 1 enterprise |
| **API Clients** | 6 | 1 client par utilisateur (sauf admin) |
| **API Calls** | ~2,000+ | Logs d'appels API sur 7 jours |
| **Abonnements** | 3 | Pro (49€) et Enterprise (299€) |
| **Activités** | 20 | Logs d'activité récente |
| **Revenus** | 12 mois | Historique de croissance |

---

## 🚀 Accès au dashboard

### 1. Lancer l'application

```bash
# En local
npm run dev

# En production
npm run build
npm run preview
```

### 2. Se connecter

1. Ouvrez votre navigateur : `http://localhost:5173` (ou votre URL de production)
2. Allez sur `/auth` ou cliquez sur "Se connecter"
3. Entrez les identifiants admin :
   ```
   Email: admin@cortexops.com
   Password: [votre mot de passe]
   ```
4. Cliquez sur "Se connecter"

### 3. Accéder au dashboard admin

Une fois connecté, vous avez deux options :

**Option A : Via l'URL directe**
```
http://localhost:5173/admin
```

**Option B : Via le menu (si implémenté)**
- Cliquez sur votre profil en haut à droite
- Cliquez sur "Administration" ou "Dashboard Admin"

### 4. Vérification de l'accès

Si vous n'êtes pas admin, vous verrez :
```
❌ Erreur d'accès
Accès refusé : Vous devez être administrateur
[Redirection automatique après 3 secondes]
```

Si vous êtes admin, vous verrez :
```
✅ Dashboard Admin CortexOps
Avec toutes les statistiques et onglets
```

---

## 🎨 Exploration des fonctionnalités

### Onglet 1 : Vue d'ensemble

**Ce que vous devriez voir :**

- **4 cartes de statistiques** :
  - Total utilisateurs (7) avec +12% de croissance
  - Appels API 24h (~2,000+) avec +8%
  - Revenu MTD (~350€) avec +15%
  - Uptime SLA (99.98%)

- **Distribution par plan** :
  - FREE: 3 utilisateurs
  - PRO: 2 utilisateurs
  - ENTERPRISE: 1 utilisateur

- **Activités récentes** :
  - Liste des 10 dernières actions
  - Email, action, temps écoulé

- **État du système** :
  - API Service : Opérationnel (99.98%)
  - Database : Opérationnel (100%)
  - Edge Functions : Opérationnel (99.95%)
  - Authentication : Opérationnel (99.99%)

- **Graphique revenus** :
  - Évolution sur 12 mois
  - Taux de croissance par mois

### Onglet 2 : Utilisateurs

**Fonctionnalités :**

- 📊 **Tableau complet** :
  - Nom, email, entreprise
  - Plan (badge coloré)
  - Statut (active/inactive)
  - Date d'inscription

- 🔍 **Barre de recherche** :
  - Tapez un nom ou email
  - Résultats en temps réel

- 🎯 **Filtres** :
  - Tous les plans
  - Free uniquement
  - Pro uniquement
  - Enterprise uniquement

- 🔄 **Bouton actualiser** :
  - Recharge les données depuis Supabase

**Testez :**
1. Recherchez "john" → devrait trouver John Doe
2. Filtrez par "pro" → devrait afficher 2 utilisateurs
3. Cliquez sur actualiser → données rafraîchies

### Onglet 3 : API Usage

**Ce que vous devriez voir :**

- Tableau avec :
  - Nom du client
  - Total d'appels (50-500+ selon le plan)
  - Success rate (95-100%)
  - Temps de réponse moyen (50-500ms)
  - Plan du client

- Codes couleur :
  - 🟢 Vert : >99% success
  - 🟡 Jaune : 95-99% success
  - 🔴 Rouge : <95% success

### Onglet 4 : Facturation

**Métriques affichées :**

- **Cartes de résumé** :
  - Revenu total (12 mois)
  - Croissance moyenne (%)
  - MRR actuel

- **Historique détaillé** :
  - Revenu par mois (YYYY-MM)
  - Montant en euros
  - Taux de croissance vs mois précédent
  - Indicateur tendance (↗️ ou ↘️)

### Onglet 5 : Système

**Surveillance en temps réel :**

- **État des services** :
  - 4 services principaux
  - Uptime percentage
  - Latence moyenne
  - Dernière vérification

- **Ressources système** :
  - CPU : Barre de progression (45%)
  - Mémoire : 62%
  - Disque : 38%
  - Bande passante : 2.4/10 GB/s

---

## 🔧 Dépannage

### Problème 1 : "Accès refusé"

**Cause :** L'utilisateur n'a pas le rôle admin

**Solution :**
```sql
UPDATE user_profiles
SET user_role = 'admin'
WHERE email = 'admin@cortexops.com';
```

### Problème 2 : Pas de données dans le dashboard

**Cause :** Les données de test n'ont pas été créées

**Solution :** Exécutez la migration `20251113210000_create_admin_user_and_test_data.sql`

### Problème 3 : Erreur "RPC function not found"

**Cause :** Les fonctions SQL n'ont pas été créées

**Solution :**
```bash
# Vérifier que toutes les migrations sont appliquées
supabase migration list

# Appliquer les migrations manquantes
supabase db push
```

Vérifiez que ces fonctions existent :
```sql
SELECT proname FROM pg_proc WHERE proname LIKE 'get_admin%';
```

Devrait retourner :
- `get_admin_stats`
- `get_api_usage_stats`
- `get_recent_activities`
- `get_system_health`
- `get_revenue_metrics`

### Problème 4 : Données vides dans les graphiques

**Solution :** Créez des données sur plusieurs mois :

```sql
-- Créer des abonnements historiques
DO $$
DECLARE
  user_rec RECORD;
  month_offset int;
BEGIN
  FOR user_rec IN
    SELECT id, user_plan FROM user_profiles
    WHERE user_plan IN ('pro', 'enterprise')
  LOOP
    FOR month_offset IN 1..11 LOOP
      INSERT INTO subscriptions (user_id, plan, status, amount, currency, interval, created_at)
      VALUES (
        user_rec.id,
        user_rec.user_plan,
        'active',
        CASE user_rec.user_plan WHEN 'pro' THEN 49.00 ELSE 299.00 END,
        'EUR',
        'month',
        NOW() - (month_offset || ' months')::interval
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
```

### Problème 5 : Erreur de permission Supabase

**Cause :** Les politiques RLS bloquent l'accès

**Solution :**
```sql
-- Vérifier que l'utilisateur a bien le rôle admin
SELECT id, email, user_role FROM user_profiles WHERE email = 'admin@cortexops.com';

-- Si user_role != 'admin', corriger :
UPDATE user_profiles SET user_role = 'admin' WHERE email = 'admin@cortexops.com';
```

---

## 📊 Vérification des fonctions SQL

Testez chaque fonction manuellement :

### Test get_admin_stats
```sql
SELECT * FROM get_admin_stats();
```

Devrait retourner :
```
total_users | active_users | total_api_calls | revenue_mtd | free_users | pro_users | enterprise_users
---------------------------------------------------------------------------
    7       |      6        |     2000+       |   ~350      |     3      |     2     |        1
```

### Test get_api_usage_stats
```sql
SELECT * FROM get_api_usage_stats();
```

Devrait retourner plusieurs lignes avec des clients API.

### Test get_system_health
```sql
SELECT * FROM get_system_health();
```

Devrait retourner 4 services (API, Database, Edge Functions, Auth).

---

## 🎯 Checklist de validation

Utilisez cette checklist pour vérifier que tout fonctionne :

- [ ] ✅ Utilisateur admin créé dans Supabase Auth
- [ ] ✅ Profil admin créé avec `user_role = 'admin'`
- [ ] ✅ Données de test insérées (utilisateurs, API calls, abonnements)
- [ ] ✅ Connexion réussie avec admin@cortexops.com
- [ ] ✅ Accès au dashboard `/admin` autorisé
- [ ] ✅ Statistiques affichées dans Vue d'ensemble
- [ ] ✅ Liste des utilisateurs visible
- [ ] ✅ Recherche d'utilisateurs fonctionne
- [ ] ✅ Filtres par plan fonctionnent
- [ ] ✅ Usage API affiché avec success rates
- [ ] ✅ Graphique de revenus visible
- [ ] ✅ État des services opérationnel
- [ ] ✅ Ressources système affichées
- [ ] ✅ Bouton actualiser fonctionne

---

## 🚀 Prochaines étapes

Une fois l'admin configuré :

1. **Production** :
   - Changez le mot de passe admin
   - Utilisez une adresse email réelle
   - Configurez l'authentification 2FA (si disponible)

2. **Personnalisation** :
   - Ajustez les seuils d'alertes système
   - Configurez les notifications par email
   - Créez des dashboards personnalisés

3. **Monitoring** :
   - Configurez Prometheus/Grafana
   - Mettez en place des alertes
   - Surveillez les métriques en temps réel

4. **Sécurité** :
   - Limitez l'accès admin par IP
   - Activez les logs d'audit
   - Configurez les politiques de mots de passe

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Consultez les logs : `npm run dev` (vérifiez la console)
2. Vérifiez Supabase : Dashboard → Logs
3. Testez les fonctions SQL manuellement
4. Vérifiez les permissions RLS

---

## 📝 Notes importantes

- 🔒 **Sécurité** : Ne partagez jamais vos identifiants admin
- 🔄 **Actualisation** : Le dashboard se rafraîchit automatiquement toutes les 5 minutes
- 💾 **Données** : Les données de test peuvent être supprimées à tout moment
- 🧪 **Environnement** : Utilisez des données de test en développement uniquement

---

**Bon test du dashboard admin ! 🎉**
