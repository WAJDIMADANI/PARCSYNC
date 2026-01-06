# Module Comptabilité - Entrées/Sorties de Personnel

## Description

Le module **Comptabilité** permet de suivre les mouvements de personnel dans l'entreprise :
- **Entrées** : Nouveaux salariés recrutés (statut "actif" avec contrat signé)
- **Sorties** : Salariés ayant quitté l'entreprise (statut "inactif" avec date de fin)

## Fonctionnalités

### Onglet Entrées
- Filtre par période (date début / date fin)
- Recherche par matricule, nom, prénom, email, poste ou site
- Liste complète des salariés entrés sur la période
- Export Excel de la liste
- Affichage du nombre total d'entrées

**Données affichées :**
- Matricule
- Nom / Prénom
- Email / Téléphone
- Poste
- Site
- Date contrat signé

### Onglet Sorties
- Filtre par période (date début / date fin)
- Recherche par matricule, nom, prénom, email, poste ou site
- Liste complète des salariés sortis sur la période
- Export Excel de la liste
- Affichage du nombre total de sorties

**Données affichées :**
- Matricule
- Nom / Prénom
- Email / Téléphone
- Poste
- Site
- Date fin contrat

## Utilisation

1. **Aller dans le menu Comptabilité**
2. **Choisir l'onglet** (Entrées ou Sorties)
3. **Sélectionner une plage de dates**
4. **Cliquer sur Rechercher**
5. **Utiliser la recherche** pour filtrer les résultats si besoin
6. **Exporter en Excel** si nécessaire

## Permissions

Les permissions sont gérées dans **Administration > Utilisateurs** :
- `compta/entrees` : Accès à l'onglet Entrées
- `compta/sorties` : Accès à l'onglet Sorties

## Source des données

Le module utilise la table `profil` existante :
- **Entrées** : `statut = 'actif'` avec `date_contrat_signe` renseignée
- **Sorties** : `statut = 'inactif'` avec `date_fin_contrat` renseignée

**Aucune modification SQL n'est nécessaire**, tout fonctionne directement !

## Fichiers modifiés

1. `src/components/ComptabiliteEntriesTab.tsx` : Onglet Entrées
2. `src/components/ComptabiliteExitsTab.tsx` : Onglet Sorties
3. `src/components/AccountingDashboard.tsx` : Dashboard principal

---

**Le module est prêt à l'emploi !**
