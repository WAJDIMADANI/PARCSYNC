# Guide Rapide: Nouvelle section "Documents et dates importantes"

## Etape 1: Appliquer la migration SQL

Ouvrez Supabase SQL Editor et executez le fichier `add-avenant-dates-columns.sql`

Cela ajoute 4 colonnes a la table profil:
- avenant_1_date_debut
- avenant_1_date_fin
- avenant_2_date_debut
- avenant_2_date_fin

## Etape 2: Ce qui a change

### Modal EmployeeDetailModal

**AVANT**: Section "Documents" simple avec seulement:
- Type de piece d'identite
- Titre de sejour - Fin de validite
- Visite medicale - Date de debut
- Visite medicale - Date de fin

**APRES**: Section "Documents et dates importantes" avec 3 sous-sections:

1. **Contrat** (fond bleu)
   - Date de debut
   - Date de fin

2. **Avenants** (fond orange) - Affiche seulement si au moins une date existe
   - Avenant 1: Date de debut + Date de fin
   - Avenant 2: Date de debut + Date de fin

3. **Documents administratifs** (fond jaune)
   - Type de piece d'identite
   - Titre de sejour - Fin de validite
   - Visite medicale - Date de debut
   - Visite medicale - Date de fin

### Import CSV

Les dates d'avenants sont maintenant stockees dans la table `profil` lors de l'import.

## Verification rapide

1. Importez un CSV avec des dates d'avenants
2. Cliquez sur un employe dans la liste
3. Verifiez que la nouvelle section "Documents et dates importantes" affiche toutes les informations
4. Verifiez que le titre de sejour s'affiche correctement

## Probleme du titre de sejour resolu

Le titre de sejour devrait maintenant s'afficher correctement dans la sous-section "Documents administratifs".

Pour Mohammed ZERROUKI, si la date est 2035-01-08 dans le CSV, elle doit s'afficher comme "08/01/2035".
