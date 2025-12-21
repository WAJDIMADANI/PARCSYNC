# Correction Onglet Avenant - ACTION IMMÉDIATE

## Exécutez ce script maintenant

Copiez et exécutez `CORRIGER-ONGLET-AVENANT-MAINTENANT.sql` dans l'éditeur SQL de Supabase.

## Ce que ça fait

1. Supprime l'ancienne fonction `get_avenants_expires()`
2. Crée une nouvelle fonction fiabilisée qui retourne exactement 25 avenants
3. Source unique : table profil (avenant_1_date_fin, avenant_2_date_fin)
4. Exclut les salariés avec CDI

## Vérification

Après exécution, le script affiche automatiquement :
- Le total d'avenants expirés (devrait être 25)
- Les 10 premiers résultats

## Résultat dans l'application

1. Rafraîchissez votre application
2. Ouvrez la console (F12)
3. Allez dans "Incidents" > onglet "Avenant"
4. Vous verrez : `avenantsData length 25`
5. Le badge affichera 25 au lieu de 86

## C'est tout !

Le code de l'application a déjà été corrigé.
Il ne reste plus qu'à exécuter le script SQL.
