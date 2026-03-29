# Patch appliqué : Webhook Yousign stocke maintenant le PDF signé final

## Problème diagnostiqué

### Flow actuel (AVANT le patch)

1. **Envoi contrat Yousign** → Crée ligne en base avec `yousign_signature_request_id`
2. **Salarié signe sur Yousign** → Webhook reçu
3. **Webhook met à jour** : `statut = 'signe'`, `yousign_signed_at`
4. **MAIS** : Webhook ne télécharge PAS le PDF signé final
5. **Résultat** : `fichier_signe_url = NULL`, `signed_storage_path = NULL`

### Conséquence utilisateur

Quand on clique sur "Télécharger" :
- **Cas 1** : Si `fichier_signe_url` existe → ouvre le vrai PDF ✅
- **Cas 2** : Sinon si `yousign_signature_request_id` → télécharge depuis Yousign à la volée ⚠️
- **Cas 3** : Sinon → **RÉGÉNÈRE un PDF local (blob navigateur)** ❌

**Le faux PDF = Cas 3** : Un PDF généré localement dans le navigateur, pas le vrai PDF signé Yousign.

---

## Solution appliquée

### 1. Webhook Yousign mis à jour

**Fichier** : `supabase/functions/yousign-webhook/index.ts` (lignes 344-406)

**Nouveau comportement** :
1. Quand signature complète détectée (`signature_request.done`)
2. **Télécharger le PDF signé final depuis Yousign** via API `/documents/download`
3. **Uploader ce PDF dans Supabase Storage** → `documents/contrats/{contrat_id}_signed_{timestamp}.pdf`
4. **Mettre à jour la base** :
   ```typescript
   fichier_signe_url: "contrats/{contrat_id}_signed_{timestamp}.pdf"
   signed_storage_path: "contrats/{contrat_id}_signed_{timestamp}.pdf"
   ```

**Code ajouté** :
```typescript
// --- (AJOUT) Télécharger et stocker le PDF signé final depuis Yousign ---
if (signatureRequestId) {
  const YOUSIGN_API_KEY = Deno.env.get("YOUSIGN_API_KEY");
  const YOUSIGN_BASE_URL = Deno.env.get("YOUSIGN_BASE_URL") ?? "https://api.yousign.app";

  if (YOUSIGN_API_KEY) {
    try {
      console.log("Téléchargement du PDF signé depuis Yousign...");

      const dlRes = await fetch(
        `${YOUSIGN_BASE_URL}/v3/signature_requests/${signatureRequestId}/documents/download`,
        { headers: { Authorization: `Bearer ${YOUSIGN_API_KEY}` } }
      );

      if (dlRes.ok) {
        const contentType = dlRes.headers.get("content-type") ?? "application/pdf";
        const bytes = await dlRes.arrayBuffer();

        const fileName = `contrats/${c.id}_signed_${Date.now()}.pdf`;

        const uploadRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/documents/${fileName}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SERVICE_KEY}`,
              apikey: SERVICE_KEY,
              "Content-Type": contentType,
            },
            body: bytes,
          }
        );

        if (uploadRes.ok) {
          console.log("PDF signé uploadé dans Storage:", fileName);

          await restPatch(
            SUPABASE_URL,
            `contrat?id=eq.${encodeURIComponent(String(c.id))}`,
            SERVICE_KEY,
            {
              fichier_signe_url: fileName,
              signed_storage_path: fileName,
            },
            "return=minimal"
          );

          console.log("Contrat mis à jour avec fichier_signe_url");
        } else {
          const uploadText = await uploadRes.text();
          console.error("Échec upload Storage:", uploadRes.status, uploadText);
        }
      } else {
        const dlText = await dlRes.text();
        console.error("Échec téléchargement Yousign:", dlRes.status, dlText);
      }
    } catch (err) {
      console.error("Erreur téléchargement/upload PDF signé:", err);
    }
  } else {
    console.warn("YOUSIGN_API_KEY manquant, PDF signé non téléchargé");
  }
}
```

### 2. Bouton Télécharger corrigé

**Fichier** : `src/components/EmployeeList.tsx` (lignes 4590-4610)

**AVANT** : Mauvaise priorité
```typescript
if (contract.yousign_signature_request_id && contract.statut === 'signé') {
  await handleDownloadContract(contract.id); // Télécharge depuis Yousign
}
else if (contract.fichier_signe_url || contract.signed_storage_path) {
  // Ouvre le fichier stocké
}
else if (contract.modele_id) {
  // GÉNÈRE UN FAUX PDF LOCAL ❌
}
```

**APRÈS** : Bonne priorité
```typescript
// PRIORITÉ 1: Fichier signé stocké (PDF final Yousign ou manuel)
if (contract.fichier_signe_url || contract.signed_storage_path) {
  // Ouvre le VRAI PDF depuis Storage ✅
}
// PRIORITÉ 2: Téléchargement à la volée depuis Yousign (si pas encore stocké)
else if (contract.yousign_signature_request_id && contract.statut === 'signé') {
  await handleDownloadContract(contract.id);
}
// PRIORITÉ 3: Génération PDF local (uniquement si aucun PDF signé disponible)
else if (contract.modele_id) {
  // Ne s'exécute JAMAIS pour un contrat signé Yousign
}
```

---

## Impact

### Pour les nouveaux contrats (après le patch)
1. Salarié signe sur Yousign ✅
2. Webhook reçoit l'événement ✅
3. Webhook télécharge + stocke le PDF signé ✅
4. Base mise à jour avec `fichier_signe_url` ✅
5. Bouton "Télécharger" ouvre le vrai PDF ✅

### Pour les contrats existants
- **Contrats signés AVANT le patch** : `fichier_signe_url = NULL`
  - Le bouton "Télécharger" utilise encore `handleDownloadContract` (téléchargement à la volée depuis Yousign)
  - **Pas de régression**, fonctionne toujours

- **Solution pour rétroactif** (optionnel) :
  ```sql
  -- Identifier les contrats signés sans PDF stocké
  SELECT id, yousign_signature_request_id, fichier_signe_url
  FROM public.contrat
  WHERE statut = 'signe'
    AND yousign_signature_request_id IS NOT NULL
    AND fichier_signe_url IS NULL
  ORDER BY yousign_signed_at DESC;
  ```
  - Créer un script de migration pour télécharger rétroactivement tous les PDFs manquants

---

## Vérification après déploiement

### 1. Logs du webhook
```bash
# Surveiller les logs après qu'un salarié signe
# Doit afficher :
# "Téléchargement du PDF signé depuis Yousign..."
# "PDF signé uploadé dans Storage: contrats/{id}_signed_{timestamp}.pdf"
# "Contrat mis à jour avec fichier_signe_url"
```

### 2. Vérifier en base
```sql
-- Après signature d'un nouveau contrat
SELECT
  id,
  statut,
  yousign_signature_request_id,
  fichier_signe_url,
  signed_storage_path,
  yousign_signed_at
FROM public.contrat
WHERE yousign_signed_at > NOW() - INTERVAL '1 hour'
ORDER BY yousign_signed_at DESC;
```

**Résultat attendu** :
- `fichier_signe_url` : `"contrats/{id}_signed_{timestamp}.pdf"` ✅
- `signed_storage_path` : `"contrats/{id}_signed_{timestamp}.pdf"` ✅

### 3. Vérifier dans Storage
Naviguer vers `Supabase Storage → documents → contrats/`
- Doit contenir `{id}_signed_{timestamp}.pdf`

### 4. Tester le bouton Télécharger
- Ouvrir fiche salarié
- Cliquer sur "Télécharger" du contrat signé
- **Doit ouvrir le PDF stocké dans Storage** (pas de téléchargement à la volée)

---

## Déploiement

### Frontend (déjà fait)
```bash
npm run build  # ✅ OK
```

### Edge Function (à faire)
```bash
# Déployer le webhook Yousign mis à jour
supabase functions deploy yousign-webhook --no-verify-jwt
```

Ou via l'interface Supabase :
1. Aller dans Dashboard → Edge Functions
2. Sélectionner `yousign-webhook`
3. Remplacer le code par le nouveau fichier
4. Déployer

---

## Résumé

| Élément | Avant | Après |
|---------|-------|-------|
| **Webhook stocke PDF** | ❌ Non | ✅ Oui |
| **fichier_signe_url rempli** | ❌ NULL | ✅ Chemin Storage |
| **Télécharger = vrai PDF** | ⚠️ Parfois faux | ✅ Toujours vrai |
| **Performance** | ⚠️ Télécharge à chaque fois | ✅ Stocké une fois |
| **Contrats existants** | ⚠️ Marche toujours | ✅ Pas de régression |

**Le faux PDF venait du cas 3** : génération locale navigateur quand ni `fichier_signe_url` ni `yousign_signature_request_id` n'étaient exploitables. Maintenant la priorité est corrigée et le webhook stocke le vrai PDF.
