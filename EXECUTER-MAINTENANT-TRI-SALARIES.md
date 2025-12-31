# Tri des salariés par dernière modification

## Ce qui a été fait

Les salariés dans l'onglet "Salariés" s'afficheront désormais par ordre de dernière modification (les plus récemment modifiés ou créés en premier).

## Action requise

Vous devez exécuter le SQL suivant dans l'éditeur SQL de Supabase :

1. Allez dans votre projet Supabase
2. Cliquez sur "SQL Editor" dans le menu de gauche
3. Copiez-collez le contenu du fichier `add-updated-at-to-profil.sql`
4. Cliquez sur "Run"

## Ce que fait la migration

- Ajoute une colonne `updated_at` à la table `profil`
- Crée un trigger automatique qui met à jour `updated_at` à chaque modification d'un profil
- Initialise `updated_at` avec les valeurs de `created_at` pour les données existantes

## Résultat

Après avoir exécuté la migration :
- Les salariés récemment modifiés apparaîtront en haut de la liste
- Chaque fois qu'un profil est modifié, il remontera automatiquement en haut de la liste
- Le tri fonctionne sur tous les champs : infos personnelles, documents, contrats, etc.
