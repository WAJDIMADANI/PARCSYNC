import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';
import { X } from 'lucide-react';

interface EmployeeProfileModalProps {
  employeeId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export function EmployeeProfileModal({ employeeId, onClose, onUpdate }: EmployeeProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployeeData();
  }, [employeeId]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger l'employé
      const { data: employeeData, error: employeeError } = await supabase
        .from('profil')
        .select(`
          *,
          site:site_id(id, nom),
          secteur:secteur_id(id, nom),
          manager:manager_id(prenom, nom)
        `)
        .eq('id', employeeId)
        .single();

      if (employeeError) throw employeeError;
      if (!employeeData) throw new Error('Employé non trouvé');

      setEmployee(employeeData);

      // Charger les contrats
      const { data: contractsData, error: contractsError } = await supabase
        .from('contrat')
        .select('*')
        .eq('profil_id', employeeId)
        .order('date_debut', { ascending: false });

      if (contractsError) throw contractsError;
      setContracts(contractsData || []);

    } catch (err: any) {
      console.error('Erreur lors du chargement du profil:', err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    if (onUpdate) {
      onUpdate();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-600">Erreur</h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-700">{error || 'Employé non trouvé'}</p>
          <button
            onClick={handleClose}
            className="mt-4 w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  // Afficher les informations de base de l'employé
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            Profil de {employee.prenom} {employee.nom}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informations personnelles */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Informations personnelles</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{employee.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Téléphone</p>
                <p className="font-medium">{employee.tel || 'Non renseigné'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Matricule TCA</p>
                <p className="font-medium">{employee.matricule_tca || 'Non renseigné'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Poste</p>
                <p className="font-medium">{employee.poste || 'Non renseigné'}</p>
              </div>
              {employee.site && (
                <div>
                  <p className="text-sm text-gray-600">Site</p>
                  <p className="font-medium">{employee.site.nom}</p>
                </div>
              )}
              {employee.secteur && (
                <div>
                  <p className="text-sm text-gray-600">Secteur</p>
                  <p className="font-medium">{employee.secteur.nom}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contrats */}
          {contracts.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Contrats ({contracts.length})</h3>
              <div className="space-y-2">
                {contracts.map((contract) => (
                  <div key={contract.id} className="bg-white rounded p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{contract.type_contrat}</p>
                        <p className="text-sm text-gray-600">
                          {contract.date_debut ? new Date(contract.date_debut).toLocaleDateString('fr-FR') : '-'}
                          {' → '}
                          {contract.date_fin ? new Date(contract.date_fin).toLocaleDateString('fr-FR') : 'CDI'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        contract.statut === 'actif' || contract.statut === 'signe'
                          ? 'bg-green-100 text-green-800'
                          : contract.statut === 'en_attente'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {contract.statut}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="text-sm text-gray-500 text-center">
            Pour voir les détails complets et modifier le profil, utilisez la liste des salariés.
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-medium transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
