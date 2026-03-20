# Exécuter le correctif : finition / energie / couleur

## 🎯 Objectif

Corriger l'affichage des champs finition, energie, couleur dans le modal véhicule.

## 📋 Checklist

### ☐ NIVEAU 1 : Correctif SQL (immédiat)

**Fichier** : `FIX-NIVEAU-1-VUE-FINITION-ENERGIE-COULEUR.sql`

**Action** :
1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier-coller le contenu du fichier
3. Exécuter

**Vérification** :
```sql
-- Vérifier qu'un véhicule affiche bien ses données
SELECT
  immatriculation,
  marque,
  modele,
  finition,
  energie,
  couleur
FROM v_vehicles_list_ui
WHERE immatriculation = 'AZ123EY';
```

**Résultat attendu** :
- Les colonnes finition, energie, couleur doivent avoir des valeurs (pas NULL)

**Temps estimé** : 30 secondes

---

### ☐ Test dans l'application (après NIVEAU 1)

1. Rafraîchir la page de l'application (F5)
2. Ouvrir un véhicule qui a finition/energie/couleur renseignés
3. Vérifier que les champs s'affichent en mode "Voir"
4. Cliquer "Modifier" et vérifier que les champs sont pré-remplis

**Si ça fonctionne** : NIVEAU 1 suffit !

**Si vous voulez l'architecture robuste** : Continuer avec NIVEAU 2

---

### ☐ NIVEAU 2 : Correctif Frontend (robuste)

**Fichier déjà modifié** : `src/components/VehicleDetailModal.tsx`

**Action** :
```bash
# Build de l'application
npm run build

# Déploiement (selon votre méthode habituelle)
# Netlify, Vercel, etc.
```

**Vérification** :
1. Ouvrir un véhicule dans l'application déployée
2. Vérifier que les champs finition/energie/couleur s'affichent
3. Tester le mode "Modifier"
4. Vérifier dans la console du navigateur :
   - `[fetchVehicleDetails] Début refetch pour vehicule ID: ...`
   - Pas d'erreur SQL

**Temps estimé** : 2-3 minutes (build) + déploiement

---

## 🔄 Ordre d'exécution recommandé

### Scénario A : Besoin urgent (production down)

1. Exécuter **NIVEAU 1 (SQL)** → Fix en 30 secondes
2. Tester dans l'application
3. Planifier **NIVEAU 2 (Frontend)** plus tard

### Scénario B : Amélioration planifiée

1. Exécuter **NIVEAU 1 (SQL)**
2. Tester
3. Exécuter **NIVEAU 2 (Frontend)**
4. Tester l'ensemble
5. Déployer

### Scénario C : Déploiement complet

1. Exécuter **NIVEAU 1 (SQL)**
2. Build et déployer **NIVEAU 2 (Frontend)**
3. Tester l'ensemble

---

## 🧪 Tests de vérification

### Test 1 : Affichage en mode "Voir"

1. Ouvrir un véhicule avec finition = "Premium"
2. Vérifier que "Finition : Premium" s'affiche

**Résultat attendu** : ✅ Valeur affichée

### Test 2 : Formulaire en mode "Modifier"

1. Ouvrir un véhicule avec energie = "Diesel"
2. Cliquer "Modifier"
3. Vérifier que le champ Énergie contient "Diesel"

**Résultat attendu** : ✅ Champ pré-rempli

### Test 3 : Sauvegarde

1. Modifier la couleur d'un véhicule
2. Enregistrer
3. Recharger le modal

**Résultat attendu** : ✅ Nouvelle valeur enregistrée et affichée

### Test 4 : Console navigateur (NIVEAU 2 uniquement)

1. Ouvrir la console (F12)
2. Ouvrir un véhicule
3. Chercher les logs `[fetchVehicleDetails]`

**Résultat attendu** :
```
[fetchVehicleDetails] Début refetch pour vehicule ID: xxx
[fetchVehicleDetails] Données reçues: { finition: "Premium", ... }
[fetchVehicleDetails] État mis à jour avec succès
```

---

## ❌ Rollback si problème

### Si NIVEAU 1 pose problème

```sql
-- Restaurer l'ancienne vue (sans finition/energie/couleur)
-- Exécuter FIX-VUE-VEHICLES-FINAL.sql
```

### Si NIVEAU 2 pose problème

```bash
# Redéployer la version précédente du frontend
git revert <commit_hash>
npm run build
```

**Note** : NIVEAU 1 seul ne pose normalement aucun risque (on ajoute des colonnes, on ne change rien d'existant)

---

## 📞 En cas de problème

### Erreur SQL "column does not exist"

**Cause** : Une colonne n'existe pas dans la table `vehicule`

**Solution** : Vérifier la structure de la table
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'vehicule'
  AND column_name IN ('finition', 'energie', 'couleur');
```

Si elles n'existent pas, les créer d'abord :
```sql
ALTER TABLE vehicule ADD COLUMN IF NOT EXISTS finition TEXT;
ALTER TABLE vehicule ADD COLUMN IF NOT EXISTS energie TEXT;
ALTER TABLE vehicule ADD COLUMN IF NOT EXISTS couleur TEXT;
```

### Erreur Frontend "Cannot read property of undefined"

**Cause** : Typo dans un nom de propriété

**Solution** : Vérifier les logs console et comparer avec le nom exact de la colonne DB

### Les champs restent vides après NIVEAU 1

**Cause possible** : Cache navigateur

**Solution** :
1. Vider le cache (Ctrl+Shift+R)
2. Rafraîchir la page
3. Réessayer

---

## ✅ Confirmation du succès

Après avoir appliqué les correctifs, vous devriez voir :

**AVANT** :
```
Finition : (vide)
Énergie : (vide)
Couleur : (vide)
```

**APRÈS** :
```
Finition : Premium
Énergie : Diesel
Couleur : Blanc
```

🎉 Succès !
