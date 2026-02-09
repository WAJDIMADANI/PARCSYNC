-- Script de test pour vérifier le patch de mise à jour des dates d'incident

-- 1. Vérifier que la fonction existe
SELECT
  proname as nom_fonction,
  pg_get_function_arguments(oid) as parametres
FROM pg_proc
WHERE proname = 'update_incident_expiration_date_only';

-- Si la fonction existe, vous devriez voir:
-- nom_fonction: update_incident_expiration_date_only
-- parametres: p_profil_id uuid, p_type text, p_nouvelle_date date, p_commentaire text DEFAULT 'Date mise à jour depuis le modal salarié'::text


-- 2. Trouver un profil avec un incident titre_sejour actif pour tester
SELECT
  i.id as incident_id,
  i.profil_id,
  i.type,
  i.statut,
  i.date_expiration as date_actuelle,
  p.nom,
  p.prenom
FROM incident i
JOIN profil p ON p.id = i.profil_id
WHERE i.type = 'titre_sejour'
  AND i.statut IN ('actif', 'en_cours')
LIMIT 5;

-- Copier un profil_id de la liste ci-dessus pour le test


-- 3. TEST: Appeler la fonction pour mettre à jour la date d'expiration
-- REMPLACER 'VOTRE_PROFIL_ID' par un vrai UUID de profil de l'étape 2
SELECT public.update_incident_expiration_date_only(
  'VOTRE_PROFIL_ID'::uuid,  -- Remplacer par un vrai ID
  'titre_sejour',
  '2025-12-31'::date,
  'Test de mise à jour depuis SQL'
);

-- Vous devriez voir un résultat JSON:
-- {"success": true, "incident_id": "...", "updated": true, "message": "Date d'expiration mise à jour"}


-- 4. Vérifier que l'incident a bien été mis à jour
-- REMPLACER 'VOTRE_PROFIL_ID' par le même UUID
SELECT
  id,
  profil_id,
  type,
  statut,  -- Doit rester 'actif' ou 'en_cours'
  date_expiration,  -- Doit être '2025-12-31'
  commentaire,  -- Doit contenir 'Test de mise à jour depuis SQL'
  updated_at
FROM incident
WHERE profil_id = 'VOTRE_PROFIL_ID'::uuid
  AND type = 'titre_sejour'
ORDER BY created_at DESC
LIMIT 1;


-- 5. Vérifier qu'aucun incident n'a été créé/dupliqué
-- REMPLACER 'VOTRE_PROFIL_ID' par le même UUID
SELECT
  COUNT(*) as nombre_incidents,
  type,
  statut
FROM incident
WHERE profil_id = 'VOTRE_PROFIL_ID'::uuid
  AND type = 'titre_sejour'
GROUP BY type, statut;

-- Vous devriez voir:
-- nombre_incidents: 1 (pas de duplication)
-- type: titre_sejour
-- statut: actif (ou en_cours)


-- 6. TEST avec un profil qui n'a PAS d'incident
SELECT public.update_incident_expiration_date_only(
  '00000000-0000-0000-0000-000000000000'::uuid,  -- ID fictif
  'titre_sejour',
  '2025-12-31'::date,
  'Test avec profil inexistant'
);

-- Vous devriez voir:
-- {"success": true, "incident_id": null, "updated": false, "message": "Aucun incident actif trouvé"}


-- 7. Statistiques globales des incidents avant/après
SELECT
  type,
  statut,
  COUNT(*) as nombre
FROM incident
GROUP BY type, statut
ORDER BY type, statut;
