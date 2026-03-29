# Patch appliqué : Gestion des erreurs Yousign

## Problème corrigé

**Avant** : Les erreurs CORS/réseau Yousign étaient ignorées silencieusement
```typescript
if (yousignResponse.status === 0 || errorText.includes('CORS')) {
  console.warn('⚠️ Erreur CORS, on continue quand même');  // ❌ IGNORÉ
} else {
  throw new Error(`Yousign error: ${errorText}`);
}
```

**Conséquence** :
- Contrat créé en base avec `yousign_signature_request_id = NULL`
- Salarié ne reçoit jamais l'email
- Contrat invisible dans le modal salarié
- Aucune trace d'erreur visible

## Solution appliquée

**Fichier modifié** : `src/components/ContractSendModal.tsx` (lignes 780-807)

**Après** : Toutes les erreurs Yousign sont traitées explicitement
```typescript
if (!yousignResponse.ok) {
  const errorText = await yousignResponse.text();
  console.error('❌ Yousign error (status ' + yousignResponse.status + '):', errorText);

  // ✅ Marquer le contrat comme erreur au lieu de l'ignorer silencieusement
  await supabase
    .from('contrat')
    .update({
      statut: 'erreur',
      variables: {
        ...contractData.variables,
        error_yousign: errorText.substring(0, 500),
        error_timestamp: new Date().toISOString()
      }
    })
    .eq('id', contrat.id);

  throw new Error(
    `Impossible de créer la signature Yousign (${yousignResponse.status}): ${errorText.substring(0, 200)}`
  );
}
```

## Avantages du patch

1. **Aucune erreur ignorée** : Toutes les erreurs Yousign remontent à l'utilisateur
2. **Traçabilité** : Erreur stockée dans `contrat.variables.error_yousign`
3. **Détection facile** : Contrats en erreur ont `statut = 'erreur'`
4. **Aucune perte de données** : Le contrat reste en base pour investigation
5. **Pas de migration SQL nécessaire** : Utilise le champ `variables` existant

## Détection des contrats en erreur

```sql
-- Chercher les contrats en erreur Yousign
SELECT
  c.id,
  c.profil_id,
  p.prenom || ' ' || p.nom as nom_complet,
  c.statut,
  c.variables->>'error_yousign' as erreur,
  c.variables->>'error_timestamp' as date_erreur,
  c.created_at
FROM public.contrat c
LEFT JOIN public.profil p ON p.id = c.profil_id
WHERE c.statut = 'erreur'
ORDER BY c.created_at DESC;
```

## Contrats orphelins existants

```sql
-- Chercher les contrats créés mais jamais envoyés à Yousign
SELECT
  c.id,
  c.profil_id,
  p.prenom || ' ' || p.nom as nom_complet,
  c.statut,
  c.source,
  c.yousign_signature_request_id,
  c.created_at
FROM public.contrat c
LEFT JOIN public.profil p ON p.id = c.profil_id
WHERE c.yousign_signature_request_id IS NULL
  AND c.statut IN ('envoye', 'signe', 'en_attente_signature')
  AND c.source IS DISTINCT FROM 'manuel'
  AND c.source IS DISTINCT FROM 'import'
ORDER BY c.created_at DESC
LIMIT 50;
```

## Impact

- **Build** : ✅ OK (aucune erreur de compilation)
- **Existant** : ✅ Aucune régression (code existant non affecté)
- **Nouveaux contrats** : ✅ Erreurs maintenant visibles
- **Database schema** : ✅ Aucune modification nécessaire

## Prochaines étapes recommandées

1. **Corriger les contrats orphelins existants** :
   - Identifier les salariés concernés
   - Recréer/renvoyer les contrats Yousign

2. **Ajouter monitoring** :
   - Dashboard admin pour voir les contrats en erreur
   - Alert email si erreur Yousign détectée

3. **Documentation utilisateur** :
   - Guider les admins sur la gestion des contrats en erreur
   - Procédure de renvoi manuel si nécessaire
