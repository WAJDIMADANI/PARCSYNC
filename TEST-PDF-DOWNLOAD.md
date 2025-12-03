# Test du téléchargement de PDF après le fix

## Ce qui a été corrigé

1. ✅ **Fichier config.toml créé** - Configure la fonction pour accepter les requêtes publiques
2. ✅ **Fonction modifiée** - Retourne maintenant le PDF directement pour les requêtes GET
3. ✅ **Sécurité maintenue** - Le contractId UUID agit comme token de sécurité

## Avant de tester

**IMPORTANT:** Vous devez redéployer la fonction sur Supabase avec l'option `--no-verify-jwt`

### Via Dashboard Supabase:
1. Allez sur: https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr/functions
2. Sélectionnez `generate-contract-pdf`
3. Cliquez sur "Deploy" et activez "Disable JWT verification"

### Via CLI (si Supabase CLI installé):
```bash
supabase functions deploy generate-contract-pdf --no-verify-jwt
```

## Test 1: Requête GET (depuis email)

**URL de test:**
```
https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/generate-contract-pdf?contractId=413870ec-750a-43a9-ab97-b364fc744cbe
```

**Résultat attendu:**
- ✅ Le navigateur télécharge automatiquement un fichier PDF
- ✅ Le nom du fichier: `[Prenom]_[Nom]_[Date].pdf`
- ✅ Le PDF contient les informations du contrat
- ❌ PLUS d'erreur "Missing authorization header"

## Test 2: Depuis l'application (POST)

La fonction continue de fonctionner normalement pour les appels POST depuis l'application:

```javascript
// Appel POST pour générer et stocker le PDF
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/generate-contract-pdf`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contractId: '...' })
  }
);
```

**Résultat attendu:**
- ✅ Retourne un JSON avec le chemin du fichier dans storage
- ✅ Le contrat est mis à jour avec le chemin du fichier

## Test 3: Email complet

1. Envoyer un nouveau contrat à un employé
2. L'employé reçoit l'email avec le lien
3. Cliquer sur "Télécharger le contrat"
4. Le PDF se télécharge directement

## Comportement de la fonction

### GET (depuis email - SANS auth):
- Extrait contractId des query params
- Génère le PDF à la volée
- Retourne le PDF directement avec header `Content-Disposition: attachment`
- Ne stocke PAS le fichier (génération à la demande)

### POST (depuis app - AVEC auth):
- Reçoit contractId dans le body
- Génère le PDF
- Stocke dans Supabase Storage
- Met à jour la table contrat
- Retourne le chemin du fichier

## En cas de problème

### Erreur 401 persiste
→ La fonction n'a pas été redéployée avec `--no-verify-jwt`

### Erreur 500
→ Vérifier les logs Supabase: Dashboard > Edge Functions > generate-contract-pdf > Logs

### PDF vide ou incomplet
→ Vérifier que les variables du contrat sont bien remplies dans la base

## Logs à vérifier

Sur Supabase Dashboard > Edge Functions > generate-contract-pdf > Logs

Rechercher:
- ✅ "Contract ID: ..." (confirmation de la requête)
- ✅ "PDF generated successfully"
- ❌ "Missing authorization header" (ne devrait plus apparaître)
- ❌ "Contract not found" (vérifier l'ID)
