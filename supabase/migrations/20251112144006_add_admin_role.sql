/*
  # Ajout du rôle administrateur

  1. Modifications
    - Ajoute la colonne `is_admin` à la table `user_profiles`
    - Défini chams.askri@gmail.com comme administrateur
    - Ajoute une policy RLS pour que les admins puissent voir tous les profils

  2. Sécurité
    - Les utilisateurs normaux ne peuvent voir que leur propre profil
    - Les administrateurs peuvent voir tous les profils
    - Seuls les admins peuvent modifier le statut admin
*/

-- Ajouter la colonne is_admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Définir chams.askri@gmail.com comme admin
UPDATE user_profiles
SET is_admin = true
WHERE email = 'chams.askri@gmail.com';

-- Policy pour permettre aux admins de voir tous les profils
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Policy pour empêcher les utilisateurs normaux de modifier le champ is_admin
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (is_admin = (SELECT is_admin FROM user_profiles WHERE id = auth.uid()))
  );
