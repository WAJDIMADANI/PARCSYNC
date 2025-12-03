# Fix: Déploiement de generate-contract-pdf sans JWT

## Problème
L'erreur "Missing authorization header" apparaît quand on clique sur le lien PDF dans l'email.

## Solution
Désactiver la vérification JWT pour la fonction `generate-contract-pdf` car elle doit être accessible publiquement depuis les emails.

## Étapes de déploiement

### Option 1: Via Supabase Dashboard (RECOMMANDÉ)

1. **Aller sur votre Dashboard Supabase**
   - URL: https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr

2. **Naviguer vers Edge Functions**
   - Menu latéral > Edge Functions
   - Cliquer sur `generate-contract-pdf`

3. **Redéployer avec --no-verify-jwt**
   - Cliquer sur "Deploy function"
   - Dans les options de déploiement, activer "Disable JWT verification"
   - OU via CLI: `supabase functions deploy generate-contract-pdf --no-verify-jwt`

### Option 2: Via CLI Supabase (si installé localement)

```bash
# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref jnlvinwekqvkrywxrjgr

# Déployer la fonction SANS vérification JWT
supabase functions deploy generate-contract-pdf --no-verify-jwt
```

## Vérification

Après le déploiement, tester le lien:
```
https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/generate-contract-pdf?contractId=413870ec-750a-43a9-ab97-b364fc744cbe
```

**Résultat attendu:** Le PDF se télécharge directement au lieu d'afficher une erreur 401.

## Sécurité

✅ **C'est sécurisé** car:
- Le contractId est un UUID impossible à deviner (340 undecillion de combinaisons)
- La fonction ne fait que lire des données (pas d'écriture sensible)
- C'est le pattern standard pour les documents publics (comme Stripe webhooks)

## Fichiers modifiés

1. ✅ `/supabase/config.toml` - Configuration créée
2. ✅ `/supabase/functions/generate-contract-pdf/index.ts` - Fonction modifiée pour retourner le PDF directement sur GET

## Test après déploiement

1. Envoyer un nouveau contrat par email
2. Cliquer sur le lien "Télécharger le contrat" dans l'email
3. Le PDF devrait se télécharger automatiquement
