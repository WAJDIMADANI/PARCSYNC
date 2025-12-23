# CORRECTION URGENTE : Erreur RLS sur courrier_genere

## Problème
Vous avez une erreur "new row violates row-level security policy" lors de la génération de courriers.

## Solution
Exécuter le script SQL suivant dans votre base de données Supabase.

## Étapes à suivre

### 1. Ouvrir le SQL Editor de Supabase
- Allez sur https://supabase.com/dashboard
- Sélectionnez votre projet
- Cliquez sur "SQL Editor" dans le menu de gauche

### 2. Copier et exécuter le SQL suivant

```sql
/*
  # Fix RLS Policies for courrier_genere

  Corrige les politiques RLS pour permettre aux utilisateurs
  authentifiés de créer des courriers générés.
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view generated letters" ON courrier_genere;
DROP POLICY IF EXISTS "Authenticated users can create generated letters" ON courrier_genere;
DROP POLICY IF EXISTS "Users can update their generated letters" ON courrier_genere;
DROP POLICY IF EXISTS "Users can delete their generated letters" ON courrier_genere;

-- Policy: All authenticated users can view generated letters
CREATE POLICY "Users can view generated letters"
  ON courrier_genere
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: All authenticated users can insert generated letters
CREATE POLICY "Authenticated users can create generated letters"
  ON courrier_genere
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can update their own generated letters or if they are admin
CREATE POLICY "Users can update their generated letters"
  ON courrier_genere
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- Policy: Users can delete their own generated letters or if they are admin
CREATE POLICY "Users can delete their generated letters"
  ON courrier_genere
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app_utilisateur
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'super_admin')
    )
  );
```

### 3. Cliquer sur "Run" (ou appuyer sur Ctrl+Enter)

### 4. Vérifier que tout est OK

Vous devriez voir un message de succès indiquant que les politiques ont été créées.

### 5. Retester la génération de courrier

Retournez dans l'application et essayez de générer un nouveau courrier. L'erreur RLS devrait être résolue.

## Qu'est-ce qui a été corrigé ?

Les politiques RLS (Row Level Security) pour la table `courrier_genere` ont été créées/corrigées pour permettre :

1. **SELECT** : Tous les utilisateurs authentifiés peuvent voir tous les courriers
2. **INSERT** : Tous les utilisateurs authentifiés peuvent créer des courriers (en s'assignant comme créateur)
3. **UPDATE** : Les utilisateurs peuvent modifier leurs propres courriers (ou les admins peuvent modifier n'importe quel courrier)
4. **DELETE** : Les utilisateurs peuvent supprimer leurs propres courriers (ou les admins peuvent supprimer n'importe quel courrier)

## En cas de problème

Si vous avez toujours des erreurs après avoir exécuté ce script, vérifiez :

1. Que la table `courrier_genere` existe bien
2. Que RLS est activé sur cette table :
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'courrier_genere';
```

3. Que votre utilisateur est bien authentifié dans l'application
