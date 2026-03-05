# Guide d'installation : Rappel automatique RDV visites médicales

## Étape 1 : Exécuter le SQL sur Supabase

1. Va sur Supabase : https://supabase.com
2. Ouvre ton projet
3. Clique sur "SQL Editor" dans le menu de gauche
4. Clique sur "New query"
5. Copie TOUT le contenu du fichier `EXECUTER-MAINTENANT-rdv-visite-medicale.sql`
6. Colle-le dans l'éditeur SQL
7. Clique sur "Run" (ou appuie sur Ctrl+Enter)
8. Attends que ça finisse (tu devrais voir "Success" avec des messages verts)

## Étape 2 : Vérifier que tout est OK

1. Reste dans le SQL Editor
2. Ouvre le fichier `TESTER-RDV-VISITE-MEDICALE.sql`
3. Copie les lignes 7 à 12 (vérification des colonnes)
4. Colle et exécute
5. Tu dois voir 2 lignes :
   - `visite_medicale_rdv_date` (type: date)
   - `visite_medicale_rdv_heure` (type: time without time zone)

Si tu vois ces 2 lignes, c'est bon !

## Étape 3 : Vérifier l'interface web

1. Ouvre ton application web
2. Va dans la liste des salariés
3. Clique sur un salarié pour ouvrir son profil
4. Scroll jusqu'à la section "Documents administratifs" (fond jaune)
5. Clique sur le bouton "Modifier" (en haut à droite de cette section)
6. Tu dois maintenant voir 2 NOUVEAUX champs en dessous des dates de visites médicales :
   - **"Prochain RDV - Date"** (champ date)
   - **"Prochain RDV - Heure"** (champ heure)

## Comment l'utiliser ?

### Scénario 1 : RDV dans plus de 2 jours
1. Remplis la date (ex: dans 5 jours)
2. Remplis l'heure (ex: 14:30)
3. Clique sur "Enregistrer"
4. **Résultat** : Rien ne se passe immédiatement
5. **Dans 3 jours** : Le système créera automatiquement les notifications à 8h du matin

### Scénario 2 : RDV dans moins de 2 jours
1. Remplis la date (ex: demain)
2. Remplis l'heure (ex: 09:00)
3. Clique sur "Enregistrer"
4. **Résultat** : Une notification est créée IMMÉDIATEMENT pour tous les membres "Accueil - Recrutement"

### Qui reçoit les notifications ?
Tous les utilisateurs qui ont l'une de ces permissions :
- Accueil - Recrutement
- Admin Full
- RH Full

### Format de la notification
```
Titre : Rappel RDV Visite Médicale
Description : Jean DUPONT (matricule 12345) a un RDV le 07/03/2026 à 14:30
```

## Test rapide

### Faire un test complet :

1. **Va dans Supabase SQL Editor**
2. **Trouve l'ID d'un salarié de test** :
   ```sql
   SELECT id, prenom, nom, matricule_tca
   FROM profil
   WHERE deleted_at IS NULL
   LIMIT 1;
   ```
3. **Note l'ID** (copie-le)

4. **Crée un RDV pour dans 2 jours** :
   ```sql
   UPDATE profil
   SET
     visite_medicale_rdv_date = CURRENT_DATE + INTERVAL '2 days',
     visite_medicale_rdv_heure = '14:30:00'
   WHERE id = 'COLLE_ICI_L_ID';
   ```
   (Remplace `COLLE_ICI_L_ID` par l'ID que tu as noté)

5. **Teste la fonction manuellement** :
   ```sql
   SELECT * FROM generate_rdv_visite_medicale_notifications();
   ```

6. **Vérifie que les notifications ont été créées** :
   ```sql
   SELECT
     i.titre,
     i.description,
     i.statut,
     au.email as destinataire
   FROM incident i
   LEFT JOIN app_utilisateur au ON i.assigned_to = au.id
   WHERE i.type = 'rdv_visite_medicale'
   ORDER BY i.created_at DESC
   LIMIT 5;
   ```

Si tu vois des lignes avec "Rappel RDV Visite Médicale", c'est que ça marche !

## Automatisation

Le système tourne automatiquement **tous les jours à 8h00 du matin**.

Il vérifie :
- Tous les salariés actifs (pas sortis, pas inactifs)
- Qui ont un RDV programmé dans exactement 2 jours
- Et crée une notification pour chaque membre de l'équipe Accueil-Recrutement

## En cas de problème

### Problème : Les colonnes n'apparaissent pas dans l'interface
1. Vérifie que tu as bien exécuté le SQL
2. Rafraîchis complètement la page (Ctrl+F5)
3. Vide le cache du navigateur

### Problème : Les notifications ne sont pas créées
1. Vérifie que le salarié n'est pas "sorti" ou "inactif"
2. Vérifie que la date ET l'heure sont bien renseignées
3. Vérifie qu'il y a bien des utilisateurs avec les bonnes permissions

### Problème : Le CRON ne tourne pas
```sql
-- Vérifier le job
SELECT * FROM cron.job WHERE jobname = 'generate-rdv-visite-medicale-notifications';

-- Si le job n'existe pas, recrée-le :
SELECT cron.schedule(
  'generate-rdv-visite-medicale-notifications',
  '0 8 * * *',
  $$SELECT generate_rdv_visite_medicale_notifications();$$
);
```

## C'est tout !

Tu peux maintenant utiliser le système. N'hésite pas si tu as des questions !
