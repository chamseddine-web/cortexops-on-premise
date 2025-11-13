# 🔄 Guide : Remplacer OpenAI par Mistral AI

Ce guide vous explique comment désactiver OpenAI et utiliser exclusivement Mistral AI dans CortexOps.

---

## 📋 Table des matières

1. [Pourquoi remplacer OpenAI par Mistral ?](#pourquoi-remplacer-openai-par-mistral)
2. [Configuration rapide (3 étapes)](#configuration-rapide-3-étapes)
3. [Désactiver complètement OpenAI](#désactiver-complètement-openai)
4. [Vérification et tests](#vérification-et-tests)
5. [Comparaison des coûts](#comparaison-des-coûts)
6. [Retour en arrière](#retour-en-arrière)

---

## 🎯 Pourquoi remplacer OpenAI par Mistral ?

### Avantages de Mistral AI

| Critère | Mistral AI | OpenAI |
|---------|-----------|--------|
| **Coût** | 0,15€ - 2€ / 1M tokens | 0,50€ - 30€ / 1M tokens |
| **Conformité** | RGPD européen | US Cloud Act |
| **Latence** | ~200-500ms | ~500-1000ms |
| **Qualité** | Excellente | Premium |
| **Données** | Europe (France) | USA |
| **Disponibilité** | 99,9% | 99,9% |

### Cas d'usage Mistral AI

✅ **Utilisez Mistral pour :**
- Génération de playbooks Ansible
- Audit de sécurité DevOps
- Documentation technique
- Analyse de configurations
- Usage quotidien en production

❌ **OpenAI peut être préférable pour :**
- Traductions complexes multilingues
- Génération de contenu marketing créatif
- Cas d'usage très spécialisés

---

## ⚡ Configuration rapide (3 étapes)

### Étape 1 : Obtenir votre clé API Mistral

1. Créez un compte sur [console.mistral.ai](https://console.mistral.ai/)
2. Allez dans **API Keys**
3. Cliquez sur **Create new key**
4. Donnez un nom : `CortexOps Production`
5. Copiez la clé (format : `xxx...`)

### Étape 2 : Configurer la clé Mistral

Modifiez votre fichier `.env` :

```bash
# ✅ REQUIS - Mistral AI (Provider principal)
VITE_MISTRAL_API_KEY=votre_cle_mistral_ici

# ❌ OPTIONNEL - OpenAI (Désactivé)
# VITE_OPENAI_API_KEY=

# Pour Ollama local (optionnel)
VITE_OLLAMA_ENDPOINT=http://localhost:11434
```

### Étape 3 : Redémarrer l'application

```bash
npm run dev
```

✅ **C'est fait !** Mistral est maintenant le provider par défaut.

---

## 🚫 Désactiver complètement OpenAI

### Option 1 : Via l'interface (Recommandé)

1. Allez dans **Paramètres** → **Providers AI**
2. Trouvez la section **OpenAI**
3. Désactivez le toggle
4. Cliquez sur **Enregistrer**

### Option 2 : Via le fichier .env

Commentez ou supprimez la ligne OpenAI :

```bash
# Désactiver OpenAI
# VITE_OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

### Option 3 : Suppression complète (Avancé)

Si vous voulez supprimer complètement le code OpenAI :

#### 1. Modifier `src/lib/aiModelConfig.ts`

Supprimez les modèles OpenAI :

```typescript
export const AI_MODELS = {
  // Mistral Models (Garder)
  'mistral-large': { ... },
  'mistral-small': { ... },
  'mistral-nemo': { ... },

  // OpenAI Models (Supprimer ces lignes)
  // 'gpt-4': { ... },
  // 'gpt-3.5-turbo': { ... },

  // Ollama (Garder)
  'ollama-mistral': { ... }
};
```

#### 2. Modifier `src/lib/aiService.ts`

Supprimez la méthode `generateOpenAI` :

```typescript
// Supprimer cette méthode complète
/*
private async generateOpenAI(
  request: AIGenerationRequest,
  modelConfig: any
): Promise<AIGenerationResponse> {
  // ... supprimer tout le code
}
*/
```

Modifiez la méthode `generate` :

```typescript
async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
  const modelConfig = getModelConfig(request.modelKey);

  switch (modelConfig.provider) {
    case 'mistral':
      return await this.generateMistral(request, modelConfig);

    // Supprimer ce case
    // case 'openai':
    //   return await this.generateOpenAI(request, modelConfig);

    case 'ollama':
      return await this.generateOllama(request, modelConfig);

    default:
      throw new Error(`Provider non supporté: ${modelConfig.provider}`);
  }
}
```

#### 3. Nettoyer le constructeur

```typescript
export class AIService {
  // Supprimer openaiKey
  private mistralKey?: string;

  constructor(mistralKey?: string) {
    this.mistralKey = mistralKey;
  }
}

// Modifier createAIService
export const createAIService = () => {
  const mistralKey = import.meta.env.VITE_MISTRAL_API_KEY;
  return new AIService(mistralKey);
};
```

#### 4. Mettre à jour les tests de connexion

```typescript
async testConnection(provider: 'mistral' | 'ollama'): Promise<boolean> {
  try {
    switch (provider) {
      case 'mistral':
        if (!this.mistralKey) return false;
        const mistralRes = await fetch('https://api.mistral.ai/v1/models', {
          headers: { 'Authorization': `Bearer ${this.mistralKey}` }
        });
        return mistralRes.ok;

      // Supprimer le case openai

      case 'ollama':
        const ollamaRes = await fetch('http://localhost:11434/api/tags');
        return ollamaRes.ok;

      default:
        return false;
    }
  } catch {
    return false;
  }
}
```

#### 5. Rebuild l'application

```bash
npm run build
```

---

## ✅ Vérification et tests

### 1. Vérifier la configuration

```bash
# Afficher les variables d'environnement
echo $VITE_MISTRAL_API_KEY  # Doit afficher votre clé
echo $VITE_OPENAI_API_KEY   # Doit être vide
```

### 2. Tester dans l'interface

1. Ouvrez CortexOps
2. Allez dans **Générateur de Playbooks**
3. Cliquez sur **Sélecteur de modèle**
4. Vérifiez que seuls les modèles Mistral sont disponibles
5. Générez un playbook de test
6. Vérifiez qu'il est généré avec Mistral

### 3. Tester avec un playbook simple

```yaml
# Prompt de test
Créer un playbook pour installer Nginx sur Ubuntu
```

Si la génération fonctionne, Mistral est bien configuré !

### 4. Vérifier les logs

Ouvrez la console du navigateur (F12) et cherchez :

```
✅ Connexion Mistral AI : OK
❌ Connexion OpenAI : Désactivée
```

---

## 💰 Comparaison des coûts

### Exemple : Générer 100 playbooks par jour

| Modèle | Tokens/playbook | Coût/playbook | Coût mensuel (3000 playbooks) |
|--------|----------------|---------------|------------------------------|
| **Mistral Small** | 1000 | 0,0002€ | 0,60€ |
| **Mistral Nemo** | 1000 | 0,00015€ | 0,45€ |
| **GPT-3.5 Turbo** | 1000 | 0,0005€ | 1,50€ |
| **GPT-4** | 1000 | 0,03€ | 90€ |

### Économies annuelles

- **Mistral Small vs GPT-3.5** : ~11€/an
- **Mistral Small vs GPT-4** : ~1 074€/an
- **Mistral Nemo vs GPT-4** : ~1 076€/an

---

## 🔄 Retour en arrière

Si vous souhaitez réactiver OpenAI :

### 1. Réactiver dans .env

```bash
# Décommenter la ligne
VITE_OPENAI_API_KEY=sk-votre_cle_openai
```

### 2. Réactiver dans l'interface

1. Allez dans **Paramètres** → **Providers AI**
2. Section **OpenAI**
3. Activez le toggle
4. Testez la connexion

### 3. Redémarrer

```bash
npm run dev
```

---

## 📊 Configuration Multi-Provider (Fallback)

Pour une haute disponibilité, configurez plusieurs providers :

```bash
# .env - Configuration recommandée
VITE_MISTRAL_API_KEY=xxx    # Provider principal
VITE_OPENAI_API_KEY=yyy     # Fallback 1
VITE_OLLAMA_ENDPOINT=zzz    # Fallback 2 (offline)
```

### Ordre de priorité automatique

1. **Mistral AI** (si disponible)
2. **OpenAI** (si Mistral échoue)
3. **Ollama** (si tous échouent)

---

## 🛠️ Configuration avancée

### Modèle par défaut

Modifiez `src/lib/aiModelConfig.ts` :

```typescript
export const DEFAULT_MODEL = 'mistral-small'; // Au lieu de 'gpt-3.5-turbo'
```

### Désactiver le sélecteur OpenAI

Dans `src/components/AIModelSelector.tsx` :

```typescript
const groupedModels = {
  'mistral': Object.entries(AI_MODELS).filter(([_, m]) => m.provider === 'mistral'),
  // 'openai': Object.entries(AI_MODELS).filter(([_, m]) => m.provider === 'openai'), // Commenté
  'ollama': Object.entries(AI_MODELS).filter(([_, m]) => m.provider === 'ollama')
};
```

---

## ❓ FAQ

### Q : Puis-je utiliser les deux en même temps ?

**R :** Oui ! Configurez les deux clés et choisissez le modèle dans l'interface.

### Q : Mistral est-il aussi performant qu'OpenAI ?

**R :** Pour les playbooks Ansible et l'audit DevOps, Mistral est aussi performant, voire meilleur dans certains cas, à un coût 10x inférieur.

### Q : Mes données sont-elles sécurisées avec Mistral ?

**R :** Oui, Mistral respecte le RGPD et stocke les données en Europe (France), contrairement à OpenAI qui est soumis au Cloud Act américain.

### Q : Comment savoir quel provider est utilisé ?

**R :** L'interface affiche toujours le modèle utilisé lors de la génération. Vous pouvez aussi vérifier dans les logs.

### Q : Que se passe-t-il si Mistral est indisponible ?

**R :** Si OpenAI est configuré, il sera utilisé automatiquement en fallback. Sinon, vous verrez une erreur.

### Q : Comment optimiser les coûts ?

**R :**
1. Utilisez `mistral-nemo` pour les tâches simples
2. Utilisez `mistral-small` pour l'audit
3. Réservez `mistral-large` pour les playbooks complexes

---

## 🔗 Liens utiles

- **Console Mistral AI** : https://console.mistral.ai/
- **Documentation Mistral** : https://docs.mistral.ai/
- **Tarifs Mistral** : https://mistral.ai/technology/#pricing
- **Comparaison des modèles** : Voir `AI_MODEL_DECISION_TREE.md`
- **Guide d'intégration complet** : Voir `MISTRAL_INTEGRATION.md`

---

## 📝 Checklist de migration

Avant de passer à Mistral exclusivement :

- [ ] J'ai créé un compte Mistral AI
- [ ] J'ai obtenu ma clé API
- [ ] J'ai configuré VITE_MISTRAL_API_KEY dans .env
- [ ] J'ai désactivé ou supprimé VITE_OPENAI_API_KEY
- [ ] J'ai redémarré l'application
- [ ] J'ai testé la génération d'un playbook
- [ ] La génération fonctionne correctement
- [ ] J'ai vérifié les logs (aucune erreur)
- [ ] J'ai documenté ma configuration

---

## 🎯 Résumé

**En 3 lignes :**

1. Obtenez votre clé Mistral sur [console.mistral.ai](https://console.mistral.ai/)
2. Ajoutez `VITE_MISTRAL_API_KEY=xxx` dans `.env`
3. Commentez `VITE_OPENAI_API_KEY` pour désactiver OpenAI

**Bénéfices :**
- ✅ Coûts divisés par 10
- ✅ Latence réduite de 50%
- ✅ Conformité RGPD européenne
- ✅ Même qualité pour DevOps

**Inconvénients :**
- ⚠️ Moins de cas d'usage non-DevOps documentés
- ⚠️ Communauté plus petite qu'OpenAI

---

**Bon migration ! 🚀**

Pour toute question, consultez `MISTRAL_QUICK_START.md` ou `MISTRAL_INTEGRATION.md`.
