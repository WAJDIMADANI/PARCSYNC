import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, FileText, Search, User, Send } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import MissingDocumentsReminderModal from './MissingDocumentsReminderModal';

interface MissingDocumentData {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  poste: string | null;
  site_id: string | null;
  nom_site: string | null;
  documents_manquants: string[];
}

interface MissingDocumentsProps {
  onNavigate?: (view: string, params?: any) => void;
}

const DOCUMENT_LABELS: Record<string, string> = {
  permis_recto: 'Permis de conduire',
  certificat_medical: 'Certificat médical',
  cni_recto: 'Carte d\'identité',
  carte_vitale: 'Carte vitale',
  rib: 'RIB'
};

export function MissingDocuments({ onNavigate }: MissingDocumentsProps) {
  const [salaries, setSalaries] = useState<MissingDocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSalarie, setSelectedSalarie] = useState<MissingDocumentData | null>(null);

  useEffect(() => {
    fetchMissingDocuments();

    const channel = supabase
      .channel('document-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document' }, () => {
        fetchMissingDocuments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMissingDocuments = async () => {
    try {
      const { data, error } = await supabase.rpc('get_missing_documents_by_salarie');

      if (error) throw error;

      console.log('📊 DEBUG - Données brutes reçues:', data);
      console.log('📊 DEBUG - Nombre de salariés:', data?.length);
      if (data && data.length > 0) {
        console.log('📊 DEBUG - Premier salarié:', data[0]);
        console.log('📊 DEBUG - Clés du premier salarié:', Object.keys(data[0]));
      }

      setSalaries(data || []);
    } catch (error) {
      console.error('Erreur chargement documents manquants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = (salarie: MissingDocumentData) => {
    console.log('🔍 DEBUG - Salarié sélectionné:', salarie);
    console.log('🔍 DEBUG - ID du salarié:', salarie.id);
    console.log('🔍 DEBUG - Type de l\'ID:', typeof salarie.id);
    console.log('🔍 DEBUG - Toutes les clés:', Object.keys(salarie));

    if (!salarie.id) {
      alert('❌ ERREUR: L\'ID du salarié est manquant dans les données SQL!\n\nVérifiez que la fonction SQL get_missing_documents_by_salarie() retourne bien la colonne "id".');
      return;
    }

    setSelectedSalarie(salarie);
    setShowModal(true);
  };

  const handleReminderSuccess = () => {
    fetchMissingDocuments();
  };

  const filteredSalaries = salaries.filter(s => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      s.nom?.toLowerCase().includes(searchLower) ||
      s.prenom?.toLowerCase().includes(searchLower) ||
      s.email?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des documents manquants..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-600" />
          Documents manquants par salarié
        </h1>
        <p className="text-gray-600 mt-2">
          Liste des salariés actifs auxquels il manque un ou plusieurs documents obligatoires
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredSalaries.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm ? 'Aucun résultat' : 'Félicitations !'}
          </h3>
          <p className="text-gray-600">
            {searchTerm
              ? 'Aucun salarié ne correspond à votre recherche'
              : 'Tous les salariés actifs ont leurs documents obligatoires'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salarié
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Poste
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documents manquants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSalaries.map((salarie) => (
                  <tr key={salarie.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {salarie.prenom} {salarie.nom}
                          </div>
                          <div className="text-sm text-gray-500">{salarie.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {salarie.poste || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {salarie.nom_site || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {salarie.documents_manquants.map((doc) => (
                          <span
                            key={doc}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {DOCUMENT_LABELS[doc] || doc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNavigate?.('rh/salaries', { profilId: salarie.id })}
                          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <User className="w-4 h-4" />
                          Voir le profil
                        </button>
                        <button
                          onClick={() => handleSendReminder(salarie)}
                          className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center gap-1 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          Envoyer rappel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-bold text-red-700">{filteredSalaries.length}</span> salarié
              {filteredSalaries.length > 1 ? 's' : ''} avec des documents manquants
            </p>
          </div>
        </div>
      )}

      {showModal && selectedSalarie && (
        <MissingDocumentsReminderModal
          profilId={selectedSalarie.id}
          employeeName={`${selectedSalarie.prenom} ${selectedSalarie.nom}`}
          employeeEmail={selectedSalarie.email}
          missingDocuments={selectedSalarie.documents_manquants}
          onClose={() => {
            setShowModal(false);
            setSelectedSalarie(null);
          }}
          onSuccess={handleReminderSuccess}
        />
      )}
    </div>
  );
}
