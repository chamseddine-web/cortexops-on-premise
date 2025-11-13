/*
  # Ansible Learning Platform Schema

  1. New Tables
    - `courses`
      - `id` (uuid, primary key)
      - `title` (text) - Course title
      - `description` (text) - Course description
      - `level` (text) - beginner, intermediate, advanced, expert
      - `order_index` (integer) - Display order
      - `created_at` (timestamptz)
    
    - `lessons`
      - `id` (uuid, primary key)
      - `course_id` (uuid, foreign key)
      - `title` (text) - Lesson title
      - `content` (text) - Lesson content in markdown
      - `order_index` (integer) - Display order within course
      - `example_playbook` (text) - Example playbook code
      - `created_at` (timestamptz)
    
    - `user_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - User identifier
      - `lesson_id` (uuid, foreign key)
      - `completed` (boolean) - Lesson completion status
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `generated_playbooks`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - User identifier
      - `natural_language_input` (text) - Original user input
      - `generated_playbook` (text) - Generated Ansible playbook
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for courses and lessons (educational content)
    - Authenticated users can manage their own progress and playbooks
*/

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  level text NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  example_playbook text,
  created_at timestamptz DEFAULT now()
);

-- Create user progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Create generated playbooks table
CREATE TABLE IF NOT EXISTS generated_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  natural_language_input text NOT NULL,
  generated_playbook text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_playbooks ENABLE ROW LEVEL SECURITY;

-- Courses policies (public read)
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  USING (true);

-- Lessons policies (public read)
CREATE POLICY "Anyone can view lessons"
  ON lessons FOR SELECT
  USING (true);

-- User progress policies
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Generated playbooks policies
CREATE POLICY "Users can view own playbooks"
  ON generated_playbooks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playbooks"
  ON generated_playbooks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own playbooks"
  ON generated_playbooks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert sample course data
INSERT INTO courses (title, description, level, order_index) VALUES
  ('Introduction à Ansible', 'Découvrez les bases d''Ansible : installation, concepts fondamentaux et premiers playbooks', 'beginner', 1),
  ('Ansible Intermédiaire', 'Approfondissez vos connaissances : variables, templates, handlers et rôles', 'intermediate', 2),
  ('Ansible Avancé', 'Maîtrisez les concepts avancés : Ansible Vault, stratégies, optimisation', 'advanced', 3),
  ('Ansible Expert', 'Devenez un expert : développement de modules, plugins, architecture complexe', 'expert', 4);

-- Insert sample lessons for beginner course
INSERT INTO lessons (course_id, title, content, order_index, example_playbook)
SELECT 
  c.id,
  'Qu''est-ce qu''Ansible ?',
  E'# Qu''est-ce qu''Ansible ?\n\nAnsible est un outil d''automatisation IT open-source qui permet de :\n\n- **Gérer la configuration** de serveurs\n- **Déployer des applications**\n- **Orchestrer des tâches** complexes\n\n## Pourquoi Ansible ?\n\n1. **Sans agent** : pas besoin d''installer de logiciel sur les machines cibles\n2. **Simple** : utilise YAML, facile à lire et écrire\n3. **Puissant** : gère des infrastructures complexes\n4. **Idempotent** : peut être exécuté plusieurs fois sans effet secondaire\n\n## Comment ça marche ?\n\nAnsible se connecte aux machines via SSH et exécute des tâches définies dans des **playbooks**.',
  1,
  E'# Exemple simple de connexion\n# Ce n''est pas encore un vrai playbook, juste pour comprendre\n# Ansible utilise SSH pour se connecter aux serveurs'
FROM courses c WHERE c.level = 'beginner' LIMIT 1;

INSERT INTO lessons (course_id, title, content, order_index, example_playbook)
SELECT 
  c.id,
  'Installation d''Ansible',
  E'# Installation d''Ansible\n\n## Sur Ubuntu/Debian\n\n```bash\nsudo apt update\nsudo apt install ansible\n```\n\n## Sur CentOS/RHEL\n\n```bash\nsudo yum install epel-release\nsudo yum install ansible\n```\n\n## Avec pip (toutes plateformes)\n\n```bash\npip install ansible\n```\n\n## Vérifier l''installation\n\n```bash\nansible --version\n```\n\nVous devriez voir la version d''Ansible installée !',
  2,
  E'# Après installation, testez la connexion locale\n---\n- name: Test de connexion locale\n  hosts: localhost\n  tasks:\n    - name: Afficher un message\n      debug:\n        msg: "Ansible fonctionne !"'
FROM courses c WHERE c.level = 'beginner' LIMIT 1;

INSERT INTO lessons (course_id, title, content, order_index, example_playbook)
SELECT 
  c.id,
  'Votre premier playbook',
  E'# Votre premier playbook\n\n## Structure d''un playbook\n\nUn playbook Ansible est un fichier YAML qui contient :\n\n1. **Le nom du play** (optionnel mais recommandé)\n2. **Les hôtes cibles** (hosts)\n3. **Les tâches à exécuter** (tasks)\n\n## Anatomie d''une tâche\n\nChaque tâche a :\n- Un **nom** descriptif\n- Un **module** Ansible (debug, copy, apt, etc.)\n- Des **paramètres** pour le module\n\n## Exemple expliqué\n\nLe playbook à droite :\n1. Cible la machine locale (localhost)\n2. Affiche un message de bienvenue\n3. Crée un fichier de test\n\n**Exécution** : `ansible-playbook monplaybook.yml`',
  3,
  E'---\n- name: Mon premier playbook\n  hosts: localhost\n  tasks:\n    - name: Afficher un message de bienvenue\n      debug:\n        msg: "Bienvenue dans Ansible !"\n\n    - name: Créer un fichier de test\n      file:\n        path: /tmp/ansible-test.txt\n        state: touch'
FROM courses c WHERE c.level = 'beginner' LIMIT 1;

INSERT INTO lessons (course_id, title, content, order_index, example_playbook)
SELECT 
  c.id,
  'L''inventaire (inventory)',
  E'# L''inventaire Ansible\n\n## Qu''est-ce qu''un inventaire ?\n\nL''inventaire est la liste des serveurs qu''Ansible peut gérer.\n\n## Format INI (simple)\n\n```ini\n[webservers]\nweb1.example.com\nweb2.example.com\n\n[databases]\ndb1.example.com\n```\n\n## Format YAML\n\n```yaml\nall:\n  children:\n    webservers:\n      hosts:\n        web1.example.com:\n        web2.example.com:\n```\n\n## Groupes et variables\n\nVous pouvez organiser vos serveurs en groupes et leur assigner des variables.\n\n**Fichier par défaut** : `/etc/ansible/hosts`\n\n**Utiliser un inventaire custom** : `ansible-playbook -i mon_inventaire.ini playbook.yml`',
  4,
  E'---\n- name: Exemple avec différents groupes\n  hosts: webservers\n  tasks:\n    - name: Installer nginx sur les serveurs web\n      apt:\n        name: nginx\n        state: present\n      become: yes\n\n- name: Configuration des bases de données\n  hosts: databases\n  tasks:\n    - name: Installer postgresql\n      apt:\n        name: postgresql\n        state: present\n      become: yes'
FROM courses c WHERE c.level = 'beginner' LIMIT 1;

INSERT INTO lessons (course_id, title, content, order_index, example_playbook)
SELECT 
  c.id,
  'Les modules essentiels',
  E'# Les modules Ansible essentiels\n\n## Modules de base\n\n### 1. debug\nAffiche des messages ou variables\n\n### 2. copy\nCopie des fichiers vers les hôtes\n\n### 3. file\nGère les fichiers et répertoires\n\n### 4. apt / yum\nGère les packages (Ubuntu/CentOS)\n\n### 5. service\nGère les services système\n\n### 6. command / shell\nExécute des commandes\n\n### 7. template\nDéploie des fichiers avec variables\n\n## Idempotence\n\nLes modules Ansible sont **idempotents** : ils vérifient l''état actuel avant d''agir.\n\nExemple : si un package est déjà installé, Ansible ne le réinstalle pas.\n\n## Documentation\n\n`ansible-doc <nom_module>` pour voir la doc d''un module',
  5,
  E'---\n- name: Démonstration des modules essentiels\n  hosts: localhost\n  become: yes\n  tasks:\n    - name: Créer un répertoire\n      file:\n        path: /tmp/ansible-demo\n        state: directory\n        mode: ''0755''\n\n    - name: Copier un fichier\n      copy:\n        content: "Fichier créé par Ansible"\n        dest: /tmp/ansible-demo/info.txt\n\n    - name: Installer un package\n      apt:\n        name: curl\n        state: present\n        update_cache: yes\n\n    - name: Vérifier le statut d''un service\n      service:\n        name: ssh\n        state: started\n        enabled: yes'
FROM courses c WHERE c.level = 'beginner' LIMIT 1;