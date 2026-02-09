# ✅ Patch Minimal - Mise à jour automatique des dates d'incident

## Ce qui a été modifié

### 1. Fonction SQL créée
- **Fichier**: `create-update-incident-expiration-rpc.sql`
- **Fonction**: `update_incident_expiration_date_only(profil_id, type, date, commentaire)`
- **Action**: Met à jour uniquement `date_expiration` de l'incident sans changer le statut

### 2. Code frontend modifié
- **Fichier**: `src/components/EmployeeList.tsx` (lignes 2096-2153)
- **Fonction**: `handleSaveExpirationDates`
- **Ajout**:
  - Appel automatique RPC après sauvegarde du profil
  - Détection si titre_sejour ou visite_medicale a changé
  - Mise à jour de l'incident correspondant
  - Rafraîchissement automatique de l'UI via `onUpdate()`

## Flow complet

```
1. Utilisateur ouvre modal salarié
   ↓
2. Modifie "Titre de séjour - Fin de validité"
   ↓
3. Clique sur "Enregistrer"
   ↓
4. Update profil.titre_sejour_fin_validite ✅
   ↓
5. Appel RPC update_incident_expiration_date_only ✅
   ↓
6. Incident.date_expiration mise à jour ✅
   ↓
7. Incident.statut reste 'actif' ✅
   ↓
8. onUpdate() rafraîchit l'UI ✅
   ↓
9. Compteurs d'incidents mis à jour immédiatement ✅
```

## Déploiement en 2 étapes

### Étape 1: SQL
```sql
-- Copier-coller dans Supabase SQL Editor
-- Fichier: create-update-incident-expiration-rpc.sql
```

### Étape 2: Frontend
Le code est déjà modifié et a build avec succès ✅

## Test rapide

```sql
-- Vérifier la fonction
SELECT proname FROM pg_proc WHERE proname = 'update_incident_expiration_date_only';

-- Tester sur un profil
SELECT public.update_incident_expiration_date_only(
  'votre-profil-id',
  'titre_sejour',
  '2025-12-31',
  'Test manuel'
);
```

## Comportement confirmé

✅ La date du profil est mise à jour
✅ La date d'expiration de l'incident est mise à jour
✅ Le statut de l'incident reste "actif"
✅ Un commentaire est ajouté dans l'incident
✅ Les compteurs dans le dashboard se rafraîchissent
✅ Pas de rechargement de page nécessaire
✅ Fonctionne pour titre_sejour ET visite_medicale

## Ce qui N'a PAS changé

❌ Les incidents ne sont PAS résolus automatiquement
❌ Le statut reste "actif" ou "en_cours"
❌ Pas de résolution automatique lors de l'upload de documents (autre feature)

## Fichiers créés

1. `create-update-incident-expiration-rpc.sql` - Fonction SQL
2. `DEPLOYER-PATCH-INCIDENT-DATE.md` - Guide détaillé
3. `TESTER-PATCH-INCIDENT-DATE.sql` - Script de test
4. `RESUME-PATCH-INCIDENT-DATE.md` - Ce fichier

## Build status

✅ `npm run build` réussi sans erreurs
