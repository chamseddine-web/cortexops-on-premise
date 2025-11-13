# 📧 CortexOps Email System - Guide Complet

## 🎯 Vue d'ensemble

Système d'email automation professionnel utilisant **IONOS SMTP** pour l'envoi automatique d'emails de bienvenue personnalisés lors de la création de compte.

---

## 📁 Architecture

```
Email System
├── Edge Function (Supabase)
│   └── welcome-email/
│       └── index.ts          # SMTP client + HTML template
│
├── Frontend Integration
│   └── ProfessionalSignUpForm.tsx  # Appel API post-signup
│
├── Configuration
│   ├── Secrets Supabase      # SMTP credentials
│   └── IONOS SMTP            # smtp.ionos.fr:465
│
└── Documentation
    ├── EMAIL_IONOS_SETUP.md      # Guide configuration
    ├── DEPLOYMENT_CHECKLIST.md   # Checklist déploiement
    └── EMAIL_SYSTEM_README.md    # Ce fichier
```

---

## ⚙️ Configuration SMTP

### **Serveur IONOS**

```
Host:       smtp.ionos.fr
Port:       465
Encryption: SSL/TLS
Auth:       LOGIN (Base64)
Email:      contact@spectra-consulting.fr
```

### **Secrets Supabase**

```bash
# Configurer les credentials
supabase secrets set SMTP_USER="contact@spectra-consulting.fr"
supabase secrets set SMTP_PASSWORD="[password]"
```

---

## 🚀 Déploiement Rapide

### **Option 1: Script automatique (Recommandé)**

```bash
# Rendre le script exécutable
chmod +x deploy-email-ionos.sh

# Lancer le déploiement
./deploy-email-ionos.sh
```

Le script va :
1. ✅ Vérifier Supabase CLI
2. ✅ Demander les credentials IONOS
3. ✅ Configurer les secrets
4. ✅ Déployer l'Edge Function
5. ✅ Tester l'envoi (optionnel)
6. ✅ Afficher les logs

### **Option 2: Déploiement manuel**

```bash
# 1. Configurer les secrets
supabase secrets set SMTP_USER="contact@spectra-consulting.fr"
supabase secrets set SMTP_PASSWORD="votre-password"

# 2. Déployer la fonction
supabase functions deploy welcome-email --no-verify-jwt

# 3. Tester
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/welcome-email \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","fullName":"Test User"}'
```

---

## 📧 Format de l'Email

### **Structure**

```html
┌─────────────────────────────────────┐
│  [Header Gradient Bleu-Violet]     │
│  Bienvenue sur CortexOps ! 🎉      │
├─────────────────────────────────────┤
│  Bonjour [Prénom],                 │
│                                     │
│  Message de bienvenue...           │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ [Poste] chez [Entreprise]    │ │
│  └───────────────────────────────┘ │
│                                     │
│  Vos cas d'usage:                  │
│  • 🚀 CI/CD Automation             │
│  • 🔒 Security Hardening           │
│                                     │
│  ┌──────┐  ┌──────┐               │
│  │  5   │  │  ∞   │               │
│  │Plays │  │Temps │               │
│  └──────┘  └──────┘               │
│                                     │
│  [🚀 Commencer à générer]         │
│                                     │
│  🎯 Guide de démarrage:            │
│  1. Connectez-vous                 │
│  2. Décrivez votre infra           │
│  3. Générez le playbook            │
│  4. Déployez !                     │
│                                     │
│  📚 Ressources:                    │
│  • Documentation                   │
│  • Exemples                        │
│  • Support                         │
├─────────────────────────────────────┤
│  [Footer: CortexOps © 2025]       │
└─────────────────────────────────────┘
```

### **Personnalisation**

- ✅ **Prénom** extrait du fullName
- ✅ **Poste** (si fourni)
- ✅ **Entreprise** (si fournie)
- ✅ **Use cases** avec icons
- ✅ **Responsive** (mobile/desktop)
- ✅ **HTML inline CSS** (compatibilité email clients)

---

## 🔌 Intégration Frontend

### **Dans ProfessionalSignUpForm.tsx**

```typescript
// Après signup réussi
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const { error, data } = await signUp(
    formData.email,
    formData.password,
    formData.fullName,
    {
      job_title: formData.jobTitle,
      company_name: formData.companyName,
      use_cases: formData.useCase
    }
  );

  if (!error && data.user) {
    // Envoyer email de bienvenue
    try {
      await fetch(
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
    } catch (err) {
      console.error('Email error:', err);
      // Ne pas bloquer l'inscription si l'email échoue
    }

    // Continuer vers page succès
    setStep('verification');
  }
};
```

---

## 🧪 Tests

### **Test 1: Envoi basique**

```bash
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/welcome-email \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "Jean Dupont"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Welcome email sent to test@example.com"
}
```

### **Test 2: Avec métadonnées complètes**

```bash
curl -X POST [URL] \
  -H [HEADERS] \
  -d '{
    "email": "jean.dupont@test.com",
    "fullName": "Jean Dupont",
    "jobTitle": "DevOps Engineer",
    "companyName": "Acme Corp",
    "useCases": ["cicd", "infrastructure", "security"]
  }'
```

### **Test 3: Vérifier la réception**

1. Envoyer vers votre email
2. Vérifier inbox ET spam
3. Vérifier que le HTML s'affiche correctement
4. Tester les liens (CTA, footer)

---

## 📊 Monitoring

### **Logs en temps réel**

```bash
# Suivre les logs
supabase functions logs welcome-email --follow

# Filtrer les erreurs
supabase functions logs welcome-email --limit 100 | grep -i error

# Compter les emails envoyés (24h)
supabase functions logs welcome-email --limit 1000 \
  | grep "Email sent successfully" \
  | wc -l
```

### **Métriques clés**

| Métrique | Commande | Objectif |
|----------|----------|----------|
| **Delivery rate** | Logs Supabase | >98% |
| **Latency** | Dashboard Supabase | <2s |
| **Error rate** | `grep error` | <1% |
| **Daily volume** | `wc -l` | Selon croissance |

---

## 🔧 Troubleshooting

### **Problème: "SMTP_PASSWORD not configured"**

**Cause** : Secret pas configuré dans Supabase

**Solution** :
```bash
supabase secrets set SMTP_PASSWORD="votre-password"
supabase functions deploy welcome-email
```

### **Problème: "Authentication failed: 535"**

**Cause** : Credentials IONOS incorrects

**Solution** :
1. Vérifier le password dans IONOS dashboard
2. Tester manuellement avec openssl :
   ```bash
   openssl s_client -connect smtp.ionos.fr:465 -crlf
   ```
3. Reconfigurer :
   ```bash
   supabase secrets set SMTP_PASSWORD="nouveau-password"
   ```

### **Problème: Email non reçu**

**Diagnostic** :
```bash
# Vérifier les logs
supabase functions logs welcome-email --limit 20

# Chercher le message "Email sent successfully"
```

**Causes possibles** :
1. Email en spam (vérifier le dossier)
2. Adresse invalide (vérifier format)
3. Quota IONOS atteint (vérifier dashboard)
4. Réputation IP basse (contacter IONOS)

### **Problème: Timeout**

**Cause** : Port 465 bloqué ou IONOS down

**Solution** :
1. Vérifier status.ionos.fr
2. Tester avec port 587 (STARTTLS) :
   ```typescript
   const SMTP_CONFIG = {
     host: 'smtp.ionos.fr',
     port: 587,
     secure: false
   };
   ```

---

## 🔐 Sécurité

### **Best Practices**

- ✅ **Jamais** de credentials dans le code
- ✅ Utilisation exclusive de secrets Supabase
- ✅ Connexion SSL/TLS obligatoire
- ✅ Rate limiting activé (Supabase)
- ✅ CORS configuré restrictif
- ✅ Validation des inputs (email format)

### **Vérification Sécurité**

```bash
# Vérifier que les secrets existent
supabase secrets list | grep SMTP

# Vérifier que le code n'a pas de credentials
grep -r "password" supabase/functions/welcome-email/ | grep -v env

# Résultat attendu: aucune ligne (sauf Deno.env.get)
```

---

## 📈 Optimisations Futures

### **Phase 2: Tracking**

```typescript
// Ajouter pixel de tracking pour open rate
const trackingPixel = `
  <img src="https://cortexops.dev/t/${userId}.png"
       width="1" height="1" />
`;
```

### **Phase 3: Templates multiples**

```
supabase/functions/
├── welcome-email/
├── password-reset-email/
├── invoice-email/
└── newsletter-email/
```

### **Phase 4: Queue system**

```typescript
// File d'attente pour haute dispo
import { Queue } from 'supabase-queue';

const emailQueue = new Queue('emails');
await emailQueue.add({ email, fullName, ... });
```

---

## 📚 Documentation Complète

### **Guides disponibles**

1. **EMAIL_IONOS_SETUP.md** - Configuration détaillée IONOS
2. **DEPLOYMENT_CHECKLIST.md** - Checklist de déploiement
3. **EMAIL_SYSTEM_README.md** - Ce fichier (overview)
4. **NEXT_STEPS_IMPLEMENTATION.md** - Roadmap et évolutions

### **Scripts utiles**

- `deploy-email-ionos.sh` - Déploiement automatique
- `test-email.sh` - Tests automatisés (à créer)

---

## 🎉 Résumé

**Système d'email professionnel prêt à l'emploi avec :**

- ✅ SMTP IONOS (contact@spectra-consulting.fr)
- ✅ Edge Function Supabase performante (<2s)
- ✅ Template HTML responsive et moderne
- ✅ Personnalisation totale (nom, poste, entreprise)
- ✅ Monitoring et logs complets
- ✅ Sécurité enterprise-grade
- ✅ Documentation exhaustive

**Prêt pour production !** 🚀

---

## 📞 Support

### **Problème technique**
- 📖 Documentation: Voir guides ci-dessus
- 💬 Logs: `supabase functions logs welcome-email`

### **Problème IONOS**
- 📧 Email: support@ionos.fr
- 📞 Téléphone: +33 (0)9 70 80 89 11
- 🌐 Dashboard: https://www.ionos.fr/

### **Problème Supabase**
- 📧 Email: support@supabase.com
- 💬 Discord: https://discord.supabase.com
- 📖 Docs: https://supabase.com/docs

---

**Last updated**: 2025-01-12
**Version**: 1.0.0
**Status**: ✅ Production Ready
