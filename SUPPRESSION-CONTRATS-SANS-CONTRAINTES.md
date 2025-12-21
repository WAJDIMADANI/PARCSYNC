# Suppression de contrats sans contraintes

## Modifications apportées

### 1. Bouton de suppression pour TOUS les contrats

**Avant :**
- Seuls les contrats manuels pouvaient être supprimés
- Les contrats générés via Yousign ne pouvaient pas être supprimés

**Après :**
- TOUS les contrats (manuels ET générés) peuvent être supprimés
- Le bouton "Supprimer" apparaît pour chaque contrat dans le modal du salarié

### 2. Fonction de suppression améliorée

**Fichier modifié :** `src/components/EmployeeList.tsx`

La fonction `deleteManualContract` a été améliorée pour :
- Supprimer les fichiers du storage pour tous les types de contrats
- Gérer les contrats Yousign (fichiers dans `signed_storage_path`)
- Gérer les contrats manuels (fichiers dans `fichier_signe_url`)
- Supprimer l'enregistrement de la base de données

```typescript
// Supprime le fichier signé du storage
if (contractToDelete.fichier_signe_url) {
  await supabase.storage
    .from('documents')
    .remove([contractToDelete.fichier_signe_url]);
}

// Supprime le fichier storage_path (pour contrats Yousign)
if (contractToDelete.signed_storage_path) {
  await supabase.storage
    .from('documents')
    .remove([contractToDelete.signed_storage_path]);
}

// Supprime l'enregistrement de la base de données
await supabase
  .from('contrat')
  .delete()
  .eq('id', contractToDelete.id);
```

### 3. Bouton "Renvoyer" pour les contrats générés

**Avant :**
- Le bouton s'appelait "Envoyer"
- Pas clair qu'on peut renvoyer le même modèle

**Après :**
- Le bouton s'appelle maintenant "Renvoyer"
- Tooltip explicatif : "Renvoyer le même modèle de contrat"
- Permet de renvoyer facilement un contrat après suppression

### 4. Modal de confirmation amélioré

Le modal de confirmation de suppression affiche maintenant correctement :
- Le nom du contrat (CDI, CDD, Avenant, etc.)
- Le type de contrat
- La date de signature (ou création si non signé)
- Pour tous les types de contrats (manuels et générés)

## Utilisation

### Supprimer un contrat

1. Ouvrez le modal d'un salarié
2. Dans la section "Contrats signés", cliquez sur le bouton rouge "Supprimer" du contrat à supprimer
3. Confirmez la suppression dans le modal de confirmation
4. Le contrat est supprimé de la base de données et le fichier PDF est supprimé du storage

### Renvoyer le même modèle de contrat

1. Après avoir supprimé un contrat généré (ou pour un contrat existant)
2. Cliquez sur le bouton vert "Renvoyer" pour les contrats générés
3. Le système renverra le même modèle de contrat au salarié

### Créer un nouveau contrat

1. Utilisez le bouton "Créer un contrat" pour créer un nouveau contrat avec un modèle différent
2. Utilisez le bouton "Ajouter un contrat" pour uploader un contrat manuel

## Avertissements

**ATTENTION :** La suppression de contrat est irréversible !
- Le fichier PDF sera définitivement supprimé
- Toutes les données associées seront supprimées
- Il n'y a pas de corbeille ou de sauvegarde automatique

**Recommandations :**
- Téléchargez toujours une copie du contrat avant de le supprimer
- Vérifiez que c'est bien le bon contrat avant de confirmer
- Ne supprimez pas un contrat si vous n'êtes pas sûr

## Tests effectués

- Build réussi sans erreurs
- L'interface affiche correctement les boutons pour tous les types de contrats
- Le modal de confirmation affiche les bonnes informations
- La fonction de suppression gère tous les types de contrats

## Fichiers modifiés

1. **src/components/EmployeeList.tsx**
   - Ligne 3965-4011 : Boutons d'action des contrats
   - Ligne 1242-1289 : Fonction `deleteManualContract`
   - Ligne 4659-4702 : Modal de confirmation de suppression

## Prochaines étapes

Pour tester en production :
1. Déployez les changements
2. Ouvrez le modal d'un salarié avec des contrats
3. Vérifiez que le bouton "Supprimer" apparaît pour tous les contrats
4. Testez la suppression sur un contrat de test
5. Vérifiez que le contrat est bien supprimé de la base et du storage
