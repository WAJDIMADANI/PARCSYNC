# 🎯 Actions à faire MAINTENANT

## Étapes d'exécution (dans l'ordre)

### 1. Ouvrir Supabase SQL Editor
Aller dans votre projet Supabase → SQL Editor

### 2. Exécuter le fichier CDD
Copier/coller le contenu de :
```
create-get-cdd-expires-function.sql
```
→ Cliquer sur "Run"

### 3. Exécuter le fichier Avenants
Copier/coller le contenu de :
```
create-get-avenants-expires-function.sql
```
→ Cliquer sur "Run"

### 4. Rafraîchir l'application
Actualiser la page dans votre navigateur

### 5. Vérifier
1. Aller dans "Incidents"
2. Ouvrir la console du navigateur (F12)
3. Vérifier les logs :
   ```
   📊 CDD expirés depuis RPC: 0
   📊 Avenants expirés depuis RPC: X
   ```

## ✅ Résultat attendu

- **0 CDD** affichés (au lieu de 9)
- **X avenants** réellement expirés
- Plus de rechargement en boucle
- Comptage cohérent avec le Dashboard

## 📚 Documentation

Pour comprendre les changements, lire :
- `RESUME-CORRECTION-INCIDENTS-CONTRATS.md` - Vue d'ensemble complète
- `EXECUTER-FUNCTION-CDD-EXPIRES.md` - Détails CDD
- `EXECUTER-AVENANTS-EXPIRES.md` - Détails avenants

## ⚠️ Important

Les deux fonctions SQL **doivent** être exécutées pour que l'application fonctionne correctement.
