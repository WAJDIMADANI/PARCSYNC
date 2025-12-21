# Fix: Variables CDI non remplies - Guide de diagnostic

## Le problème

Dans les contrats CDI générés via Yousign, certaines variables ne sont pas remplies ({{last_name}}, {{first_name}}, {{contract_start}}, etc.).

## Solution déployée

La fonction `create-yousign-signature` a été mise à jour avec :

### 1. Meilleur mapping des variables

Avant, seuls certains noms de champs étaient supportés. Maintenant, la fonction utilise `pickFirst()` pour essayer plusieurs noms :

```typescript
mapped["first_name"] = pickFirst(vars.first_name, vars.prenom, "");
mapped["last_name"] = pickFirst(vars.last_name, vars.nom, "");
mapped["birthday"] = pickFirst(vars.birthday, vars.date_naissance, "");
mapped["id_number"] = pickFirst(vars.id_number, vars.numero_piece_identite, vars.numero_securite_sociale, "");
```

### 2. Logs de diagnostic ajoutés

La fonction affiche maintenant dans les logs Supabase :

- **PROFIL DATA FROM DB** : toutes les données du profil récupérées depuis la base de données
- **CONTRACT DATA FROM DB** : les données du contrat (date_debut, date_fin, type)
- **ENRICHED VARIABLES** : les variables finales envoyées au template
- **PROFIL MAPPING** : le résultat du mapping (ce qui est écrit dans le DOCX)
- **CONTRACT DATES MAPPING** : les dates du contrat mappées

### 3. Enrichissement des variables

La fonction enrichit automatiquement les variables avec les données du profil :

```typescript
const enriched = {
  ...rawVars, // Variables du front

  // Données du profil (priorité haute)
  first_name: contract.profil?.prenom || rawVars.first_name || "",
  last_name: contract.profil?.nom || rawVars.last_name || "",
  birthday: contract.profil?.date_naissance || rawVars.birthday || "",
  // ... etc

  // Date de début (avec fallback)
  contract_start: pickFirst(
    rawVars.contract_start,
    contract.date_debut // ✅ Fallback sur la date du contrat
  ),
};
```

## Comment diagnostiquer

### Étape 1 : Vérifier les logs Supabase

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Cliquez sur "Edge Functions" > "create-yousign-signature"
4. Cliquez sur "Logs"
5. Générez un contrat CDI via Yousign
6. Regardez les logs en temps réel

### Étape 2 : Analyser les logs

Cherchez ces sections dans les logs :

#### A) PROFIL DATA FROM DB
```json
{
  "prenom": "Mohamed",  // ✅ OK
  "nom": "Moba",        // ✅ OK
  "date_naissance": "1990-01-15",  // ✅ OK
  "lieu_naissance": "Paris",       // ✅ OK
  "nationalite": "Française",      // ✅ OK
  "adresse": "123 rue Example",    // ✅ OK
  "ville": "Paris",                // ✅ OK
  "code_postal": "75001",          // ✅ OK
  "numero_piece_identite": "AB123456" // ✅ OK
}
```

**Si ces champs sont vides (null ou "") :**
- Le profil dans la base de données n'est pas rempli
- Il faut compléter les informations du salarié dans l'interface

#### B) CONTRACT DATA FROM DB
```json
{
  "date_debut": "2025-01-15",  // ✅ OK
  "date_fin": null,            // ✅ OK pour CDI
  "type": "CDI"                // ✅ OK
}
```

**Si date_debut est vide :**
- Le contrat n'a pas de date de début
- Il faut renseigner la date de début du contrat

#### C) ENRICHED VARIABLES
```json
{
  "first_name": "Mohamed",
  "last_name": "Moba",
  "birthday": "1990-01-15",
  "contract_start": "2025-01-15",
  // ... etc
}
```

**Si les variables sont vides ici :**
- Elles sont vides dans la base de données
- Le mapping ne peut pas créer des données qui n'existent pas

#### D) PROFIL MAPPING
```json
{
  "first_name": "Mohamed",
  "last_name": "Moba",
  "birthday": "15-01-1990",        // ✅ Formaté en DD-MM-YYYY
  "contract_start": "15-01-2025",  // ✅ Formaté en DD-MM-YYYY
  // ... etc
}
```

**C'est ce qui est écrit dans le DOCX final.**

## Solutions selon le diagnostic

### Cas 1 : PROFIL DATA FROM DB est vide

**Problème** : Les données du salarié ne sont pas dans la base de données.

**Solution** :
1. Allez dans l'interface RH
2. Ouvrez la fiche du salarié
3. Remplissez tous les champs obligatoires :
   - Nom
   - Prénom
   - Date de naissance
   - Lieu de naissance
   - Nationalité
   - Adresse complète
   - Numéro de pièce d'identité / Sécurité sociale

### Cas 2 : CONTRACT DATA FROM DB.date_debut est vide

**Problème** : Le contrat n'a pas de date de début.

**Solution** :
1. Allez dans l'interface des contrats
2. Ouvrez le contrat
3. Renseignez la date de début du contrat
4. Enregistrez

### Cas 3 : Variables transmises via le front

**Problème** : Les variables ne sont pas envoyées par le front lors de la création du contrat.

**Solution** :
1. Vérifiez que le formulaire de création de contrat envoie bien toutes les variables
2. Vérifiez que le champ `variables` du contrat contient les bonnes données

## Redéploiement de la fonction

La fonction a été mise à jour. Pour la redéployer manuellement :

```bash
cd supabase/functions/create-yousign-signature
supabase functions deploy create-yousign-signature
```

Ou utilisez l'interface Supabase Dashboard > Edge Functions > Deploy.

## Test rapide

Créez un contrat CDI de test et vérifiez dans les logs que :
1. PROFIL DATA FROM DB contient toutes les infos
2. CONTRACT DATA FROM DB contient la date_debut
3. ENRICHED VARIABLES contient toutes les variables
4. PROFIL MAPPING affiche les dates au format DD-MM-YYYY
5. Le PDF généré contient bien toutes les informations

## Variables supportées dans le template CDI

Toutes les variables du template sont maintenant supportées :
- `{{first_name}}` - Prénom
- `{{last_name}}` - Nom
- `{{birthday}}` - Date de naissance (DD-MM-YYYY)
- `{{birthplace}}` - Lieu de naissance
- `{{nationality}}` - Nationalité
- `{{address_1}}` - Adresse
- `{{zip}}` - Code postal
- `{{city}}` - Ville
- `{{id_number}}` - Numéro pièce d'identité ou sécu
- `{{contract_start}}` - Date de début du contrat (DD-MM-YYYY)

**La variable `{{s1|signature|180|60}}` ne doit PAS être remplie** - c'est Yousign qui gère la signature électronique.
