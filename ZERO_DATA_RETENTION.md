# Zero Data Retention Policy

## Principe de Confidentialité

CortexOps applique un principe strict de **Zero Data Retention** pour toutes les requêtes de génération de playbooks Ansible.

## Comment ça fonctionne

### 1. Traitement en Mémoire Vive
- Toutes les requêtes utilisateur sont traitées exclusivement en RAM
- Aucune requête n'est écrite sur disque ou dans des logs permanents
- Les données sont automatiquement effacées après traitement

### 2. Ce qui N'EST JAMAIS stocké
- ❌ Vos prompts de génération
- ❌ Le contenu de vos playbooks générés
- ❌ Les détails de votre infrastructure
- ❌ Les secrets ou configurations sensibles
- ❌ L'historique de vos requêtes

### 3. Ce qui EST stocké (minimum nécessaire)
- ✅ Votre email et profil utilisateur
- ✅ Métadonnées d'utilisation (nombre de générations, plan actif)
- ✅ Préférences de compte
- ✅ Tokens d'API (si vous en créez)

## Architecture Technique

```
┌─────────────────┐
│  Navigateur     │
│  (Client)       │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  Edge Function  │
│  (RAM uniquement)│
│                 │
│  1. Reçoit      │
│  2. Traite      │
│  3. Retourne    │
│  4. Efface      │
└─────────────────┘
         │
         ▼
    [Aucun stockage]
```

## Conformité

Cette approche garantit :
- **RGPD** : Minimisation des données personnelles
- **SOC 2** : Sécurité des données sensibles
- **ISO 27001** : Gestion de la confidentialité

## Audit et Transparence

- Les Edge Functions sont stateless (sans état)
- Aucun log applicatif ne conserve vos requêtes
- Les métriques agrégées ne contiennent aucune donnée utilisateur

## Export de Données

Vos playbooks générés sont :
- Téléchargés directement dans votre navigateur
- Exportables vers Git (GitHub/GitLab) depuis votre machine
- Jamais stockés sur nos serveurs

## Questions ?

Pour toute question sur notre politique de confidentialité :
- Email : privacy@cortexops.dev
- Documentation : https://docs.cortexops.dev/privacy
