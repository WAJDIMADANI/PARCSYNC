# 🚀 Déploiement rapide - Contrats expirés

## En 3 étapes

### ✅ Étape 1: SQL (2 minutes)

1. Ouvrir Supabase > SQL Editor
2. Copier-coller le contenu de `create-expired-contracts-incidents-system.sql`
3. Cliquer sur "Run"

**Résultat attendu:** Vous verrez dans les logs:
```
contrats_expires | incidents_crees | incidents_existants
-----------------+-----------------+--------------------
              53 |              53 |                   0
```

### ✅ Étape 2: Frontend

Rien à faire! Le frontend a déjà été modifié.

Si vous voulez vérifier, rebuild:
```bash
npm run build
```

### ✅ Étape 3: Vérifier (1 minute)

1. Aller dans **Incidents** (menu de gauche)
2. Cliquer sur l'onglet **"Expirés"**
3. Vous devriez voir **53 incidents**

## Vérification SQL rapide

```sql
-- Compter les incidents créés
SELECT COUNT(*) FROM incident WHERE type = 'contrat_expire';
-- Résultat attendu: 53

-- Répartition CDD vs Avenants
SELECT
  lower(c.type) AS type,
  COUNT(*) AS nombre
FROM incident i
INNER JOIN contrat c ON i.contrat_id = c.id
WHERE i.type = 'contrat_expire'
GROUP BY lower(c.type);
-- Résultat attendu:
-- cdd     | 22
-- avenant | 31
```

## C'est tout!

Le système est maintenant opérationnel:
- ✅ Les 53 contrats expirés apparaissent dans l'onglet Incidents
- ✅ Badge "EXPIRÉ" visible
- ✅ Texte "Contrat expiré - Nécessite une action"
- ✅ Distinction entre "Contrat CDD" et "Avenant au contrat"
- ✅ Tous les boutons fonctionnent (Rappel, En cours, Résoudre, Ignorer)
- ✅ Les nouveaux contrats qui expirent généreront automatiquement un incident

## En cas de problème

Consulter le guide complet: `GUIDE-DEPLOIEMENT-CONTRATS-EXPIRES.md`
