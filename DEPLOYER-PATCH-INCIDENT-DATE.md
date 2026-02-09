# Patch Minimal - Mise à jour des dates d'incident depuis le modal salarié

## Ce qui a été fait

### 1. Fonction SQL créée
**Fichier**: `create-update-incident-expiration-rpc.sql`

Cette fonction permet de mettre à jour uniquement la date d'expiration d'un incident actif sans changer son statut.

### 2. Code modifié
**Fichier**: `src/components/EmployeeList.tsx`

Dans la fonction `handleSaveExpirationDates` (ligne ~2075), j'ai ajouté:
- Appel automatique de la RPC après sauvegarde du profil
- Mise à jour de l'incident titre_sejour si la date a changé
- Mise à jour de l'incident visite_medicale si la date a changé
- Appel à `onUpdate()` pour rafraîchir les compteurs d'incidents dans l'UI

## Déploiement

### Étape 1: Exécuter le SQL
1. Aller dans Supabase → SQL Editor
2. Copier-coller le contenu du fichier `create-update-incident-expiration-rpc.sql`
3. Cliquer sur "Run"

### Étape 2: Vérifier la fonction
```sql
-- Tester que la fonction existe
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'update_incident_expiration_date_only';
```

### Étape 3: Déployer le frontend
Le code frontend a déjà été modifié et build avec succès.

## Comment ça marche

1. **Utilisateur modifie la date** dans le modal salarié (Titre de séjour ou Visite médicale)
2. **Clic sur Enregistrer**
3. Le système:
   - Met à jour la colonne dans la table `profil` (comportement actuel conservé)
   - Appelle la RPC `update_incident_expiration_date_only` qui:
     - Trouve l'incident actif correspondant
     - Met à jour uniquement `date_expiration`
     - Ajoute un commentaire traçant la modification
     - **NE CHANGE PAS le statut** de l'incident
   - Déclenche `onUpdate()` pour rafraîchir l'UI

4. **L'incident reste actif** mais avec la nouvelle date d'expiration
5. **Les compteurs d'incidents** se mettent à jour immédiatement dans le dashboard

## Test

Pour tester:
1. Ouvrir le modal d'un salarié qui a un incident titre_sejour actif
2. Modifier la date de "Titre de séjour - Fin de validité"
3. Enregistrer
4. Vérifier dans la console:
   - `Incident titre_sejour mis à jour: {...}`
5. Vérifier dans la base:
```sql
SELECT id, profil_id, type, statut, date_expiration, commentaire
FROM incident
WHERE profil_id = 'UUID_DU_PROFIL' AND type = 'titre_sejour';
```

## Comportement attendu

- ✅ La date du profil est mise à jour
- ✅ La date d'expiration de l'incident est mise à jour
- ✅ Le statut de l'incident reste "actif"
- ✅ Un commentaire est ajouté dans l'incident
- ✅ Les compteurs dans le dashboard se rafraîchissent
- ✅ Aucun rechargement de page nécessaire

## Notes importantes

- Cette fonction ne résout PAS les incidents automatiquement
- Elle met uniquement à jour la date d'expiration
- Le statut de l'incident reste inchangé
- Fonctionne pour titre_sejour et visite_medicale
