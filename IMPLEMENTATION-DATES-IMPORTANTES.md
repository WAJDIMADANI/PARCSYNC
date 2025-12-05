# Implementation: Section "Documents et dates importantes"

## Modifications apportées

### 1. Migration SQL: Ajout des colonnes d'avenants

**Fichier**: `add-avenant-dates-columns.sql`

Cette migration ajoute 4 nouvelles colonnes à la table `profil`:
- `avenant_1_date_debut` (date)
- `avenant_1_date_fin` (date)
- `avenant_2_date_debut` (date)
- `avenant_2_date_fin` (date)

**Action requise**: Executer cette migration SQL dans Supabase:

```bash
# Copiez le contenu du fichier add-avenant-dates-columns.sql
# et executez-le dans l'editeur SQL de Supabase
```

### 2. Modifications du modal EmployeeDetailModal.tsx

**Changements**:
- Renommage de la section "Documents" en "Documents et dates importantes"
- Ajout de trois sous-sections avec design distinct:
  - **Contrat** (fond bleu clair): Date de debut et date de fin du contrat
  - **Avenants** (fond orange clair): Dates des avenants 1 et 2 (affiche uniquement si au moins une date existe)
  - **Documents administratifs** (fond jaune clair): Type de piece d'identite, titre de sejour, visite medicale

**Design**:
- Bordures gauches colorees de 4px pour chaque sous-section
- Icones Calendar pour toutes les dates
- Affichage conditionnel de la section Avenants
- Grid layout responsive

### 3. Modifications ImportSalariesBulk.tsx

**Changements**:
- Ajout des champs d'avenants dans l'insertion des nouveaux profils
- Ajout des champs d'avenants dans la mise a jour des profils existants
- Les dates d'avenants sont maintenant stockees dans la table `profil` en plus de la table `contrat`

**Colonnes ajoutees a l'insertion/update**:
- `avenant_1_date_debut`
- `avenant_1_date_fin`
- `avenant_2_date_debut`
- `avenant_2_date_fin`

### 4. Template CSV

Le template CSV inclut deja les colonnes suivantes:
- DATE DE FIN - AVENANT1
- DATE DE DEBUT - AVENANT2
- DATE DE FIN - AVENANT2
- TITRE DE SEJOUR - FIN DE VALIDITE

## Resultats attendus

Apres l'application de ces modifications:

1. **Modal de details des employes** affiche une nouvelle section complete "Documents et dates importantes" avec:
   - Toutes les dates de contrat
   - Toutes les dates d'avenants (si presentes)
   - Tous les documents administratifs et leurs dates

2. **Import CSV** stocke maintenant les dates d'avenants directement dans la table `profil`

3. **Affichage du titre de sejour** fonctionne correctement pour tous les employes

4. **Section "Contrat Principal"** reste inchangee et continue d'afficher les dates de contrat et les avenants comme avant

## Test recommandes

1. Appliquer la migration SQL
2. Importer un fichier CSV avec des dates d'avenants
3. Ouvrir le modal de details d'un employe
4. Verifier que:
   - La section "Documents et dates importantes" est visible
   - Les dates de contrat sont affichees dans la sous-section "Contrat"
   - Les dates d'avenants sont affichees dans la sous-section "Avenants" (si presentes)
   - Les documents administratifs sont affiches correctement
   - Le titre de sejour s'affiche correctement (exemple: 08/01/2035 pour Mohammed ZERROUKI)

## Notes

- Les avenants continuent d'etre stockes dans la table `contrat` comme avant
- En plus, les dates d'avenants sont maintenant aussi stockees dans la table `profil` pour un acces rapide
- Le format de date est DD/MM/YYYY
- Les dates non renseignees affichent un tiret "-"
