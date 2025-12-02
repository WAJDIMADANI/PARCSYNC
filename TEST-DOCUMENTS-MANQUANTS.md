# Test du système de documents manquants

## Modifications effectuées

### 1. Création d'une source centralisée (requiredDocuments.ts)

**Fichier:** `src/constants/requiredDocuments.ts`

Cette source unique définit les 7 documents obligatoires:
- permis_recto (Permis de conduire Recto)
- permis_verso (Permis de conduire Verso)
- cni_recto (Carte d'identité Recto)
- cni_verso (Carte d'identité Verso)
- carte_vitale (Carte vitale)
- certificat_medical (Certificat médical)
- rib (RIB)

### 2. Correction du bug d'insertion dans UploadAllMissingDocuments.tsx

**Problème:** Les documents étaient insérés avec les mauvais champs de colonnes
- `url` → corrigé en `file_url`
- `nom_fichier` → corrigé en `file_name`
- Ajout des champs manquants: `storage_path`, `bucket`, `statut`

**Résultat:** Les documents uploadés sont maintenant correctement enregistrés dans la table `document`

### 3. Synchronisation avec EmployeeList.tsx

**Changements:**
- Import de `REQUIRED_DOCUMENT_TYPES` et `REQUIRED_DOCUMENTS_MAP`
- Suppression de la constante locale `REQUIRED_DOCUMENTS` et `DOCUMENT_LABELS`
- Utilisation de la source centralisée pour détecter les documents manquants

### 4. Synchronisation avec SendMissingDocumentsReminderModal.tsx

**Changements:**
- Import de `REQUIRED_DOCUMENTS_MAP`
- Suppression de la constante locale `DOCUMENT_LABELS`
- Utilisation de la source centralisée pour afficher les noms de documents

### 5. Amélioration de l'interface /upload-all-documents

**Ajouts:**
- Barre de progression visuelle montrant le nombre de documents uploadés
- Compteur "X / Y documents" en haut de la page
- Animation fluide lors de la progression

## Workflow complet de test

### Étape 1: Vérifier qu'un salarié a des documents manquants

1. Se connecter à l'interface admin
2. Aller dans "Gestion des salariés"
3. Sélectionner un salarié (ex: WAJDI MADANI)
4. Vérifier la section "Documents manquants à télécharger" (rouge)
5. Tous les documents de la liste doivent correspondre aux 7 types définis

### Étape 2: Envoyer un rappel

1. Cliquer sur "Tout sélectionner" dans la section Documents manquants
2. Cliquer sur "Envoyer un rappel par email"
3. Vérifier que l'email contient la liste des documents manquants
4. Vérifier que l'email contient le lien `/upload-all-documents?profil=...&token=...`

### Étape 3: Tester le lien d'upload

1. Ouvrir le lien reçu par email
2. Vérifier que la page affiche:
   - Le nom du salarié (Bonjour Prénom Nom)
   - La barre de progression (0 / 7 documents)
   - La liste des 7 documents manquants sous forme de cartes
   - Chaque carte affiche l'icône et le label correct

### Étape 4: Uploader un document

1. Sélectionner un document (ex: permis_recto)
2. Choisir un fichier ou prendre une photo
3. Cliquer sur "Envoyer"
4. Vérifier que:
   - Le document passe en vert avec "Document téléchargé avec succès!"
   - Le compteur passe à "1 / 7 documents"
   - La barre de progression avance à ~14%

### Étape 5: Vérifier la synchronisation

1. Retourner dans l'interface admin
2. Actualiser la page du salarié
3. Vérifier que:
   - Le document uploadé apparaît dans la section "Documents" (orange)
   - Le document n'apparaît plus dans "Documents manquants" (rouge)
   - Le nombre de documents manquants a diminué

### Étape 6: Uploader tous les documents

1. Uploader les 6 documents restants un par un
2. Vérifier que le compteur augmente à chaque fois
3. Quand tous les documents sont uploadés (7/7):
   - La page affiche "Tous les documents sont complets!"
   - Message de félicitations avec icône verte

### Étape 7: Vérification finale dans l'admin

1. Actualiser la page du salarié dans l'admin
2. Vérifier que:
   - Tous les 7 documents apparaissent dans la section "Documents"
   - La section "Documents manquants" est vide ou n'apparaît plus
   - Aucun document obligatoire ne manque

## Points de vérification SQL

### Vérifier que la fonction RPC existe:

```sql
SELECT proname FROM pg_proc WHERE proname = 'get_missing_documents_for_profil';
```

### Tester la fonction RPC avec un profil_id:

```sql
SELECT * FROM get_missing_documents_for_profil('ceba9276-4cae-4fca-92ad-7f8a2f4a4e2a');
```

### Vérifier les documents d'un salarié:

```sql
SELECT type_document, file_name, statut, created_at
FROM document
WHERE owner_id = 'ceba9276-4cae-4fca-92ad-7f8a2f4a4e2a'
  AND owner_type = 'profil'
ORDER BY created_at DESC;
```

## Résolution de problèmes

### Si les documents manquants ne s'affichent pas:

1. Vérifier que la fonction RPC `get_missing_documents_for_profil` existe dans Supabase
2. Exécuter le fichier `FIX-DOCUMENTS-MANQUANTS-FINAL.sql` dans l'éditeur SQL de Supabase
3. Vérifier les logs de la console navigateur sur la page `/upload-all-documents`

### Si l'upload échoue:

1. Vérifier que le bucket `documents` existe dans Supabase Storage
2. Vérifier les policies RLS sur la table `document`
3. Vérifier les logs de la console navigateur

### Si les documents uploadés n'apparaissent pas dans l'admin:

1. Vérifier que le document est bien dans la table `document` (voir requête SQL ci-dessus)
2. Actualiser la page (F5)
3. Vérifier les champs: `owner_id`, `owner_type`, `type_document`

## Résumé des fichiers modifiés

1. ✅ `src/constants/requiredDocuments.ts` (CRÉÉ)
2. ✅ `src/components/UploadAllMissingDocuments.tsx` (MODIFIÉ)
3. ✅ `src/components/EmployeeList.tsx` (MODIFIÉ)
4. ✅ `src/components/SendMissingDocumentsReminderModal.tsx` (MODIFIÉ)

## Prochaines étapes suggérées

1. Tester le workflow complet avec un vrai salarié
2. Vérifier que les emails de rappel contiennent la bonne liste
3. Tester l'upload depuis mobile (caméra)
4. Vérifier les permissions RLS si nécessaire
