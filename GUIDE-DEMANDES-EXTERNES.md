# Guide - Système de Demandes Externes

## Vue d'ensemble

Système complet permettant aux chauffeurs externes d'envoyer des demandes aux équipes sans authentification.

## Étapes d'installation

### 1. Exécuter la migration SQL

Exécutez le fichier SQL dans votre base de données Supabase:

```bash
create-demandes-externes-system.sql
```

Cette migration crée:
- Table `demandes_externes` avec RLS policies
- Bucket storage `demandes-externes` pour les fichiers
- Policies anonymes pour permettre l'accès public

### 2. Déployer l'edge function

Déployez la fonction d'envoi d'email de confirmation:

```bash
supabase functions deploy send-demande-confirmation
```

### 3. Accéder à la page publique

La page est accessible à l'URL:
```
https://votre-domaine.com/demande-externe
```

## Fonctionnalités

### Page Publique (/demande-externe)

1. **Recherche du chauffeur**
   - Le chauffeur entre son matricule TCA
   - Le système recherche dans la table `profil`
   - Affichage des infos du chauffeur si trouvé

2. **Formulaire de demande**
   - Sélection du pôle destinataire (RH, Maintenance, Administration, Logistique)
   - Sujet (max 200 caractères)
   - Contenu (minimum 10 caractères)
   - Upload de fichiers (PDF, PNG, JPG - max 3 fichiers de 5MB)

3. **Soumission**
   - Upload des fichiers dans le bucket storage
   - Création de la demande en base
   - Création de notifications inbox pour tous les utilisateurs du pôle
   - Envoi d'email de confirmation au chauffeur via Brevo

### Section Admin

Dans **Administration > Utilisateurs**, une nouvelle section "Lien de demande externe" permet:

1. **Copier le lien**
   - Bouton pour copier l'URL de la page publique
   - Toast de confirmation

2. **Générer et télécharger le QR Code**
   - Afficher le QR code pointant vers la page
   - Télécharger le QR code en PNG (300x300px)
   - Partager avec les chauffeurs

3. **Instructions d'utilisation**
   - Guide visuel pour les admins
   - Explications sur le processus

## Architecture Technique

### Base de données

**Table demandes_externes:**
- `id` (uuid) - ID unique
- `profil_id` (uuid) - Référence vers le chauffeur
- `pole_id` (uuid) - Pôle destinataire
- `sujet` (text) - Sujet de la demande
- `contenu` (text) - Contenu détaillé
- `fichiers` (jsonb) - Array de fichiers [{path, name, size}]
- `statut` (text) - 'nouveau', 'en_cours', 'traite', 'refuse'
- `created_at` / `updated_at` (timestamptz)

**RLS Policies:**
- Anonymous INSERT: Permet aux utilisateurs non connectés de créer des demandes
- Authenticated SELECT: Les utilisateurs voient les demandes de leur pôle
- Authenticated UPDATE: Les utilisateurs peuvent mettre à jour les demandes de leur pôle

### Storage

**Bucket demandes-externes:**
- Public read access
- Anonymous upload
- Organisation: `demandes-externes/{profil_id}/{timestamp}_{filename}`

### Edge Function

**send-demande-confirmation:**
- Envoie l'email de confirmation via Brevo
- Contenu: sujet, pôle, date formatée
- Email HTML avec design professionnel

### Composants

1. **DemandeExterne.tsx** - Page publique
   - Recherche chauffeur
   - Formulaire de demande
   - Upload de fichiers
   - Gestion des erreurs

2. **ExternalDemandLink.tsx** - Section admin
   - Affichage du lien
   - Génération QR code
   - Copy to clipboard

## Workflow Complet

1. **Le chauffeur accède à la page**
   - Via lien direct ou QR code
   - Pas de login requis

2. **Recherche par matricule**
   - Entre son matricule TCA
   - Le système trouve ses informations

3. **Remplit le formulaire**
   - Sélectionne le pôle concerné
   - Décrit sa demande
   - Ajoute des fichiers si nécessaire

4. **Soumet la demande**
   - Fichiers uploadés dans storage
   - Demande créée en base
   - Tous les utilisateurs du pôle sont notifiés dans leur inbox
   - Email de confirmation envoyé au chauffeur

5. **Les équipes sont notifiées**
   - Notification dans l'inbox
   - Type: "demande_externe"
   - Référence vers la demande

6. **Les équipes traitent la demande**
   - Consultation dans l'inbox
   - Mise à jour du statut (optionnel - à développer)

## Sécurité

- RLS activé sur toutes les tables
- Anonymous limité aux INSERT et SELECT profil
- Storage avec policies restrictives
- Validation côté client et serveur
- Limitation de taille et type de fichiers

## Prochaines étapes possibles

1. **Page de gestion des demandes pour les admins**
   - Liste des demandes
   - Filtres par pôle, statut, date
   - Mise à jour du statut
   - Ajout de réponses

2. **Système de notifications email**
   - Notifier les équipes par email
   - Emails de suivi pour le chauffeur

3. **Historique et statistiques**
   - Dashboard des demandes
   - Temps de traitement
   - Volume par pôle

## Variables d'environnement requises

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
BREVO_API_KEY=your_brevo_api_key  # Dans Supabase Edge Functions
```

## Support

En cas de problème:
1. Vérifier les RLS policies dans Supabase
2. Vérifier les logs de l'edge function
3. Vérifier les permissions du bucket storage
4. Tester avec différents matricules
