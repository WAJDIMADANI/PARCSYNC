# Guide Complet: Système de Pré-remplissage Automatique des Avertissements Véhicule

## Vue d'Ensemble

Le système gère **6 types distincts** d'avertissements pour l'utilisation du véhicule avec pré-remplissage automatique des informations des avertissements précédents.

---

## Les 6 Types d'Avertissements

### **Type 1: "1er Avertissement utilisation du vehicule"**

**Détection:** Modèle contenant "1er" ou "premier"

**Pré-remplissage:** ❌ AUCUN
- L'utilisateur doit remplir TOUS les champs manuellement
- C'est le premier avertissement, donc pas de données précédentes

**Avertissements requis:** Aucun

---

### **Type 2: "2ème Avertissement utilisation du vehicule"**

**Détection:** Modèle contenant "2ème" ou "deuxième"

**Pré-remplissage:** ✅ AUTOMATIQUE (2 champs)
- `date_1er_courrier` ← Date du 1er avertissement
- `liste_infractions_1er` ← Infractions du 1er avertissement

**Avertissements requis:** 1

**Ce que l'utilisateur remplit:**
- Les informations spécifiques au 2ème avertissement

---

### **Type 3a: "3ème Avertissement utilisation du vehicule"**

**Détection:** Modèle contenant "3ème" sans "convocation" ni "annexe"

**Pré-remplissage:** ✅ AUTOMATIQUE (4 champs)
- `date_1er_courrier` ← Date du 1er avertissement
- `date_2eme_courrier` ← Date du 2ème avertissement
- `liste_infractions_1er` ← Infractions du 1er avertissement
- `liste_infractions_2eme` ← Infractions du 2ème avertissement

**Avertissements requis:** 2

**Ce que l'utilisateur remplit:**
- Les informations spécifiques au 3ème avertissement

---

### **Type 3b: "3ème Avertissement utilisation du vehicule + convocation + annexe"**

**Détection:** Modèle contenant "3ème" + "convocation" + "annexe"

**Pré-remplissage:** ✅ AUTOMATIQUE (5 champs)
- `date_1er_courrier` ← Date du 1er avertissement
- `date_2eme_courrier` ← Date du 2ème avertissement
- `date_dernier_avertissement` ← Date du 2ème avertissement (même valeur)
- `liste_infractions_1er` ← Infractions du 1er avertissement
- `liste_infractions_2eme` ← Infractions du 2ème avertissement

**Avertissements requis:** 2

**Ce que l'utilisateur remplit:**
- Date de convocation
- Heure de convocation
- Lieu de convocation
- Informations du 3ème avertissement

---

### **Type 3c: "3ème Avertissement sans convocation avec annexe"**

**Détection:** Modèle contenant "3ème" + "sans convocation" + "annexe"

**Pré-remplissage:** ✅ AUTOMATIQUE (4 champs)
- `date_1er_courrier` ← Date du 1er avertissement
- `date_2eme_courrier` ← Date du 2ème avertissement
- `liste_infractions_1er` ← Infractions du 1er avertissement
- `liste_infractions_2eme` ← Infractions du 2ème avertissement

**NE PAS pré-remplir:**
- ❌ `date_3eme_courrier` (saisie manuelle uniquement)
- ❌ `liste_infractions_3eme` (saisie manuelle uniquement)

**Avertissements requis:** 2

**Ce que l'utilisateur remplit:**
- `date_3eme_courrier` (OBLIGATOIRE - saisie manuelle)
- `liste_infractions_3eme` (OBLIGATOIRE - saisie manuelle)
- Autres informations spécifiques

---

### **Type 4: "3ème Avertissement + convocation + Mise à pied conservatoire"**

**Détection:** Modèle contenant "mise" + "pied" + "conservatoire"

**Pré-remplissage:** ✅ AUTOMATIQUE (10 champs!)

**Données des 4 avertissements précédents:**
- `date_1er_avertissement` ← Date du 1er avertissement
- `description_1er_infraction` ← Infractions du 1er
- `date_2eme_avertissement` ← Date du 2ème avertissement
- `description_2eme_infraction` ← Infractions du 2ème
- `date_3eme_avertissement` ← Date du 3ème avertissement
- `description_3eme_infraction` ← Infractions du 3ème
- `date_4eme_avertissement` ← Date du 4ème avertissement
- `description_4eme_infraction` ← Infractions du 4ème

**Données de convocation du 4ème avertissement:**
- `date_entretien_manque` ← Date de convocation du 4ème
- `heure_entretien_manque` ← Heure de convocation du 4ème

**Avertissements requis:** 4

**Ce que l'utilisateur remplit UNIQUEMENT:**
- `date_convocation` (nouvelle convocation)
- `heure_convocation` (nouvelle convocation)
- `lieu_convocation`
- `date_mise_a_pied_conservatoire`

---

## Logique de Récupération des Infractions

Le système utilise un **ordre de priorité** pour extraire les descriptions d'infractions:

### Ordre de Recherche (du plus spécifique au plus général):

1. `liste_infractions_1er` / `liste_infractions_2eme` / `liste_infractions_3eme`
2. `liste_infractions`
3. `description_1er_infraction` / `description_2eme_infraction` / `description_3eme_infraction`
4. `description_infractions`
5. `description_faits`
6. **Fallback:** `"Infractions relevées le [date]"`

Cette logique garantit que le système trouve toujours une description, même si les noms de variables varient entre les modèles.

---

## Fonctionnalités Visuelles

### 1. Détection Automatique du Type

Lors de la sélection d'un modèle d'avertissement véhicule:
```
╔════════════════════════════════════════════════════════════╗
║  📄 Type 3b: 3ème Avertissement + convocation + annexe    ║
║  Détection automatique du type d'avertissement            ║
╚════════════════════════════════════════════════════════════╝
```

### 2. Indicateur de Champs Pré-remplis

Si des avertissements précédents sont trouvés:
```
╔════════════════════════════════════════════════════════════╗
║  ✨ 2 avertissement(s) précédent(s) trouvé(s)             ║
║  Champs pré-remplis automatiquement                       ║
║                                                            ║
║  [ℹ️ date_1er_courrier] [ℹ️ date_2eme_courrier]           ║
║  [ℹ️ liste_infractions_1er] [ℹ️ liste_infractions_2eme]   ║
║                                                            ║
║  Vous pouvez modifier ces valeurs si nécessaire           ║
╚════════════════════════════════════════════════════════════╝
```

### 3. Alerte si Avertissements Manquants

Si pas assez d'avertissements précédents:
```
╔════════════════════════════════════════════════════════════╗
║  ⚠️ Attention: Avertissements précédents manquants        ║
║                                                            ║
║  Seulement 1 avertissement(s) trouvé(s) sur 2 requis.    ║
║  Veuillez vérifier les données et remplir manuellement    ║
║  les champs manquants.                                    ║
╚════════════════════════════════════════════════════════════╝
```

### 4. Badge "Pré-rempli" sur les Champs

Les champs automatiquement remplis affichent un badge:
```
Date du 1er courrier *  [✨ Pré-rempli]
┌─────────────────────────────────────┐
│ 15 novembre 2024                    │
└─────────────────────────────────────┘
```

---

## Comment Créer un Nouveau Modèle

### Étape 1: Nommez le Modèle Correctement

Le système détecte automatiquement le type en fonction du nom:

- **Type 1:** Inclure "1er" ou "premier"
- **Type 2:** Inclure "2ème" ou "deuxième"
- **Type 3a:** Inclure "3ème" (sans autre mot-clé)
- **Type 3b:** Inclure "3ème" + "convocation" + "annexe"
- **Type 3c:** Inclure "3ème" + "sans convocation" + "annexe"
- **Type 4:** Inclure "mise" + "pied" + "conservatoire"

### Étape 2: Définir les Variables

**Variables Système** (pré-remplies automatiquement):
- `nom`, `prenom`, `matricule_tca`, `email`, `tel`, `poste`, etc.

**Variables Personnalisées** à déclarer selon le type:

#### Pour Type 2:
```json
{
  "date_1er_courrier": { "type": "text", "label": "Date du 1er courrier", "required": false },
  "liste_infractions_1er": { "type": "textarea", "label": "Liste des infractions du 1er", "required": false },
  "description_faits": { "type": "textarea", "label": "Description des faits", "required": true }
}
```

#### Pour Type 3a/3b/3c:
```json
{
  "date_1er_courrier": { "type": "text", "label": "Date du 1er courrier", "required": false },
  "date_2eme_courrier": { "type": "text", "label": "Date du 2ème courrier", "required": false },
  "liste_infractions_1er": { "type": "textarea", "label": "Liste des infractions du 1er", "required": false },
  "liste_infractions_2eme": { "type": "textarea", "label": "Liste des infractions du 2ème", "required": false }
}
```

#### Pour Type 4:
```json
{
  "date_1er_avertissement": { "type": "text", "label": "Date du 1er avertissement", "required": false },
  "description_1er_infraction": { "type": "textarea", "label": "Description 1ère infraction", "required": false },
  "date_2eme_avertissement": { "type": "text", "label": "Date du 2ème avertissement", "required": false },
  "description_2eme_infraction": { "type": "textarea", "label": "Description 2ème infraction", "required": false },
  "date_3eme_avertissement": { "type": "text", "label": "Date du 3ème avertissement", "required": false },
  "description_3eme_infraction": { "type": "textarea", "label": "Description 3ème infraction", "required": false },
  "date_4eme_avertissement": { "type": "text", "label": "Date du 4ème avertissement", "required": false },
  "description_4eme_infraction": { "type": "textarea", "label": "Description 4ème infraction", "required": false },
  "date_entretien_manque": { "type": "date", "label": "Date entretien manqué", "required": false },
  "heure_entretien_manque": { "type": "time", "label": "Heure entretien manqué", "required": false },
  "date_convocation": { "type": "date", "label": "Date de convocation", "required": true },
  "heure_convocation": { "type": "time", "label": "Heure de convocation", "required": true },
  "lieu_convocation": { "type": "text", "label": "Lieu de convocation", "required": true },
  "date_mise_a_pied_conservatoire": { "type": "date", "label": "Date de mise à pied conservatoire", "required": true }
}
```

### Étape 3: Utiliser les Variables dans le Contenu

Dans le contenu du modèle, utilisez les variables avec la syntaxe `{{nom_variable}}`:

```html
<p>Madame, Monsieur,</p>

<p>Nous faisons suite à nos précédents courriers:</p>
<ul>
  <li>1er avertissement en date du <b>{{date_1er_courrier}}</b> pour: {{liste_infractions_1er}}</li>
  <li>2ème avertissement en date du <b>{{date_2eme_courrier}}</b> pour: {{liste_infractions_2eme}}</li>
</ul>

<p>Nous sommes au regret de constater que...</p>
```

---

## Vérifications de Sécurité

### Le système vérifie:

1. **Présence des avertissements précédents**
   - Type 2 nécessite 1 avertissement
   - Type 3 (a/b/c) nécessite 2 avertissements
   - Type 4 nécessite 4 avertissements

2. **Affiche un avertissement** si pas assez d'avertissements trouvés

3. **Permet la modification** de toutes les valeurs pré-remplies

4. **Ne bloque JAMAIS** la génération
   - Si des avertissements manquent, l'utilisateur peut remplir manuellement

---

## Logs de Débogage

Le système affiche des logs dans la console pour faciliter le débogage:

```javascript
✓ Type 3b: 2 avertissement(s) trouvé(s), 5 champ(s) pré-rempli(s)
```

ou

```javascript
⚠️ Attention: Seulement 1 avertissement(s) trouvé(s) sur 2 requis
```

---

## Tests Recommandés

### Test 1: Création de Modèles
1. Créer un modèle de chaque type (1 à 4)
2. Vérifier que la détection automatique fonctionne

### Test 2: Génération avec Données Existantes
1. Créer un 1er avertissement pour un salarié
2. Créer un 2ème avertissement → Vérifier le pré-remplissage
3. Créer un 3ème avertissement → Vérifier le pré-remplissage
4. Créer un 4ème avertissement (Type 4) → Vérifier les 10 champs

### Test 3: Génération sans Données Précédentes
1. Essayer de créer un Type 2 sans Type 1 existant
2. Vérifier l'alerte d'avertissements manquants
3. Vérifier que la génération reste possible avec saisie manuelle

### Test 4: Modification des Valeurs Pré-remplies
1. Générer un Type 2 avec pré-remplissage
2. Modifier les valeurs pré-remplies
3. Vérifier que les modifications sont prises en compte

---

## Résolution de Problèmes

### Problème: Les champs ne se pré-remplissent pas

**Cause possible:** Nom du modèle incorrect

**Solution:** Vérifier que le nom du modèle contient les mots-clés de détection

### Problème: Mauvaises valeurs pré-remplies

**Cause possible:** Variables avec des noms différents dans les anciens avertissements

**Solution:** Le système utilise déjà un ordre de priorité. Si le problème persiste, vérifier les noms de variables dans `variables_remplies` des avertissements précédents

### Problème: Avertissements non trouvés

**Cause possible:** Les avertissements précédents n'ont pas été enregistrés dans `courrier_genere`

**Solution:** Vérifier que les avertissements précédents apparaissent dans la liste des courriers générés

---

## Support Technique

Pour toute question ou problème, vérifier:
1. Les logs dans la console du navigateur
2. La table `courrier_genere` dans Supabase
3. Les valeurs de `variables_remplies` des avertissements précédents
4. Le nom du modèle de courrier utilisé

---

**Dernière mise à jour:** 8 décembre 2024
**Version:** 2.0 - Système 6 types complet
