# Déploiement Rapide - Conversion DOCX → PDF

## 📋 Prérequis

1. Compte CloudConvert : https://cloudconvert.com/
2. API Key CloudConvert obtenue
3. Supabase CLI installé (ou accès Dashboard)

---

## ⚡ Déploiement en 5 Minutes

### 1. Configurer CloudConvert API Key

**Dans Supabase Dashboard :**

1. `Project Settings` > `Edge Functions` > `Secrets`
2. Ajouter : `CLOUDCONVERT_API_KEY` = `eyJ...votre-clé...`
3. Sauvegarder

**Ou via CLI :**

```bash
supabase secrets set CLOUDCONVERT_API_KEY=eyJ...votre-clé...
```

---

### 2. Déployer l'Edge Function

**Via MCP Supabase :**

Utiliser l'outil `mcp__supabase__deploy_edge_function` avec :
- **name:** `convert-courrier-to-pdf`
- **slug:** `convert-courrier-to-pdf`
- **verify_jwt:** `true`
- **files:** Le contenu de `supabase/functions/convert-courrier-to-pdf/index.ts`

**Ou via CLI :**

```bash
cd /tmp/cc-agent/59041934/project
supabase functions deploy convert-courrier-to-pdf
```

---

### 3. Déployer le Frontend

```bash
npm run build
```

Uploader le contenu de `dist/` sur parcsync.madimpact.fr

**Nouveau hash :** `index-Cnfp7Rda.js`

---

### 4. Tester

1. Aller dans la liste des courriers
2. Trouver un courrier avec un fichier Word (DOCX)
3. Cliquer sur le bouton 🔍 "Générer PDF"
4. Attendre 2-5 secondes
5. Toast de succès : "PDF généré avec succès!"
6. Bouton "Télécharger PDF" apparaît
7. Télécharger et ouvrir le PDF

---

## 🎯 Comportement

### Avant Conversion

- Courrier avec DOCX uniquement
- Boutons : 📥 Word + 🔍 Générer PDF

### Pendant Conversion

- Spinner animé sur le bouton 🔍
- Durée : 2-5 secondes typiquement

### Après Conversion

- Bouton 🔍 disparaît
- Nouveau bouton : 📥 PDF
- Base de données mise à jour :
  - `fichier_pdf_url` → URL .pdf
  - `fichier_word_genere_url` → URL .docx

---

## 🔍 Vérification

### Logs Edge Function

Supabase Dashboard > Edge Functions > Logs

Rechercher :
```
Conversion du courrier <id>
PDF généré avec succès
```

### Base de Données

```sql
SELECT
  fichier_pdf_url,
  fichier_word_genere_url
FROM courrier_genere
WHERE id = 'test-courrier-id';
```

Résultat attendu :
- `fichier_pdf_url` : `https://.../pdf/xxx.pdf`
- `fichier_word_genere_url` : `https://.../xxx.docx`

---

## ⚠️ Troubleshooting

### Erreur "CLOUDCONVERT_API_KEY non configurée"

```bash
supabase secrets set CLOUDCONVERT_API_KEY=votre-clé
supabase functions deploy convert-courrier-to-pdf
```

### Le bouton "Générer PDF" ne s'affiche pas

1. Vérifier que le courrier a un DOCX
2. Vider le cache navigateur (Ctrl+Shift+R)
3. Vérifier le hash JS : `index-Cnfp7Rda.js`

### Erreur 401 lors de l'appel

La fonction nécessite une authentification :
- Vérifier que l'utilisateur est connecté
- La fonction utilise `verify_jwt: true`

---

## 💰 Coûts CloudConvert

| Plan | Prix | Conversions/jour |
|------|------|------------------|
| Gratuit | $0 | 25 |
| Starter | $9/mois | 500 |
| Pro | $39/mois | 5000 |

**Recommandation :** Starter pour démarrer

---

## 📚 Documentation Complète

Voir `GUIDE-CONVERSION-DOCX-PDF-CLOUDCONVERT.md` pour :
- Détails techniques CloudConvert API
- Gestion d'erreurs complète
- Monitoring et maintenance
- Améliorations futures

---

## ✅ Checklist

- [ ] API Key CloudConvert configurée
- [ ] Edge Function déployée
- [ ] Frontend buildé et déployé
- [ ] Cache navigateur vidé
- [ ] Test conversion réussi
- [ ] PDF téléchargeable
- [ ] Logs vérifiés

---

**Hash Build :** `index-Cnfp7Rda.js`
**Fichiers Créés :**
- `supabase/functions/convert-courrier-to-pdf/index.ts`
- `src/utils/fileTypeDetector.ts` (fonctions ajoutées)
- `src/components/GeneratedLettersList.tsx` (modifications)

**Statut :** ✅ Prêt pour déploiement
