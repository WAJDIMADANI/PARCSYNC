import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PermissionGuard } from './PermissionGuard';
import { Phone, Search, X, Save, AlertCircle, Clock, CheckCircle, Edit2, Filter, User, History, ArrowRight, Eye, CheckSquare } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { RequestValidationModal } from './RequestValidationModal';
import { Pagination } from './Pagination';

interface Profil {
  id: string;
  nom: string;
  prenom: string;
  tel: string | null;
  email: string;
  matricule_tca: string | null;
}

interface Demande {
  id: string;
  profil_id: string | null;
  nom_salarie: string | null;
  prenom_salarie: string | null;
  tel_salarie: string | null;
  matricule_salarie: string | null;
  email_salarie: string | null;
  type_demande: string;
  description: string;
  priorite: 'normale' | 'urgente';
  statut: 'en_attente' | 'en_cours' | 'traitee';
  created_by: string;
  created_at: string;
  assigned_to: string | null;
  treated_by: string | null;
  treated_at: string | null;
  notes_resolution: string | null;
  profil?: Profil;
  creator?: { nom: string; prenom: string };
  treater?: { nom: string; prenom: string };
}

const TYPES_DEMANDE = [
  'Attestation de travail',
  'Relevé de salaire',
  'Information congés',
  'Envoi contrat',
  'Envoi visite médicale obligatoire',
  'Autre',
];

export function DemandesPage() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState<Demande | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profil[]>([]);
  const [selectedProfil, setSelectedProfil] = useState<Profil | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('');
  const [filterPriorite, setFilterPriorite] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    profil_id: null as string | null,
    nom_salarie: '',
    prenom_salarie: '',
    tel_salarie: '',
    email_salarie: '',
    matricule_salarie: '',
    type_demande: TYPES_DEMANDE[0],
    description: '',
    priorite: 'normale' as 'normale' | 'urgente',
  });

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NOUVEAUX STATES - Historique Salarié
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProfilForHistory, setSelectedProfilForHistory] = useState<Profil | null>(null);
  const [employeeHistory, setEmployeeHistory] = useState<Demande[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // NOUVEAUX STATES - Confirmation Statut
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{demandeId: string, demande: Demande, oldStatut: string, newStatut: string} | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchDemandes();

    const channel = supabase
      .channel('demandes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demande_standard' }, () => {
        fetchDemandes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDemandes = async () => {
    try {
      const { data, error } = await supabase
        .from('demande_standard')
        .select(`
          *,
          profil:profil_id(id, nom, prenom, tel, email, matricule_tca),
          creator:created_by(nom, prenom),
          treater:treated_by(nom, prenom)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDemandes(data || []);
    } catch (err: any) {
      console.error('Error fetching demandes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchProfils = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profil')
        .select('id, nom, prenom, tel, email, matricule_tca')
        .or(`nom.ilike.%${query}%,prenom.ilike.%${query}%,tel.ilike.%${query}%,matricule_tca.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err: any) {
      console.error('Error searching profils:', err);
    }
  };

  const selectProfil = (profil: Profil) => {
    setSelectedProfil(profil);
    setFormData({
      ...formData,
      profil_id: profil.id,
      nom_salarie: profil.nom,
      prenom_salarie: profil.prenom,
      tel_salarie: profil.tel || '',
      email_salarie: profil.email,
      matricule_salarie: profil.matricule_tca || '',
    });
    setSearchResults([]);
    setSearchTerm('');
  };

  const clearSelection = () => {
    setSelectedProfil(null);
    setFormData({
      ...formData,
      profil_id: null,
      nom_salarie: '',
      prenom_salarie: '',
      tel_salarie: '',
      email_salarie: '',
      matricule_salarie: '',
    });
  };

  const handleCreateDemande = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const { data: appUserData } = await supabase
        .from('app_utilisateur')
        .select('id')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!appUserData) {
        throw new Error('Utilisateur non trouvé dans app_utilisateur');
      }

      const { error: insertError } = await supabase
        .from('demande_standard')
        .insert({
          profil_id: formData.profil_id,
          nom_salarie: formData.nom_salarie || null,
          prenom_salarie: formData.prenom_salarie || null,
          tel_salarie: formData.tel_salarie || null,
          email_salarie: formData.email_salarie || null,
          matricule_salarie: formData.matricule_salarie || null,
          type_demande: formData.type_demande,
          description: formData.description,
          priorite: formData.priorite,
          created_by: appUserData.id,
        });

      if (insertError) throw insertError;

      setShowCreateModal(false);
      resetForm();
      await fetchDemandes();
    } catch (err: any) {
      console.error('Error creating demande:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatut = async (demandeId: string, newStatut: 'en_attente' | 'en_cours' | 'traitee') => {
    try {
      const updates: any = { statut: newStatut };

      if (newStatut === 'traitee') {
        const { data: appUserData } = await supabase
          .from('app_utilisateur')
          .select('id')
          .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (appUserData) {
          updates.treated_by = appUserData.id;
          updates.treated_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('demande_standard')
        .update(updates)
        .eq('id', demandeId);

      if (error) throw error;
      await fetchDemandes();
    } catch (err: any) {
      console.error('Error updating statut:', err);
      setError(err.message);
    }
  };

  const saveNotes = async () => {
    if (!selectedDemande) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('demande_standard')
        .update({ notes_resolution: notes })
        .eq('id', selectedDemande.id);

      if (error) throw error;

      await fetchDemandes();
      setShowDetailsModal(false);
    } catch (err: any) {
      console.error('Error saving notes:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      profil_id: null,
      nom_salarie: '',
      prenom_salarie: '',
      tel_salarie: '',
      email_salarie: '',
      matricule_salarie: '',
      type_demande: TYPES_DEMANDE[0],
      description: '',
      priorite: 'normale',
    });
    setSelectedProfil(null);
    setSearchTerm('');
    setSearchResults([]);
  };

  const openDetails = (demande: Demande) => {
    setSelectedDemande(demande);
    setNotes(demande.notes_resolution || '');
    setShowDetailsModal(true);
  };

  const filteredDemandes = demandes.filter((d) => {
    if (filterStatut && d.statut !== filterStatut) return false;
    if (filterPriorite && d.priorite !== filterPriorite) return false;
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatut, filterPriorite]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDemandes = filteredDemandes.slice(startIndex, startIndex + itemsPerPage);

  const demandesEnAttente = demandes.filter((d) => d.statut === 'en_attente').length;

  // NOUVELLE FONCTION - Chargement historique
  const fetchEmployeeHistory = async (profilId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('demande_standard')
        .select(`
          *,
          creator:created_by(nom, prenom),
          treater:treated_by(nom, prenom)
        `)
        .eq('profil_id', profilId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployeeHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching employee history:', err);
      setError(err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  // NOUVELLE FONCTION - Ouverture modal historique
  const openEmployeeHistory = (profil: Profil) => {
    setSelectedProfilForHistory(profil);
    setShowHistoryModal(true);
    fetchEmployeeHistory(profil.id);
  };

  // NOUVELLE FONCTION - Fermeture modal historique
  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setSelectedProfilForHistory(null);
    setEmployeeHistory([]);
  };

  // NOUVELLE FONCTION - Demande de changement statut
  const handleStatusChangeRequest = (demande: Demande, newStatut: string) => {
    setPendingStatusChange({
      demandeId: demande.id,
      demande: demande,
      oldStatut: demande.statut,
      newStatut: newStatut
    });
    setShowStatusConfirmModal(true);
  };

  // NOUVELLE FONCTION - Confirmation changement
  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;

    setUpdatingStatus(true);
    try {
      await updateStatut(pendingStatusChange.demandeId, pendingStatusChange.newStatut as any);
      setShowStatusConfirmModal(false);
      setPendingStatusChange(null);
    } catch (err: any) {
      console.error('Error confirming status change:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // NOUVELLE FONCTION - Annulation changement
  const cancelStatusChange = () => {
    setShowStatusConfirmModal(false);
    setPendingStatusChange(null);
  };

  // Calculer les statistiques d'historique
  const historyStats = {
    total: employeeHistory.length,
    enAttente: employeeHistory.filter(d => d.statut === 'en_attente').length,
    enCours: employeeHistory.filter(d => d.statut === 'en_cours').length,
    traitees: employeeHistory.filter(d => d.statut === 'traitee').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Chargement des demandes..." />
      </div>
    );
  }

  return (
    <PermissionGuard permission="rh/demandes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Demandes Standardistes</h1>
            <p className="text-slate-600 mt-1">Gestion des demandes téléphoniques</p>
          </div>
          <div className="flex items-center gap-4">
            {demandesEnAttente > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-semibold text-red-700">
                  {demandesEnAttente} en attente
                </span>
              </div>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              <Filter className="w-5 h-5" />
              Filtres
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium"
            >
              <Phone className="w-5 h-5" />
              Nouvelle demande
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Statut
                </label>
                <select
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Tous</option>
                  <option value="en_attente">En attente</option>
                  <option value="en_cours">En cours</option>
                  <option value="traitee">Traitée</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Priorité
                </label>
                <select
                  value={filterPriorite}
                  onChange={(e) => setFilterPriorite(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Toutes</option>
                  <option value="normale">Normale</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Créé par</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Salarié</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Priorité</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Traité par</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedDemandes.map((demande) => (
                  <tr key={demande.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">
                        {new Date(demande.created_at).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(demande.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {demande.creator ? (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {demande.creator.prenom} {demande.creator.nom}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">Utilisateur inconnu</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {demande.profil ? (
                        <button
                          onClick={() => openEmployeeHistory(demande.profil!)}
                          className="text-left hover:bg-slate-100 rounded-lg p-2 -m-2 transition-colors w-full"
                        >
                          <div>
                            <p className="font-semibold text-slate-900 hover:text-primary-600 transition-colors">
                              {demande.profil.prenom} {demande.profil.nom}
                            </p>
                            {demande.profil.tel && (
                              <p className="text-xs text-slate-500">{demande.profil.tel}</p>
                            )}
                          </div>
                        </button>
                      ) : (
                        <div>
                          <p className="font-semibold text-slate-900">
                            {demande.prenom_salarie} {demande.nom_salarie}
                          </p>
                          {demande.tel_salarie && (
                            <p className="text-xs text-slate-500">{demande.tel_salarie}</p>
                          )}
                          <p className="text-xs text-amber-600">Non identifié</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{demande.type_demande}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          demande.priorite === 'urgente'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {demande.priorite === 'urgente' ? 'Urgente' : 'Normale'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={demande.statut}
                        onChange={(e) => handleStatusChangeRequest(demande, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-0 focus:ring-2 focus:ring-primary-500 ${
                          demande.statut === 'en_attente'
                            ? 'bg-amber-100 text-amber-700'
                            : demande.statut === 'en_cours'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        <option value="en_attente">En attente</option>
                        <option value="en_cours">En cours</option>
                        <option value="traitee">Traitée</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {demande.treater ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-green-700">
                              {demande.treater.prenom.charAt(0)}{demande.treater.nom.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {demande.treater.prenom} {demande.treater.nom}
                            </p>
                            {demande.treated_at && (
                              <p className="text-xs text-slate-500">
                                {new Date(demande.treated_at).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openDetails(demande)}
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredDemandes.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredDemandes.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900">Nouvelle demande</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDemande} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rechercher un salarié
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        searchProfils(e.target.value);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Nom, téléphone, matricule..."
                      disabled={!!selectedProfil}
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((profil) => (
                        <button
                          key={profil.id}
                          type="button"
                          onClick={() => selectProfil(profil)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          <p className="font-semibold text-slate-900">
                            {profil.prenom} {profil.nom}
                          </p>
                          <p className="text-xs text-slate-500">
                            {profil.tel} • {profil.matricule_tca}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedProfil && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-green-900">
                          {selectedProfil.prenom} {selectedProfil.nom}
                        </p>
                        <p className="text-sm text-green-700">{selectedProfil.tel}</p>
                      </div>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-green-700" />
                      </button>
                    </div>
                  )}
                </div>

                {!selectedProfil && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Prénom
                        </label>
                        <input
                          type="text"
                          value={formData.prenom_salarie}
                          onChange={(e) => setFormData({ ...formData, prenom_salarie: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Nom
                        </label>
                        <input
                          type="text"
                          value={formData.nom_salarie}
                          onChange={(e) => setFormData({ ...formData, nom_salarie: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={formData.tel_salarie}
                          onChange={(e) => setFormData({ ...formData, tel_salarie: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Matricule
                        </label>
                        <input
                          type="text"
                          value={formData.matricule_salarie}
                          onChange={(e) => setFormData({ ...formData, matricule_salarie: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Type de demande *
                  </label>
                  <select
                    value={formData.type_demande}
                    onChange={(e) => setFormData({ ...formData, type_demande: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    {TYPES_DEMANDE.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Priorité
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="normale"
                        checked={formData.priorite === 'normale'}
                        onChange={(e) => setFormData({ ...formData, priorite: e.target.value as any })}
                        className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Normale</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="urgente"
                        checked={formData.priorite === 'urgente'}
                        onChange={(e) => setFormData({ ...formData, priorite: e.target.value as any })}
                        className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-red-700">Urgente</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium disabled:opacity-50"
                  >
                    {saving ? 'Création...' : 'Créer la demande'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetailsModal && selectedDemande && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900">Détails de la demande</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Date</p>
                    <p className="text-slate-900 font-semibold">
                      {new Date(selectedDemande.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Priorité</p>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        selectedDemande.priorite === 'urgente'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {selectedDemande.priorite === 'urgente' ? 'Urgente' : 'Normale'}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">Créé par</p>
                  {selectedDemande.creator ? (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        <p className="font-semibold text-blue-900">
                          {selectedDemande.creator.prenom} {selectedDemande.creator.nom}
                        </p>
                      </div>
                      <p className="text-sm text-blue-700 mt-2">
                        Le {new Date(selectedDemande.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-sm text-slate-500">Utilisateur inconnu</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">Salarié</p>
                  {selectedDemande.profil ? (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="font-semibold text-slate-900">
                        {selectedDemande.profil.prenom} {selectedDemande.profil.nom}
                      </p>
                      <p className="text-sm text-slate-600">{selectedDemande.profil.tel}</p>
                      <p className="text-sm text-slate-600">{selectedDemande.profil.email}</p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 rounded-lg p-4">
                      <p className="font-semibold text-amber-900">
                        {selectedDemande.prenom_salarie} {selectedDemande.nom_salarie}
                      </p>
                      <p className="text-sm text-amber-700">{selectedDemande.tel_salarie}</p>
                      <p className="text-xs text-amber-600">Salarié non identifié dans le système</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">Type de demande</p>
                  <p className="text-slate-900">{selectedDemande.type_demande}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">Description</p>
                  <p className="text-slate-900">{selectedDemande.description}</p>
                </div>

                {selectedDemande.treated_at && (
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-2">Traitée le</p>
                    <p className="text-slate-900">
                      {new Date(selectedDemande.treated_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                )}

                {selectedDemande.treater && (
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-2">Traité par</p>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="font-semibold text-green-900">
                          {selectedDemande.treater.prenom} {selectedDemande.treater.nom}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes de résolution
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={4}
                    placeholder="Ajoutez des notes sur le traitement de cette demande..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => setShowValidationModal(true)}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium flex items-center justify-center gap-2"
                >
                  <CheckSquare className="w-5 h-5" />
                  Demander validation
                </button>
                <button
                  onClick={saveNotes}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Enregistrer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showHistoryModal && selectedProfilForHistory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <History className="w-6 h-6 text-primary-600" />
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Historique - {selectedProfilForHistory.prenom} {selectedProfilForHistory.nom}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {selectedProfilForHistory.tel} • {selectedProfilForHistory.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeHistoryModal}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-sm font-medium text-slate-600 mb-1">Total</p>
                    <p className="text-2xl font-bold text-slate-900">{historyStats.total}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <p className="text-sm font-medium text-amber-700 mb-1">En attente</p>
                    <p className="text-2xl font-bold text-amber-900">{historyStats.enAttente}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-sm font-medium text-blue-700 mb-1">En cours</p>
                    <p className="text-2xl font-bold text-blue-900">{historyStats.enCours}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-sm font-medium text-green-700 mb-1">Traitées</p>
                    <p className="text-2xl font-bold text-green-900">{historyStats.traitees}</p>
                  </div>
                </div>

                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" text="Chargement de l'historique..." />
                  </div>
                ) : employeeHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">Aucune demande trouvée pour ce salarié</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Créé par</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {employeeHistory.map((historique) => (
                          <tr key={historique.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <p className="text-sm text-slate-900">
                                {new Date(historique.created_at).toLocaleDateString('fr-FR')}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(historique.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-slate-700">{historique.type_demande}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-slate-700 truncate max-w-xs">
                                {historique.description.substring(0, 50)}{historique.description.length > 50 ? '...' : ''}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                  historique.statut === 'en_attente'
                                    ? 'bg-amber-100 text-amber-700'
                                    : historique.statut === 'en_cours'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {historique.statut === 'en_attente' ? 'En attente' : historique.statut === 'en_cours' ? 'En cours' : 'Traitée'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {historique.creator ? (
                                <p className="text-sm text-slate-700">
                                  {historique.creator.prenom} {historique.creator.nom}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-400">Inconnu</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  closeHistoryModal();
                                  openDetails(historique);
                                }}
                                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-200">
                <button
                  onClick={closeHistoryModal}
                  className="w-full px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {showStatusConfirmModal && pendingStatusChange && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900">Confirmer le changement de statut</h3>
                <button
                  onClick={cancelStatusChange}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-600 mb-2">Demande concernée</p>
                  <p className="font-semibold text-slate-900">
                    {pendingStatusChange.demande.type_demande}
                  </p>
                  <p className="text-sm text-slate-600">
                    {pendingStatusChange.demande.profil
                      ? `${pendingStatusChange.demande.profil.prenom} ${pendingStatusChange.demande.profil.nom}`
                      : `${pendingStatusChange.demande.prenom_salarie} ${pendingStatusChange.demande.nom_salarie}`
                    }
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4 py-4">
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      pendingStatusChange.oldStatut === 'en_attente'
                        ? 'bg-amber-100 text-amber-700'
                        : pendingStatusChange.oldStatut === 'en_cours'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {pendingStatusChange.oldStatut === 'en_attente' ? 'En attente' : pendingStatusChange.oldStatut === 'en_cours' ? 'En cours' : 'Traitée'}
                  </span>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      pendingStatusChange.newStatut === 'en_attente'
                        ? 'bg-amber-100 text-amber-700'
                        : pendingStatusChange.newStatut === 'en_cours'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {pendingStatusChange.newStatut === 'en_attente' ? 'En attente' : pendingStatusChange.newStatut === 'en_cours' ? 'En cours' : 'Traitée'}
                  </span>
                </div>

                {pendingStatusChange.newStatut === 'traitee' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Information importante</p>
                        <p className="text-sm text-green-700 mt-1">
                          En marquant cette demande comme traitée, la date et l'heure seront enregistrées automatiquement, ainsi que votre identité comme traiteur.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {pendingStatusChange.newStatut === 'en_cours' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Prise en charge</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Vous allez prendre en charge cette demande. Elle sera marquée comme en cours de traitement.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 p-6 border-t border-slate-200">
                <button
                  onClick={cancelStatusChange}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  disabled={updatingStatus}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmStatusChange}
                  disabled={updatingStatus}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updatingStatus ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Confirmation...
                    </>
                  ) : (
                    'Confirmer'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showValidationModal && selectedDemande && (
          <RequestValidationModal
            demandeId={selectedDemande.id}
            onClose={() => setShowValidationModal(false)}
            onSuccess={() => {
              setShowValidationModal(false);
              setShowDetailsModal(false);
            }}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
