# À FAIRE MAINTENANT - Fix incidents CDI

## Action immédiate

1. Ouvrir **Supabase Dashboard**
2. Aller dans **SQL Editor**
3. Copier-coller le fichier **`EXECUTER-MAINTENANT-INCIDENTS-OBSOLETES.sql`**
4. Cliquer **Run**

## Problème résolu

Des profils avec CDI signé apparaissent dans "Contrats expirés" alors qu'ils ne devraient pas.

## Règle appliquée

```
CDD/Avenant expiré + CDI signé ensuite = Pas d'incident
```

## Ce que le script fait

1. Corrige `get_cdd_expires()` pour exclure les CDD couverts par un CDI
2. Corrige `get_avenants_expires()` pour exclure les avenants couverts par un CDI  
3. Crée une fonction pour résoudre les incidents obsolètes
4. Ajoute un trigger pour auto-résolution lors création CDI
5. Résout tous les incidents existants (backfill)

## Résultat attendu

- Didier RENARD n'apparaît plus dans "Contrats expirés"
- Compteurs incidents diminuent (uniquement vrais cas restent)
- Auto-résolution future lors création CDI

## Fichiers créés

- **EXECUTER-MAINTENANT-INCIDENTS-OBSOLETES.sql** ⭐ (à exécuter)
- **GUIDE-RAPIDE-FIX-INCIDENTS.md** (guide)
- **FIX-INCIDENTS-CONTRAT-OBSOLETES.sql** (version détaillée)
- **EXECUTER-MAINTENANT-FIX-INCIDENTS-OBSOLETES.md** (documentation complète)

## Temps d'exécution

2-3 secondes
