-- Vue pour lister les incidents de documents expirés
-- À exécuter directement dans l'éditeur SQL de Supabase

CREATE OR REPLACE VIEW public.v_incident_documents_expires_list AS
SELECT
  i.id,
  i.type,
  i.statut,
  COALESCE(i.nouvelle_date_validite, i.date_expiration_originale) as date_effective,
  i.profil_id,
  p.prenom,
  p.nom,
  p.email
FROM public.incident i
LEFT JOIN public.profil p ON p.id = i.profil_id
WHERE i.statut = 'expire';

-- Commentaire sur la vue
COMMENT ON VIEW public.v_incident_documents_expires_list IS
'Vue qui liste tous les incidents de documents expirés avec les informations du profil associé';
