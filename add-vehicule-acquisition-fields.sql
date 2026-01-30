/*
  # Ajouter les champs d'acquisition de véhicule

  1. Nouveaux champs
    - `fournisseur` - Le fournisseur du véhicule
    - `mode_acquisition` - Mode d'acquisition (LLD, LOA, LCD, Achat pur, Prêt, Location société)
    - `prix_ht` - Prix HT (pour achat ou valeur)
    - `prix_ttc` - Prix TTC (calculé automatiquement avec TVA 20%)
    - `mensualite` - Montant de la mensualité (pour locations uniquement)
    - `duree_contrat_mois` - Durée du contrat en mois
    - `date_debut_contrat` - Date de début du contrat d'acquisition
    - `date_fin_prevue_contrat` - Date de fin prévue du contrat

  2. Notes
    - Ces champs permettent de suivre comment le véhicule a été acquis
    - Pour les achats purs : prix_ht et prix_ttc sont utilisés, mensualite est NULL
    - Pour les locations (LLD, LOA, LCD, Location société) : mensualite est remplie
*/

-- Ajouter les colonnes d'acquisition à la table vehicule
ALTER TABLE vehicule
ADD COLUMN IF NOT EXISTS fournisseur text,
ADD COLUMN IF NOT EXISTS mode_acquisition text CHECK (mode_acquisition IN ('LLD', 'LOA', 'LCD', 'Achat pur', 'Prêt', 'Location société')),
ADD COLUMN IF NOT EXISTS prix_ht numeric(10, 2),
ADD COLUMN IF NOT EXISTS prix_ttc numeric(10, 2),
ADD COLUMN IF NOT EXISTS mensualite numeric(10, 2),
ADD COLUMN IF NOT EXISTS duree_contrat_mois integer,
ADD COLUMN IF NOT EXISTS date_debut_contrat date,
ADD COLUMN IF NOT EXISTS date_fin_prevue_contrat date;

-- Ajouter un commentaire pour documenter les colonnes
COMMENT ON COLUMN vehicule.fournisseur IS 'Fournisseur du véhicule (concessionnaire, loueur, etc.)';
COMMENT ON COLUMN vehicule.mode_acquisition IS 'Mode d''acquisition du véhicule : LLD, LOA, LCD, Achat pur, Prêt, Location société';
COMMENT ON COLUMN vehicule.prix_ht IS 'Prix Hors Taxes (pour achat ou valeur du véhicule)';
COMMENT ON COLUMN vehicule.prix_ttc IS 'Prix TTC calculé automatiquement (prix_ht * 1.20)';
COMMENT ON COLUMN vehicule.mensualite IS 'Montant de la mensualité (pour locations uniquement)';
COMMENT ON COLUMN vehicule.duree_contrat_mois IS 'Durée du contrat en mois';
COMMENT ON COLUMN vehicule.date_debut_contrat IS 'Date de début du contrat d''acquisition';
COMMENT ON COLUMN vehicule.date_fin_prevue_contrat IS 'Date de fin prévue du contrat';
