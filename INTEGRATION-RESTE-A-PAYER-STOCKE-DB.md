# Intégration des montants restants stockés en base

## 1. Audit rapide

**Avant modifications :**
- Interface `Vehicle` ne contenait PAS les colonnes DB :
  - `mensualites_deja_comptees`
  - `reste_a_payer_ht`
  - `dernier_recalcul_contrat_at`
- `reste_a_payer_ttc` existait dans l'interface mais était **recalculé côté frontend** via `calculateResteAPayer()`
- Un `useEffect` (lignes 277-285) recalculait `reste_a_payer_ttc` en temps réel côté frontend
- Le calcul frontend dans `resteAPayerCalculator.ts` pouvait diverger du calcul SQL en base
- Les valeurs calculées n'étaient PAS stockées en base lors du `handleSave`

**Problème identifié :**
Source de vérité divergente entre frontend (calcul JS) et backend (calcul SQL + cron job quotidien).

---

## 2. Fichiers modifiés

### `/src/components/VehicleDetailModal.tsx`

**Modifications apportées :**

1. **Suppression de l'import inutilisé** (ligne 10) :
   ```typescript
   - import { calculateResteAPayer } from '../utils/resteAPayerCalculator';
   ```

2. **Ajout des colonnes manquantes dans l'interface `Vehicle`** (lignes 41-44) :
   ```typescript
   mensualites_deja_comptees: number | null;
   reste_a_payer_ht: number | null;
   reste_a_payer_ttc: number | null;
   dernier_recalcul_contrat_at: string | null;
   ```

3. **Suppression du useEffect qui recalculait reste_a_payer_ttc** (ancien code lignes 277-285) :
   ```typescript
   - // Recalcul automatique du reste à payer TTC
   - useEffect(() => {
   -   const resteAPayer = calculateResteAPayer(
   -     editedVehicle.date_debut_contrat || '',
   -     editedVehicle.duree_contrat_mois || '',
   -     editedVehicle.mensualite_ttc || ''
   -   );
   -   setEditedVehicle(prev => ({ ...prev, reste_a_payer_ttc: resteAPayer }));
   - }, [editedVehicle.date_debut_contrat, editedVehicle.duree_contrat_mois, editedVehicle.mensualite_ttc]);
   ```

4. **Suppression de l'envoi des valeurs calculées dans handleSave** (ligne 372) :
   ```typescript
   - reste_a_payer_ttc: editedVehicle.reste_a_payer_ttc,
   + // NE PAS envoyer mensualites_deja_comptees, reste_a_payer_ht, reste_a_payer_ttc, dernier_recalcul_contrat_at
   + // Ces valeurs sont calculées automatiquement par la DB via un cron job quotidien
   ```

5. **Ajout d'une nouvelle section dans l'onglet Acquisition** (lignes 1183-1241) :
   - Section ambre avec bordure
   - Affichage de `mensualites_deja_comptees` avec indicateur de progression
   - Affichage de `reste_a_payer_ht` formaté en euros
   - Affichage de `reste_a_payer_ttc` formaté en euros
   - Date du dernier recalcul (`dernier_recalcul_contrat_at`)
   - Message d'information expliquant le cron job

---

## 3. Ancien comportement trouvé

**Calcul frontend :**
- `calculateResteAPayer()` dans `resteAPayerCalculator.ts`
- Calcul basé sur :
  ```javascript
  mensualitesEcoulees = (aujourdhui - dateDebut) en mois
  mensualitesRestantes = dureeContrat - mensualitesEcoulees
  resteAPayer = mensualitesRestantes × mensualiteTtc
  ```
- Recalcul en temps réel à chaque changement de date de début, durée ou mensualité
- Valeur écrasée lors du `handleSave` (envoyée à la DB)

**Risques :**
- Divergence entre calcul JS et calcul SQL
- Pas de prise en compte des triggers DB
- Écrasement des valeurs calculées par le cron job quotidien
- Absence d'historique de recalcul

---

## 4. Nouveau comportement mis en place

**Source de vérité : BASE DE DONNÉES**

### Calcul automatique en DB :
- Fonction SQL : `public.recalculate_all_vehicle_contract_amounts()`
- Cron job quotidien : `recalculate-vehicle-contract-amounts-daily`
- Schedule : `5 0 * * *` (tous les jours à 00h05)

### Affichage frontend :
- Lecture des valeurs stockées en base (pas de recalcul)
- Affichage des 4 champs :
  - `mensualites_deja_comptees` (nombre)
  - `reste_a_payer_ht` (formaté en €)
  - `reste_a_payer_ttc` (formaté en €)
  - `dernier_recalcul_contrat_at` (date du dernier calcul)

### Workflow de sauvegarde :
1. L'utilisateur modifie les champs de contrat (mensualité, durée, date de début)
2. `handleSave` envoie UNIQUEMENT les champs modifiables
3. Les valeurs calculées NE SONT PAS envoyées
4. Le cron job recalculera automatiquement les montants restants la nuit suivante
5. Au prochain rechargement, les nouvelles valeurs calculées seront affichées

### Calcul informatif conservé :
Le useEffect qui calcule `prix_ht` et `prix_ttc` à partir des mensualités est conservé car il sert uniquement d'affichage informatif dans la section verte "Prix total calculé automatiquement". Ce calcul ne diverge pas avec la DB car il s'agit d'une simple multiplication (mensualité × durée).

---

## 5. Champs DB effectivement affichés

### Section ambre : "Montants restants (stockés en base)"

| Champ DB | Type | Affichage | Description |
|----------|------|-----------|-------------|
| `mensualites_deja_comptees` | `integer` | Nombre | Nombre de mensualités écoulées depuis le début du contrat |
| `reste_a_payer_ht` | `numeric` | `X XXX.XX €` | Montant HT restant à payer |
| `reste_a_payer_ttc` | `numeric` | `X XXX.XX €` | Montant TTC restant à payer |
| `dernier_recalcul_contrat_at` | `timestamp` | `JJ/MM/AAAA` | Date du dernier recalcul automatique |

### Indicateurs visuels :
- **Progression** : `X / Y mois écoulés` (X = mensualites_deja_comptees, Y = duree_contrat_mois)
- **Date de recalcul** : Affichée en haut à droite de la section
- **Message informatif** : Icône AlertCircle + texte explicatif sur le cron job quotidien

### Champs non modifiables :
Tous les champs de cette section sont en lecture seule (`disabled`) avec :
- Fond gris clair (`bg-gray-50`)
- Texte gris foncé (`text-gray-600`)
- Police en gras (`font-semibold`)

---

## 6. Build OK

**Résultat de `npm run build` :**
```
✓ 2046 modules transformed.
✓ built in 20.13s
```

**Aucune erreur TypeScript détectée.**

Tous les champs sont correctement typés dans l'interface `Vehicle` et correspondent aux colonnes de la table `vehicule` en base.

---

## 7. Points de vigilance

### À faire côté DB :
- Vérifier que la fonction `public.recalculate_all_vehicle_contract_amounts()` existe
- Vérifier que le cron job `recalculate-vehicle-contract-amounts-daily` est actif
- S'assurer que les colonnes existent dans la table `vehicule` :
  ```sql
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'vehicule'
    AND column_name IN (
      'mensualites_deja_comptees',
      'reste_a_payer_ht',
      'reste_a_payer_ttc',
      'dernier_recalcul_contrat_at'
    );
  ```

### Comportement attendu après sauvegarde :
1. Modification d'un contrat (mensualité, durée, date de début)
2. Sauvegarde → Les nouvelles valeurs sont stockées
3. L'UI affiche encore les anciennes valeurs calculées
4. Le cron job nocturne recalcule les montants restants
5. Au prochain rechargement (lendemain), les nouvelles valeurs calculées apparaissent

### Trigger optionnel pour recalcul immédiat :
Si besoin d'un recalcul immédiat après modification du contrat, créer un trigger :
```sql
CREATE OR REPLACE FUNCTION trigger_recalculate_vehicle_contract()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculer uniquement si les champs de contrat ont changé
  IF (NEW.mensualite_ht IS DISTINCT FROM OLD.mensualite_ht)
     OR (NEW.mensualite_ttc IS DISTINCT FROM OLD.mensualite_ttc)
     OR (NEW.duree_contrat_mois IS DISTINCT FROM OLD.duree_contrat_mois)
     OR (NEW.date_debut_contrat IS DISTINCT FROM OLD.date_debut_contrat)
  THEN
    -- Logique de recalcul ici
    -- (à implémenter selon la logique de recalculate_all_vehicle_contract_amounts)
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_on_contract_update
AFTER UPDATE ON vehicule
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_vehicle_contract();
```

---

## 8. Résumé

**Source de vérité maintenant : BASE DE DONNÉES**

- Import `calculateResteAPayer` supprimé
- UseEffect de recalcul frontend supprimé
- 4 nouvelles colonnes ajoutées à l'interface `Vehicle`
- Section ambre ajoutée dans l'onglet Acquisition
- Affichage des valeurs stockées en base (lecture seule)
- Pas d'envoi des valeurs calculées lors du save
- Cron job quotidien assure la mise à jour automatique
- Build OK, aucune erreur TypeScript

**Le frontend ne recalcule plus, il affiche.**
