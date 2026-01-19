# Déploiement: Envoi d'emails par secteur

## ✅ Fonctionnalités ajoutées

### 1. Mode d'envoi "Par secteur" (UI)
- Nouveau mode de sélection avec radio button "Par secteur"
- Multi-select de secteurs avec checkboxes
- Compteur en temps réel: "X salariés trouvés (Y sans email ignorés)"
- Badges visuels pour les secteurs sélectionnés
- Validation des secteurs avant envoi

### 2. Edge Function mise à jour
La fonction `send-simple-email` supporte maintenant le mode `sector`:
- Accepte `{ mode: "sector", secteurIds: [...], subject, message }`
- Charge tous les profils des secteurs sélectionnés
- Enregistre les `target_secteur_ids` dans `crm_email_batches`

### 3. Historique amélioré
- Badge "Par secteur" pour les envois par secteur
- Affichage des secteurs ciblés avec leurs noms
- Icônes Tag pour identifier visuellement les secteurs

## 🗄️ Migration SQL requise

**Avant de tester, exécuter cette migration:**

```sql
-- Ajouter la colonne target_secteur_ids pour tracer les secteurs ciblés
ALTER TABLE crm_email_batches
ADD COLUMN IF NOT EXISTS target_secteur_ids jsonb DEFAULT NULL;
```

Ou exécuter le fichier:
```bash
# Dans Supabase SQL Editor
-- Copier le contenu de: add-secteur-target-to-crm-batches.sql
```

## 🚀 Déploiement de l'Edge Function

L'outil de déploiement automatique ne fonctionne pas actuellement. **Vous devez déployer manuellement:**

### Via Dashboard Supabase (RECOMMANDÉ)

1. Allez sur: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/functions
2. Cliquez sur la fonction `send-simple-email`
3. Cliquez sur "Edit"
4. Copiez le contenu de: `supabase/functions/send-simple-email/index.ts`
5. Collez dans l'éditeur
6. Cliquez sur "Deploy"

### Modifications apportées à la fonction:
- Support du mode `"sector"`
- Extraction des `secteurIds` du payload
- Filtrage des profils par `secteur_id IN (secteurIds)`
- Enregistrement de `target_secteur_ids` dans le batch

## 🧪 Test après déploiement

### 1. Exécuter la migration SQL
Exécuter la requête ALTER TABLE ci-dessus dans le SQL Editor Supabase.

### 2. Tester le mode secteur

1. Aller dans RH > Emails > Nouveau
2. Sélectionner "Par secteur"
3. Cocher un ou plusieurs secteurs
4. Observer le compteur: "X salariés trouvés (Y sans email ignorés)"
5. Remplir sujet + message
6. Cliquer "Envoyer"

**Console logs attendus:**
```
[Emails] Payload envoyé: { mode: "sector", secteurIds: [...], subject, message }
[send-simple-email] Payload reçu: { mode: "sector", secteurIdsCount: 2 }
[send-simple-email] Profils chargés: 15
[send-simple-email] Batch créé: xxx-xxx-xxx
[Emails] Succès! BatchId: xxx, Envoyés: 12
```

### 3. Vérifier l'historique

1. Aller dans RH > Emails > Historique
2. Vérifier que le dernier envoi a:
   - Badge "Par secteur"
   - Liste des secteurs ciblés avec leurs noms
   - Statistiques correctes

**Vérification en base:**
```sql
-- Vérifier le batch
SELECT
  id,
  mode,
  target_secteur_ids,
  total_recipients,
  sent_count
FROM crm_email_batches
WHERE mode = 'sector'
ORDER BY created_at DESC
LIMIT 1;

-- Vérifier les noms des secteurs
SELECT id, nom
FROM secteur
WHERE id = ANY(
  SELECT jsonb_array_elements_text(target_secteur_ids)
  FROM crm_email_batches
  WHERE mode = 'sector'
  ORDER BY created_at DESC
  LIMIT 1
);
```

## 📊 Structure des données

### Payload envoyé (mode sector)
```json
{
  "mode": "sector",
  "secteurIds": ["uuid-1", "uuid-2"],
  "subject": "Message important",
  "message": "Bonjour..."
}
```

### crm_email_batches (nouveau champ)
```
target_secteur_ids: jsonb (array de UUID)
```

Exemple:
```json
["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]
```

## 🎯 Workflow complet

### Frontend (CRMEmailsNew.tsx)
1. Charge tous les secteurs au mount
2. Quand secteurs sélectionnés → charge profils de ces secteurs
3. Affiche compteur avec/sans email
4. Envoie `{ mode: "sector", secteurIds: [...] }`

### Backend (send-simple-email)
1. Reçoit le payload avec `secteurIds`
2. Query: `profil WHERE secteur_id IN (secteurIds) AND date_sortie IS NULL`
3. Crée batch avec `target_secteur_ids = secteurIds`
4. Envoie emails via Brevo
5. Met à jour statuts

### Historique (CRMEmailsHistory.tsx)
1. Charge batches avec `target_secteur_ids`
2. Récupère noms des secteurs (query secteur par IDs)
3. Affiche badges "Par secteur" + liste secteurs

## 🔍 Troubleshooting

**Aucun salarié trouvé:**
- Vérifier que les profils ont bien `secteur_id` renseigné
- Vérifier que les secteurs existent dans la table `secteur`

**Erreur "Aucun destinataire spécifié":**
- La fonction n'a pas reçu `secteurIds`
- Vérifier les logs console frontend

**target_secteur_ids NULL en base:**
- La migration SQL n'a pas été exécutée
- Ou la fonction n'a pas été redéployée

**Noms de secteurs non affichés dans l'historique:**
- Les secteurs ont été supprimés de la table `secteur`
- Affichera l'UUID à la place du nom

## ✨ Points clés

1. **Pas de breaking changes**: Les modes `all` et `selected` fonctionnent toujours
2. **Compatibilité**: Les anciens batches sans `target_secteur_ids` s'affichent normalement
3. **Performance**: Chargement lazy des secteurs (uniquement si mode = sector)
4. **UX**: Compteur temps réel + warnings pour emails manquants
5. **Traçabilité**: Les secteurs ciblés sont enregistrés dans le batch
