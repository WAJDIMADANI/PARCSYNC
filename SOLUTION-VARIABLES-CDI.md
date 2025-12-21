# Solution : Variables CDI non remplies

## Qu'est-ce qui a été corrigé

La fonction Yousign `create-yousign-signature` a été mise à jour pour :
1. Mieux récupérer les variables depuis le profil
2. Ajouter des logs détaillés pour le diagnostic
3. Supporter plusieurs noms de champs (nom/last_name, prenom/first_name, etc.)

## Que faire maintenant

### Étape 1 : Redéployer la fonction (IMPORTANT)

La fonction mise à jour doit être redéployée. Allez dans le dossier du projet et exécutez :

```bash
cd supabase/functions/create-yousign-signature
supabase functions deploy create-yousign-signature
```

Ou via l'interface Supabase :
1. Dashboard > Edge Functions
2. create-yousign-signature
3. Cliquez sur "Deploy"

### Étape 2 : Vérifier les données du profil

Utilisez le script SQL `VERIFIER-DONNEES-PROFIL-CDI.sql` :

1. Ouvrez l'éditeur SQL de Supabase
2. Copiez le contenu du fichier
3. Remplacez `'MATRICULE_ICI'` par le matricule du salarié
4. Exécutez

**Résultat attendu :**
- Toutes les lignes doivent afficher ✅
- Si vous voyez des ❌, les données sont manquantes dans la base

### Étape 3 : Compléter les données manquantes

Si des données sont manquantes :

1. Allez dans l'interface RH
2. Ouvrez la fiche du salarié concerné
3. Remplissez TOUS les champs :
   - Nom
   - Prénom
   - Date de naissance
   - Lieu de naissance
   - Nationalité
   - Adresse complète (rue, code postal, ville)
   - Numéro de pièce d'identité OU numéro de sécurité sociale
4. Enregistrez

### Étape 4 : Vérifier la date de début du contrat

Pour les contrats CDI, assurez-vous que la date de début est renseignée :

```sql
SELECT id, type, date_debut, statut
FROM contrat
WHERE profil_id = (SELECT id FROM profil WHERE matricule_tca = 'MATRICULE_ICI')
AND LOWER(type) = 'cdi';
```

Si `date_debut` est NULL, mettez-la à jour :

```sql
UPDATE contrat
SET date_debut = '2025-01-15'  -- Changez la date
WHERE id = 'ID_DU_CONTRAT';
```

### Étape 5 : Tester avec un nouveau contrat

1. Créez un nouveau contrat CDI via Yousign
2. Pendant la création, ouvrez les logs Supabase :
   - Dashboard > Edge Functions > create-yousign-signature > Logs
3. Vérifiez que les sections affichent les bonnes données :
   - **PROFIL DATA FROM DB** : toutes les infos du profil
   - **CONTRACT DATA FROM DB** : date_debut présente
   - **ENRICHED VARIABLES** : toutes les variables remplies
   - **PROFIL MAPPING** : dates formatées en DD-MM-YYYY
4. Vérifiez le PDF généré

### Étape 6 : Si ça ne fonctionne toujours pas

Regardez les logs Supabase et identifiez la section vide :

- **Si PROFIL DATA FROM DB est vide** → Données manquantes dans la base
- **Si CONTRACT DATA FROM DB.date_debut est vide** → Date de début du contrat non renseignée
- **Si ENRICHED VARIABLES est vide** → Problème de récupération depuis la base

Envoyez-moi une capture des logs et je vous aiderai.

## Fichiers créés

1. **FIX-VARIABLES-CDI-NON-REMPLIES.md** - Guide complet avec diagnostic détaillé
2. **VERIFIER-DONNEES-PROFIL-CDI.sql** - Script SQL pour vérifier les données
3. **SOLUTION-VARIABLES-CDI.md** - Ce fichier (résumé de la solution)

## Variables supportées dans les templates

Toutes les variables standard sont maintenant supportées :
- `{{first_name}}`, `{{last_name}}`
- `{{birthday}}` (format DD-MM-YYYY automatique)
- `{{birthplace}}`, `{{nationality}}`
- `{{address_1}}`, `{{zip}}`, `{{city}}`
- `{{id_number}}`
- `{{contract_start}}` (format DD-MM-YYYY automatique)
- `{{contract_end}}` (pour CDD)

La variable `{{s1|signature|180|60}}` ne doit PAS être dans votre template - Yousign gère la signature.

## Résumé en 3 étapes

1. Redéployez la fonction Edge
2. Vérifiez que les données du profil sont complètes dans la base
3. Testez avec un nouveau contrat CDI et vérifiez les logs
