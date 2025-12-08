import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PermissionGuard } from './PermissionGuard';
import { usePermissions } from '../contexts/PermissionsContext';
import { CheckSquare, Search, X, Clock, CheckCircle, XCircle, AlertCircle, Send, User, MessageSquare, ArrowRight, Eye, Users } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { ValidateRequestModal } from './ValidateRequestModal';

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

export function ValidationsPage() {
  const { appUser, hasPermission } = usePermissions();
  const [validations, setValidations] = useState<Validation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assignees' | 'traitees' | 'toutes'>('assignees');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValidation, setSelectedValidation] = useState<Validation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const isSuperAdmin = hasPermission('admin/utilisateurs');

  useEffect(() => {
    fetchValidations();

    const channel = supabase
      .channel('validations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demande_validation' }, () => {
        fetchValidations();
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

  const stats = {
    assignees: validations.filter(v =>
      v.statut === 'en_attente' &&
      (v.validateur_id === appUser?.id || v.transferee_vers === appUser?.id || isSuperAdmin)
    ).length,
    traitees: validations.filter(v =>
      v.statut === 'approuvee' || v.statut === 'rejetee'
    ).length,
    toutes: validations.length,
  };

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
                  {filteredValidations.map((validation) => (
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
    </PermissionGuard>
  );
}
