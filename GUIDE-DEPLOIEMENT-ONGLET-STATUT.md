# Guide de déploiement - Nouvel onglet Statut avec historisation

## Vue d'ensemble des changements

### 1. Nouvel onglet "Statut" dans le modal de détail du véhicule
- **Séparé de l'onglet "Informations"** pour une meilleure organisation
- **Liste déroulante avec 9 statuts** clairement définis avec emojis
- **Historique complet** de tous les changements de statut

### 2. Liste des statuts disponibles
- 🅿️ Sur parc
- 👤 Chauffeur TCA
- 🏢 Direction / Administratif
- 🔄 Location pure
- 💰 Location avec option d'achat (LOA / location-vente)
- 🤝 En prêt
- 🛠️ En garage
- 🚫 Hors service
- 📦 Véhicule sorti / rendu de la flotte

### 3. Historisation automatique
- **Chaque changement de statut** est automatiquement enregistré
- **Traçabilité complète** : date, heure, utilisateur qui a effectué le changement
- **Trigger automatique** : aucune action manuelle requise

### 4. Suppressions effectuées
- Bloc "Statut et dates" retiré de l'onglet "Informations"
- Champ `date_fin_service` supprimé (inutilisé)

---

## Étapes de déploiement

### ÉTAPE 1 : Déployer la base de données

1. Ouvrir **Supabase Dashboard** → **SQL Editor**
2. Copier tout le contenu du fichier : `EXECUTER-MAINTENANT-ONGLET-STATUT.sql`
3. Cliquer sur **Run**
4. Vérifier qu'il n'y a pas d'erreurs

**Ce script crée :**
- Table `historique_statut_vehicule`
- Trigger automatique `trg_historiser_statut_vehicule`
- Vue `v_historique_statut_vehicule`
- Policies RLS pour la sécurité
- Historique initial pour tous les véhicules existants

### ÉTAPE 2 : Déployer le frontend

Le code frontend a déjà été modifié. Les changements incluent :
- Nouveau type d'onglet `'statut'` dans `VehicleDetailModal.tsx`
- Affichage de l'historique des statuts
- Rechargement automatique de l'historique après sauvegarde
- Suppression des références à `date_fin_service`

### ÉTAPE 3 : Vérification

Après déploiement, vérifier que :

1. **L'onglet "Statut" est visible** dans le modal de détail d'un véhicule
2. **La liste déroulante** affiche les 9 statuts avec les emojis
3. **Le bouton "Modifier"** permet de changer le statut
4. **L'historique s'affiche** après changement de statut
5. **Les informations traçables** (date, heure, utilisateur) sont présentes

---

## Test rapide

### Test 1 : Changer un statut

```sql
-- Ouvrir un véhicule dans l'interface
-- Aller dans l'onglet "Statut"
-- Cliquer sur "Modifier"
-- Changer le statut (ex: de "Sur parc" à "Chauffeur TCA")
-- Cliquer sur "Enregistrer"

-- Vérifier dans la base de données :
SELECT * FROM v_historique_statut_vehicule
WHERE immatriculation = 'VOTRE-IMMAT'
ORDER BY date_modification DESC;
```

### Test 2 : Vérifier l'historique dans l'interface

1. Ouvrir un véhicule
2. Aller dans l'onglet "Statut"
3. Scroller vers le bas pour voir "Historique des statuts"
4. Vérifier que tous les changements sont visibles

---

## Structure de la table d'historique

```sql
historique_statut_vehicule
├── id (uuid)
├── vehicule_id (uuid) → vehicule(id)
├── ancien_statut (text, nullable)
├── nouveau_statut (text)
├── modifie_par (uuid) → app_utilisateur(id)
├── date_modification (timestamptz)
├── commentaire (text, nullable)
└── created_at (timestamptz)
```

---

## Requêtes utiles

### Voir l'historique d'un véhicule spécifique
```sql
SELECT * FROM v_historique_statut_vehicule
WHERE immatriculation = 'AA-111-BB'
ORDER BY date_modification DESC;
```

### Statistiques des changements de statut
```sql
SELECT
  nouveau_statut,
  COUNT(*) as nb_changements
FROM historique_statut_vehicule
GROUP BY nouveau_statut
ORDER BY nb_changements DESC;
```

### Voir qui a modifié le plus de statuts
```sql
SELECT
  modifie_par_nom,
  COUNT(*) as nb_modifications
FROM v_historique_statut_vehicule
WHERE modifie_par_nom IS NOT NULL
GROUP BY modifie_par_nom
ORDER BY nb_modifications DESC;
```

---

## Comportement automatique

### Lors d'un INSERT (création de véhicule)
- Un enregistrement d'historique est créé avec `ancien_statut = NULL`
- Le statut initial est enregistré

### Lors d'un UPDATE (modification de statut)
- Un enregistrement d'historique est créé automatiquement
- L'ancien et le nouveau statut sont enregistrés
- L'utilisateur qui a fait le changement est tracé
- La date/heure exacte est enregistrée

### Traçabilité
- `auth.uid()` capture automatiquement l'utilisateur connecté
- `now()` capture l'horodatage exact
- Aucune action manuelle requise

---

## Résolution de problèmes

### L'historique ne s'affiche pas
1. Vérifier que la vue existe :
   ```sql
   SELECT * FROM v_historique_statut_vehicule LIMIT 1;
   ```

2. Vérifier les permissions RLS :
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'historique_statut_vehicule';
   ```

### Le trigger ne fonctionne pas
1. Vérifier que le trigger existe :
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trg_historiser_statut_vehicule';
   ```

2. Vérifier la fonction :
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'trigger_historiser_statut_vehicule';
   ```

### Forcer l'initialisation de l'historique
```sql
-- Créer un historique initial pour tous les véhicules sans historique
INSERT INTO historique_statut_vehicule (vehicule_id, ancien_statut, nouveau_statut, date_modification)
SELECT v.id, NULL, v.statut, v.created_at
FROM vehicule v
WHERE NOT EXISTS (
  SELECT 1 FROM historique_statut_vehicule h WHERE h.vehicule_id = v.id
);
```

---

## Points importants

1. **Suppression de `date_fin_service`** : Si vous utilisez encore ce champ, ne pas exécuter la ligne qui le supprime dans le SQL
2. **Performance** : Des index sont créés automatiquement sur `vehicule_id` et `date_modification`
3. **Sécurité** : RLS est activé, seuls les utilisateurs authentifiés peuvent voir l'historique
4. **Cascade** : Si un véhicule est supprimé, tout son historique est supprimé automatiquement

---

## Support

En cas de problème :
1. Vérifier les logs dans Supabase Dashboard → Database → Logs
2. Vérifier la console du navigateur (F12) pour les erreurs frontend
3. Tester les requêtes SQL manuellement dans SQL Editor
