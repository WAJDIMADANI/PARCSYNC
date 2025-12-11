-- Diagnostic du contrat de WAJDI
-- Vérifier pourquoi il n'apparaît pas dans les incidents

-- 1. Informations du profil WAJDI
SELECT
  'PROFIL' as table_name,
  id,
  matricule_tca,
  nom,
  prenom,
  statut as statut_profil
FROM profil
WHERE matricule_tca = '15901';

-- 2. Tous les contrats de WAJDI avec détails
SELECT
  'CONTRATS' as table_name,
  c.id,
  c.type,
  c.date_debut,
  c.date_fin,
  c.statut as statut_contrat,
  c.created_at,
  CASE
    WHEN c.date_fin < CURRENT_DATE THEN '❌ EXPIRÉ'
    WHEN c.date_fin = CURRENT_DATE THEN '⚠️ EXPIRE AUJOURD''HUI'
    ELSE '✅ ACTIF'
  END as etat_calcule
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE p.matricule_tca = '15901'
ORDER BY c.created_at DESC;

-- 3. Incidents liés à WAJDI
SELECT
  'INCIDENTS' as table_name,
  i.id,
  i.type,
  i.date_expiration_originale,
  i.date_creation_incident,
  i.statut,
  i.metadata
FROM incident i
JOIN profil p ON i.profil_id = p.id
WHERE p.matricule_tca = '15901'
ORDER BY i.date_creation_incident DESC;

-- 4. Notifications liées à WAJDI
SELECT
  'NOTIFICATIONS' as table_name,
  n.id,
  n.type,
  n.date_echeance,
  n.created_at,
  n.statut
FROM notification n
JOIN profil p ON n.profil_id = p.id
WHERE p.matricule_tca = '15901'
ORDER BY n.created_at DESC;

-- 5. Test de la condition de la fonction d'incidents
-- Cette requête simule ce que fait generate_daily_expired_incidents()
SELECT
  'TEST CONDITION FONCTION' as table_name,
  c.id,
  c.type,
  c.date_fin,
  c.statut,
  CASE
    WHEN c.type = 'CDD' THEN '✅ Type OK'
    ELSE '❌ Type NON OK'
  END as check_type,
  CASE
    WHEN c.date_fin <= CURRENT_DATE THEN '✅ Date OK (expiré)'
    ELSE '❌ Date NON OK'
  END as check_date,
  CASE
    WHEN c.statut = 'actif' THEN '✅ Statut OK pour fonction'
    ELSE '❌ Statut NON OK (fonction cherche ''actif'')'
  END as check_statut,
  CASE
    WHEN c.type = 'CDD'
      AND c.date_fin <= CURRENT_DATE
      AND c.statut = 'actif'
    THEN '✅ DEVRAIT CRÉER INCIDENT'
    WHEN c.type = 'CDD'
      AND c.date_fin <= CURRENT_DATE
      AND c.statut != 'actif'
    THEN '❌ BLOQUÉ PAR STATUT "' || c.statut || '"'
    ELSE '❌ NE REMPLIT PAS LES CONDITIONS'
  END as resultat_final
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE p.matricule_tca = '15901'
ORDER BY c.created_at DESC;
