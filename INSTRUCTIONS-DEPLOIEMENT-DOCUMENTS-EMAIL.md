# Instructions de déploiement de la fonction send-documents-email

## Contexte
Cette fonction permet d'envoyer par email les documents sélectionnés aux salariés. Les salariés peuvent demander leurs documents directement et les recevoir dans leur boite email.

## Prérequis
- La fonction Edge `send-documents-email` a été créée localement dans `supabase/functions/send-documents-email/`
- Brevo API est configuré (BREVO_API_KEY)

## Déploiement de la fonction

### Option 1 : Via l'interface Supabase (Recommandé)

1. Allez dans votre projet Supabase Dashboard
2. Naviguez vers **Edge Functions**
3. Cliquez sur **Deploy a new function**
4. Copiez le contenu du fichier `supabase/functions/send-documents-email/index.ts`
5. Nommez la fonction : `send-documents-email`
6. Assurez-vous que les variables d'environnement suivantes sont configurées :
   - `BREVO_API_KEY` (déjà configuré normalement)

### Option 2 : Via CLI Supabase (Si vous avez accès)

```bash
supabase functions deploy send-documents-email
```

## Fonctionnalités ajoutées

### Dans la fiche salarié (EmployeeList)

1. **Sélection de documents**
   - Chaque document affiche maintenant une checkbox
   - Bouton "Tout sélectionner" / "Tout désélectionner" en haut
   - Compteur de documents sélectionnés

2. **Envoi par email**
   - Bouton "Envoyer (X)" qui apparaît quand des documents sont sélectionnés
   - Modal de confirmation avec la liste des documents
   - Email envoyé au salarié avec les liens de téléchargement

3. **Email reçu par le salarié**
   - Sujet : "Vos documents - X document(s) disponible(s)"
   - Liste des documents avec liens de téléchargement
   - Design professionnel et responsive
   - Conseils pour sauvegarder les documents

## Comment utiliser

1. Ouvrir la fiche d'un salarié
2. Dans la section "Documents", cocher les documents à envoyer
3. Cliquer sur "Envoyer (X)" où X est le nombre de documents sélectionnés
4. Confirmer l'envoi dans la modal
5. Le salarié reçoit un email avec les liens vers ses documents

## Points techniques

- Les URLs des documents sont générées via `getStorageUrl()` qui utilise Supabase Storage
- Les documents sont accessibles via des URLs publiques sécurisées
- L'email est envoyé via Brevo API
- La fonction Edge vérifie l'authentification JWT

## Vérifications après déploiement

- [ ] La fonction `send-documents-email` est déployée
- [ ] Les checkboxes apparaissent sur les documents
- [ ] Le bouton "Envoyer" apparaît quand on sélectionne des documents
- [ ] La modal de confirmation s'affiche correctement
- [ ] L'email est bien reçu par le salarié
- [ ] Les liens dans l'email fonctionnent et ouvrent les documents
