# 🚀 Mistral AI - Guide de démarrage rapide

## Configuration en 3 minutes

### Étape 1 : Obtenir une clé API Mistral

1. Visitez [console.mistral.ai](https://console.mistral.ai/)
2. Créez un compte (gratuit)
3. Naviguez vers **API Keys**
4. Cliquez sur **Create new key**
5. Copiez votre clé API

### Étape 2 : Configurer CortexOps

```bash
# Ouvrez votre fichier .env
nano .env

# Ajoutez votre clé Mistral
VITE_MISTRAL_API_KEY=votre-cle-api-ici
```

### Étape 3 : Tester

```bash
# Démarrez l'application
npm run dev

# Dans l'interface web :
# 1. Ouvrez les Paramètres (⚙️)
# 2. Section "Modèles AI"
# 3. Cliquez sur "Tester connexions"
# 4. Vous devriez voir ✅ pour Mistral
```

## 🎯 Cas d'usage recommandés

### Génération de playbook complexe
```
Modèle : mistral-large-latest
Prompt : "Créer un playbook Ansible pour déployer une stack Kubernetes
         avec haute disponibilité, monitoring Prometheus, et sécurité CIS"
```

### Audit de sécurité
```
Modèle : mistral-small-latest
Prompt : "Audite ce playbook et identifie toutes les vulnérabilités"
```

### Prototypage rapide
```
Modèle : open-mistral-nemo
Prompt : "Playbook simple pour installer nginx avec SSL"
```

## 💰 Tarification

| Modèle | Coût / 1M tokens | Playbook typique (~2K tokens) |
|--------|------------------|-------------------------------|
| mistral-large | $8.00 | ~$0.016 |
| mistral-small | $2.00 | ~$0.004 |
| mistral-nemo | $2.00 | ~$0.004 |

**Estimation** : Avec $10 de crédit, vous pouvez générer ~600 playbooks avec mistral-large !

## 🆓 Mode gratuit avec Ollama

Si vous voulez éviter les coûts API :

```bash
# Installer Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Télécharger Mistral 7B
ollama pull mistral:7b

# Démarrer
ollama serve
```

Puis dans CortexOps, sélectionnez **mistral:7b (Ollama)** - c'est gratuit et fonctionne offline !

## 🔥 Tips

### 1. Combinez les modèles
- **Génération** : mistral-large
- **Validation** : mistral-small
- **Itération** : mistral-nemo

### 2. Optimisez les prompts
```typescript
// ❌ Mauvais
"Faire un playbook"

// ✅ Bon
"Créer un playbook Ansible production-ready pour déployer PostgreSQL 14
avec réplication master-slave, backup automatique et hardening CIS Level 2"
```

### 3. Limitez les tokens pour économiser
```typescript
const response = await generate(prompt, systemPrompt, {
  maxTokens: 1000  // Au lieu de 32000 par défaut
});
```

## ❓ FAQ

**Q : Puis-je utiliser Mistral sans carte de crédit ?**
A : Oui ! Utilisez Ollama en local avec mistral:7b gratuitement.

**Q : Quelle est la différence avec GPT-4 ?**
A : Mistral est optimisé pour le code et les tâches techniques, souvent plus rapide et moins cher.

**Q : Mes données sont-elles sécurisées ?**
A : Avec Mistral Cloud, oui (RGPD compliant). Pour une sécurité maximale, utilisez Ollama local.

**Q : Puis-je changer de modèle à la volée ?**
A : Oui ! Utilisez le sélecteur de modèle dans l'interface.

## 🎓 Prochaines étapes

1. ✅ Lisez [MISTRAL_INTEGRATION.md](./MISTRAL_INTEGRATION.md) pour les détails complets
2. 🔧 Explorez les exemples dans `src/hooks/useAIModel.ts`
3. 🚀 Testez différents modèles selon vos besoins
4. 💡 Consultez les best practices

Bon DevOps ! 🎉
