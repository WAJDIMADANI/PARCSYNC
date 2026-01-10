-- Vérifier le dernier matricule utilisé
SELECT
  matricule,
  nom,
  prenom,
  created_at,
  SUBSTRING(matricule, 1, 1) as premier_chiffre
FROM profil
WHERE matricule IS NOT NULL
ORDER BY matricule DESC
LIMIT 10;

-- Compter les matricules par premier chiffre
SELECT
  SUBSTRING(matricule, 1, 1) as premier_chiffre,
  COUNT(*) as nombre
FROM profil
WHERE matricule IS NOT NULL
GROUP BY SUBSTRING(matricule, 1, 1)
ORDER BY premier_chiffre;
