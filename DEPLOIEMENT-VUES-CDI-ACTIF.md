# Déploiement des vues pour exclure les CDI actifs

## Problème résolu

Les salariés avec un **CDI actif** ne doivent JAMAIS apparaître dans les incidents "Contrat expiré", même s'ils ont des anciens CDD dans l'historique.

## Solution

Deux vues SQL ont été créées :
1. `v_profils_cdi_actif` - Liste les profils ayant un CDI actif
2. `v_incidents_contrats_affichables` - Incidents de contrats expirés SANS les profils en CDI actif

## Étape 1 : Créer les vues dans la base de données

Exécute ce fichier SQL dans Supabase :

📄 `create-contrat-expire-views.sql`

```sql
-- Copie-colle ce fichier dans le SQL Editor de Supabase
```

## Étape 2 : Vérification

Après avoir exécuté le SQL, vérifie que les vues existent :

```sql
-- Vérifier la vue v_profils_cdi_actif
SELECT * FROM v_profils_cdi_actif LIMIT 5;

-- Vérifier la vue v_incidents_contrats_affichables
SELECT * FROM v_incidents_contrats_affichables LIMIT 5;
```

## Résultat attendu

✅ Dans "Gestion des incidents" :
- Onglet "CDD" : N'affiche que les CDD expirés de salariés SANS CDI actif
- Onglet "Avenant" : N'affiche que les avenants expirés de salariés SANS CDI actif
- Les autres onglets (Titre de séjour, Visite médicale, Permis) restent inchangés

✅ Dans le "Tableau de bord RH" :
- Le bloc "Documents expirés" affiche les mêmes chiffres que "Gestion des incidents"
- Le compteur "Contrats CDD" exclut les profils avec CDI actif

## Règle métier appliquée

**Si un salarié a un CDI actif** :
- ❌ Il ne doit PAS apparaître dans les incidents de contrats expirés
- ❌ Ses anciens CDD ne sont plus pertinents
- ✅ Seuls les documents personnels (titre séjour, visite médicale, permis) sont suivis

**Si un salarié n'a qu'un CDD expiré** :
- ✅ Il apparaît dans les incidents de contrats expirés
- ✅ C'est normal et doit être traité

## Code modifié

Les fichiers suivants ont été modifiés pour utiliser les vues :
- `src/components/IncidentsList.tsx` - Utilise `v_incidents_contrats_affichables` pour les contrats
- `src/components/RHDashboard.tsx` - Utilise `v_incidents_contrats_affichables` pour les stats

## Comportement technique

### Avant (❌)
```
Table incident → tous les incidents de type "contrat_expire"
→ Affiche même les anciens CDD des salariés en CDI
```

### Après (✅)
```
Vue v_incidents_contrats_affichables
→ Incidents "contrat_expire" SAUF si profil a un CDI actif
→ Affiche uniquement les contrats vraiment expirés à surveiller
```
