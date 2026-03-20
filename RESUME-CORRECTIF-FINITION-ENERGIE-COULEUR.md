# Résumé : Correctif finition / energie / couleur

## 🐛 Bug

Champs vides dans modal véhicule (modes "Voir" et "Modifier")

## 🔍 Cause

Vue `v_vehicles_list_ui` n'exposait pas ces colonnes

## ✅ Correctif 2 niveaux

### Niveau 1 : Immédiat (SQL)
**Fichier** : `FIX-NIVEAU-1-VUE-FINITION-ENERGIE-COULEUR.sql`

Ajouter à la vue :
- finition, energie, couleur
- reste_a_payer_ttc, financeur_*

→ Fix immédiat, pas de redéploiement frontend

### Niveau 2 : Robuste (Frontend)
**Fichier** : `VehicleDetailModal.tsx` (ligne 91-176)

**AVANT** :
```typescript
.from('v_vehicles_list_ui')  // ❌ Vue de liste
```

**APRÈS** :
```typescript
.from('vehicule')  // ✅ Table directe (toutes colonnes)
+ .from('attribution_vehicule')  // Attributions séparément
```

→ Architecture propre, indépendance

## 📦 Fichiers

**SQL** :
- `FIX-NIVEAU-1-VUE-FINITION-ENERGIE-COULEUR.sql`

**Frontend** :
- `src/components/VehicleDetailModal.tsx`

**Doc** :
- `CORRECTIF-2-NIVEAUX-FINITION-ENERGIE-COULEUR.md` (détails complets)

## 🚀 Déploiement

**Option A : Progressif (recommandé)**
1. SQL → fix immédiat
2. Tester
3. Frontend → amélioration architecture

**Option B : Direct**
1. SQL + Frontend ensemble

## 💡 Pourquoi

**Une vue de liste ≠ un détail complet**

- Vue = optimisée pour affichage tableau multi-lignes
- Détail = toutes les colonnes d'une ligne

**Problème avant** :
- Détail dépendait de la vue de liste
- Colonne manquante dans vue → bug silencieux

**Solution après** :
- Détail charge depuis table `vehicule` (SELECT *)
- Garantie d'avoir toutes les colonnes
- Indépendance liste ↔ détail

## ✨ Résultat

- ✅ Finition / energie / couleur s'affichent
- ✅ Formulaire "Modifier" pré-rempli
- ✅ Architecture robuste
- ✅ Build OK (20.80s)
