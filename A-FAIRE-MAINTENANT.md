# À faire maintenant - 2 corrections

## ⚠️ ERREUR SQL CORRIGÉE

**Les scripts utilisaient le mauvais nom de colonne !**
- ❌ `numero_piece_identite` (n'existe pas)
- ✅ `nir` (le bon nom)

Tous les fichiers ont été corrigés. Voir : **`CORRECTION-VARIABLES-CDI-APPLIQUEE.md`**

---

## 1. Corriger l'onglet Avenant (25 au lieu de 86)

### Exécuter le SQL
1. Ouvrez l'éditeur SQL de Supabase
2. Copiez et exécutez le fichier : **`CORRIGER-ONGLET-AVENANT-MAINTENANT.sql`**
3. Rafraîchissez votre application
4. Le badge "Avenant" affiche maintenant 25

### Vérification
- Console du navigateur (F12) doit afficher : `avenantsData length 25`
- L'onglet Avenant doit afficher uniquement 25 avenants expirés
- Pas de doublons
- Les salariés avec CDI sont exclus

**Fichiers disponibles :**
- `CORRIGER-ONGLET-AVENANT-MAINTENANT.sql` - SQL à exécuter
- `CORRECTION-ONGLET-AVENANT-README.md` - Explications détaillées
- `EXECUTER-CORRECTION-AVENANT.md` - Guide rapide

---

## 2. Corriger les variables CDI non remplies

### Redéployer la fonction Edge
La fonction `create-yousign-signature` a été mise à jour avec de meilleurs logs et mapping.

**Redéploiement via CLI :**
```bash
cd /tmp/cc-agent/59041934/project
supabase functions deploy create-yousign-signature
```

**Ou via Dashboard Supabase :**
1. Edge Functions > create-yousign-signature
2. Cliquez sur "Deploy"
3. Uploadez le fichier `supabase/functions/create-yousign-signature/index.ts`

### Vérifier les données du profil
Utilisez le script SQL : **`VERIFIER-DONNEES-PROFIL-CDI.sql`**

1. Ouvrez l'éditeur SQL de Supabase
2. Copiez le contenu du fichier
3. Remplacez `'MATRICULE_ICI'` par le matricule du salarié
4. Exécutez
5. Vérifiez que toutes les lignes affichent ✅

### Si des données sont manquantes
1. Allez dans l'interface RH
2. Ouvrez la fiche du salarié
3. Remplissez TOUS les champs obligatoires
4. Enregistrez

### Tester avec un nouveau contrat
1. Créez un nouveau contrat CDI via Yousign
2. Ouvrez les logs Supabase (Edge Functions > Logs)
3. Vérifiez que les variables sont bien remplies
4. Vérifiez le PDF généré

**Fichiers disponibles :**
- `FIX-VARIABLES-CDI-NON-REMPLIES.md` - Guide complet de diagnostic
- `VERIFIER-DONNEES-PROFIL-CDI.sql` - Script de vérification
- `SOLUTION-VARIABLES-CDI.md` - Résumé de la solution

---

## Ordre d'exécution recommandé

### 1. Onglet Avenant (2 minutes)
```bash
# SQL à exécuter
CORRIGER-ONGLET-AVENANT-MAINTENANT.sql
```

### 2. Variables CDI (5-10 minutes)
```bash
# 1. Redéployer la fonction
supabase functions deploy create-yousign-signature

# 2. Vérifier les données (SQL)
VERIFIER-DONNEES-PROFIL-CDI.sql

# 3. Compléter les données manquantes (Interface RH)
# 4. Tester avec un nouveau contrat
```

---

## Résumé

### Onglet Avenant
- Exécutez `CORRIGER-ONGLET-AVENANT-MAINTENANT.sql`
- Rafraîchissez l'application
- Vérifiez que le badge affiche 25

### Variables CDI
- Redéployez la fonction Edge
- Vérifiez que les données du profil sont complètes
- Testez avec un nouveau contrat CDI
- Vérifiez les logs Supabase pour le diagnostic

---

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs Supabase (Edge Functions > Logs)
2. Vérifiez la console du navigateur (F12)
3. Exécutez les scripts SQL de vérification
4. Envoyez-moi les logs et captures d'écran
