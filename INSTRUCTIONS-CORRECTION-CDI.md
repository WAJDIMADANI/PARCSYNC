# 🔧 Instructions pour Corriger l'Affichage des Contrats CDI

## Étape 1: Diagnostic

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Copiez et exécutez le contenu du fichier `DIAGNOSTIC-CONTRATS-CDI.sql`
3. Analysez les résultats:

### Points à vérifier dans les résultats:

#### Section 1 - MODÈLES DE CONTRATS
- Vérifiez que des modèles avec `type_contrat = 'CDI'` existent
- **Problème possible**: Le type est mal écrit (cdi, Cdi, CDI avec espaces)
- **Solution**: La longueur doit être exactement 3 caractères

#### Section 2 - CONTRATS ET LEURS MODÈLES
- Vérifiez que des contrats sont liés à des modèles CDI
- **Problème possible**: Aucun contrat n'utilise les modèles CDI

#### Section 3 - STATISTIQUES PAR TYPE
- Vérifiez le nombre de contrats par type
- **Problème possible**: Les CDI sont comptés sous un autre type

#### Section 4 - POLITIQUES RLS
- Vérifiez qu'il existe des policies permettant la lecture
- **Problème possible**: Les policies sont trop restrictives

#### Section 5 - STATUT RLS
- Vérifiez que RLS est activé mais pas forcé
- **Problème possible**: RLS bloque tout accès

#### Section 6 - CONTRATS CDI DÉTAILLÉS
- Vérifiez que les contrats CDI ont un profil_id valide
- **Problème possible**: profil_id pointe vers un profil inexistant

---

## Étape 2: Correction

Selon le problème identifié:

### Si le problème est le type de contrat mal écrit:
```sql
-- Exécutez dans SQL Editor
UPDATE modeles_contrats
SET type_contrat = 'CDI'
WHERE UPPER(TRIM(type_contrat)) = 'CDI'
  AND type_contrat != 'CDI';
```

### Si le problème est RLS:
```sql
-- Exécutez tout le fichier CORRIGER-CONTRATS-CDI.sql
```

### Si les contrats n'ont pas de profil_id valide:
Vous devrez corriger manuellement les profil_id dans la table `contrat`

---

## Étape 3: Vérification

Après correction, exécutez cette requête:

```sql
SELECT
  c.id,
  p.prenom || ' ' || p.nom as candidat,
  m.type_contrat,
  c.statut,
  c.date_signature
FROM contrat c
JOIN modeles_contrats m ON c.modele_id = m.id
JOIN profil p ON c.profil_id = p.id
WHERE m.type_contrat = 'CDI'
ORDER BY c.date_envoi DESC;
```

**Résultat attendu**: Vous devez voir tous les contrats CDI avec le nom du candidat

---

## Étape 4: Test dans l'application

1. Reconnectez-vous à l'application
2. Allez dans **Contrats**
3. Utilisez le filtre **Type de contrat** → **CDI**
4. Vous devriez maintenant voir tous les contrats CDI

---

## Problèmes Courants et Solutions

### Problème: "Type de contrat manquant"
**Cause**: Le modèle de contrat n'a pas de type défini
**Solution**:
```sql
UPDATE modeles_contrats
SET type_contrat = 'CDI'
WHERE id = 'ID_DU_MODELE';
```

### Problème: "Profil manquant"
**Cause**: Le profil_id du contrat ne correspond à aucun profil
**Solution**: Identifiez le bon profil et mettez à jour:
```sql
UPDATE contrat
SET profil_id = 'BON_PROFIL_ID'
WHERE id = 'ID_DU_CONTRAT';
```

### Problème: "RLS bloque l'accès"
**Cause**: Les politiques RLS sont trop restrictives
**Solution**: Exécutez `CORRIGER-CONTRATS-CDI.sql` section CORRECTION 2

### Problème: "CDI marqués comme CDD"
**Cause**: Le type_contrat du modèle est 'CDD' au lieu de 'CDI'
**Solution**:
```sql
-- Vérifiez d'abord quel modèle est concerné
SELECT id, nom, type_contrat
FROM modeles_contrats
WHERE nom LIKE '%CDI%';

-- Puis corrigez
UPDATE modeles_contrats
SET type_contrat = 'CDI'
WHERE id = 'ID_DU_MODELE';
```

---

## Support

Si le problème persiste après ces corrections:

1. Vérifiez les logs du navigateur (F12 → Console)
2. Vérifiez que votre utilisateur a les permissions nécessaires
3. Vérifiez que la connexion Supabase fonctionne

**Permissions requises pour voir les contrats**:
- `voir_contrats` OU
- `gerer_contrats` OU
- `gerer_rh` OU
- Role `admin` ou `super_admin`
