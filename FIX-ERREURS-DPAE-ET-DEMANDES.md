# Correction des erreurs DPAE et Demandes

## Problèmes corrigés

### 1. Erreur 403 sur GET /rest/v1/document
**Cause**: Les policies RLS de la table `document` ne permettaient pas l'accès aux documents.

**Solution**: Exécuter le fichier SQL `FIX-DOCUMENT-RLS-POLICIES-403.sql` pour corriger les policies.

### 2. Logs détaillés ajoutés
Des logs ont été ajoutés pour mieux diagnostiquer les erreurs:
- Dans `EmployeeList.tsx` : fonction `fetchDocuments`
- Dans `ImportantDocumentUpload.tsx` : fonction `handleUpload`

### 3. Erreur 400 PGRST200 dans demandes
**Note**: Le code actuel de `DemandesPage.tsx` utilise déjà `profil:profil_id(...)` qui est correct. Si vous voyez encore cette erreur, vérifiez qu'il n'y a pas de cache navigateur.

## Étapes de déploiement

### 1. Exécuter le SQL dans Supabase

1. Ouvrez l'éditeur SQL de Supabase
2. Copiez tout le contenu de `FIX-DOCUMENT-RLS-POLICIES-403.sql`
3. Exécutez le script
4. Vérifiez les résultats:
   - Les anciennes policies doivent être supprimées
   - 5 nouvelles policies doivent être créées
   - Les GRANT doivent être appliqués

### 2. Actualiser l'application

1. Videz le cache du navigateur (Ctrl+Shift+R)
2. Rechargez complètement la page
3. Reconnectez-vous si nécessaire

### 3. Tester l'upload DPAE

1. Ouvrez un profil salarié
2. Essayez d'uploader un document DPAE
3. Ouvrez la console développeur (F12)
4. Regardez les logs détaillés:
   ```
   [UPLOAD DOCUMENT] Insertion document: {...}
   [UPLOAD DOCUMENT] Document inséré avec succès
   ```

### 4. Vérifier les logs en cas d'erreur

Si vous voyez encore des erreurs, les logs vous donneront maintenant:
- Le **status** HTTP (403, 400, etc.)
- Le **message** d'erreur
- Les **details** techniques
- Le **hint** de PostgreSQL
- Le **code** d'erreur

## Exemple de logs en cas d'erreur

### Erreur 403 (Accès refusé)
```
[FETCH DOCUMENTS] Erreur profil documents: {
  status: 403,
  message: "permission denied for table document",
  details: null,
  hint: null,
  code: "42501"
}
```

**Solution**: Exécuter `FIX-DOCUMENT-RLS-POLICIES-403.sql`

### Erreur 400 (Mauvaise requête)
```
[FETCH DOCUMENTS] Erreur profil documents: {
  status: 400,
  message: "foreign key violation",
  details: "Key (owner_id)=(xxx) is not present in table profil",
  hint: null,
  code: "23503"
}
```

**Solution**: Vérifier que le profil existe dans la base de données

## Vérifications post-déploiement

1. **Vérifier les policies**:
   ```sql
   SELECT policyname, cmd, roles
   FROM pg_policies
   WHERE tablename = 'document';
   ```

2. **Tester l'accès aux documents**:
   ```sql
   SELECT COUNT(*) FROM document;
   ```

3. **Vérifier les permissions**:
   ```sql
   SELECT grantee, privilege_type
   FROM information_schema.role_table_grants
   WHERE table_name = 'document';
   ```

## Si les problèmes persistent

1. Vérifiez les logs dans la console (F12)
2. Copiez l'erreur complète
3. Vérifiez que l'utilisateur est bien connecté
4. Vérifiez que le profil de l'utilisateur a le bon rôle (admin, manager, etc.)

## Notes importantes

- Les logs sont préfixés avec `[FETCH DOCUMENTS]` ou `[UPLOAD DOCUMENT]` pour faciliter la recherche
- Les erreurs ne bloquent plus l'interface (l'application continue de fonctionner)
- Tous les détails de l'erreur sont maintenant loggés dans la console
