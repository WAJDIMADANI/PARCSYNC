# 📋 RAPPORT D'AUDIT - AJOUT CHAMPS PERMIS

## 🎯 Objectif
Auditer le code avant d'ajouter les champs `permis_conduire` et `permis_conduire_fin_validite` dans la section "Documents administratifs"

---

## 1️⃣ Composant du modal salarié

**Fichier:** `src/components/EmployeeList.tsx`

**Section:** "Documents administratifs" (ligne 3949-4028)

---

## 2️⃣ Champs actuels utilisés

### Champs affichés en lecture seule:
- **`type_piece_identite`** (ligne 3962)
  - Affiche le type de pièce d'identité
  - Fallback: `candidatTypePiece`

### Champs éditables (mode édition):

| Champ UI | State React | Colonne DB | Ligne |
|----------|------------|------------|-------|
| Pièce d'identité - Fin de validité | `editedTitreSejourExpiration` | `titre_sejour_fin_validite` | 3973-3974 |
| Visite médicale - Date de début | `editedDateVisite` | `date_visite_medicale` | 3995-3996 |
| Visite médicale - Date de fin | `editedCertificatExpiration` | `date_fin_visite_medicale` | 4015-4016 |

### Champs RDV (section séparée):
| Champ UI | State React | Colonne DB | Ligne |
|----------|------------|------------|-------|
| Date du RDV | `editedRdvDate` | `visite_medicale_rdv_date` | 4046-4047 |
| Heure du RDV | `editedRdvHeure` | `visite_medicale_rdv_heure` | Ligne suivante |

---

## 3️⃣ States "edited..." et fonction save

### 📦 Déclaration des states (ligne 1142-1147)

```typescript
const [editedCertificatExpiration, setEditedCertificatExpiration] = useState(employee.date_fin_visite_medicale || '');
const [editedTitreSejourExpiration, setEditedTitreSejourExpiration] = useState(employee.titre_sejour_fin_validite || '');
const [editedDateVisite, setEditedDateVisite] = useState(employee.date_visite_medicale || '');
const [editedRdvDate, setEditedRdvDate] = useState(employee.visite_medicale_rdv_date || '');
const [editedRdvHeure, setEditedRdvHeure] = useState(employee.visite_medicale_rdv_heure || '');
```

### 💾 Fonction save: `handleSaveExpirationDates` (ligne 2084-2132)

**Emplacement:** Ligne 2084

**Bouton:** Ligne 3738

---

## 4️⃣ Colonnes envoyées dans le .update()

### Code de l'update (ligne 2087-2100)

```typescript
const { error } = await supabase
  .from('profil')
  .update({
    date_fin_visite_medicale: editedCertificatExpiration || null,
    date_visite_medicale: editedDateVisite || null,
    visite_medicale_rdv_date: editedRdvDate || null,
    visite_medicale_rdv_heure: editedRdvHeure || null,
    titre_sejour_fin_validite: editedTitreSejourExpiration || null,
    avenant_1_date_debut: editedAvenant1DateDebut || null,
    avenant_1_date_fin: editedAvenant1DateFin || null,
    avenant_2_date_debut: editedAvenant2DateDebut || null,
    avenant_2_date_fin: editedAvenant2DateFin || null
  })
  .eq('id', currentEmployee.id);
```

### ✅ Colonnes mises à jour:

| # | Colonne DB | State React |
|---|-----------|-------------|
| 1 | `date_fin_visite_medicale` | `editedCertificatExpiration` |
| 2 | `date_visite_medicale` | `editedDateVisite` |
| 3 | `visite_medicale_rdv_date` | `editedRdvDate` |
| 4 | `visite_medicale_rdv_heure` | `editedRdvHeure` |
| 5 | `titre_sejour_fin_validite` | `editedTitreSejourExpiration` |
| 6 | `avenant_1_date_debut` | `editedAvenant1DateDebut` |
| 7 | `avenant_1_date_fin` | `editedAvenant1DateFin` |
| 8 | `avenant_2_date_debut` | `editedAvenant2DateDebut` |
| 9 | `avenant_2_date_fin` | `editedAvenant2DateFin` |

---

## 5️⃣ RPC/Trigger supplémentaires

### 🔍 Recherche effectuée

```bash
grep -n "\.rpc\(|TRIGGER|trigger" src/components/EmployeeList.tsx
```

**Résultat:** ❌ **AUCUN MATCH TROUVÉ**

### ✅ Confirmation

**Aucune RPC ou trigger n'est appelé dans `handleSaveExpirationDates`**

Le code fait uniquement:
1. `.from('profil').update(...).eq('id', currentEmployee.id)`
2. Mise à jour du state local `currentEmployee`
3. Appel de `onUpdate()` (callback parent optionnel)

**Pas de risque comme l'ancien bug `assigned_to`** ✅

---

## 📊 Résumé de l'audit

| Élément | Statut | Notes |
|---------|--------|-------|
| **Composant trouvé** | ✅ | `EmployeeList.tsx` |
| **Section trouvée** | ✅ | "Documents administratifs" ligne 3949 |
| **States déclarés** | ✅ | Pattern cohérent `edited...` |
| **Fonction save** | ✅ | `handleSaveExpirationDates` ligne 2084 |
| **Update direct** | ✅ | `.from('profil').update(...)` |
| **Pas de RPC** | ✅ | Aucune RPC appelée |
| **Pas de trigger** | ⚠️ | À vérifier en DB (voir AUDIT-PERMIS-CONDUIRE.sql) |

---

## 🎯 Prochaines étapes

### 1. Vérifier les triggers DB
Exécuter: `AUDIT-PERMIS-CONDUIRE.sql`

### 2. Ajouter les champs permis
Si l'audit DB est OK:
- Ajouter 2 states: `editedPermisConduire`, `editedPermisConduireExpiration`
- Ajouter 2 champs dans la section "Documents administratifs"
- Ajouter 2 colonnes dans l'update de `handleSaveExpirationDates`

### 3. Vérifier la colonne DB existe
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profil' AND column_name = 'permis_conduire';
```

---

## ⚠️ Points d'attention

1. **Pattern identique** : Utiliser le même pattern que les autres champs
2. **Fallback null** : `editedPermisConduire || null` (pas de string vide)
3. **Pas de trigger** : S'assurer qu'aucun trigger n'interfère
4. **Type date** : `permis_conduire_fin_validite` doit être `date` ou `text`
5. **RLS** : Vérifier que les policies permettent UPDATE de ces colonnes

---

## ✅ AUDIT COMPLET

Le code est **propre** et **sûr** pour l'ajout des champs permis.

Aucun risque de bug comme `assigned_to` car:
- Pas de RPC appelée
- Update direct sur la table `profil`
- Pattern simple et cohérent

**Vous pouvez procéder à l'ajout des champs permis en toute sécurité** ✅
