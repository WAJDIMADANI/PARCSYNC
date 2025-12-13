# 🚨 CORRECTION URGENTE - Incidents manquants

## 📊 Problème identifié

**Symptôme:**
- ✅ Tableau de bord affiche: 2 titres de séjour + 17 visites médicales expirés
- ❌ Page "Incidents" est complètement vide

**Cause:**
```
Tableau de bord RH    →  Lit la table "notification"  ✓
Page Incidents        →  Lit la table "incident"      ✗ (vide)
```

Les notifications ont été créées, mais les incidents correspondants n'ont jamais été générés !

---

## ⚡ Solution en 3 étapes (2 minutes)

### Étape 1: Ouvrir Supabase SQL Editor
1. Aller sur Supabase Dashboard
2. Cliquer sur "SQL Editor" dans le menu

### Étape 2: Exécuter le script
1. Ouvrir le fichier: `SOLUTION-COMPLETE-INCIDENTS-MANQUANTS.sql`
2. Copier TOUT le contenu
3. Coller dans Supabase SQL Editor
4. Cliquer sur "Run" (ou F5)

### Étape 3: Vérifier les résultats
Le script affichera quelque chose comme:
```json
{
  "titre_sejour": 2,
  "visite_medicale": 17,
  "permis_conduire": 0,
  "contrat_cdd": 0,
  "total": 19
}
```

✅ **19 incidents créés !**

---

## 🔍 Vérification finale

### Dans Supabase (après exécution)
Le script affiche automatiquement la liste des incidents créés avec:
- Type d'incident
- Nom du salarié
- Date d'expiration
- Nombre de jours depuis expiration

### Dans l'application
1. Retourner sur la page "Gestion des incidents"
2. Cliquer sur "Actualiser" en haut à droite
3. Cliquer sur l'onglet "Titre de séjour" → voir 2 incidents
4. Cliquer sur l'onglet "Visite médicale" → voir 17 incidents

---

## 📝 Ce que fait le script

1. **Scanne les salariés actifs** pour trouver les documents expirés:
   - Titres de séjour expirés
   - Visites médicales expirées
   - Permis de conduire expirés
   - Contrats CDD expirés

2. **Crée un incident** pour chaque document expiré qui n'a pas déjà d'incident

3. **Évite les doublons** - ne crée pas d'incident si un incident existe déjà

4. **Affiche un résumé** du nombre d'incidents créés par type

---

## 🔄 Synchronisation future

Après cette correction unique:
- Les nouveaux documents expirés créeront automatiquement des incidents
- Le tableau de bord et la page Incidents seront toujours synchronisés
- Plus besoin de réexécuter ce script

---

## ❓ Questions fréquentes

**Q: Pourquoi les incidents n'ont-ils pas été créés automatiquement?**
R: Le système de génération automatique n'a probablement pas été activé ou les documents étaient déjà expirés avant l'installation du système d'incidents.

**Q: Ce script va-t-il créer des doublons?**
R: Non, le script vérifie avant de créer chaque incident. Si un incident existe déjà, il ne crée rien.

**Q: Puis-je exécuter ce script plusieurs fois?**
R: Oui, sans danger. Le script ne créera que les incidents manquants.

---

## 📞 Support

Si après l'exécution du script les incidents n'apparaissent toujours pas:
1. Vérifier les permissions RLS sur la table `incident`
2. Vérifier que les profils ont bien `statut = 'actif'`
3. Consulter les logs dans Supabase SQL Editor
