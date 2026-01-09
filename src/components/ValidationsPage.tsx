import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PermissionGuard } from './PermissionGuard';
import { usePermissions } from '../contexts/PermissionsContext';
import { CheckSquare, Search, X, Clock, CheckCircle, XCircle, AlertCircle, Send, User, MessageSquare, ArrowRight, Eye, Users, Euro } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { ValidateRequestModal } from './ValidateRequestModal';
import { Pagination } from './Pagination';
import Toast from './Toast';

interface Validation {
  id: string;
  demande_id: string;
  demandeur_id: string;
  validateur_id: string;
  type_action: 'modification_demande' | 'suppression_demande' | 'changement_priorite' | 'reassignation' | 'autre';
  priorite: 'normale' | 'urgente';
  statut: 'en_attente' | 'approuvee' | 'rejetee' | 'transferee';
  message_demande: string;
  commentaire_validateur: string | null;
  created_at: string;
  responded_at: string | null;
  transferee_vers: string | null;
  raison_transfert: string | null;

  type_demande: string;
  demande_description: string;
  demande_statut: 'en_attente' | 'en_cours' | 'traitee';
  nom_salarie: string | null;
  prenom_salarie: string | null;
  matricule_salarie: string | null;

  demandeur_email: string;
  demandeur_nom: string;
  demandeur_prenom: string;

  validateur_email: string | null;
  validateur_nom: string | null;
  validateur_prenom: string | null;

  messages_non_lus_validateur: number;
  messages_non_lus_demandeur: number;
}

interface AvanceFrais {
  id: string;
  profil_id: string;
  montant: number;
  motif: string;
  date_demande: string;
  statut: 'en_attente' | 'validee' | 'refusee';
  commentaire_validation: string | null;
  profil?: {
    nom: string;
    prenom: string;
    matricule_tca: string;
  };
}

export function ValidationsPage() {
  const { appUser, hasPermission } = usePermissions();
  const [validations, setValidations] = useState<Validation[]>([]);
  const [avancesFrais, setAvancesFrais] = useState<AvanceFrais[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assignees' | 'traitees' | 'toutes' | 'avances_frais'>('assignees');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValidation, setSelectedValidation] = useState<Validation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAvanceModal, setShowAvanceModal] = useState(false);
  const [selectedAvance, setSelectedAvance] = useState<AvanceFrais | null>(null);
  const [validationComment, setValidationComment] = useState('');

  const isSuperAdmin = hasPermission('admin/utilisateurs');

  useEffect(() => {
    fetchValidations();
    fetchAvancesFrais();

    const channel = supabase
      .channel('validations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demande_validation' }, () => {
        fetchValidations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compta_avance_frais' }, () => {
        fetchAvancesFrais();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchValidations = async () => {
    try {
      const { data, error } = await supabase
        .from('validations_avec_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setValidations(data || []);
    } catch (err: any) {
      console.error('Error fetching validations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvancesFrais = async () => {
    try {
      const { data, error } = await supabase
        .from('compta_avance_frais')
        .select(`
          *,
          profil:profil_id (
            nom,
            prenom,
            matricule_tca
          )
        `)
        .order('date_demande', { ascending: false });

      if (error) throw error;
      setAvancesFrais(data || []);
    } catch (err: any) {
      console.error('Error fetching avances de frais:', err);
    }
  };

  const handleValidateAvance = async (avanceId: string, statut: 'validee' | 'refusee') => {
    try {
      const { error } = await supabase.rpc('valider_avance_frais', {
        p_avance_id: avanceId,
        p_validation_statut: statut,
        p_commentaire: validationComment || null
      });

      if (error) throw error;

      setToast({
        message: statut === 'validee' ? 'Avance de frais validée avec succès' : 'Avance de frais refusée',
        type: 'success'
      });

      setShowAvanceModal(false);
      setSelectedAvance(null);
      setValidationComment('');
      fetchAvancesFrais();
    } catch (error: any) {
      console.error('Error validating avance:', error);
      setToast({ message: 'Erreur lors de la validation: ' + error.message, type: 'error' });
    }
  };

  const getFilteredValidations = () => {
    let filtered = validations;

    if (!appUser) return [];

    if (!isSuperAdmin) {
      filtered = filtered.filter(v =>
        v.demandeur_id === appUser.id ||
        v.validateur_id === appUser.id ||
        v.transferee_vers === appUser.id
      );
    }

    switch (activeTab) {
      case 'assignees':
        filtered = filtered.filter(v =>
          v.statut === 'en_attente' &&
          (v.validateur_id === appUser.id || v.transferee_vers === appUser.id || isSuperAdmin)
        );
        break;
      case 'traitees':
        filtered = filtered.filter(v =>
          v.statut === 'approuvee' || v.statut === 'rejetee'
        );
        break;
      case 'toutes':
        break;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.nom_salarie?.toLowerCase().includes(term) ||
        v.prenom_salarie?.toLowerCase().includes(term) ||
        v.matricule_salarie?.toLowerCase().includes(term) ||
        v.type_demande.toLowerCase().includes(term) ||
        v.demandeur_nom.toLowerCase().includes(term) ||
        v.demandeur_prenom.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const getTypeActionLabel = (type: string) => {
    switch (type) {
      case 'modification_demande': return 'Modification demande';
      case 'suppression_demande': return 'Suppression demande';
      case 'changement_priorite': return 'Changement priorité';
      case 'reassignation': return 'Réassignation';
      case 'autre': return 'Autre';
      default: return type;
    }
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'en_attente':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            <Clock className="w-3.5 h-3.5" />
            En attente
          </span>
        );
      case 'approuvee':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            <CheckCircle className="w-3.5 h-3.5" />
            Approuvée
          </span>
        );
      case 'rejetee':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            Rejetée
          </span>
        );
      case 'transferee':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <ArrowRight className="w-3.5 h-3.5" />
            Transférée
          </span>
        );
      default:
        return null;
    }
  };

  const getPrioriteBadge = (priorite: string) => {
    if (priorite === 'urgente') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          <AlertCircle className="w-3 h-3" />
          Urgent
        </span>
      );
    }
    return null;
  };

  const filteredValidations = getFilteredValidations();

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedValidations = (filteredValidations || []).slice(startIndex, startIndex + itemsPerPage);

  const stats = {
    assignees: validations.filter(v =>
      v.statut === 'en_attente' &&
      (v.validateur_id === appUser?.id || v.transferee_vers === appUser?.id || isSuperAdmin)
    ).length,
    traitees: validations.filter(v =>
      v.statut === 'approuvee' || v.statut === 'rejetee'
    ).length,
    toutes: validations.length,
    avances_frais: avancesFrais.filter(a => a.statut === 'en_attente').length,
  };

  const filteredAvances = avancesFrais.filter(avance => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        avance.profil?.nom?.toLowerCase().includes(term) ||
        avance.profil?.prenom?.toLowerCase().includes(term) ||
        avance.profil?.matricule_tca?.toLowerCase().includes(term) ||
        avance.motif?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <PermissionGuard permission="rh/validations">
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Validations</h2>
                <p className="text-sm text-slate-600 mt-0.5">Gérez les demandes de validation des standardistes</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('assignees')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'assignees'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Assignées à moi
                {stats.assignees > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                    {stats.assignees}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('traitees')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'traitees'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Traitées
                {stats.traitees > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {stats.traitees}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('toutes')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'toutes'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Toutes
                {stats.toutes > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {stats.toutes}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('avances_frais')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  activeTab === 'avances_frais'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Euro className="w-4 h-4" />
                Avances de frais
                {stats.avances_frais > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                    {stats.avances_frais}
                  </span>
                )}
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : activeTab === 'avances_frais' ? (
            filteredAvances.length === 0 ? (
              <div className="text-center py-16">
                <Euro className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Aucune avance de frais</h3>
                <p className="text-slate-600">
                  Aucune avance de frais en attente de validation.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Employé</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Date demande</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Montant</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Motif</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Statut</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAvances.map((avance) => (
                      <tr key={avance.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <div>
                              <div className="font-medium text-slate-900">
                                {avance.profil?.prenom} {avance.profil?.nom}
                              </div>
                              {avance.profil?.matricule_tca && (
                                <div className="text-xs text-slate-500">{avance.profil.matricule_tca}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-slate-600">
                            {new Date(avance.date_demande).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-sm font-medium text-slate-900">
                            <Euro className="w-4 h-4 text-slate-400" />
                            {parseFloat(avance.montant.toString()).toFixed(2)} €
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-slate-900 max-w-xs truncate" title={avance.motif}>
                            {avance.motif}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {avance.statut === 'en_attente' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                              <Clock className="w-3.5 h-3.5" />
                              En attente
                            </span>
                          )}
                          {avance.statut === 'validee' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Validée
                            </span>
                          )}
                          {avance.statut === 'refusee' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              <XCircle className="w-3.5 h-3.5" />
                              Refusée
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {avance.statut === 'en_attente' ? (
                            <button
                              onClick={() => {
                                setSelectedAvance(avance);
                                setShowAvanceModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              Traiter
                            </button>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredValidations.length === 0 ? (
            <div className="text-center py-16">
              <CheckSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Aucune validation</h3>
              <p className="text-slate-600">
                {activeTab === 'assignees' && "Vous n'avez aucune validation assignée pour le moment."}
                {activeTab === 'traitees' && "Aucune validation n'a été traitée."}
                {activeTab === 'toutes' && "Aucune validation disponible."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Salarié</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Action</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Demandeur</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Validateur</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Statut</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Date</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Messages</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedValidations.map((validation) => (
                    <tr key={validation.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <div>
                            <div className="font-medium text-slate-900">
                              {validation.prenom_salarie} {validation.nom_salarie}
                            </div>
                            {validation.matricule_salarie && (
                              <div className="text-xs text-slate-500">{validation.matricule_salarie}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-900">{validation.type_demande}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getTypeActionLabel(validation.type_action)}
                          {validation.priorite === 'urgente' && getPrioriteBadge(validation.priorite)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-900">
                          {validation.demandeur_prenom} {validation.demandeur_nom}
                        </div>
                        <div className="text-xs text-slate-500">{validation.demandeur_email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-900">
                          {validation.validateur_prenom} {validation.validateur_nom}
                        </div>
                        {validation.validateur_email && (
                          <div className="text-xs text-slate-500">{validation.validateur_email}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {getStatutBadge(validation.statut)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-600">
                          {new Date(validation.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(validation.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {(validation.messages_non_lus_validateur > 0 || validation.messages_non_lus_demandeur > 0) && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {validation.validateur_id === appUser?.id
                              ? validation.messages_non_lus_validateur
                              : validation.messages_non_lus_demandeur
                            }
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedValidation(validation);
                            setShowDetailsModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredValidations && filteredValidations.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredValidations.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {showDetailsModal && selectedValidation && (
        <ValidateRequestModal
          validation={selectedValidation}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedValidation(null);
          }}
          onSuccess={() => {
            fetchValidations();
          }}
        />
      )}

      {showAvanceModal && selectedAvance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Valider l'avance de frais
              </h3>
              <button
                onClick={() => {
                  setShowAvanceModal(false);
                  setSelectedAvance(null);
                  setValidationComment('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Employé</p>
                    <p className="font-medium text-gray-900">
                      {selectedAvance.profil?.prenom} {selectedAvance.profil?.nom}
                    </p>
                    {selectedAvance.profil?.matricule_tca && (
                      <p className="text-sm text-gray-500">{selectedAvance.profil.matricule_tca}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Montant</p>
                    <p className="font-medium text-gray-900 flex items-center gap-1">
                      <Euro className="w-4 h-4" />
                      {parseFloat(selectedAvance.montant.toString()).toFixed(2)} €
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-1">Motif</p>
                  <p className="text-gray-900">{selectedAvance.motif}</p>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">Date de la demande</p>
                  <p className="text-gray-900">
                    {new Date(selectedAvance.date_demande).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={validationComment}
                  onChange={(e) => setValidationComment(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Ajoutez un commentaire..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleValidateAvance(selectedAvance.id, 'refusee')}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Refuser
              </button>
              <button
                onClick={() => handleValidateAvance(selectedAvance.id, 'validee')}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </PermissionGuard>
  );
}
