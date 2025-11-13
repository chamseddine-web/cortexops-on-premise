#!/usr/bin/env tsx

/**
 * Script pour créer un utilisateur admin dans CortexOps
 *
 * Usage:
 *   npm run create-admin
 *
 * Ou avec des variables d'environnement personnalisées:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secure123 npm run create-admin
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://pkvfnmmnfwfxnwojycmp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@cortexops.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'CortexAdmin2024!';

// Validation
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erreur: SUPABASE_SERVICE_ROLE_KEY manquante');
  console.error('');
  console.error('Cette clé se trouve dans:');
  console.error('  Supabase Dashboard → Settings → API → service_role');
  console.error('');
  console.error('Définissez-la avec:');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.error('');
  process.exit(1);
}

// Créer le client Supabase avec la clé service_role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          Création de l\'utilisateur admin                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📧 Email: ${ADMIN_EMAIL}`);
  console.log(`🔒 Mot de passe: ${ADMIN_PASSWORD.replace(/./g, '*')}`);
  console.log('');

  try {
    // Étape 1: Vérifier si l'utilisateur existe déjà
    console.log('1️⃣  Vérification de l\'utilisateur existant...');

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === ADMIN_EMAIL);

    let userId: string;

    if (existingUser) {
      console.log('   ⚠️  L\'utilisateur existe déjà dans Auth');
      userId = existingUser.id;
      console.log(`   UUID: ${userId}`);
    } else {
      // Étape 2: Créer l'utilisateur dans Supabase Auth
      console.log('2️⃣  Création de l\'utilisateur dans Supabase Auth...');

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: 'Administrateur CortexOps',
          company: 'CortexOps'
        }
      });

      if (authError) {
        throw new Error(`Erreur Auth: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Utilisateur non créé');
      }

      userId = authData.user.id;
      console.log('   ✅ Utilisateur créé dans Auth');
      console.log(`   UUID: ${userId}`);
    }

    // Étape 3: Vérifier si le profil existe
    console.log('');
    console.log('3️⃣  Vérification du profil utilisateur...');

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id, user_role')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      console.log('   ℹ️  Profil existant trouvé');

      if (existingProfile.user_role === 'admin') {
        console.log('   ✅ L\'utilisateur est déjà admin');
      } else {
        // Mettre à jour le rôle
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            user_role: 'admin',
            user_plan: 'enterprise',
            user_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          throw new Error(`Erreur mise à jour: ${updateError.message}`);
        }

        console.log('   ✅ Rôle mis à jour vers admin');
      }
    } else {
      // Étape 4: Créer le profil admin
      console.log('4️⃣  Création du profil admin...');

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: ADMIN_EMAIL,
          full_name: 'Administrateur CortexOps',
          company: 'CortexOps',
          user_role: 'admin',
          user_plan: 'enterprise',
          user_status: 'active',
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        });

      if (profileError) {
        throw new Error(`Erreur profil: ${profileError.message}`);
      }

      console.log('   ✅ Profil admin créé');
    }

    // Étape 5: Vérification finale
    console.log('');
    console.log('5️⃣  Vérification finale...');

    const { data: finalProfile, error: finalError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, user_role, user_plan, user_status')
      .eq('id', userId)
      .single();

    if (finalError || !finalProfile) {
      throw new Error('Impossible de vérifier le profil créé');
    }

    console.log('   ✅ Profil vérifié');
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ ADMIN CRÉÉ AVEC SUCCÈS                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Informations du profil:');
    console.log(`   - Email: ${finalProfile.email}`);
    console.log(`   - Nom: ${finalProfile.full_name}`);
    console.log(`   - Rôle: ${finalProfile.user_role} 🛡️`);
    console.log(`   - Plan: ${finalProfile.user_plan}`);
    console.log(`   - Statut: ${finalProfile.user_status}`);
    console.log('');
    console.log('🎯 Prochaines étapes:');
    console.log('');
    console.log('   1. Connectez-vous à l\'application:');
    console.log(`      Email: ${ADMIN_EMAIL}`);
    console.log(`      Password: ${ADMIN_PASSWORD}`);
    console.log('');
    console.log('   2. Accédez au dashboard admin:');
    console.log('      URL: http://localhost:5173/admin');
    console.log('      ou: https://votre-domaine.com/admin');
    console.log('');
    console.log('   3. Explorez les fonctionnalités admin:');
    console.log('      - Vue d\'ensemble des statistiques');
    console.log('      - Gestion des utilisateurs');
    console.log('      - Monitoring API');
    console.log('      - Facturation et revenus');
    console.log('      - État du système');
    console.log('');
    console.log('⚠️  IMPORTANT: Changez le mot de passe en production !');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║                    ❌ ERREUR                               ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error('');

    if (error instanceof Error) {
      console.error(`❌ ${error.message}`);
      console.error('');

      if (error.message.includes('already exists')) {
        console.error('💡 L\'utilisateur existe peut-être déjà.');
        console.error('   Essayez de vous connecter avec cet email.');
      } else if (error.message.includes('permission')) {
        console.error('💡 Vérifiez que SUPABASE_SERVICE_ROLE_KEY est correct.');
        console.error('   Cette clé se trouve dans:');
        console.error('   Supabase Dashboard → Settings → API → service_role');
      } else if (error.message.includes('network')) {
        console.error('💡 Problème de connexion réseau.');
        console.error('   Vérifiez que SUPABASE_URL est correct.');
      }
    } else {
      console.error('❌ Erreur inconnue:', error);
    }

    console.error('');
    console.error('📚 Pour plus d\'aide, consultez:');
    console.error('   - ADMIN_SETUP_GUIDE.md');
    console.error('   - https://supabase.com/docs');
    console.error('');

    process.exit(1);
  }
}

// Exécuter le script
createAdminUser();
