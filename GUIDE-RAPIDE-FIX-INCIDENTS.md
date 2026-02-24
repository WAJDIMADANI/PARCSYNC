# Guide rapide - Fix incidents obsolètes

## Problème
Profils avec CDI signé apparaissent encore dans "Contrats expirés"

Exemple: **Didier RENARD** a un CDI signé mais des incidents sur ses anciens avenants

## Solution en 1 étape

### Copier-coller ce script dans Supabase SQL Editor:

```
Fichier: EXECUTER-MAINTENANT-INCIDENTS-OBSOLETES.sql
```

### Étapes:
1. Ouvrir **Supabase Dashboard** → **SQL Editor**
2. Copier tout le contenu du fichier `EXECUTER-MAINTENANT-INCIDENTS-OBSOLETES.sql`
3. Coller dans SQL Editor
4. Cliquer **Run**
5. Attendre 2-3 secondes

## Ce que ça fait

✅ Corrige `get_cdd_expires()` - Exclut CDD couverts par CDI
✅ Corrige `get_avenants_expires()` - Exclut avenants couverts par CDI
✅ Crée fonction `resoudre_incidents_contrats_obsoletes()`
✅ Ajoute trigger auto-résolution sur création CDI
✅ Résout tous les incidents existants obsolètes (BACKFILL)

## Résultat

### Avant
- Didier RENARD avec CDI visible dans "Contrats expirés"
- Compteur: 25 incidents

### Après
- Didier RENARD n'apparaît plus
- Compteur: 10 incidents (uniquement vrais cas)
- Incidents obsolètes marqués "resolu"

## Vérification dans l'interface

1. Aller dans **Incidents** → **Contrats expirés**
2. Chercher "Didier RENARD"
3. Il ne devrait plus apparaître
4. Le compteur a diminué

## Prévention future

Le trigger s'active automatiquement:
- Lors création d'un CDI → résout incidents couverts
- Lors signature d'un CDI → résout incidents couverts

**Plus besoin d'intervention manuelle!**

## Support

Si un incident obsolète réapparaît, exécuter:
```sql
SELECT * FROM resoudre_incidents_contrats_obsoletes();
```
