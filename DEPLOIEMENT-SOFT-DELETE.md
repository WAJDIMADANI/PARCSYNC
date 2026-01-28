# Déploiement Système Soft Delete - Action Immédiate

## Étape 1 : Appliquer la migration SQL (OBLIGATOIRE)

Ouvrez le dashboard Supabase → SQL Editor et exécutez le fichier :
```
add-soft-delete-profil.sql
```

Ou copiez-collez le contenu directement dans l'éditeur SQL.

## Étape 2 : Le frontend est prêt !

Tous les fichiers frontend ont été modifiés. Le système est fonctionnel dès que la migration SQL est appliquée.

## Test rapide

1. Appliquez la migration SQL
2. Ouvrez l'application
3. Allez dans "Salariés"
4. Cliquez sur un profil
5. Le bouton "Supprimer" apparaît dans le header (rouge)
6. Cliquez dessus → Un modal de confirmation s'affiche
7. Confirmez → Le profil est archivé et disparaît de la liste

## Vérification SQL

```sql
-- Voir si la colonne existe
SELECT * FROM profil LIMIT 1;

-- Compter les profils actifs vs archivés
SELECT
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as actifs,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as archives
FROM profil;
```

## Comportement

### Profil archivé = :
- N'apparaît plus dans aucune liste
- Historique emails CRM conservé
- Peut recréer un profil avec le même email

### Profil actif = :
- `deleted_at IS NULL`
- Visible normalement
- Email unique (pas de doublon)

## Bouton Supprimer

- **Desktop** : Bouton "Supprimer" avec texte
- **Mobile** : Icône poubelle seule
- **Emplacement** : Header du modal de détail (à côté du X)
- **Couleur** : Rouge

## Fichiers concernés

### Créés :
- `src/components/ConfirmDeleteProfilModal.tsx` - Modal de confirmation
- `add-soft-delete-profil.sql` - Migration SQL
- `GUIDE-SOFT-DELETE-PROFILS.md` - Guide complet

### Modifiés :
- `src/components/EmployeeList.tsx` - Bouton + filtre + fonction suppression
- `src/components/CRMEmailsNew.tsx` - Filtre deleted_at
- `src/components/RHDashboard.tsx` - Filtre deleted_at
- `src/components/ContractsList.tsx` - Filtre deleted_at

## En cas de problème

Consultez `GUIDE-SOFT-DELETE-PROFILS.md` pour le guide détaillé avec dépannage.
