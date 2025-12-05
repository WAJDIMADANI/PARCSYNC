import { SYSTEM_VARIABLES } from '../lib/letterTemplateGenerator';

interface VariableInsertButtonsProps {
  onInsert: (variable: string) => void;
}

export function VariableInsertButtons({ onInsert }: VariableInsertButtonsProps) {
  const categories = {
    'Identité': ['nom', 'prenom', 'nom_complet', 'civilite', 'matricule_tca'],
    'Contact': ['email', 'tel', 'adresse', 'complement_adresse', 'code_postal', 'ville'],
    'Professionnel': ['poste', 'site_nom', 'secteur_nom', 'date_entree', 'date_sortie'],
    'Personnel': ['date_naissance', 'lieu_naissance', 'nationalite', 'numero_securite_sociale'],
    'Dates': ['date_aujourd_hui'],
    'Entreprise': ['nom_entreprise', 'adresse_entreprise', 'ville_entreprise', 'tel_entreprise', 'siret_entreprise', 'rcs_entreprise', 'code_naf_entreprise', 'groupe_entreprise'],
    'Signataire': ['prenom_signataire', 'nom_signataire', 'fonction_signataire'],
    'Courrier disciplinaire': ['type_courrier', 'mode_envoi', 'motif_avertissement', 'periode_concernee', 'resume_faits', 'details_infractions', 'total_km_non_autorises', 'nombre_incidents', 'date_avertissement_reference', 'historique_avertissements', 'mesure_disciplinaire', 'risque_en_cas_de_recidive'],
    'Véhicule': ['type_vehicule', 'immatriculation_vehicule', 'modele_vehicule', 'zone_autorisee'],
    'Entretien': ['date_entretien', 'heure_entretien', 'lieu_entretien', 'type_entretien'],
    'Mise à pied': ['date_debut_mise_a_pied', 'date_fin_mise_a_pied'],
    'Licenciement': ['date_courrier_convocation_prealable', 'date_entretien_prealable', 'lieu_entretien_prealable', 'motif_licenciement']
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">
        Variables système disponibles (cliquez pour insérer) :
      </div>

      {Object.entries(categories).map(([category, variables]) => (
        <div key={category}>
          <div className="text-xs font-medium text-gray-600 mb-1">{category}</div>
          <div className="flex flex-wrap gap-2">
            {variables.map(variable => (
              <button
                key={variable}
                type="button"
                onClick={() => onInsert(variable)}
                className="px-3 py-1 text-xs font-mono bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors border border-blue-200"
                title={SYSTEM_VARIABLES[variable]}
              >
                {`{{${variable}}}`}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
