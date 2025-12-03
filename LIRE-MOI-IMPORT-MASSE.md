# 🚀 Activation de l'Import en Masse - LIRE-MOI

## ⚡ Action Rapide (30 secondes)

### Option 1 : Script Ultra-Rapide ⚡

1. Ouvrez **Supabase Dashboard > SQL Editor**
2. Copiez-collez le contenu de **`QUICK-ADD-IMPORT-BULK-PERMISSION.sql`**
3. Cliquez sur **"Run"**
4. Rafraîchissez l'application (`Ctrl + Shift + R`)
5. ✅ **C'est fait !**

### Option 2 : Script Détaillé avec Logs 📊

1. Ouvrez **Supabase Dashboard > SQL Editor**
2. Copiez-collez le contenu de **`add-import-bulk-permission-to-admins.sql`**
3. Cliquez sur **"Run"**
4. Lisez les logs détaillés dans la console
5. Rafraîchissez l'application (`Ctrl + Shift + R`)
6. ✅ **C'est fait !**

---

## 📁 Fichiers disponibles

| Fichier | Description | Utilisation |
|---------|-------------|-------------|
| **QUICK-ADD-IMPORT-BULK-PERMISSION.sql** | Script SQL rapide | ⚡ Exécution rapide |
| **add-import-bulk-permission-to-admins.sql** | Script SQL détaillé avec logs | 📊 Avec diagnostic |
| **GUIDE-ACTIVATION-IMPORT-MASSE.md** | Guide complet | 📖 Documentation complète |
| **LIRE-MOI-IMPORT-MASSE.md** | Ce fichier | 📄 Vue d'ensemble |

---

## 🎯 Résultat attendu

Après l'exécution du script, **tous les administrateurs** verront apparaître dans leur menu :

```
📁 Administration
  ├─ 🏢 Sites
  ├─ 🏷️  Secteurs
  ├─ 💼 Postes
  ├─ 📝 Modèles de Courriers
  ├─ 📄 Modèles Contrats
  ├─ 👤 Import Salarié Test
  ├─ 📤 Import en Masse          ← ✨ NOUVEAU
  └─ 👥 Utilisateurs
```

---

## 👥 Utilisateurs concernés

Le script ajoute automatiquement la permission pour **TOUS** les utilisateurs avec :
- **Rôle** : `admin`
- **Email** : Notamment `wajdi@mad-impact.com` et tous les autres admins

---

## ✨ Fonctionnalités du module

Une fois activé, le module **"Import en Masse"** permet :

### 1. Téléchargement du modèle
- 📥 Template CSV pré-formaté avec exemple
- 📋 Tous les champs disponibles (30+ colonnes)

### 2. Import de fichiers
- 📂 Formats supportés : CSV, XLSX, XLS
- 🖱️ Glisser-déposer ou sélection de fichier

### 3. Prévisualisation intelligente
- ✅ Validation automatique des données
- ⚠️ Détection des avertissements (secteur inconnu, etc.)
- ❌ Détection des erreurs (email en double, ligne vide)
- 📊 Statistiques en temps réel

### 4. Sélection des lignes
- ☑️ Sélection/désélection par ligne
- ☑️ Sélection globale
- 🚫 Exclusion automatique des lignes en erreur

### 5. Import en masse
- 🔄 Barre de progression en temps réel
- ⚡ Import ligne par ligne avec gestion des erreurs
- 📊 Rapport détaillé de l'import

### 6. Rapport final
- ✅ Nombre de succès
- ❌ Nombre d'erreurs
- 📝 Détail par ligne avec nom et message

---

## 🔧 Détails techniques

### Permission ajoutée
```javascript
{
  section_id: 'admin/import-bulk',
  actif: true
}
```

### Vérification de la permission
```typescript
// Dans Sidebar.tsx (ligne 166)
const hasAccess = hasPermission('admin/import-bulk');
```

### Route du composant
```typescript
// Dans Dashboard.tsx
case 'admin/import-bulk':
  return <ImportSalariesBulk />;
```

---

## ✅ Checklist de vérification

Après avoir exécuté le script :

- [ ] Script SQL exécuté sans erreur
- [ ] Cache du navigateur vidé (`Ctrl + Shift + R`)
- [ ] Application rafraîchie
- [ ] Connecté en tant qu'administrateur
- [ ] Section "Administration" dépliée
- [ ] Menu "Import en Masse" visible avec icône 📤
- [ ] Clic sur le menu ouvre le composant d'import
- [ ] Bouton "Télécharger le modèle CSV" fonctionne

---

## 🐛 Dépannage

### Le menu n'apparaît pas

```sql
-- Vérifier si la permission existe
SELECT
  u.email,
  up.section_id,
  up.actif
FROM app_utilisateur u
LEFT JOIN utilisateur_permissions up ON u.id = up.utilisateur_id
WHERE u.role = 'admin'
  AND up.section_id = 'admin/import-bulk';
```

**Solutions :**
1. Videz le cache du navigateur complètement
2. Déconnectez-vous et reconnectez-vous
3. Vérifiez dans F12 > Console les permissions chargées
4. Réexécutez le script SQL si aucune ligne n'est retournée

### Erreur lors de l'exécution SQL

**Solutions :**
1. Vérifiez que vous êtes sur le bon projet Supabase
2. Vérifiez que les tables `app_utilisateur` et `utilisateur_permissions` existent
3. Essayez le script rapide au lieu du script détaillé

---

## 📚 Documentation complète

Pour plus de détails, consultez :
- **`GUIDE-ACTIVATION-IMPORT-MASSE.md`** : Guide complet pas à pas

---

## 🎉 Conclusion

Le script SQL ajoute simplement une ligne dans la base de données pour chaque administrateur.
Le code de l'interface est déjà prêt, il suffit d'activer la permission !

**Temps estimé : 30 secondes** ⚡

---

**Bon import ! 📤**
