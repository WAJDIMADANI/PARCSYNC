# 🚀 Quick Fix - Doublons de Matricule TCA

## Problème
Fatoumata TOUNKARA (matricule 1598) n'affiche pas son contrat dans le modal.

## Cause
Doublon de profil créé lors de l'import. Le contrat est lié au nouveau profil, pas à l'ancien.

## Solution en 3 Étapes (5 minutes)

### 1️⃣ Détectez les doublons
Dans Supabase SQL Editor:
```sql
SELECT
  matricule_tca,
  COUNT(*) as nombre_doublons,
  STRING_AGG(nom || ' ' || prenom, ' | ') as noms
FROM profil
WHERE matricule_tca IS NOT NULL
GROUP BY matricule_tca
HAVING COUNT(*) > 1;
```

### 2️⃣ Fusionnez les doublons
Dans Supabase SQL Editor, exécutez le fichier: `merge-duplicate-matricules.sql`

Cela va:
- Identifier le profil principal pour chaque doublon
- Transférer tous les contrats vers le bon profil
- Supprimer les doublons
- Afficher un résumé

### 3️⃣ Vérifiez
Actualisez votre application et ouvrez le modal de Fatoumata TOUNKARA.
Le contrat devrait maintenant s'afficher!

## Pour les prochains imports
Le système est maintenant amélioré:
- ⚠️ Il détectera les doublons de matricule TCA
- ✅ Il mettra à jour le profil existant au lieu de créer un doublon
- ✅ Plus besoin de fusion manuelle!

## Fichiers à utiliser
1. `detect-duplicate-matricules.sql` - Pour voir les doublons
2. `merge-duplicate-matricules.sql` - Pour fusionner automatiquement
3. `GUIDE-CORRECTION-DOUBLONS.md` - Guide complet

---
**⚠️ IMPORTANT:** Faites un backup Supabase avant d'exécuter le script de fusion!
