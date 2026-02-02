# Guide Final : Affichage du Nom du Locataire

## Problème
L'interface affiche "Non défini" au lieu du nom du chauffeur principal car la colonne calculée `locataire_affiche` n'existe pas encore dans la vue SQL.

## Solution

### Étape 1 : Exécuter le SQL (3 minutes)

1. **Ouvrir l'éditeur SQL de Supabase**
   - Aller sur : https://supabase.com/dashboard
   - Sélectionner votre projet
   - Menu latéral → **SQL Editor**

2. **Exécuter la migration**
   - Ouvrir le fichier : `EXECUTER-MAINTENANT-vue-locataire-affiche.sql`
   - Copier tout le contenu
   - Coller dans l'éditeur SQL de Supabase
   - Cliquer sur **Run** (ou Ctrl+Enter)

3. **Vérifier le succès**
   - Vous devriez voir des messages verts avec ✓
   - Un tableau s'affiche avec les 5 derniers véhicules
   - La colonne `locataire_affiche` doit contenir les noms

### Étape 2 : Tester l'application (2 minutes)

1. **Rafraîchir la page** de votre application (F5 ou Ctrl+R)

2. **Aller sur la page "Parc Automobile"**

3. **Créer une attribution principale** :
   - Cliquer sur un véhicule → bouton "Voir"
   - Onglet "Attributions actuelles"
   - Cliquer sur "Nouvelle attribution"
   - Choisir "Salarié TCA"
   - Sélectionner un chauffeur (ex: Misba MOHAMMAD)
   - Type d'attribution : **Principal**
   - Cliquer sur "Confirmer l'attribution"

4. **Vérifier l'affichage** :
   - Dans le modal, section "Locataire actuel" → doit afficher "Misba MOHAMMAD (XXX)"
   - Fermer le modal
   - Dans le tableau, colonne "Nom du locataire" → badge bleu avec le nom du chauffeur

## Comment ça marche

### Vue SQL `v_vehicles_list`
La vue calcule automatiquement `locataire_affiche` en fonction de :

```sql
CASE
  -- Si attribution principale active existe → nom du chauffeur
  WHEN EXISTS (attribution principale ET date_fin IS NULL)
    THEN 'Prénom NOM (Matricule TCA)'

  -- Sinon types manuels
  WHEN locataire_type = 'epave' THEN 'EPAVE'
  WHEN locataire_type = 'sur_parc' THEN 'Sur parc'
  WHEN locataire_type = 'vendu' THEN 'Vendu'
  WHEN locataire_type = 'libre' THEN locataire_nom_libre

  -- Par défaut
  ELSE 'Non défini'
END
```

### Frontend React
Le composant `VehicleListNew.tsx` lit directement `vehicle.locataire_affiche` :

```typescript
const getLocataireBadge = (vehicle: Vehicle) => {
  const locataire = vehicle.locataire_affiche; // ← Lit la colonne calculée

  if (vehicle.locataire_type === null) {
    // Badge bleu = locataire calculé depuis attribution
    return <span className="bg-blue-500">👤 {locataire}</span>;
  }
  // ...
}
```

## Avantages de cette solution

✅ **Automatique** : Le nom se met à jour en temps réel
✅ **Performant** : Calculé par PostgreSQL (pas de parsing JS)
✅ **Fiable** : Une seule source de vérité (la vue SQL)
✅ **Maintenable** : Logique centralisée dans la vue

## Dépannage

### Le nom n'apparaît toujours pas

1. **Vérifier que la migration a bien été exécutée** :
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'vehicule'
AND column_name IN ('locataire_type', 'locataire_nom_libre');
```

2. **Vérifier que la vue contient locataire_affiche** :
```sql
SELECT * FROM v_vehicles_list LIMIT 1;
```
→ Doit contenir une colonne `locataire_affiche`

3. **Vérifier qu'une attribution principale existe** :
```sql
SELECT v.immatriculation, av.type_attribution, p.prenom, p.nom
FROM vehicule v
JOIN attribution_vehicule av ON v.id = av.vehicule_id
JOIN profil p ON av.profil_id = p.id
WHERE av.date_fin IS NULL;
```

### Le cache du navigateur

Si le problème persiste :
- Ouvrir les DevTools (F12)
- Onglet Network
- Cocher "Disable cache"
- Rafraîchir la page (F5)

## Fichiers modifiés

### SQL (à exécuter)
- ✅ `EXECUTER-MAINTENANT-vue-locataire-affiche.sql` - Migration complète

### Frontend (déjà fait)
- ✅ `VehicleListNew.tsx` - Lit `vehicle.locataire_affiche`
- ✅ `VehicleDetailModal.tsx` - Affiche `vehicle.locataire_affiche`
- ✅ `AttributionModal.tsx` - Rafraîchit après création

## Résultat attendu

Avant la migration :
```
Colonne "Nom du locataire" : Non défini
```

Après la migration + attribution principale :
```
Colonne "Nom du locataire" : 👤 Misba MOHAMMAD (TCA-001)
                              (badge bleu avec icône utilisateur)
```

---

**Temps total : ~5 minutes**
**Difficulté : Facile** ✨
