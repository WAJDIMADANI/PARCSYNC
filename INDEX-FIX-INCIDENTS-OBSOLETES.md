# Index - Correction incidents contrats expirés obsolètes

## Contexte

Des profils avec CDI signé/actif apparaissent encore dans "Contrats expirés" à cause de leurs anciens CDD/avenants expirés.

## Fichiers créés (par ordre d'utilisation)

### 1. Diagnostic (OPTIONNEL - exécuter en premier si besoin)
- **DIAGNOSTIC-COMPLET-INCIDENTS-OBSOLETES.sql**
  - Identifie les profils concernés
  - Liste les incidents obsolètes
  - Statistiques avant correction
  - Cas spécifique Didier RENARD

### 2. Solution (PRIORITAIRE - à exécuter)
- **FIX-INCIDENTS-CONTRAT-OBSOLETES.sql** ⭐⭐⭐
  - Script SQL complet
  - Corrige get_cdd_expires() et get_avenants_expires()
  - Crée fonction resoudre_incidents_contrats_obsoletes()
  - Ajoute trigger auto-résolution
  - Backfill des incidents existants
  - Vérifications

### 3. Documentation
- **EXECUTER-MAINTENANT-FIX-INCIDENTS-OBSOLETES.md**
  - Guide d'exécution pas à pas
  - Explications détaillées
  - Résultats attendus
  - Tests de validation

- **RESUME-CORRECTION-INCIDENTS-CONTRATS.md**
  - Vue d'ensemble
  - Architecture de la solution
  - Cas d'usage
  - Maintenance

## Action immédiate

```
1. Supabase Dashboard → SQL Editor
2. Copier-coller: FIX-INCIDENTS-CONTRAT-OBSOLETES.sql
3. Run
4. Vérifier résultats
```

## Règle métier appliquée

```
CDD/Avenant expiré + CDI signé/actif ensuite = Pas d'incident
```

## Résultat

- Profils avec CDI n'apparaissent plus dans "Contrats expirés"
- Compteurs corrects (uniquement vrais cas)
- Auto-résolution lors création CDI (prévention future)
