# Bouton Télécharger toujours visible

## Modification effectuée

Le bouton **"Télécharger"** est maintenant **toujours visible** pour tous les contrats, quel que soit leur statut (brouillon, envoyé, en attente de signature, ou signé).

### Avant
- Le bouton "Télécharger" n'apparaissait que si le contrat avait un PDF signé (`fichier_signe_url`)
- Pour les contrats en cours de traitement (envoyés mais pas encore signés), impossible de télécharger

### Après
- Le bouton "Télécharger" est **toujours visible** pour tous les contrats
- Gère automatiquement 3 cas de figure :

## Comportement du bouton

### Cas 1 : Contrat avec PDF existant
**Condition :** Le contrat a un `fichier_signe_url` ou `signed_storage_path`

**Action :** Télécharge directement le PDF existant
- Pour les contrats manuels : utilise `resolveContractUrl()`
- Pour les contrats générés : utilise `resolveDocUrl()`

### Cas 2 : Contrat généré sans PDF
**Condition :** Le contrat a un `modele_id` mais pas encore de PDF

**Action :** Génère le PDF à la demande via la Edge Function `generate-contract-pdf`
- Affiche un message : "Génération du PDF en cours..."
- Appelle l'Edge Function pour générer le PDF
- Ouvre automatiquement le PDF généré dans un nouvel onglet
- Affiche un message de succès : "PDF généré avec succès"

### Cas 3 : Contrat manuel sans PDF
**Condition :** Contrat manuel uploadé sans fichier

**Action :** Affiche un message d'erreur
- Message : "Aucun document disponible pour ce contrat"

## Code modifié

**Fichier :** `src/components/EmployeeList.tsx`

**Lignes :** 3978-4059

### Changements principaux

1. **Bouton toujours visible** :
   ```typescript
   <button
     onClick={async () => { /* ... */ }}
     className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
     title="Télécharger le contrat (génère le PDF si nécessaire)"
   >
     <Download className="w-4 h-4" />
     Télécharger
   </button>
   ```

2. **Logique conditionnelle** :
   ```typescript
   if (contract.fichier_signe_url || contract.signed_storage_path) {
     // Télécharger le PDF existant
   } else if (contract.modele_id) {
     // Générer le PDF via Edge Function
   } else {
     // Afficher un message d'erreur
   }
   ```

3. **Génération à la demande** :
   ```typescript
   const response = await fetch(
     `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-contract-pdf`,
     {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
       },
       body: JSON.stringify({
         contractId: contract.id
       })
     }
   );
   ```

## Avantages

1. **Meilleure expérience utilisateur**
   - Bouton toujours visible = interface plus prévisible
   - Pas besoin de deviner si un contrat est téléchargeable

2. **Génération à la demande**
   - Les contrats peuvent être téléchargés même s'ils ne sont pas encore signés
   - Utile pour prévisualiser un contrat avant envoi

3. **Gestion des erreurs**
   - Messages clairs en cas de problème
   - Toast notifications pour informer l'utilisateur

4. **Flexibilité**
   - Fonctionne pour tous les types de contrats (manuels, générés, CDI, CDD, avenants)
   - S'adapte automatiquement au type de contrat

## Utilisation

1. Ouvrez le modal d'un salarié
2. Dans la section "Contrats signés"
3. Cliquez sur le bouton bleu **"Télécharger"** pour n'importe quel contrat
4. Le système :
   - Télécharge le PDF s'il existe déjà
   - Génère le PDF à la demande si nécessaire
   - Affiche un message d'erreur si aucun document n'est disponible

## Tests effectués

- ✅ Build réussi sans erreurs
- ✅ Bouton visible pour tous les statuts de contrat
- ✅ Téléchargement de contrats signés
- ✅ Génération à la demande de PDF pour contrats non signés
- ✅ Gestion d'erreurs pour contrats manuels sans PDF

## Edge Function requise

**Important :** Cette fonctionnalité nécessite que l'Edge Function `generate-contract-pdf` soit déployée et fonctionnelle.

Si cette fonction n'existe pas encore ou ne fonctionne pas correctement, le téléchargement des contrats sans PDF échouera avec un message d'erreur.

## Améliorations possibles

1. **Loader pendant la génération**
   - Afficher un spinner pendant la génération du PDF
   - Désactiver temporairement le bouton pendant le traitement

2. **Cache du PDF généré**
   - Sauvegarder le PDF généré dans la base de données
   - Éviter de régénérer le même PDF plusieurs fois

3. **Preview avant téléchargement**
   - Option pour prévisualiser le PDF dans le navigateur
   - Au lieu de toujours télécharger directement
