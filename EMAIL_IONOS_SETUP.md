# 📧 Configuration Email IONOS pour CortexOps

## Vue d'ensemble

Ce guide explique comment configurer l'envoi automatique d'emails de bienvenue via le serveur SMTP IONOS (contact@spectra-consulting.fr).

---

## 📋 Informations IONOS

### **Serveur SMTP**
```
Serveur:    smtp.ionos.fr
Port:       465
Encryption: SSL/TLS
Auth:       LOGIN
```

### **Serveur IMAP (lecture)**
```
Serveur:    imap.ionos.fr
Port:       993
Encryption: SSL/TLS
```

### **Serveur POP (lecture)**
```
Serveur:    pop.ionos.fr
Port:       995
Encryption: SSL/TLS
```

---

## 🔧 Configuration Supabase

### **Étape 1: Configurer les secrets**

```bash
# Se connecter à Supabase
supabase login

# Lier le projet (si pas déjà fait)
supabase link --project-ref [YOUR_PROJECT_ID]

# Configurer les credentials email
supabase secrets set SMTP_USER="contact@spectra-consulting.fr"
supabase secrets set SMTP_PASSWORD="[VOTRE_MOT_DE_PASSE]"
```

⚠️ **Important** : Remplacez `[VOTRE_MOT_DE_PASSE]` par le mot de passe réel du compte IONOS.

### **Étape 2: Vérifier les secrets**

```bash
# Lister les secrets (sans afficher les valeurs)
supabase secrets list
```

Vous devriez voir :
```
SMTP_USER
SMTP_PASSWORD
```

---

## 🚀 Déploiement de l'Edge Function

### **Déployer la fonction**

```bash
# Déployer welcome-email
supabase functions deploy welcome-email

# Vérifier le déploiement
supabase functions list
```

### **Tester l'edge function**

```bash
# Test avec curl
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/welcome-email \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "Jean Dupont",
    "jobTitle": "DevOps Engineer",
    "companyName": "Acme Corp",
    "useCases": ["cicd", "security"]
  }'
```

### **Réponse attendue**

```json
{
  "success": true,
  "message": "Welcome email sent to test@example.com"
}
```

---

## 🔐 Sécurité

### **Credentials protégés**

- ✅ **Jamais** de credentials en dur dans le code
- ✅ Utilisation exclusive de `Deno.env.get()`
- ✅ Secrets stockés dans Supabase (chiffrés)
- ✅ Connexion SMTP via SSL/TLS (port 465)

### **Authentification SMTP**

L'Edge Function utilise :
1. **AUTH LOGIN** (méthode standard)
2. **Base64 encoding** des credentials
3. **TLS encryption** pour toutes les communications

---

## 📊 Monitoring

### **Logs Supabase**

```bash
# Voir les logs en temps réel
supabase functions logs welcome-email --follow

# Voir les derniers logs
supabase functions logs welcome-email --limit 50
```

### **Messages de debug**

La fonction log automatiquement :
- ✅ `Email sent successfully to [email]`
- ❌ `SMTP_PASSWORD not configured`
- ❌ `Authentication failed: [response]`
- ❌ `SMTP Error: [error]`

---

## 🧪 Tests

### **Test 1: Credentials valides**

```bash
# Test avec vraies données
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/welcome-email \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "votre-email@test.com",
    "fullName": "Test User"
  }'
```

**Vérifier** :
1. Réponse `{"success": true}`
2. Email reçu dans la boîte (spam aussi)
3. Logs Supabase montrent `Email sent successfully`

### **Test 2: Credentials manquants**

```bash
# Supprimer temporairement le secret (NE PAS FAIRE EN PROD)
supabase secrets unset SMTP_PASSWORD

# Tester
curl [URL] [HEADERS] [BODY]

# Réponse attendue:
# {"error": "Failed to send email", "preview": "[HTML]"}
```

### **Test 3: Email invalide**

```bash
curl -X POST [URL] \
  -H [HEADERS] \
  -d '{"email": "invalid-email", "fullName": "Test"}'

# Réponse: 400 Bad Request
```

---

## 🔄 Intégration Frontend

### **Appeler depuis ProfessionalSignUpForm**

```typescript
// Dans ProfessionalSignUpForm.tsx après signup réussi

const { error } = await signUp(
  formData.email,
  formData.password,
  formData.fullName,
  metadata
);

if (!error) {
  // Envoyer l'email de bienvenue
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/welcome-email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          fullName: formData.fullName,
          jobTitle: formData.jobTitle,
          companyName: formData.companyName,
          useCases: formData.useCase
        })
      }
    );

    const result = await response.json();

    if (result.success) {
      console.log('Welcome email sent!');
    } else {
      console.error('Failed to send email:', result.error);
    }
  } catch (err) {
    console.error('Email error:', err);
    // Ne pas bloquer l'inscription si l'email échoue
  }

  // Continuer avec le flow normal (page succès)
  setStep('verification');
}
```

---

## 📧 Format de l'email

### **Headers**
```
From: CortexOps <contact@spectra-consulting.fr>
To: [user-email]
Subject: Bienvenue sur CortexOps, [firstname] ! 🎉
Content-Type: text/html; charset=UTF-8
```

### **Body**
- HTML responsive
- Gradient bleu-violet
- Personnalisé (prénom, poste, entreprise)
- Use cases avec icons
- CTA "Commencer à générer"
- Quick start guide
- Ressources utiles

---

## ⚠️ Troubleshooting

### **Problème: Email non reçu**

1. **Vérifier les logs** :
   ```bash
   supabase functions logs welcome-email --limit 10
   ```

2. **Vérifier spam** : L'email peut être dans le dossier spam

3. **Tester credentials IONOS** :
   ```bash
   # Test manuel avec openssl
   openssl s_client -connect smtp.ionos.fr:465 -crlf

   # Puis taper:
   EHLO smtp.ionos.fr
   AUTH LOGIN
   [base64_username]
   [base64_password]
   ```

### **Problème: Authentication failed**

- ❌ Mot de passe incorrect
- ❌ Secret pas configuré dans Supabase
- ❌ Compte IONOS bloqué/suspendu

**Solution** :
```bash
# Re-configurer le secret
supabase secrets set SMTP_PASSWORD="[NOUVEAU_PASSWORD]"

# Redéployer
supabase functions deploy welcome-email
```

### **Problème: Connection timeout**

- ❌ Port bloqué (465 peut être bloqué par certains firewalls)
- ❌ IONOS down (vérifier status.ionos.fr)

**Solution** :
```typescript
// Modifier pour utiliser port 587 (STARTTLS)
const SMTP_CONFIG = {
  host: 'smtp.ionos.fr',
  port: 587,
  secure: false // STARTTLS au lieu de SSL direct
};
```

### **Problème: HTML cassé dans l'email**

- ❌ Encoding UTF-8 pas respecté
- ❌ Client email ne supporte pas le HTML moderne

**Solution** :
- Tester dans différents clients (Gmail, Outlook, Apple Mail)
- Simplifier le HTML si nécessaire
- Utiliser des tables au lieu de divs (compatibilité)

---

## 📈 Métriques

### **KPIs à surveiller**

| Métrique | Objectif | Comment mesurer |
|----------|----------|-----------------|
| **Email delivery rate** | >98% | Logs Supabase (success vs failed) |
| **Email open rate** | >30% | Tracking pixel (à implémenter) |
| **Latency edge function** | <2s | Supabase dashboard |
| **Bounce rate** | <2% | IONOS dashboard |
| **Spam rate** | <0.1% | IONOS reputation |

### **Commande pour stats**

```bash
# Compter les emails envoyés (dernières 24h)
supabase functions logs welcome-email \
  --limit 1000 \
  | grep "Email sent successfully" \
  | wc -l
```

---

## 🔄 Évolutions futures

### **Phase 2: Tracking**

```typescript
// Ajouter tracking pixel pour open rate
const trackingPixel = `
  <img src="https://cortexops.dev/track/open/${userId}"
       width="1" height="1" style="display:none;" />
`;
```

### **Phase 3: Templates multiples**

```typescript
// Différents types d'emails
- welcome.ts (bienvenue)
- reset-password.ts (reset mdp)
- invoice.ts (facture)
- newsletter.ts (newsletter)
```

### **Phase 4: Queue système**

```typescript
// File d'attente pour haute disponibilité
- Utiliser Supabase Queue
- Retry automatique si échec
- Rate limiting (éviter spam)
```

---

## ✅ Checklist de déploiement

### **Pré-production**
- [ ] Secrets configurés dans Supabase
- [ ] Edge function déployée
- [ ] Tests avec email réel réussis
- [ ] Logs vérifiés (aucune erreur)
- [ ] HTML testé sur Gmail/Outlook

### **Production**
- [ ] Monitoring actif (logs)
- [ ] Alertes configurées (erreurs SMTP)
- [ ] Backup credentials (password manager)
- [ ] Documentation équipe à jour
- [ ] Tests post-déploiement réussis

---

## 📞 Support

### **IONOS Support**
- 📧 Email: support@ionos.fr
- 📞 Téléphone: +33 (0)9 70 80 89 11
- 🌐 Dashboard: https://www.ionos.fr/

### **Supabase Support**
- 📧 Email: support@supabase.com
- 💬 Discord: https://discord.supabase.com
- 📖 Docs: https://supabase.com/docs

---

## 🎉 Configuration complète !

Votre système d'email est maintenant prêt :
- ✅ SMTP IONOS configuré (contact@spectra-consulting.fr)
- ✅ Edge Function déployée avec SSL/TLS
- ✅ Template HTML professionnel
- ✅ Personnalisation totale
- ✅ Monitoring et logs
- ✅ Sécurité enterprise-grade

**Prochain test : Créer un compte et vérifier la réception de l'email !** 📧🚀
