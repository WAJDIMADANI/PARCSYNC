-- Diagnostic: Pourquoi "Aucun salarié disponible" dans emails

-- 1. Compter tous les profils
SELECT
  'Total profils' as type,
  count(*) as nombre
FROM profil;

-- 2. Profils actifs (is_staff=true)
SELECT
  'Profils is_staff=true' as type,
  count(*) as nombre
FROM profil
WHERE is_staff = true;

-- 3. Profils actifs et pas sortis
SELECT
  'Profils actifs (is_staff=true, date_sortie null)' as type,
  count(*) as nombre
FROM profil
WHERE is_staff = true
AND date_sortie IS NULL;

-- 4. Profils actifs AVEC email
SELECT
  'Profils actifs AVEC email' as type,
  count(*) as nombre
FROM profil
WHERE is_staff = true
AND date_sortie IS NULL
AND email IS NOT NULL;

-- 5. Profils actifs SANS email
SELECT
  'Profils actifs SANS email' as type,
  count(*) as nombre
FROM profil
WHERE is_staff = true
AND date_sortie IS NULL
AND email IS NULL;

-- 6. Montrer quelques exemples
SELECT
  matricule_tca,
  nom,
  prenom,
  email,
  is_staff,
  date_sortie
FROM profil
WHERE is_staff = true
AND date_sortie IS NULL
ORDER BY nom
LIMIT 10;
