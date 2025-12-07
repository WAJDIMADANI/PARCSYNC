# Guide de Test - Générateur de Courrier Administratif

## Test Rapide (5 minutes)

### Prérequis
- Application démarrée (`npm run dev`)
- Base de données Supabase configurée
- Au moins 1 salarié dans la table `profil`
- Au moins 1 modèle de courrier dans `modele_courrier`

### Étapes de Test

#### 1. Accéder à l'Interface
```
Navigation: Menu → Courriers → Générer un courrier
```

#### 2. Sélectionner un Salarié
- Utiliser la barre de recherche
- Sélectionner n'importe quel salarié
- Cliquer "Suivant"

#### 3. Choisir un Modèle
- Filtrer par type si nécessaire
- Sélectionner un modèle
- Cliquer "Suivant"

#### 4. Remplir les Variables
- Les variables système sont pré-remplies automatiquement
- Remplir les variables personnalisées si demandées
- Cliquer "Prévisualiser" pour voir le résultat

#### 5. Générer le PDF
- Cliquer "Générer le courrier"
- Le PDF sera téléchargé automatiquement
- Ouvrir le PDF et vérifier

### Points de Vérification

**En-tête (Haut du document):**
- [ ] "TRANSPORT CLASSE AFFAIRE" en gras
- [ ] Adresse: "111 Avenue Victor Hugo"
- [ ] Code postal: "75016 PARIS"
- [ ] Téléphone: "01.86.22.24.00"
- [ ] SIRET: "50426507500029"
- [ ] Ligne de séparation horizontale

**Date et Lieu:**
- [ ] Aligné à droite
- [ ] Format: "Paris, le 7 décembre 2024"

**Destinataire:**
- [ ] Civilité + Prénom + NOM (majuscules)
- [ ] Adresse (si renseignée)
- [ ] Code postal + Ville

**Objet:**
- [ ] "Objet: [titre]"
- [ ] Texte en gras
- [ ] Souligné

**Corps:**
- [ ] Formule d'appel: "Madame, Monsieur," ou "Madame," ou "Monsieur,"
- [ ] Paragraphes justifiés
- [ ] Formatage HTML respecté (gras, italique, listes)
- [ ] Espacement entre paragraphes (6mm)

**Signature:**
- [ ] Alignée à droite
- [ ] Fonction: "La Direction des Ressources Humaines"
- [ ] Nom du signataire en majuscules

**Pied de page:**
- [ ] Sur toutes les pages
- [ ] "TRANSPORT CLASSE AFFAIRE - Document confidentiel"
- [ ] "Page X/Y | Généré le JJ/MM/AAAA"

**Marges:**
- [ ] Haut: ~20mm
- [ ] Bas: ~25mm
- [ ] Gauche: ~25mm
- [ ] Droite: ~25mm

## Test Avancé (15 minutes)

### Test 1: Courrier avec Formatage HTML

**Créer un template de test:**
```sql
INSERT INTO modele_courrier (nom, type_courrier, sujet, contenu, actif)
VALUES (
  'Test HTML',
  'test',
  'Test de formatage',
  '<p>Ce paragraphe contient du <strong>texte en gras</strong> et du <em>texte en italique</em>.</p>

  <h2>Section avec titre</h2>
  <p>Paragraphe sous le titre avec <u>texte souligné</u>.</p>

  <h3>Liste à puces</h3>
  <ul>
    <li>Premier élément</li>
    <li>Deuxième élément avec <strong>gras</strong></li>
    <li>Troisième élément</li>
  </ul>

  <h3>Liste numérotée</h3>
  <ol>
    <li>Étape 1</li>
    <li>Étape 2</li>
    <li>Étape 3</li>
  </ol>

  <hr>

  <p style="text-align: center;">Texte centré</p>
  <p style="text-align: right;">Texte à droite</p>

  <p>Accents français: à, é, è, ê, ô, î, ù, ç</p>
  <p>Apostrophes: l''entreprise, d''embauche</p>',
  true
);
```

**Vérifications:**
- [ ] Tous les formatages sont appliqués
- [ ] Titres en gras et plus grands
- [ ] Listes avec puces/numéros
- [ ] Ligne horizontale visible
- [ ] Alignements respectés
- [ ] Accents français corrects

### Test 2: Courrier Long (Sauts de Page)

**Créer un template avec beaucoup de contenu:**
```sql
INSERT INTO modele_courrier (nom, type_courrier, sujet, contenu, actif)
VALUES (
  'Test Pages Multiples',
  'test',
  'Courrier sur plusieurs pages',
  '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit...</p>
  <p>Sed do eiusmod tempor incididunt ut labore...</p>
  <p>Ut enim ad minim veniam, quis nostrud...</p>
  [Répéter 20 fois]',
  true
);
```

**Vérifications:**
- [ ] Sauts de page automatiques
- [ ] Pied de page sur chaque page
- [ ] Numérotation correcte (Page 1/3, 2/3, 3/3)
- [ ] Pas de texte coupé au milieu

### Test 3: Variables Système

**Template avec toutes les variables:**
```html
<p><strong>Informations du salarié:</strong></p>
<ul>
  <li>Nom: {{nom}}</li>
  <li>Prénom: {{prenom}}</li>
  <li>Matricule: {{matricule_tca}}</li>
  <li>Poste: {{poste}}</li>
  <li>Site: {{site_nom}}</li>
  <li>Email: {{email}}</li>
  <li>Téléphone: {{tel}}</li>
</ul>

<p>Date du jour: {{date_aujourd_hui}}</p>
```

**Vérifications:**
- [ ] Toutes les variables sont remplacées
- [ ] Aucun "{{variable}}" visible dans le PDF
- [ ] Format de date correct: "7 décembre 2024"
- [ ] Pas de "[Non renseigné]" si données présentes

### Test 4: Caractères Spéciaux

**Template de test:**
```html
<p>Accents: à, é, è, ê, ë, ï, î, ô, ù, û, ü, ÿ, ç</p>
<p>Majuscules accentuées: À, É, È, Ê, Ô, Ù</p>
<p>Guillemets: « citation », "guillemets anglais"</p>
<p>Apostrophes: l'entreprise, aujourd'hui, s'il vous plaît</p>
<p>Symboles: €, %, &, @, #</p>
```

**Vérifications:**
- [ ] Tous les accents s'affichent correctement
- [ ] Pas de caractères bizarres (�, ?)
- [ ] Guillemets français « » visibles
- [ ] Apostrophes correctes

## Test de Non-Régression

**Vérifier que l'ancien système fonctionne toujours:**

1. **htmlToPdfGenerator.ts** est toujours disponible
2. Les autres fonctions utilisant `generateProfessionalPdf` fonctionnent
3. Aucune régression sur les autres modules

## Problèmes Courants et Solutions

### PDF vide ou erreur 401
**Cause:** Permissions Supabase Storage
**Solution:** Vérifier les policies sur le bucket `courriers-generes`

### Variables non remplacées
**Cause:** Nom de variable incorrect
**Solution:** Vérifier l'orthographe: `{{nom}}` pas `{{nom }}`

### Caractères accentués bizarres
**Cause:** Encodage incorrect
**Solution:** Le générateur gère automatiquement UTF-8

### Texte qui dépasse
**Cause:** Ligne trop longue sans espaces
**Solution:** Le générateur coupe automatiquement

### Signature sur nouvelle page
**Cause:** Pas assez de place en bas
**Solution:** Comportement normal, saut de page automatique

## Comparaison avec Word Original

**Si vous avez le document Word original:**

1. Ouvrir le Word dans LibreOffice/Word
2. Faire "Enregistrer sous PDF"
3. Ouvrir les deux PDFs côte à côte
4. Comparer:
   - Position des blocs
   - Espacements
   - Tailles de police
   - Marges

**Tolérance acceptable:** ± 2mm

## Checklist Finale

Avant de considérer le test réussi:

- [ ] PDF généré sans erreur
- [ ] Format A4 (210 x 297mm)
- [ ] Toutes les sections présentes
- [ ] Marges correctes (20-25mm)
- [ ] Police lisible (11pt)
- [ ] Aucune variable non remplacée
- [ ] Accents français corrects
- [ ] Pied de page sur toutes les pages
- [ ] Numérotation cohérente
- [ ] Fichier uploadé vers Supabase
- [ ] Enregistrement en base de données

## Tests en Production

**Avant de déployer:**

1. Générer 5-10 courriers différents
2. Les faire relire par un utilisateur
3. Comparer avec anciens courriers Word
4. Vérifier l'impression papier (Ctrl+P)
5. Tester sur différents navigateurs (Chrome, Firefox, Safari)

## Support

**En cas de problème:**

1. Vérifier la console du navigateur (F12)
2. Regarder les logs de la fonction `handleGenerate`
3. Vérifier les logs Supabase Edge Functions
4. Consulter `IMPLEMENTATION-COURRIER-ADMINISTRATIF.md`

**Logs utiles:**
```javascript
console.log('=== GÉNÉRATION COURRIER ADMINISTRATIF ===');
console.log('Courrier administratif généré, taille:', pdfBlob.size, 'bytes');
```

---

**Test réussi?** Félicitations! Le système est prêt pour la production. 🎉
