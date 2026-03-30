import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, X, Calendar, Clock, FileText, Download, Upload, Trash2, CheckCircle, PauseCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Pagination } from './Pagination';

interface AREvent {
  id: string;
  profil_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  poste: string | null;
  kind: 'absence' | 'retard';
  date_debut: string;
  date_fin: string | null;
  retard_minutes: number | null;
  is_justified: boolean;
  note: string | null;
  justificatif_file_path: string | null;
  created_at: string;
}

interface Employee {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
}

interface ComptabiliteARTabProps {
  focusArEventId?: string;
}

export default function ComptabiliteARTab({ focusArEventId }: ComptabiliteARTabProps) {
  const [events, setEvents] = useState<AREvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AREvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [searchingEmployees, setSearchingEmployees] = useState(false);
  const employeeSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    ar_type: 'RETARD' as 'ABSENCE' | 'RETARD',
    start_date: '',
    end_date: '',
    retard_minutes: 0,
    isJustified: false,
    note: '',
  });
  const [justificatifFile, setJustificatifFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [showClotureModal, setShowClotureModal] = useState(false);
  const [showProlongerModal, setShowProlongerModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AREvent | null>(null);
  const [clotureData, setClotureData] = useState({ date_reprise: '', note: '' });
  const [prolongerData, setProlongerData] = useState({ nouvelle_date_fin: '', note: '' });

  useEffect(() => {
    loadEvents();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, startDateFilter, endDateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDateFilter, endDateFilter]);

  // Gérer le focus sur un événement spécifique depuis l'Inbox
  useEffect(() => {
    if (focusArEventId && filteredEvents.length > 0 && !loading) {
      const eventIndex = filteredEvents.findIndex(e => e.id === focusArEventId);

      if (eventIndex !== -1) {
        // Calculer la page contenant l'événement
        const targetPage = Math.floor(eventIndex / itemsPerPage) + 1;
        setCurrentPage(targetPage);

        // Attendre que le DOM soit mis à jour, puis scroller et surligner
        setTimeout(() => {
          const element = document.querySelector(`[data-ar-event-id="${focusArEventId}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedEventId(focusArEventId);

            // Retirer le surlignage après 4 secondes
            setTimeout(() => {
              setHighlightedEventId(null);
            }, 4000);
          }
        }, 100);
      }
    }
  }, [focusArEventId, filteredEvents, loading]);

  useEffect(() => {
    if (employeeSearchTimeoutRef.current) {
      clearTimeout(employeeSearchTimeoutRef.current);
    }

    if (employeeSearch.length >= 1) {
      employeeSearchTimeoutRef.current = setTimeout(() => {
        searchEmployees(employeeSearch);
      }, 300);
    } else {
      setEmployees([]);
    }

    return () => {
      if (employeeSearchTimeoutRef.current) {
        clearTimeout(employeeSearchTimeoutRef.current);
      }
    };
  }, [employeeSearch]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('v_compta_ar_v2')
        .select('*')
        .order('date_debut', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading A&R events:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchEmployees = async (searchTerm: string) => {
    try {
      setSearchingEmployees(true);
      const search = searchTerm.trim();

      const { data, error } = await supabase
        .from('profil')
        .select('id, matricule_tca, nom, prenom')
        .eq('role', 'salarie')
        .or(`matricule_tca.ilike.%${search}%,nom.ilike.%${search}%,prenom.ilike.%${search}%`)
        .order('nom')
        .limit(20);

      if (error) throw error;

      const results = (data || []).map(emp => ({
        id: emp.id,
        matricule: emp.matricule_tca || '',
        nom: emp.nom,
        prenom: emp.prenom
      }));

      setEmployees(results);

      if (results.length === 1 && search.toLowerCase() === results[0].matricule.toLowerCase()) {
        setSelectedEmployee(results[0]);
        setEmployeeSearch('');
        setShowEmployeeDropdown(false);
      }
    } catch (error) {
      console.error('Error searching employees:', error);
      setEmployees([]);
    } finally {
      setSearchingEmployees(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.matricule?.toLowerCase().includes(search) ||
          e.nom?.toLowerCase().includes(search) ||
          e.prenom?.toLowerCase().includes(search)
      );
    }

    if (startDateFilter) {
      filtered = filtered.filter((e) => e.date_debut >= startDateFilter);
    }

    if (endDateFilter) {
      filtered = filtered.filter((e) => e.date_debut <= endDateFilter);
    }

    setFilteredEvents(filtered);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      setSaving(true);

      if (formData.ar_type === 'RETARD') {
        const minutes = parseInt(String(formData.retard_minutes), 10);
        if (isNaN(minutes) || minutes <= 0) {
          alert('Erreur: Minutes > 0 obligatoire pour un retard');
          setSaving(false);
          return;
        }
      }

      let justificatif_path = null;
      if (justificatifFile) {
        const fileExt = justificatifFile.name.split('.').pop();
        const fileName = `${selectedEmployee.id}_${Date.now()}.${fileExt}`;
        const filePath = `ar-justificatifs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, justificatifFile);

        if (uploadError) throw uploadError;
        justificatif_path = filePath;
      }

      const eventData: any = {
        profil_id: selectedEmployee.id,
        kind: formData.ar_type.toLowerCase(),
        start_date: formData.start_date,
        is_justified: formData.isJustified,
        justification_note: formData.note || null,
        justificatif_file_path: justificatif_path,
      };

      if (formData.ar_type === 'RETARD') {
        const minutes = parseInt(String(formData.retard_minutes), 10);
        eventData.retard_minutes = minutes;
        eventData.end_date = formData.start_date;
      } else {
        eventData.end_date = formData.end_date;
        eventData.retard_minutes = null;
      }

      const { error } = await supabase
        .from('compta_ar_events')
        .insert([eventData]);

      if (error) throw error;

      setShowModal(false);
      resetForm();
      loadEvents();
    } catch (error: any) {
      console.error('Error creating A&R event:', error);
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
      ar_type: 'RETARD',
      start_date: '',
      end_date: '',
      retard_minutes: 0,
      isJustified: false,
      note: '',
    });
    setJustificatifFile(null);
  };

  const downloadJustificatif = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
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

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet événement ?')) return;

    try {
      const { error } = await supabase
        .from('compta_ar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadEvents();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const exportToExcel = async () => {
    try {
      const { data, error } = await supabase
        .from('v_compta_ar_v2')
        .select('*')
        .order('date_debut', { ascending: false });

      if (error) throw error;

      const exportData = (data || []).map((e: any) => ({
        Matricule: e.matricule,
        Nom: e.nom,
        Prénom: e.prenom,
        Poste: e.poste || '',
        Type: e.kind?.toUpperCase() || '',
        'Date début': e.date_debut,
        'Date fin': e.date_fin || '',
        'Minutes de retard': e.retard_minutes || '',
        'Heures de retard': e.retard_minutes ? (e.retard_minutes / 60).toFixed(2) : '',
        Justifié: e.is_justified ? 'OUI' : 'NON',
        Note: e.note || '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'A&R');
      XLSX.writeFile(wb, `absences_retards_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error: any) {
      console.error('Error exporting to Excel:', error);
      alert('Erreur lors de l\'export: ' + error.message);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const handleCloturer = (event: AREvent) => {
    setSelectedEvent(event);
    setClotureData({ date_reprise: new Date().toISOString().split('T')[0], note: '' });
    setShowClotureModal(true);
  };

  const handleProlonger = (event: AREvent) => {
    setSelectedEvent(event);
    setProlongerData({ nouvelle_date_fin: event.date_fin || '', note: '' });
    setShowProlongerModal(true);
  };

  const submitCloturer = async () => {
    if (!selectedEvent || !clotureData.date_reprise) {
      alert('Veuillez renseigner la date de reprise');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('compta_ar_events')
        .update({
          end_date: clotureData.date_reprise,
          justification_note: clotureData.note || null
        })
        .eq('id', selectedEvent.id);

      if (error) throw error;

      setShowClotureModal(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (error: any) {
      console.error('Error closing absence:', error);
      alert('Erreur lors de la clôture: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const submitProlonger = async () => {
    if (!selectedEvent || !prolongerData.nouvelle_date_fin) {
      alert('Veuillez renseigner la nouvelle date de fin');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('compta_ar_events')
        .update({
          end_date: prolongerData.nouvelle_date_fin,
          justification_note: prolongerData.note || null
        })
        .eq('id', selectedEvent.id);

      if (error) throw error;

      setShowProlongerModal(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (error: any) {
      console.error('Error extending absence:', error);
      alert('Erreur lors de la prolongation: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Absences & Retards</h2>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Exporter Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nouveau
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher un salarié
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tapez un matricule, nom ou prénom pour rechercher..."
                className="w-full pl-12 pr-12 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Effacer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            {searchTerm && (
              <p className="mt-2 text-sm text-blue-600">
                {filteredEvents.length} résultat{filteredEvents.length > 1 ? 's' : ''} trouvé{filteredEvents.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrer par date début
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrer par date fin
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {(startDateFilter || endDateFilter) && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-600">
                Filtres de date actifs
              </p>
              <button
                onClick={() => {
                  setStartDateFilter('');
                  setEndDateFilter('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date début
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date fin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durée
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Justifié
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Note
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedEvents.map((event) => (
                  <tr
                    key={event.id}
                    data-ar-event-id={event.id}
                    className={`hover:bg-gray-50 transition-colors duration-300 ${
                      highlightedEventId === event.id
                        ? 'bg-gradient-to-r from-orange-100 via-amber-100 to-orange-100 shadow-lg scale-105'
                        : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.matricule}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.prenom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          event.kind === 'absence'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {event.kind.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(event.date_debut)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.date_fin ? formatDate(event.date_fin) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.kind === 'retard'
                        ? `${event.retard_minutes} min (${(event.retard_minutes! / 60).toFixed(2)}h)`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          event.is_justified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {event.is_justified ? 'OUI' : 'NON'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={event.note || ''}>
                      {event.note || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        {event.kind === 'absence' && (
                          <>
                            <button
                              onClick={() => handleCloturer(event)}
                              className="text-green-600 hover:text-green-900"
                              title="Clôturer l'absence"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleProlonger(event)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Prolonger l'absence"
                            >
                              <PauseCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {event.justificatif_file_path && (
                          <button
                            onClick={() => downloadJustificatif(event.justificatif_file_path!)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Télécharger le justificatif"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
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
          {filteredEvents.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Aucun événement trouvé
            </div>
          )}
          {filteredEvents.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredEvents.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {showClotureModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                Clôturer l'absence
              </h3>
              <button
                onClick={() => {
                  setShowClotureModal(false);
                  setSelectedEvent(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Salarié</p>
                <p className="font-semibold text-gray-900">
                  {selectedEvent.matricule} - {selectedEvent.nom} {selectedEvent.prenom}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de reprise effective *
                </label>
                <input
                  type="date"
                  value={clotureData.date_reprise}
                  onChange={(e) => setClotureData({ ...clotureData, date_reprise: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (optionnelle)
                </label>
                <textarea
                  value={clotureData.note}
                  onChange={(e) => setClotureData({ ...clotureData, note: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Commentaire sur la reprise..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowClotureModal(false);
                    setSelectedEvent(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={submitCloturer}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Enregistrement...' : 'Clôturer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProlongerModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <PauseCircle className="w-6 h-6 text-orange-600" />
                Prolonger l'absence
              </h3>
              <button
                onClick={() => {
                  setShowProlongerModal(false);
                  setSelectedEvent(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Salarié</p>
                <p className="font-semibold text-gray-900">
                  {selectedEvent.matricule} - {selectedEvent.nom} {selectedEvent.prenom}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouvelle date de fin *
                </label>
                <input
                  type="date"
                  value={prolongerData.nouvelle_date_fin}
                  onChange={(e) => setProlongerData({ ...prolongerData, nouvelle_date_fin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (optionnelle)
                </label>
                <textarea
                  value={prolongerData.note}
                  onChange={(e) => setProlongerData({ ...prolongerData, note: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Raison de la prolongation..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowProlongerModal(false);
                    setSelectedEvent(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={submitProlonger}
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Enregistrement...' : 'Prolonger'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">
                Nouvel événement A&R
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salarié *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={
                      selectedEmployee
                        ? `${selectedEmployee.matricule} - ${selectedEmployee.nom.toUpperCase()} ${selectedEmployee.prenom}`
                        : employeeSearch
                    }
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value);
                      setSelectedEmployee(null);
                      setShowEmployeeDropdown(true);
                    }}
                    onFocus={() => {
                      if (employeeSearch && !selectedEmployee) {
                        setShowEmployeeDropdown(true);
                      }
                    }}
                    placeholder="Tapez un matricule, nom ou prénom (min. 1 caractère)..."
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {searchingEmployees && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {selectedEmployee && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(null);
                        setEmployeeSearch('');
                        setEmployees([]);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Effacer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {showEmployeeDropdown && employees.length > 0 && !selectedEmployee && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {employees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setEmployeeSearch('');
                            setShowEmployeeDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-gray-900">
                            {emp.matricule} - {emp.nom.toUpperCase()} {emp.prenom}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {!searchingEmployees && employeeSearch && employees.length === 0 && showEmployeeDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
                      Aucun salarié trouvé
                    </div>
                  )}
                </div>
                {employeeSearch && employeeSearch.length < 1 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Tapez au moins 1 caractère pour rechercher
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="RETARD"
                      checked={formData.ar_type === 'RETARD'}
                      onChange={(e) =>
                        setFormData({ ...formData, ar_type: e.target.value as 'RETARD' })
                      }
                      className="mr-2"
                    />
                    Retard
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="ABSENCE"
                      checked={formData.ar_type === 'ABSENCE'}
                      onChange={(e) =>
                        setFormData({ ...formData, ar_type: e.target.value as 'ABSENCE' })
                      }
                      className="mr-2"
                    />
                    Absence
                  </label>
                </div>
              </div>

              {formData.ar_type === 'RETARD' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Durée du retard (minutes) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.retard_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          retard_minutes: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Soit {(formData.retard_minutes / 60).toFixed(2)} heure(s)
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date début *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date fin *
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isJustified}
                    onChange={(e) =>
                      setFormData({ ...formData, isJustified: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Justifié</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Note additionnelle..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Justificatif
                </label>
                <input
                  type="file"
                  onChange={(e) => setJustificatifFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedEmployee}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
