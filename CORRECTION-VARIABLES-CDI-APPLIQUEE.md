# Correction appliquée : Variables CDI

## Problème identifié

Les scripts SQL et la fonction Edge utilisaient des noms de colonnes incorrects :
- ❌ `numero_piece_identite` (n'existe pas)
- ❌ `numero_securite_sociale` (n'existe pas)

Le bon nom de colonne dans la table `profil` est :
- ✅ `nir` (Numéro d'Inscription au Répertoire = Numéro de sécurité sociale)

## Fichiers corrigés

### 1. Script SQL de vérification
**Fichier :** `VERIFIER-DONNEES-PROFIL-CDI.sql`

**Changements :**
- Remplacé `numero_piece_identite` par `nir`
- Remplacé `numero_securite_sociale` par `nir`
- Mis à jour l'exemple de mise à jour

### 2. Fonction Edge Yousign
**Fichier :** `supabase/functions/create-yousign-signature/index.ts`

**Changements :**
- Ligne 95 : `mapped["id_number"] = pickFirst(vars.id_number, vars.nir, "");`
- Ligne 573 : `nir: contract.profil?.nir,`
- Ligne 594 : `id_number: contract.profil?.nir || rawVars.id_number || "",`

### 3. Documentation
**Fichiers :**
- `FIX-VARIABLES-CDI-NON-REMPLIES.md`
- `SOLUTION-VARIABLES-CDI.md`

**Changements :**
- Toutes les références à "Numéro de pièce d'identité / Sécurité sociale" → "NIR (Numéro de sécurité sociale)"
- Clarification que `{{id_number}}` correspond au NIR

## Action immédiate requise

### Redéployer la fonction Edge

La fonction mise à jour doit être redéployée :

```bash
cd /tmp/cc-agent/59041934/project
supabase functions deploy create-yousign-signature
```

Ou via l'interface Supabase :
1. Dashboard > Edge Functions
2. create-yousign-signature
3. Deploy

### Tester le script SQL

Exécutez le script corrigé pour vérifier un profil :

```sql
-- Remplacez 'MATRICULE_ICI' par un vrai matricule
SELECT * FROM profil WHERE matricule_tca = 'VOTRE_MATRICULE';
```

Si le champ `nir` est NULL ou vide, remplissez-le :

```sql
UPDATE profil
SET nir = '1900115012345'  -- 15 chiffres
WHERE matricule_tca = 'VOTRE_MATRICULE';
```

## Vérification finale

1. **Redéployez** la fonction Edge
2. **Exécutez** `VERIFIER-DONNEES-PROFIL-CDI.sql` avec un vrai matricule
3. **Vérifiez** que tous les champs affichent ✅
4. **Créez** un nouveau contrat CDI de test
5. **Vérifiez** les logs Supabase (Edge Functions > Logs)
6. **Vérifiez** le PDF généré

## Résultat attendu

Dans les logs Supabase, vous devriez voir :

```json
🔍 PROFIL DATA FROM DB: {
  "nir": "1900115012345",  // ✅ Rempli
  // ... autres champs
}

✅ ENRICHED VARIABLES: {
  "id_number": "1900115012345",  // ✅ Rempli
  // ... autres variables
}
```

Le PDF généré doit afficher le NIR à la place de `{{id_number}}`.
