import { Download, FileText, Calendar } from 'lucide-react';

export function ParcExports() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Exports Parc</h1>
        <p className="text-gray-600 mt-1">Exportez vos données de parc automobile</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Liste des véhicules</h3>
              <p className="text-sm text-gray-600">Export complet du parc</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Exportez la liste complète de vos véhicules avec toutes les informations : immatriculation, marque, modèle, kilométrage, statut, etc.
          </p>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Download className="w-5 h-5" />
            Exporter en CSV
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">CT & Assurances</h3>
              <p className="text-sm text-gray-600">Documents et échéances</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Exportez tous les contrôles techniques et assurances avec leurs dates d'expiration pour un suivi optimal.
          </p>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
            <Download className="w-5 h-5" />
            Exporter en CSV
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <FileText className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Historique maintenance</h3>
              <p className="text-sm text-gray-600">Interventions et coûts</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Exportez l'historique complet des maintenances, réparations et entretiens avec les coûts associés.
          </p>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
            <Download className="w-5 h-5" />
            Exporter en CSV
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Rapport mensuel</h3>
              <p className="text-sm text-gray-600">Synthèse complète</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Générez un rapport mensuel complet incluant véhicules, documents, maintenances et statistiques.
          </p>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            <Download className="w-5 h-5" />
            Générer le rapport
          </button>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Format des exports</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Fichiers CSV compatibles Excel et Google Sheets</li>
          <li>• Encodage UTF-8 pour les caractères spéciaux</li>
          <li>• Séparateur : point-virgule (;)</li>
          <li>• Date du jour incluse dans le nom du fichier</li>
        </ul>
      </div>
    </div>
  );
}
