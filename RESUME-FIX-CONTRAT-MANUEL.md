# Résumé : Fix Erreur 400 Contrat Manuel

## Problème identifié

Erreur 400 lors de l'ajout d'un contrat manuel :
- Message : "Erreur lors de l'enregistrement en base de données"
- Console : "Insert error: Object { No properties }"

## Causes trouvées

1. Colonne `modele_id` est `NOT NULL` mais contrats manuels = pas de modèle
2. Logs d'erreur incomplets (objet vide)
3. Contrainte CHECK potentiellement restrictive

## Corrections appliquées

### Code amélioré
`src/components/ManualContractUploadModal.tsx` :
- Logs détaillés avant insertion
- Affichage complet de l'erreur (message, details, hint, code)
- Message d'erreur explicite pour l'utilisateur

### Script SQL créé
`FIX-CONTRAT-MANUEL-COMPLETE.sql` :
- Rend `modele_id` nullable
- Ajoute colonnes manquantes (type, date_debut, date_fin, source, yousign_signature_request_id)
- Met à jour contrainte CHECK pour accepter tous les statuts
- Vérifie les policies RLS

## Actions à faire

### 1. Exécuter le SQL
```bash
# Dans Supabase SQL Editor :
FIX-CONTRAT-MANUEL-COMPLETE.sql
```

### 2. Tester
1. Rafraîchir l'app
2. Modal salarié → "Ajouter contrat manuel"
3. Remplir formulaire + PDF
4. Enregistrer
5. Vérifier le contrat apparaît

### 3. Si erreur persiste
Ouvrir F12, la console montrera maintenant :
```
Insert error details: {
  message: "...",
  details: "...",
  hint: "...",
  code: "..."
}
```

## Fichiers créés

1. `FIX-CONTRAT-MANUEL-COMPLETE.sql` - Script de correction
2. `DIAGNOSTIC-CONTRAT-MANUEL-ERREUR.sql` - Script de diagnostic
3. `GUIDE-FIX-CONTRAT-MANUEL.md` - Guide détaillé
4. `RESUME-FIX-CONTRAT-MANUEL.md` - Ce fichier

## Résultat attendu

| Avant | Après |
|-------|-------|
| Erreur 400 | Contrat créé |
| "No properties" | Message d'erreur clair |
| Impossible d'uploader | Upload OK |
| modele_id requis | modele_id optionnel |

**Temps : 30 secondes + test**

Build OK
