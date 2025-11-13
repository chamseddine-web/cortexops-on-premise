/*
  # Création utilisateur admin et données de test

  1. Création utilisateur admin
    - Email: admin@cortexops.com
    - Rôle: admin
    - Plan: enterprise

  2. Données de test
    - Utilisateurs de test (free, pro, enterprise)
    - API clients et usage
    - Activités récentes
    - Abonnements et revenus

  3. Sécurité
    - RLS appliqué
    - Données de démonstration uniquement
*/

-- ============================================
-- IMPORTANT: Instructions
-- ============================================
-- 1. Créez d'abord l'utilisateur dans Supabase Auth:
--    Dashboard → Authentication → Users → Add user
--    Email: admin@cortexops.com
--    Password: [votre mot de passe sécurisé]
--
-- 2. Copiez l'UUID de l'utilisateur créé
--
-- 3. Remplacez 'PASTE_ADMIN_USER_ID_HERE' ci-dessous par cet UUID
--
-- 4. Exécutez cette migration

-- ============================================
-- 1. Créer le profil admin
-- ============================================
DO $$
DECLARE
  admin_id uuid := 'PASTE_ADMIN_USER_ID_HERE'::uuid; -- REMPLACER PAR L'UUID RÉEL
BEGIN
  -- Vérifier si le profil existe déjà
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = admin_id) THEN
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
      admin_id,
      'admin@cortexops.com',
      'Administrateur CortexOps',
      'CortexOps',
      'admin',
      'enterprise',
      'active',
      NOW() - INTERVAL '30 days',
      NOW()
    );
    RAISE NOTICE 'Profil admin créé avec succès';
  ELSE
    -- Mettre à jour le profil existant pour s'assurer qu'il est admin
    UPDATE user_profiles
    SET
      user_role = 'admin',
      user_plan = 'enterprise',
      user_status = 'active',
      full_name = 'Administrateur CortexOps',
      company = 'CortexOps'
    WHERE id = admin_id;
    RAISE NOTICE 'Profil admin mis à jour';
  END IF;
END $$;

-- ============================================
-- 2. Créer des utilisateurs de test
-- ============================================
-- Note: Ces utilisateurs n'auront pas de compte Auth,
-- mais permettent de voir des données dans le dashboard

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
)
VALUES
  -- Utilisateurs FREE
  (
    gen_random_uuid(),
    'john.doe@acme.com',
    'John Doe',
    'Acme Corp',
    'user',
    'free',
    'active',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '2 hours'
  ),
  (
    gen_random_uuid(),
    'sarah.wilson@startup.io',
    'Sarah Wilson',
    'Startup.io',
    'user',
    'free',
    'active',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '1 day'
  ),
  (
    gen_random_uuid(),
    'mike.brown@company.com',
    'Mike Brown',
    'Company Ltd',
    'user',
    'free',
    'inactive',
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '30 days'
  ),

  -- Utilisateurs PRO
  (
    gen_random_uuid(),
    'lisa.martin@techcorp.fr',
    'Lisa Martin',
    'TechCorp',
    'user',
    'pro',
    'active',
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '30 minutes'
  ),
  (
    gen_random_uuid(),
    'david.lee@devops.cloud',
    'David Lee',
    'DevOps Cloud',
    'user',
    'pro',
    'active',
    NOW() - INTERVAL '120 days',
    NOW() - INTERVAL '3 hours'
  ),

  -- Utilisateurs ENTERPRISE
  (
    gen_random_uuid(),
    'emma.taylor@enterprise.com',
    'Emma Taylor',
    'Enterprise Solutions',
    'user',
    'enterprise',
    'active',
    NOW() - INTERVAL '180 days',
    NOW() - INTERVAL '1 hour'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. Créer des API clients de test
-- ============================================
DO $$
DECLARE
  user_id uuid;
  api_key_value text;
BEGIN
  -- Pour chaque utilisateur de test, créer un client API
  FOR user_id IN
    SELECT id FROM user_profiles
    WHERE email LIKE '%@%'
    AND email != 'admin@cortexops.com'
    LIMIT 6
  LOOP
    -- Générer une clé API unique
    api_key_value := 'test_' || encode(gen_random_bytes(32), 'hex');

    INSERT INTO api_clients (
      user_id,
      name,
      api_key,
      status,
      created_at
    ) VALUES (
      user_id,
      'Client API Production',
      api_key_value,
      'active',
      NOW() - INTERVAL '10 days'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- 4. Créer des logs d'utilisation API
-- ============================================
DO $$
DECLARE
  client_rec RECORD;
  day_offset int;
  request_count int;
  i int;
BEGIN
  FOR client_rec IN
    SELECT ac.api_key, up.user_plan
    FROM api_clients ac
    JOIN user_profiles up ON ac.user_id = up.id
    WHERE ac.api_key LIKE 'test_%'
  LOOP
    -- Créer des logs pour les 7 derniers jours
    FOR day_offset IN 0..6 LOOP
      -- Nombre de requêtes selon le plan
      request_count := CASE
        WHEN client_rec.user_plan = 'free' THEN 50 + floor(random() * 50)::int
        WHEN client_rec.user_plan = 'pro' THEN 200 + floor(random() * 100)::int
        ELSE 500 + floor(random() * 200)::int
      END;

      -- Insérer des logs de requêtes
      FOR i IN 1..LEAST(request_count, 100) LOOP
        INSERT INTO api_rate_limits (
          api_key,
          endpoint,
          status_code,
          response_time,
          created_at
        ) VALUES (
          client_rec.api_key,
          '/api/playbooks/generate',
          CASE WHEN random() > 0.05 THEN 200 ELSE 429 END,
          50 + floor(random() * 500),
          NOW() - (day_offset || ' days')::interval - (i || ' minutes')::interval
        );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 5. Créer des statistiques d'usage API
-- ============================================
INSERT INTO api_usage_stats (
  user_id,
  total_requests,
  successful_requests,
  failed_requests,
  created_at
)
SELECT
  up.id as user_id,
  CASE up.user_plan
    WHEN 'free' THEN 300 + floor(random() * 200)::int
    WHEN 'pro' THEN 1500 + floor(random() * 500)::int
    ELSE 3500 + floor(random() * 1000)::int
  END as total_requests,
  CASE up.user_plan
    WHEN 'free' THEN 285 + floor(random() * 15)::int
    WHEN 'pro' THEN 1485 + floor(random() * 15)::int
    ELSE 3485 + floor(random() * 15)::int
  END as successful_requests,
  CASE up.user_plan
    WHEN 'free' THEN floor(random() * 15)::int
    WHEN 'pro' THEN floor(random() * 15)::int
    ELSE floor(random() * 15)::int
  END as failed_requests,
  CURRENT_DATE
FROM user_profiles up
WHERE up.email != 'admin@cortexops.com'
ON CONFLICT (user_id, created_at) DO NOTHING;

-- ============================================
-- 6. Créer des abonnements (pour revenus)
-- ============================================
INSERT INTO subscriptions (
  user_id,
  plan,
  status,
  amount,
  currency,
  interval,
  created_at,
  current_period_start,
  current_period_end
)
SELECT
  up.id,
  up.user_plan,
  'active',
  CASE up.user_plan
    WHEN 'pro' THEN 49.00
    WHEN 'enterprise' THEN 299.00
    ELSE 0
  END,
  'EUR',
  'month',
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '15 days',
  NOW() + INTERVAL '15 days'
FROM user_profiles up
WHERE up.user_plan IN ('pro', 'enterprise')
AND up.email != 'admin@cortexops.com'
ON CONFLICT DO NOTHING;

-- Créer des abonnements historiques pour voir la croissance
DO $$
DECLARE
  user_rec RECORD;
  month_offset int;
BEGIN
  FOR user_rec IN
    SELECT id, user_plan
    FROM user_profiles
    WHERE user_plan IN ('pro', 'enterprise')
    AND email != 'admin@cortexops.com'
  LOOP
    FOR month_offset IN 1..11 LOOP
      INSERT INTO subscriptions (
        user_id,
        plan,
        status,
        amount,
        currency,
        interval,
        created_at,
        current_period_start,
        current_period_end
      ) VALUES (
        user_rec.id,
        user_rec.user_plan,
        'active',
        CASE user_rec.user_plan
          WHEN 'pro' THEN 49.00
          WHEN 'enterprise' THEN 299.00
          ELSE 0
        END,
        'EUR',
        'month',
        NOW() - (month_offset || ' months')::interval,
        NOW() - (month_offset || ' months')::interval,
        NOW() - ((month_offset - 1) || ' months')::interval
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 7. Créer des logs d'activité récente
-- ============================================
INSERT INTO error_logs (
  user_id,
  action_type,
  details,
  severity,
  created_at
)
SELECT
  up.id,
  (ARRAY['playbook_generation', 'api_key_creation', 'subscription_upgrade', 'export_git', 'security_audit'])[floor(random() * 5 + 1)],
  CASE floor(random() * 5)
    WHEN 0 THEN 'Généré un playbook Kubernetes'
    WHEN 1 THEN 'Créé une nouvelle clé API'
    WHEN 2 THEN 'Upgrade vers plan Pro'
    WHEN 3 THEN 'Export vers GitHub réussi'
    ELSE 'Audit de sécurité terminé'
  END,
  'info',
  NOW() - (floor(random() * 24) || ' hours')::interval - (floor(random() * 60) || ' minutes')::interval
FROM user_profiles up
WHERE up.user_status = 'active'
AND up.email != 'admin@cortexops.com'
LIMIT 20;

-- ============================================
-- 8. Afficher le résumé
-- ============================================
DO $$
DECLARE
  total_users int;
  total_active int;
  total_free int;
  total_pro int;
  total_enterprise int;
  total_api_calls bigint;
  total_revenue numeric;
BEGIN
  SELECT COUNT(*) INTO total_users FROM user_profiles;
  SELECT COUNT(*) INTO total_active FROM user_profiles WHERE user_status = 'active';
  SELECT COUNT(*) INTO total_free FROM user_profiles WHERE user_plan = 'free';
  SELECT COUNT(*) INTO total_pro FROM user_profiles WHERE user_plan = 'pro';
  SELECT COUNT(*) INTO total_enterprise FROM user_profiles WHERE user_plan = 'enterprise';
  SELECT COUNT(*) INTO total_api_calls FROM api_rate_limits;
  SELECT COALESCE(SUM(amount), 0) INTO total_revenue
  FROM subscriptions
  WHERE status = 'active'
  AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE);

  RAISE NOTICE '========================================';
  RAISE NOTICE 'DONNÉES DE TEST CRÉÉES AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total utilisateurs: %', total_users;
  RAISE NOTICE '  - Actifs: %', total_active;
  RAISE NOTICE '  - Free: %', total_free;
  RAISE NOTICE '  - Pro: %', total_pro;
  RAISE NOTICE '  - Enterprise: %', total_enterprise;
  RAISE NOTICE 'Total appels API: %', total_api_calls;
  RAISE NOTICE 'Revenu mensuel: % EUR', total_revenue;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Prochaines étapes:';
  RAISE NOTICE '1. Connectez-vous avec admin@cortexops.com';
  RAISE NOTICE '2. Accédez au dashboard admin: /admin';
  RAISE NOTICE '3. Explorez les différents onglets';
  RAISE NOTICE '========================================';
END $$;
