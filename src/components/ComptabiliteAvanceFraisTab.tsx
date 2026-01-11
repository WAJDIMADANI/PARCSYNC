import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, X, Download, Upload, Trash2, FileText, Send } from 'lucide-react';
import * as XLSX from 'xlsx';
import { RequestAvanceFraisValidationModal } from './RequestAvanceFraisValidationModal';
import { SuccessNotification } from './SuccessNotification';

interface AvanceFrais {
  id: string;
  profil_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  motif: string;
  montant: number;
  facture: 'A_FOURNIR' | 'TRANSMIS' | 'RECU';
  facture_file_path: string | null;
  date_demande: string | null;
  statut: 'en_attente' | 'validee' | 'refusee' | null;
  commentaire_validation: string | null;
  valide_par: string | null;
  date_validation: string | null;
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
}

export default function ComptabiliteAvanceFraisTab() {
  const [records, setRecords] = useState<AvanceFrais[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AvanceFrais[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const employeeSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    motif: '',
    montant: '',
    facture: 'A_FOURNIR' as 'A_FOURNIR' | 'TRANSMIS' | 'RECU',
  });

  const [justificatifFile, setJustificatifFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedAvanceForValidation, setSelectedAvanceForValidation] = useState<AvanceFrais | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, startDateFilter, endDateFilter]);

  useEffect(() => {
    if (employeeSearch.length >= 2) {
      searchEmployees(employeeSearch);
    } else {
      setEmployees([]);
      setShowEmployeeDropdown(false);
    }
  }, [employeeSearch]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('v_compta_avance_frais')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error loading avance frais records:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchEmployees = async (searchTerm: string) => {
    try {
      const { data, error } = await supabase
        .from('profil')
        .select('id, matricule_tca, nom, prenom')
        .or(`matricule_tca.ilike.%${searchTerm}%,nom.ilike.%${searchTerm}%,prenom.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setEmployees(
        (data || []).map((p: any) => ({
          id: p.id,
          matricule: p.matricule_tca,
          nom: p.nom,
          prenom: p.prenom,
        }))
      );
      setShowEmployeeDropdown(true);
    } catch (error) {
      console.error('Error searching employees:', error);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.matricule?.toLowerCase().includes(search) ||
          r.nom?.toLowerCase().includes(search) ||
          r.prenom?.toLowerCase().includes(search) ||
          r.motif?.toLowerCase().includes(search)
      );
    }

    if (startDateFilter) {
      filtered = filtered.filter((r) => r.created_at >= startDateFilter);
    }

    if (endDateFilter) {
      filtered = filtered.filter((r) => r.created_at <= endDateFilter);
    }

    setFilteredRecords(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      setSaving(true);

      const insertPayload: any = {
        profil_id: selectedEmployee.id,
        motif: formData.motif,
        montant: parseFloat(formData.montant),
        facture: formData.facture,
        facture_file_path: null,
        statut: null,
        date_demande: null,
      };

      const { data: insertData, error: insertError } = await supabase
        .from('compta_avance_frais')
        .insert([insertPayload])
        .select('id')
        .single();

      if (insertError) throw insertError;

      const recordId = insertData.id;

      let facture_file_path = null;
      if (justificatifFile) {
        const fileExt = justificatifFile.name.split('.').pop();
        const timestamp = Date.now();
        const fileName = `${recordId}_${timestamp}_${justificatifFile.name}`;
        const filePath = `avance-frais/${selectedEmployee.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('compta-avance-frais')
          .upload(filePath, justificatifFile);

        if (uploadError) throw uploadError;
        facture_file_path = filePath;

        const { error: updateError } = await supabase
          .from('compta_avance_frais')
          .update({ facture_file_path })
          .eq('id', recordId);

        if (updateError) throw updateError;
      }

      setShowModal(false);
      resetForm();
      loadRecords();
      setShowSuccessMessage(true);
    } catch (error: any) {
      console.error('Error creating avance frais:', error);
      alert('Erreur lors de la création: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployee(null);
    setEmployeeSearch('');
    setEmployees([]);
    setShowEmployeeDropdown(false);
    setFormData({
      motif: '',
      montant: '',
      facture: 'A_FOURNIR',
    });
    setJustificatifFile(null);
  };

  const downloadJustificatif = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('compta-avance-frais')
        .createSignedUrl(path, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Error downloading justificatif:', error);
      alert('Erreur lors du téléchargement: ' + error.message);
    }
  };

  const handleDelete = async (id: string, statut: string | null) => {
    if (statut === 'validee' || statut === 'refusee') {
      alert('Impossible de supprimer une avance validée ou refusée');
      return;
    }

    if (!confirm('Supprimer cette avance de frais ?')) return;

    try {
      const { error } = await supabase
        .from('compta_avance_frais')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadRecords();
    } catch (error: any) {
      console.error('Error deleting record:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleRequestValidation = (record: AvanceFrais) => {
    setSelectedAvanceForValidation(record);
    setShowValidationModal(true);
  };

  const exportToExcel = () => {
    const exportData = filteredRecords.map((r) => ({
      NOM: r.nom,
      PRENOM: r.prenom,
      MOTIF: r.motif,
      MONTANT: r.montant,
      FACTURE: r.facture,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Avance de frais');
    XLSX.writeFile(wb, `avance_frais_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const selectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEmployeeSearch(`${emp.matricule} - ${emp.nom} ${emp.prenom}`);
    setShowEmployeeDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        employeeSearchRef.current &&
        !employeeSearchRef.current.contains(event.target as Node)
      ) {
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Avance de frais</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestion des avances de frais des salariés
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Nouveau
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher (matricule, nom, prénom, motif)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Date début"
            />
          </div>
          <div>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Date fin"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matricule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prénom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motif
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Facture
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.matricule}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.prenom}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {record.motif}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.montant.toFixed(2)} €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          record.facture === 'RECU'
                            ? 'bg-green-100 text-green-800'
                            : record.facture === 'TRANSMIS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {record.facture === 'A_FOURNIR'
                          ? 'À fournir'
                          : record.facture === 'TRANSMIS'
                          ? 'Transmis'
                          : 'Reçu'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!record.statut ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Brouillon
                        </span>
                      ) : record.statut === 'en_attente' ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          En attente
                        </span>
                      ) : record.statut === 'validee' ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Validée
                        </span>
                      ) : record.statut === 'refusee' ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Refusée
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.facture_file_path && (
                        <button
                          onClick={() => downloadJustificatif(record.facture_file_path!)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Télécharger le document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        {!record.statut && (
                          <button
                            onClick={() => handleRequestValidation(record)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Demander validation"
                          >
                            <Send className="w-4 h-4" />
                            <span className="text-xs font-medium">Demander validation</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(record.id, record.statut)}
                          disabled={record.statut === 'validee' || record.statut === 'refusee'}
                          className={`${
                            record.statut === 'validee' || record.statut === 'refusee'
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-900'
                          }`}
                          title={
                            record.statut === 'validee' || record.statut === 'refusee'
                              ? 'Impossible de supprimer'
                              : 'Supprimer'
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredRecords.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            Aucune avance de frais trouvée
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Nouvelle avance de frais
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salarié *
                </label>
                <div className="relative">
                  <input
                    ref={employeeSearchRef}
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value);
                      if (!e.target.value) setSelectedEmployee(null);
                    }}
                    placeholder="Rechercher par matricule, nom ou prénom..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  {showEmployeeDropdown && employees.length > 0 && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {employees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => selectEmployee(emp)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100"
                        >
                          <div className="font-medium">
                            {emp.matricule} - {emp.nom} {emp.prenom}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motif *
                </label>
                <textarea
                  value={formData.motif}
                  onChange={(e) =>
                    setFormData({ ...formData, motif: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.montant}
                  onChange={(e) =>
                    setFormData({ ...formData, montant: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facture *
                </label>
                <select
                  value={formData.facture}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      facture: e.target.value as 'A_FOURNIR' | 'TRANSMIS' | 'RECU',
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="A_FOURNIR">À fournir</option>
                  <option value="TRANSMIS">Transmis</option>
                  <option value="RECU">Reçu</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Justificatif (PDF, JPG, PNG)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer">
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {justificatifFile
                        ? justificatifFile.name
                        : 'Choisir un fichier'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) =>
                        setJustificatifFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                    />
                  </label>
                  {justificatifFile && (
                    <button
                      type="button"
                      onClick={() => setJustificatifFile(null)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedEmployee}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showValidationModal && selectedAvanceForValidation && (
        <RequestAvanceFraisValidationModal
          avanceFraisId={selectedAvanceForValidation.id}
          avanceInfo={{
            matricule: selectedAvanceForValidation.matricule,
            nom: selectedAvanceForValidation.nom,
            prenom: selectedAvanceForValidation.prenom,
            motif: selectedAvanceForValidation.motif,
            montant: selectedAvanceForValidation.montant,
          }}
          onClose={() => {
            setShowValidationModal(false);
            setSelectedAvanceForValidation(null);
          }}
          onSuccess={() => {
            loadRecords();
          }}
        />
      )}

      {showSuccessMessage && (
        <SuccessNotification
          message="Avance de frais créée avec succès. Vous pouvez maintenant demander sa validation."
          onClose={() => setShowSuccessMessage(false)}
        />
      )}
    </div>
  );
}
