# Correction complète du système RDV Visite Médicale + Inbox

## Problème résolu

### Bug identifié
Quand vous modifiez une date de RDV visite médicale dans le modal salarié, vous receviez l'erreur:
```
column "assigned_to" does not exist
```

### Cause
Le trigger `trigger_rdv_visite_medicale_notification` tentait d'insérer dans la table `incident` avec la colonne `assigned_to` qui n'existe pas. La table `incident` n'a jamais eu cette colonne.

### Solution appliquée
Les notifications RDV utilisent maintenant la table `inbox` au lieu de `incident`.

## Fichiers modifiés

### 1. FIX-RDV-VISITE-MEDICALE-INBOX.sql
**Nouveau fichier SQL de correction**

Remplace les fonctions suivantes pour utiliser `inbox`:
- `generate_rdv_visite_medicale_notifications()` - Notifications J-2
- `create_immediate_rdv_notification()` - Notifications immédiates (RDV < 2 jours)

Ces fonctions créent maintenant des messages inbox avec:
- `type = 'rdv_visite_medicale'`
- `reference_type = 'profil'`
- `reference_id = profil_id du salarié`
- `contenu = JSON` avec les données du RDV (date, heure, urgence, etc.)

### 2. src/components/InboxPage.tsx
**Améliorations de l'interface Inbox**

#### Interface étendue
- Support du type `'rdv_visite_medicale'`
- Support du statut `'ouvert'`
- Champ `reference_type` ajouté
- Contenu peut être un objet JSON

#### Chargement des profils
Quand un message a `reference_type='profil'`, les informations du salarié sont automatiquement chargées:
- Prénom, nom
- Email
- Matricule
- Poste

#### Modal amélioré
Le modal affiche différemment selon le type:

**Pour les RDV visite médicale:**
- Header orange/ambre au lieu de vert
- Section "Informations du salarié" avec bouton "Voir le profil"
- Section "Détails du rendez-vous" avec:
  - Date du RDV (format long lisible)
  - Heure du RDV
  - Badge d'urgence si applicable (AUJOURD'HUI, DEMAIN, RDV PASSÉ)
- Section "Détails de la notification" avec le message

**Pour les demandes externes:**
- Header vert (inchangé)
- Section "Informations du chauffeur" (inchangé)
- Section "Détails de la demande" (inchangé)
- Fichiers joints (inchangé)

## Utilisation

### 1. Appliquer la correction SQL

```sql
-- Dans l'éditeur SQL Supabase, exécuter:
\i FIX-RDV-VISITE-MEDICALE-INBOX.sql
```

Cette commande va:
- Recréer `generate_rdv_visite_medicale_notifications()` pour utiliser inbox
- Recréer `create_immediate_rdv_notification()` pour utiliser inbox
- Le trigger existant continue de fonctionner (pas besoin de le recréer)

### 2. Tester

1. Ouvrir le modal d'un salarié
2. Modifier la date/heure du RDV visite médicale
3. Cliquer sur "Enregistrer"
4. ✅ Plus d'erreur "assigned_to does not exist"
5. Si le RDV est dans moins de 2 jours → notification créée immédiatement dans l'inbox
6. Aller dans "Boîte de Réception"
7. Voir la notification RDV avec design orange
8. Cliquer dessus pour voir les détails
9. Cliquer sur "Voir le profil" pour ouvrir le modal du salarié

### 3. Job CRON quotidien

Le job CRON créé par `EXECUTER-MAINTENANT-rdv-visite-medicale.sql` continue de fonctionner:
- S'exécute tous les jours à 8h00
- Cherche les RDV prévus dans 2 jours (J+2)
- Crée des notifications inbox pour tous les membres RH

## Avantages de la solution

1. **Plus d'erreur SQL** - Les colonnes de la table `inbox` existent
2. **Meilleure UI** - Design spécifique pour les RDV (orange au lieu de vert)
3. **Lien direct au profil** - Bouton "Voir le profil" ouvre le modal salarié
4. **Données structurées** - Le contenu JSON permet d'extraire les infos (date, heure, urgence)
5. **Pas de régression** - Les demandes externes continuent de fonctionner normalement

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Modifier date RDV dans modal salarié                        │
│ EmployeeList.tsx:2084 handleSaveExpirationDates()          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌────────────────────────────┐
         │ UPDATE profil              │
         │ SET visite_medicale_rdv_*  │
         └──────────┬─────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │ TRIGGER: trigger_rdv_notification()   │
    │ Vérifie si RDV dans < 2 jours         │
    └──────────┬────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│ FUNCTION: create_immediate_rdv_notification()    │
│ Pour chaque utilisateur RH:                      │
│  - DELETE anciennes notifications inbox          │
│  - INSERT nouvelle notification inbox            │
│    • type = 'rdv_visite_medicale'               │
│    • reference_type = 'profil'                  │
│    • reference_id = profil_id                   │
│    • contenu = JSON(date, heure, urgence, ...)  │
└──────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│ INBOX PAGE (InboxPage.tsx)                      │
│  1. Charge les messages inbox                   │
│  2. Si reference_type='profil':                 │
│     → Charge les infos du profil                │
│  3. Affiche dans la liste                       │
│  4. Au clic → Ouvre modal avec:                 │
│     • Infos du salarié                          │
│     • Date/heure du RDV                         │
│     • Bouton "Voir le profil"                   │
└──────────────────────────────────────────────────┘
```

## Prochaines étapes possibles

1. Ajouter un bouton "Marquer comme traité" pour les notifications RDV
2. Envoyer un email automatique 2 jours avant le RDV
3. Afficher un badge sur le dashboard RH pour les RDV du jour
4. Créer un calendrier des RDV visites médicales

## Notes techniques

- Les anciennes notifications créées dans `incident` ne sont pas affectées
- Le système crée maintenant uniquement dans `inbox`
- Si vous voulez nettoyer les anciennes notifications `incident` de type `rdv_visite_medicale`:

```sql
DELETE FROM incident WHERE type = 'rdv_visite_medicale';
```

(Optionnel, elles ne causent pas de problème)
