/*
  # Schéma de Surveillance de Sécurité

  1. Nouvelles Tables
    - `security_events`
      - `id` (uuid, primary key)
      - `event_type` (text) - Type d'événement (devtools_open, copy_attempt, etc.)
      - `timestamp` (timestamptz) - Date/heure de l'événement
      - `user_agent` (text) - User agent du navigateur
      - `ip_address` (inet) - Adresse IP (si disponible)
      - `session_id` (text) - ID de session
      - `details` (jsonb) - Détails supplémentaires
      - `suspicious` (boolean) - Marqué comme suspect
      - `created_at` (timestamptz)

    - `blocked_ips`
      - `id` (uuid, primary key)
      - `ip_address` (inet, unique) - Adresse IP bloquée
      - `reason` (text) - Raison du blocage
      - `blocked_at` (timestamptz)
      - `expires_at` (timestamptz) - Date d'expiration du blocage
      - `permanent` (boolean) - Blocage permanent

    - `security_stats`
      - `id` (uuid, primary key)
      - `date` (date, unique) - Date des statistiques
      - `total_events` (integer) - Nombre total d'événements
      - `suspicious_events` (integer) - Événements suspects
      - `blocked_attempts` (integer) - Tentatives bloquées
      - `unique_visitors` (integer) - Visiteurs uniques

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques restrictives pour accès admin uniquement
*/

-- Table des événements de sécurité
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN (
    'devtools_open',
    'copy_attempt',
    'right_click',
    'suspicious_behavior',
    'bot_detected',
    'scraping_attempt',
    'source_map_access'
  )),
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_agent text NOT NULL,
  ip_address inet,
  session_id text,
  details jsonb DEFAULT '{}'::jsonb,
  suspicious boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_suspicious ON security_events(suspicious) WHERE suspicious = true;
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address) WHERE ip_address IS NOT NULL;

-- Table des IPs bloquées
CREATE TABLE IF NOT EXISTS blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet UNIQUE NOT NULL,
  reason text NOT NULL,
  blocked_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  permanent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index pour vérification rapide
CREATE INDEX IF NOT EXISTS idx_blocked_ips_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active ON blocked_ips(expires_at) WHERE permanent = false;

-- Table des statistiques de sécurité
CREATE TABLE IF NOT EXISTS security_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  total_events integer DEFAULT 0,
  suspicious_events integer DEFAULT 0,
  blocked_attempts integer DEFAULT 0,
  unique_visitors integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour statistiques
CREATE INDEX IF NOT EXISTS idx_security_stats_date ON security_stats(date DESC);

-- Enable RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_stats ENABLE ROW LEVEL SECURITY;

-- Politiques RLS (Accès service_role uniquement)
-- En production, créer un rôle admin spécifique

-- Fonction pour mettre à jour les stats automatiquement
CREATE OR REPLACE FUNCTION update_security_stats()
RETURNS trigger AS $$
BEGIN
  INSERT INTO security_stats (date, total_events, suspicious_events)
  VALUES (
    CURRENT_DATE,
    1,
    CASE WHEN NEW.suspicious THEN 1 ELSE 0 END
  )
  ON CONFLICT (date) DO UPDATE SET
    total_events = security_stats.total_events + 1,
    suspicious_events = security_stats.suspicious_events + CASE WHEN NEW.suspicious THEN 1 ELSE 0 END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mise à jour automatique des stats
DROP TRIGGER IF EXISTS trigger_update_security_stats ON security_events;
CREATE TRIGGER trigger_update_security_stats
  AFTER INSERT ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION update_security_stats();

-- Fonction pour nettoyer les anciens événements (>90 jours)
CREATE OR REPLACE FUNCTION cleanup_old_security_events()
RETURNS void AS $$
BEGIN
  DELETE FROM security_events
  WHERE created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql;

-- Vue pour rapport de sécurité quotidien
CREATE OR REPLACE VIEW daily_security_report AS
SELECT
  date,
  total_events,
  suspicious_events,
  blocked_attempts,
  ROUND((suspicious_events::numeric / NULLIF(total_events, 0) * 100), 2) as suspicious_rate,
  unique_visitors
FROM security_stats
ORDER BY date DESC;

-- Fonction pour bloquer automatiquement une IP suspecte
CREATE OR REPLACE FUNCTION auto_block_suspicious_ip(
  p_ip inet,
  p_threshold integer DEFAULT 10
)
RETURNS boolean AS $$
DECLARE
  v_suspicious_count integer;
  v_already_blocked boolean;
BEGIN
  -- Vérifier si déjà bloqué
  SELECT EXISTS(
    SELECT 1 FROM blocked_ips
    WHERE ip_address = p_ip
    AND (permanent = true OR expires_at > now())
  ) INTO v_already_blocked;

  IF v_already_blocked THEN
    RETURN false;
  END IF;

  -- Compter les événements suspects des dernières 24h
  SELECT COUNT(*)
  INTO v_suspicious_count
  FROM security_events
  WHERE ip_address = p_ip
  AND suspicious = true
  AND timestamp > now() - interval '24 hours';

  -- Bloquer si seuil dépassé
  IF v_suspicious_count >= p_threshold THEN
    INSERT INTO blocked_ips (ip_address, reason, expires_at, permanent)
    VALUES (
      p_ip,
      format('Auto-blocked: %s suspicious events in 24h', v_suspicious_count),
      now() + interval '7 days',
      false
    );
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;