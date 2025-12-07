# Corrections de l'aperçu des courriers

## Problèmes identifiés et corrigés

### 1. ✅ Formatage incorrect des nombres
**Problème:** Les nombres comme "987" et "93120" étaient transformés en dates (ex: "01/01/987")

**Cause:** La fonction `formatCustomValue()` tentait de parser tous les nombres comme des dates

**Solution:** Modification de `src/lib/letterTemplateGenerator.ts` pour ne formater en date que les chaînes contenant des séparateurs de date (-, /, T)

**Résultat:** Les nombres restent des nombres (987 km, code postal 93120, etc.)

### 2. ✅ "[Non renseigné]" pour la civilité
**Problème:** Quand le genre n'était pas renseigné, "[Non renseigné]" apparaissait dans les formules

**Cause:** La civilité était une chaîne vide et `formatCustomValue()` la transformait en "[Non renseigné]"

**Solution:** Modification de `formatProfileData()` pour utiliser "Madame, Monsieur" comme valeur par défaut neutre

**Résultat:** Plus de "[Non renseigné]" dans les formules de politesse

### 3. ⚠️ Contenu dupliqué dans le template
**Problème:** Le template "1er Avertissement utilisation du véhicule" contient des éléments structurels qui sont ajoutés automatiquement par le générateur de PDF:
- En-tête de l'entreprise
- Adresse du destinataire
- "Objet:" (apparaît 2 fois)
- "Lettre recommandée avec accusé de réception"
- Formule de politesse finale
- Signature

**Cause:** Le template en base de données contient tout le document au lieu de juste le corps de la lettre

**Solution:** Un fichier SQL a été créé pour corriger le template: `fix-template-1er-avertissement-vehicule.sql`

## Action requise

### Corriger le template en base de données

1. Ouvrez Supabase Dashboard → SQL Editor

2. Copiez et exécutez le contenu du fichier `fix-template-1er-avertissement-vehicule.sql`

3. Le template sera mis à jour pour ne contenir que le corps de la lettre

## Comment ça fonctionne

### Structure d'un template correct

Un template de courrier doit contenir **UNIQUEMENT** le corps de la lettre en HTML, sans:
- ❌ En-tête de l'entreprise (ajouté automatiquement)
- ❌ Adresse du destinataire (ajoutée automatiquement)
- ❌ "Objet:" (ajouté automatiquement depuis le champ `sujet`)
- ❌ Formule d'appel comme "Madame," (ajoutée automatiquement selon la civilité)
- ❌ Formule de politesse finale (ajoutée automatiquement)
- ❌ Signature (ajoutée automatiquement)

### Exemple de template correct

```html
<p>Malgré les règles strictes en vigueur concernant l'utilisation du véhicule de service, nous avons constaté une infraction à ces règles. En effet, le {{date_incident}}, entre {{heure_debut_incident}} et {{heure_fin_incident}}, vous avez utilisé le véhicule de service pour un trajet de {{km_non_autorises}} km non autorisé.</p>

<p>Nous vous rappelons qu'en tant que {{poste}}, vous êtes soumis à des règles précises...</p>

<p>En conséquence, nous vous adressons ce premier avertissement.</p>
```

### Ce qui est ajouté automatiquement

Le générateur de PDF (`administrativeLetterGenerator.ts`) ajoute:

1. **En-tête** avec nom, adresse, SIRET de l'entreprise
2. **Date et lieu** (ex: "À Paris, le 07/12/2025")
3. **Adresse du destinataire**
4. **Objet** avec "Lettre recommandée avec accusé de réception"
5. **Formule d'appel** ("Madame," / "Monsieur," / "Madame, Monsieur,")
6. **Votre contenu HTML**
7. **Formule de politesse** ("Veuillez agréer, [civilité], l'expression de nos salutations distinguées.")
8. **Signature** avec nom et fonction du signataire
9. **Pied de page** avec numéro de page

## Test après correction

Après avoir exécuté le fichier SQL:

1. Rafraîchissez la page de génération de courrier
2. Sélectionnez le template "1er Avertissement utilisation du véhicule"
3. Remplissez les variables
4. Vérifiez l'aperçu:
   - ✅ Les nombres doivent rester des nombres (987 km)
   - ✅ La civilité doit être "Madame, Monsieur" si le genre n'est pas renseigné
   - ✅ L'objet ne doit apparaître qu'une seule fois
   - ✅ La signature ne doit apparaître qu'une seule fois
   - ✅ Pas de contenu dupliqué

## Fichiers modifiés

- ✅ `src/lib/letterTemplateGenerator.ts` (corrections automatiques)
- 📝 `fix-template-1er-avertissement-vehicule.sql` (à exécuter manuellement)

## Note sur les autres templates

Si vous avez créé d'autres templates personnalisés, vérifiez qu'ils suivent la même structure:
- Corps uniquement en HTML
- Variables entre `{{double_accolades}}`
- Pas d'éléments structurels (en-tête, objet, signature)

Pour référence, consultez `insert-example-letter-templates.sql` qui contient des exemples de templates bien formatés.
