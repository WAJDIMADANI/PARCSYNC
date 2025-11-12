import { X, Mail, Download, FileText } from 'lucide-react';

interface Contract {
  id: string;
  variables: {
    date_debut?: string;
    date_fin?: string;
    salaire?: string;
    heures_semaine?: string;
    poste?: string;
    lieu_travail?: string;
    periode_essai?: string;
    [key: string]: any;
  };
  profil?: {
    prenom: string;
    nom: string;
    email?: string;
  };
  modeles_contrats?: {
    type_contrat: string;
    nom?: string;
  };
}

interface ContractPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  onSendEmail?: () => void;
  onDownloadPdf?: () => void;
}

export function ContractPreviewModal({
  isOpen,
  onClose,
  contract,
  onSendEmail,
  onDownloadPdf
}: ContractPreviewModalProps) {
  if (!isOpen) return null;

  const vars = contract.variables || {};
  const profil = contract.profil;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Aperçu du contrat
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {profil ? `${profil.prenom} ${profil.nom}` : 'Salarié'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gray-50">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-8 max-w-3xl mx-auto">
            {/* En-tête du contrat */}
            <div className="text-center mb-8 pb-6 border-b-2 border-blue-600">
              <h1 className="text-2xl font-bold text-blue-600 mb-2">
                {contract.modeles_contrats?.nom || 'CONTRAT DE TRAVAIL'}
              </h1>
              <p className="text-gray-600">
                Type de contrat : <span className="font-semibold">{contract.modeles_contrats?.type_contrat || 'CDI'}</span>
              </p>
            </div>

            {/* Parties */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">ENTRE LES SOUSSIGNÉS :</h2>

              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-3">
                <p className="font-semibold text-gray-800">L'Employeur : PARC SYNC</p>
                <p className="text-gray-600">Représenté par : [Nom du représentant]</p>
              </div>

              <p className="text-center text-gray-600 font-semibold my-3">ET</p>

              <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
                <p className="font-semibold text-gray-800">
                  Le Salarié : {profil ? `${profil.prenom} ${profil.nom}` : '[Nom du salarié]'}
                </p>
                {profil?.email && (
                  <p className="text-gray-600">Email : {profil.email}</p>
                )}
              </div>
            </div>

            {/* Informations principales */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">INFORMATIONS DU CONTRAT</h2>

              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="bg-gray-100 p-3 font-semibold w-1/3">Poste</td>
                    <td className="p-3">{vars.poste || '[Poste à définir]'}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="bg-gray-100 p-3 font-semibold">Date de début</td>
                    <td className="p-3">
                      {vars.date_debut ? new Date(vars.date_debut).toLocaleDateString('fr-FR') : '[Date à définir]'}
                    </td>
                  </tr>
                  {vars.date_fin && (
                    <tr className="border-b border-gray-300">
                      <td className="bg-gray-100 p-3 font-semibold">Date de fin</td>
                      <td className="p-3">
                        {new Date(vars.date_fin).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-300">
                    <td className="bg-gray-100 p-3 font-semibold">Durée hebdomadaire</td>
                    <td className="p-3">{vars.heures_semaine || '35'} heures</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="bg-gray-100 p-3 font-semibold">Salaire brut mensuel</td>
                    <td className="p-3 font-semibold text-green-700">
                      {vars.salaire ? `${parseFloat(vars.salaire).toLocaleString()} €` : '[Salaire à définir]'}
                    </td>
                  </tr>
                  {vars.periode_essai && (
                    <tr className="border-b border-gray-300">
                      <td className="bg-gray-100 p-3 font-semibold">Période d'essai</td>
                      <td className="p-3">{vars.periode_essai}</td>
                    </tr>
                  )}
                  {vars.lieu_travail && (
                    <tr className="border-b border-gray-300">
                      <td className="bg-gray-100 p-3 font-semibold">Lieu de travail</td>
                      <td className="p-3">{vars.lieu_travail}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Note */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
              <div className="flex items-start">
                <FileText className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800">Aperçu simplifié</p>
                  <p className="text-sm text-gray-600">
                    Ceci est un aperçu des informations du contrat. Le PDF complet contient tous les articles et clauses légales.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {onDownloadPdf && (
              <button
                onClick={onDownloadPdf}
                className="flex items-center gap-2 px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Télécharger PDF
              </button>
            )}

            {onSendEmail && profil?.email && (
              <button
                onClick={onSendEmail}
                className="flex items-center gap-2 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Envoyer par email
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
