# 🤖 Intégration Mistral AI pour CortexOps

## Vue d'ensemble

CortexOps supporte maintenant plusieurs modèles AI pour la génération de playbooks Ansible, avec **Mistral AI** comme provider recommandé pour les cas d'usage DevOps.

## 🎯 Modèles Mistral recommandés

### 1. **mistral-large-latest** - Génération Premium
- **Usage** : Génération de playbooks complexes, projets production
- **Avantages** : Structure parfaite, compréhension approfondie du contexte
- **Coût** : ~$0.008 / 1K tokens
- **Quand l'utiliser** :
  - Playbooks multi-environnements complexes
  - Intégrations CI/CD avancées
  - Blueprints enterprise avec sécurité renforcée
  - Projets critiques en production

### 2. **mistral-small-latest** - Audit & Corrections
- **Usage** : Validation, audit de sécurité, corrections YAML
- **Avantages** : Très rapide, précis pour les tâches ciblées
- **Coût** : ~$0.002 / 1K tokens (4× moins cher)
- **Quand l'utiliser** :
  - Audit de playbooks existants
  - Correction d'erreurs YAML
  - Validation de syntaxe Ansible
  - Suggestions d'optimisation

### 3. **open-mistral-nemo** - Usage quotidien
- **Usage** : Prototypage, tests, génération standard
- **Avantages** : Excellent rapport qualité/prix
- **Coût** : ~$0.002 / 1K tokens
- **Quand l'utiliser** :
  - Développement et prototypage
  - Tests et expérimentation
  - Playbooks simples à moyens
  - Budget limité

### 4. **mistral:7b via Ollama** - Mode Offline
- **Usage** : On-premise, sans connexion, données sensibles
- **Avantages** : Gratuit, privé, fonctionne offline
- **Coût** : Aucun (nécessite ressources locales)
- **Quand l'utiliser** :
  - Environnements on-premise stricts
  - Travail sans connexion internet
  - Données hautement confidentielles
  - Éviter les coûts API

## 🚀 Installation et Configuration

### Option 1 : Mistral Cloud API (Recommandé)

1. **Obtenir une clé API Mistral** :
   ```bash
   # Créez un compte sur https://console.mistral.ai/
   # Puis générez une clé API
   ```

2. **Configurer la clé dans .env** :
   ```env
   VITE_MISTRAL_API_KEY=your-mistral-api-key-here
   ```

3. **Tester la connexion** :
   ```bash
   npm run dev
   # Dans l'interface, allez dans Paramètres → Modèles AI
   # Cliquez sur "Tester connexions"
   ```

### Option 2 : Ollama Local (Mode Offline)

1. **Installer Ollama** :
   ```bash
   # Linux / macOS
   curl -fsSL https://ollama.com/install.sh | sh

   # Windows (via WSL ou installateur)
   # Téléchargez depuis https://ollama.com/download
   ```

2. **Télécharger Mistral 7B** :
   ```bash
   ollama pull mistral:7b
   ```

3. **Démarrer Ollama** :
   ```bash
   ollama serve
   ```

4. **Configurer l'endpoint** :
   ```env
   VITE_OLLAMA_ENDPOINT=http://localhost:11434
   ```

## 💡 Exemples d'utilisation

### Exemple 1 : Génération avec Mistral Large

```typescript
import { useAIModel } from '../hooks/useAIModel';

function PlaybookGenerator() {
  const { generate, selectedModel } = useAIModel({
    defaultModel: 'mistral-large'
  });

  const generatePlaybook = async () => {
    const response = await generate(
      'Créer un playbook pour déployer une stack LAMP sécurisée',
      'Tu es un expert Ansible. Génère des playbooks professionnels avec best practices.'
    );

    console.log('Playbook généré:', response.content);
    console.log('Coût:', response.cost);
  };
}
```

### Exemple 2 : Audit avec Mistral Small

```typescript
const { generate } = useAIModel({ defaultModel: 'mistral-small' });

const auditPlaybook = async (playbook: string) => {
  const response = await generate(
    `Audite ce playbook et identifie les problèmes de sécurité:\n\n${playbook}`,
    'Tu es un auditeur de sécurité Ansible. Identifie les vulnérabilités.'
  );

  return response.content;
};
```

### Exemple 3 : Mode Offline avec Ollama

```typescript
const { generate } = useAIModel({ defaultModel: 'mistral-7b-local' });

const generateOffline = async () => {
  try {
    const response = await generate(
      'Créer un playbook basique pour installer nginx'
    );

    console.log('Généré offline:', response.content);
  } catch (error) {
    console.error('Ollama non disponible:', error);
  }
};
```

## 🔧 Intégration dans les composants

### Utiliser le sélecteur de modèle

```tsx
import { AIModelSelector } from '../components/AIModelSelector';
import { useAIModel } from '../hooks/useAIModel';

function MyComponent() {
  const { selectedModel, setSelectedModel, generate } = useAIModel();

  return (
    <div>
      <AIModelSelector
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        estimatedTokens={2000}
      />

      <button onClick={() => generate('Mon prompt')}>
        Générer avec {selectedModel}
      </button>
    </div>
  );
}
```

## 📊 Comparaison des modèles

| Modèle | Coût/1K tokens | Vitesse | Qualité | Offline | Use Case Principal |
|--------|----------------|---------|---------|---------|-------------------|
| mistral-large-latest | $0.008 | Moyenne | ⭐⭐⭐⭐⭐ | ❌ | Production complexe |
| mistral-small-latest | $0.002 | Rapide | ⭐⭐⭐⭐ | ❌ | Audit & corrections |
| open-mistral-nemo | $0.002 | Rapide | ⭐⭐⭐⭐ | ❌ | Usage quotidien |
| mistral:7b (Ollama) | Gratuit | Moyenne | ⭐⭐⭐ | ✅ | On-premise / offline |

## 🎓 Best Practices

### 1. Choisir le bon modèle selon le contexte

```typescript
function getRecommendedModel(task: string) {
  if (task.includes('audit') || task.includes('correct')) {
    return 'mistral-small';
  }
  if (task.includes('complex') || task.includes('enterprise')) {
    return 'mistral-large';
  }
  return 'mistral-nemo'; // Default
}
```

### 2. Gérer les erreurs API

```typescript
const { generate, error } = useAIModel({
  onError: (err) => {
    if (err.message.includes('API key')) {
      console.error('Clé API invalide ou manquante');
    } else if (err.message.includes('quota')) {
      console.error('Quota API dépassé');
    }
  }
});
```

### 3. Optimiser les coûts

```typescript
// Pour les tâches simples, utilisez le modèle le plus économique
const simpleTask = async (prompt: string) => {
  const { generate } = useAIModel({ defaultModel: 'mistral-nemo' });
  return await generate(prompt, undefined, {
    maxTokens: 500 // Limiter les tokens
  });
};
```

### 4. Cache et réutilisation

```typescript
// Mettez en cache les résultats pour éviter les appels redondants
const cache = new Map<string, AIGenerationResponse>();

const generateWithCache = async (prompt: string) => {
  if (cache.has(prompt)) {
    return cache.get(prompt);
  }

  const response = await generate(prompt);
  cache.set(prompt, response);
  return response;
};
```

## 🔒 Sécurité

### Variables d'environnement
- ✅ Stockez les clés API dans `.env` (jamais en dur dans le code)
- ✅ Utilisez `.env.local` pour le développement
- ✅ Ne committez JAMAIS les fichiers `.env` dans Git

### Mode On-Premise
- Pour les données sensibles, utilisez **Ollama** en local
- Aucune donnée n'est envoyée à des services cloud
- Contrôle total sur l'infrastructure

## 📈 Monitoring et Analytics

### Suivre les coûts

```typescript
import { calculateEstimatedCost } from '../lib/aiModelConfig';

const estimatedCost = calculateEstimatedCost('mistral-large', 2000);
console.log(`Coût estimé: $${estimatedCost.toFixed(4)}`);
```

### Tracker les performances

```typescript
const { lastResponse } = useAIModel();

if (lastResponse) {
  console.log('Temps de traitement:', lastResponse.processingTime, 'ms');
  console.log('Tokens utilisés:', lastResponse.tokensUsed);
  console.log('Coût réel:', lastResponse.cost);
}
```

## 🆘 Troubleshooting

### Problème : "Clé API Mistral manquante"
**Solution** : Vérifiez que `VITE_MISTRAL_API_KEY` est défini dans `.env`

### Problème : "Ollama error: ECONNREFUSED"
**Solution** : Démarrez Ollama avec `ollama serve` ou vérifiez l'endpoint

### Problème : "Quota exceeded"
**Solution** : Vérifiez votre compte Mistral ou basculez sur Ollama local

### Problème : Génération trop lente
**Solution** : Utilisez `mistral-small` ou `mistral-nemo` au lieu de `mistral-large`

## 📚 Ressources

- [Documentation Mistral AI](https://docs.mistral.ai/)
- [Console Mistral](https://console.mistral.ai/)
- [Ollama Documentation](https://github.com/ollama/ollama)
- [Pricing Mistral](https://mistral.ai/pricing/)

## 🤝 Contribution

Pour ajouter un nouveau modèle, éditez `src/lib/aiModelConfig.ts` :

```typescript
export const AI_MODELS: Record<string, AIModelConfig> = {
  'my-new-model': {
    provider: 'mistral',
    model: 'my-model-name',
    description: 'Description du modèle',
    useCases: ['Use case 1', 'Use case 2'],
    costPerToken: 0.000001,
    maxTokens: 16000,
    temperature: 0.7,
    requiresApiKey: true
  }
};
```
