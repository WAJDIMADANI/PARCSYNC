import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit2, Trash2, UserPlus, X, ChevronRight, Share2, QrCode, ChevronDown } from 'lucide-react';
import { ShareLinkModal } from './ShareLinkModal';
import { OnboardingQRModal } from './OnboardingQRModal';
import { LoadingSpinner } from './LoadingSpinner';

interface Site {
  id: string;
  nom: string;
}

interface Secteur {
  id: string;
  nom: string;
}

interface Poste {
  id: string;
  nom: string;
  description: string | null;
}

interface Candidate {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  tel: string | null;
  pipeline: string;
  site_id: string | null;
  secteur_id: string | null;
  created_at: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  genre?: string;
  date_naissance?: string;
  nationalite?: string;
  date_permis_conduire?: string;
  cv_url?: string;
  lettre_motivation_url?: string;
  carte_identite_recto_url?: string;
  carte_identite_verso_url?: string;
  consent_rgpd_at?: string;
  poste?: string;
  statut_candidature?: string;
  code_couleur_rh?: string;
}

const STATUT_CANDIDATURE = [
  { value: 'candidature_recue', label: 'Candidature reçue' },
  { value: 'entretien', label: 'Entretien' },
  { value: 'pre_embauche', label: 'Pré-embauche' },
  { value: 'salarie', label: 'Salarié' },
  { value: 'candidature_rejetee', label: 'Candidature rejetée' },
];

const CODE_COULEUR_RH = [
  { value: 'vert', label: 'Vert', color: 'bg-green-500' },
  { value: 'jaune', label: 'Jaune', color: 'bg-yellow-500' },
  { value: 'rouge', label: 'Rouge', color: 'bg-red-500' },
  { value: 'bleu', label: 'Bleu', color: 'bg-blue-500' },
];

function CodeCouleurDropdown({ value, onChange }: { value: string | null | undefined; onChange: (value: string | null) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = CODE_COULEUR_RH.find(c => c.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 text-sm border border-gray-300 rounded px-3 py-1.5 min-w-[120px] bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <div className={`w-4 h-4 rounded-full flex-shrink-0 ${selectedOption ? selectedOption.color : 'border-2 border-gray-300'}`}></div>
        <span className="flex-1 text-left">{selectedOption?.label || 'Aucun'}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-100 text-sm text-left transition-colors"
          >
            <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0"></div>
            <span>Aucun</span>
          </button>
          {CODE_COULEUR_RH.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(option.value);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-100 text-sm text-left transition-colors"
            >
              <div className={`w-4 h-4 rounded-full flex-shrink-0 ${option.color}`}></div>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function CandidateList() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [convertingCandidate, setConvertingCandidate] = useState<Candidate | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOnboardingQR, setShowOnboardingQR] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null);
  const [showStatutConfirmModal, setShowStatutConfirmModal] = useState(false);
  const [pendingStatutChange, setPendingStatutChange] = useState<{ candidateId: string; newStatut: string; candidateName: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [candidatesRes, sitesRes, secteursRes, postesRes] = await Promise.all([
        supabase.from('candidat').select('*').is('deleted_at', null).neq('pipeline', 'converti_salarie').order('created_at', { ascending: false }),
        supabase.from('site').select('*').order('nom'),
        supabase.from('secteur').select('*').order('nom'),
        supabase.from('poste').select('id, nom, description').eq('actif', true).order('nom')
      ]);

      if (candidatesRes.error) throw candidatesRes.error;
      if (sitesRes.error) throw sitesRes.error;
      if (secteursRes.error) throw secteursRes.error;
      if (postesRes.error) throw postesRes.error;

      setCandidates(candidatesRes.data || []);
      setSites(sitesRes.data || []);
      setSecteurs(secteursRes.data || []);
      setPostes(postesRes.data || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingCandidateId(id);
  };

  const handleDelete = async () => {
    if (!deletingCandidateId) return;

    try {
      const { error } = await supabase
        .from('candidat')
        .delete()
        .eq('id', deletingCandidateId);
      if (error) throw error;
      setDeletingCandidateId(null);
      fetchData();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleStatutChange = (candidateId: string, newStatut: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    setPendingStatutChange({
      candidateId,
      newStatut,
      candidateName: `${candidate.prenom} ${candidate.nom}`,
    });
    setShowStatutConfirmModal(true);
  };

  const confirmStatutChange = async () => {
    if (!pendingStatutChange) return;

    try {
      // Préparer les données à mettre à jour
      const updateData: Record<string, any> = {
        statut_candidature: pendingStatutChange.newStatut
      };

      // Si le nouveau statut est 'entretien', ajouter la date
      if (pendingStatutChange.newStatut === 'entretien') {
        updateData.date_entretien = new Date().toISOString();
      }

      const { error } = await supabase
        .from('candidat')
        .update(updateData)
        .eq('id', pendingStatutChange.candidateId);

      if (error) throw error;

      // Si le nouveau statut est 'pre_embauche', envoyer l'email d'onboarding
      if (pendingStatutChange.newStatut === 'pre_embauche') {
        const candidate = candidates.find(c => c.id === pendingStatutChange.candidateId);
        if (candidate) {
          await sendOnboardingEmail(candidate);
        }
      }

      // Fermer le modal et réinitialiser l'état
      setShowStatutConfirmModal(false);
      setPendingStatutChange(null);

      fetchData();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      alert('Erreur lors de la mise à jour');
      // Fermer le modal même en cas d'erreur
      setShowStatutConfirmModal(false);
      setPendingStatutChange(null);
    }
  };

  const cancelStatutChange = () => {
    setShowStatutConfirmModal(false);
    setPendingStatutChange(null);
  };

  const handleCodeCouleurChange = async (candidatId: string, newColor: string | null) => {
    try {
      const { error } = await supabase
        .from('candidat')
        .update({ code_couleur_rh: newColor })
        .eq('id', candidatId);

      if (error) throw error;

      fetchData();
    } catch (error) {
      console.error('Erreur mise à jour couleur:', error);
      alert('Erreur lors de la mise à jour de la couleur');
    }
  };

  const sendOnboardingEmail = async (candidate: Candidate) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-onboarding-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          candidateEmail: candidate.email,
          candidateName: `${candidate.prenom} ${candidate.nom}`,
          candidateId: candidate.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de l\'email');
      }

      setSuccessMessage(`Email d'onboarding envoyé à ${candidate.prenom} ${candidate.nom} !`);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erreur envoi email:', error);
      setSuccessMessage('Erreur lors de l\'envoi de l\'email d\'onboarding');
      setShowSuccessModal(true);
    }
  };

  const sendRejectionEmail = async (candidate: Candidate) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-rejection-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          candidateEmail: candidate.email,
          candidateName: `${candidate.prenom} ${candidate.nom}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de l\'email');
      }

      setSuccessMessage(`Email de refus envoyé avec succès à ${candidate.prenom} ${candidate.nom}`);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erreur envoi email de refus:', error);
      setSuccessMessage('Erreur lors de l\'envoi de l\'email de refus');
      setShowSuccessModal(true);
    }
  };

  const filteredCandidates = candidates.filter(cand =>
    `${cand.prenom} ${cand.nom} ${cand.email}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des candidats..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Candidats</h1>
          <p className="text-gray-600 mt-1">{candidates.length} candidat(s) au total</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium"
          >
            <Plus className="w-5 h-5" />
            Nouveau candidat
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-400 hover:from-accent-600 hover:to-accent-500 text-slate-900 rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium"
          >
            <Share2 className="w-5 h-5" />
            Candidature
          </button>
          <button
            onClick={() => setShowOnboardingQR(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium"
          >
            <QrCode className="w-5 h-5" />
            QR Embauche
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un candidat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">Aucun candidat trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prénom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Poste
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code Postal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Code RH
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCandidates.map((candidate) => {
                const site = sites.find(s => s.id === candidate.site_id);
                const statutCandidature = candidate.statut_candidature || 'candidature_recue';
                const codeCouleur = CODE_COULEUR_RH.find(c => c.value === candidate.code_couleur_rh);
                const hasDocuments = candidate.cv_url || candidate.lettre_motivation_url || candidate.carte_identite_recto_url;

                return (
                  <tr
                    key={candidate.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setEditingCandidate(candidate)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {candidate.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candidate.prenom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {candidate.poste || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {site?.nom || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {candidate.code_postal || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(candidate.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setEditingCandidate(candidate)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          hasDocuments
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-500'
                        } transition-colors`}
                      >
                        {hasDocuments ? 'Voir' : 'Aucun'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={statutCandidature}
                        onChange={(e) => handleStatutChange(candidate.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {STATUT_CANDIDATURE.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <CodeCouleurDropdown
                        value={candidate.code_couleur_rh}
                        onChange={(value) => handleCodeCouleurChange(candidate.id, value)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {statutCandidature === 'salarie' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConvertingCandidate(candidate);
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Convertir en salarié"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCandidate(candidate);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(candidate.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <CandidateModal
          sites={sites}
          secteurs={secteurs}
          postes={postes}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchData();
          }}
        />
      )}

      {editingCandidate && (
        <CandidateModal
          candidate={editingCandidate}
          sites={sites}
          secteurs={secteurs}
          postes={postes}
          onClose={() => setEditingCandidate(null)}
          onSuccess={() => {
            setEditingCandidate(null);
            fetchData();
          }}
        />
      )}

      {convertingCandidate && (
        <ConvertToEmployeeModal
          candidate={convertingCandidate}
          sites={sites}
          secteurs={secteurs}
          onClose={() => setConvertingCandidate(null)}
          onSuccess={() => {
            setConvertingCandidate(null);
            fetchData();
          }}
        />
      )}

      {showShareModal && (
        <ShareLinkModal onClose={() => setShowShareModal(false)} />
      )}

      {showOnboardingQR && (
        <OnboardingQRModal onClose={() => setShowOnboardingQR(false)} />
      )}

      {showStatutConfirmModal && pendingStatutChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmer le changement de statut</h3>
              <p className="text-gray-600 mb-6">
                Voulez-vous vraiment changer le statut de <strong>{pendingStatutChange.candidateName}</strong> à <strong>{STATUT_CANDIDATURE.find(s => s.value === pendingStatutChange.newStatut)?.label}</strong> ?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelStatutChange}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmStatutChange}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="text-lg text-gray-900 mb-6">{successMessage}</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingCandidateId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-slideDown">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Supprimer définitivement ce candidat ?</h3>
              <p className="text-sm text-gray-600 mb-6">
                Cette action est irréversible. Le candidat sera supprimé définitivement de la base de données. Vous pourrez ensuite créer un nouveau candidat avec les mêmes coordonnées.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingCandidateId(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PosteDropdown({ value, onChange, postes, disabled }: {
  value: string;
  onChange: (value: string) => void;
  postes: Poste[];
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedPoste = postes.find(p => p.nom === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">Poste candidaté</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 bg-white text-left flex items-center justify-between"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {selectedPoste?.nom || 'Sélectionner un poste'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          <div
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-gray-400"
          >
            Sélectionner un poste
          </div>
          {postes.map((poste) => (
            <div
              key={poste.id}
              onClick={() => {
                onChange(poste.nom);
                setIsOpen(false);
              }}
              className={`px-3 py-2 hover:bg-blue-50 cursor-pointer ${
                value === poste.nom ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'
              }`}
            >
              <div className="font-medium">{poste.nom}</div>
              {poste.description && (
                <div className="text-xs text-gray-500 mt-0.5">{poste.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CandidateModal({
  candidate,
  sites,
  secteurs,
  postes,
  onClose,
  onSuccess
}: {
  candidate?: Candidate;
  sites: Site[];
  secteurs: Secteur[];
  postes: Poste[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    prenom: candidate?.prenom || '',
    nom: candidate?.nom || '',
    email: candidate?.email || '',
    tel: candidate?.tel || '',
    site_id: candidate?.site_id || '',
    secteur_id: candidate?.secteur_id || '',
    poste: candidate?.poste || '',
    adresse: candidate?.adresse || '',
    complement_adresse: candidate?.complement_adresse || '',
    code_postal: candidate?.code_postal || '',
    ville: candidate?.ville || '',
    genre: candidate?.genre || '',
    date_naissance: candidate?.date_naissance || '',
    nom_naissance: candidate?.nom_naissance || '',
    lieu_naissance: candidate?.lieu_naissance || '',
    pays_naissance: candidate?.pays_naissance || '',
    nationalite: candidate?.nationalite || '',
    numero_securite_sociale: candidate?.numero_securite_sociale || '',
    date_permis_conduire: candidate?.date_permis_conduire || '',
  });
  const [loading, setLoading] = useState(false);
  const [isViewMode, setIsViewMode] = useState(!!candidate);
  const [signedUrls, setSignedUrls] = useState<{
    cv?: string;
    lettre_motivation?: string;
    carte_identite_recto?: string;
    carte_identite_verso?: string;
  }>({});
  const [ageError, setAgeError] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (candidate) {
      generateSignedUrls();
    }
  }, [candidate]);

  useEffect(() => {
    if (formData.date_naissance) {
      const age = calculateAge(formData.date_naissance);
      if (age < 18) {
        setAgeError(`Le candidat doit avoir au moins 18 ans (âge actuel : ${age} ans)`);
      } else {
        setAgeError('');
      }
    } else {
      setAgeError('');
    }
  }, [formData.date_naissance]);

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setAddressSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Erreur recherche adresse:', error);
    }
  };

  const selectAddress = (feature: any) => {
    const properties = feature.properties;
    const fullAddress = properties.name;

    setFormData({
      ...formData,
      adresse: fullAddress,
      code_postal: properties.postcode || '',
      ville: properties.city || '',
    });

    setShowSuggestions(false);
  };

  const getSignedUrl = async (publicUrl: string): Promise<string> => {
    try {
      const match = publicUrl.match(/\/object\/public\/documents\/(.+)$/);
      if (!match) {
        console.error('URL format invalide:', publicUrl);
        return publicUrl;
      }

      const filePath = match[1];

      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);

      if (error) {
        console.error('Erreur génération URL signée:', error);
        return publicUrl;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Erreur:', error);
      return publicUrl;
    }
  };

  const generateSignedUrls = async () => {
    if (!candidate) return;

    const urls: any = {};

    if (candidate.cv_url) {
      urls.cv = await getSignedUrl(candidate.cv_url);
    }
    if (candidate.lettre_motivation_url) {
      urls.lettre_motivation = await getSignedUrl(candidate.lettre_motivation_url);
    }
    if (candidate.carte_identite_recto_url) {
      urls.carte_identite_recto = await getSignedUrl(candidate.carte_identite_recto_url);
    }
    if (candidate.carte_identite_verso_url) {
      urls.carte_identite_verso = await getSignedUrl(candidate.carte_identite_verso_url);
    }

    setSignedUrls(urls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (candidate) {
        const { error } = await supabase
          .from('candidat')
          .update(formData)
          .eq('id', candidate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('candidat').insert([{
          ...formData,
          pipeline: 'nouveau',
        }]);
        if (error) throw error;
      }
      onSuccess();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'opération');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {candidate ? (isViewMode ? 'Fiche candidat' : 'Modifier le candidat') : 'Nouveau candidat'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {candidate && isViewMode && (
          <div className="mb-4">
            <button
              onClick={() => setIsViewMode(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Modifier
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input
                type="text"
                required
                disabled={isViewMode}
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                required
                disabled={isViewMode}
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                required
                disabled={isViewMode}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                disabled={isViewMode}
                value={formData.tel}
                onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <PosteDropdown
              value={formData.poste}
              onChange={(value) => setFormData({ ...formData, poste: value })}
              postes={postes}
              disabled={isViewMode}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
              <select
                disabled={isViewMode}
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Sélectionner</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
              <input
                type="date"
                disabled={isViewMode}
                value={formData.date_naissance}
                onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent disabled:bg-gray-100 ${
                  ageError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {ageError && (
                <div className="mt-2 flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">{ageError}</span>
                </div>
              )}
            </div>

            {formData.genre === 'Femme' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de naissance</label>
                <input
                  type="text"
                  disabled={isViewMode}
                  value={formData.nom_naissance}
                  onChange={(e) => setFormData({ ...formData, nom_naissance: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="Nom de jeune fille"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de naissance</label>
              <input
                type="text"
                disabled={isViewMode}
                value={formData.lieu_naissance}
                onChange={(e) => setFormData({ ...formData, lieu_naissance: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pays de naissance</label>
              <input
                type="text"
                disabled={isViewMode}
                value={formData.pays_naissance}
                onChange={(e) => setFormData({ ...formData, pays_naissance: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nationalité</label>
              <input
                type="text"
                disabled={isViewMode}
                value={formData.nationalite}
                onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de sécurité sociale</label>
              <input
                type="text"
                disabled={isViewMode}
                value={formData.numero_securite_sociale}
                onChange={(e) => setFormData({ ...formData, numero_securite_sociale: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="X XX XX XX XXX XXX XX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date permis de conduire</label>
              <input
                type="date"
                disabled={isViewMode}
                value={formData.date_permis_conduire}
                onChange={(e) => setFormData({ ...formData, date_permis_conduire: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input
              type="text"
              disabled={isViewMode}
              value={formData.adresse}
              onChange={(e) => {
                setFormData({ ...formData, adresse: e.target.value });
                searchAddress(e.target.value);
              }}
              onFocus={() => formData.adresse.length >= 3 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Tapez votre adresse..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />

            {showSuggestions && addressSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {addressSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => selectAddress(suggestion)}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 text-sm text-gray-700"
                  >
                    {suggestion.properties.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Complément d'adresse</label>
            <input
              type="text"
              disabled={isViewMode}
              value={formData.complement_adresse}
              onChange={(e) => setFormData({ ...formData, complement_adresse: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="Bâtiment, étage, appartement..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
              <input
                type="text"
                disabled={isViewMode}
                value={formData.code_postal}
                onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input
                type="text"
                disabled={isViewMode}
                value={formData.ville}
                onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
              <select
                disabled={isViewMode}
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Aucun</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
              <select
                disabled={isViewMode}
                value={formData.secteur_id}
                onChange={(e) => setFormData({ ...formData, secteur_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Aucun</option>
                {secteurs.map(secteur => (
                  <option key={secteur.id} value={secteur.id}>{secteur.nom}</option>
                ))}
              </select>
            </div>
          </div>

          {candidate && (candidate.cv_url || candidate.lettre_motivation_url || candidate.carte_identite_recto_url) && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {candidate.cv_url && signedUrls.cv && (
                  <a
                    href={signedUrls.cv}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    CV
                  </a>
                )}
                {candidate.lettre_motivation_url && signedUrls.lettre_motivation && (
                  <a
                    href={signedUrls.lettre_motivation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Lettre de motivation
                  </a>
                )}
                {candidate.carte_identite_recto_url && signedUrls.carte_identite_recto && (
                  <a
                    href={signedUrls.carte_identite_recto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Carte d'identité (recto)
                  </a>
                )}
                {candidate.carte_identite_verso_url && signedUrls.carte_identite_verso && (
                  <a
                    href={signedUrls.carte_identite_verso}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Carte d'identité (verso)
                  </a>
                )}
              </div>
            </div>
          )}

          {!isViewMode && (
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || !!ageError}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'En cours...' : candidate ? 'Modifier' : 'Créer'}
              </button>
            </div>
          )}

          {isViewMode && (
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function ConvertToEmployeeModal({
  candidate,
  sites,
  secteurs,
  onClose,
  onSuccess
}: {
  candidate: Candidate;
  sites: Site[];
  secteurs: Secteur[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [ibanError, setIbanError] = useState('');
  const [ibanValidationMessage, setIbanValidationMessage] = useState('');
  const [formData, setFormData] = useState({
    role: '',
    date_entree: new Date().toISOString().split('T')[0],
    site_id: candidate.site_id || '',
    secteur_id: candidate.secteur_id || '',
    visite_medicale_faite: (candidate as any).visite_medicale_faite || false,
    casier_judiciaire_date: (candidate as any).casier_judiciaire_date || '',
    dpae_transmise: (candidate as any).dpae_transmise || false,
    iban: (candidate as any).iban || '',
    bic: (candidate as any).bic || '',
  });
  const [loading, setLoading] = useState(false);

  const getBicFromBankCode = (bankCode: string): string => {
    const bankCodes: { [key: string]: string } = {
      '20041': 'BNPAFRPP',
      '30004': 'SOGEFRPP',
      '10278': 'CMCIFRPP',
      '13335': 'CEPAFRPP',
      '11315': 'AGRIFRPP',
      '30002': 'CRLYFRPP',
      '16958': 'CEPAFRPP',
      '17515': 'CCFRFRPP',
      '10096': 'CMCIFR2A',
      '30003': 'SOGEFRPP',
    };
    return bankCodes[bankCode] || '';
  };

  const validateIban = async (iban: string) => {
    if (!iban || iban.length < 15) {
      setIbanError('');
      return;
    }

    try {
      const cleanIban = iban.replace(/\s/g, '').toUpperCase();

      const res = await fetch(`https://openiban.com/validate/${cleanIban}?validateBankCode=true&getBIC=true`);
      const data = await res.json();

      if (data.valid) {
        setIbanError('');
        setIbanValidationMessage('✅ IBAN valide');

        let bic = data.bankData?.bic || '';

        if (!bic && cleanIban.startsWith('FR')) {
          const bankCode = cleanIban.substring(4, 9);
          bic = getBicFromBankCode(bankCode);
        }

        setFormData(prev => ({ ...prev, bic, iban: cleanIban }));
      } else {
        setIbanError('❌ IBAN invalide');
        setIbanValidationMessage('');
      }
    } catch (e) {
      console.error('IBAN validation error:', e);
      setIbanError('❌ Erreur validation');
      setIbanValidationMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.dpae_transmise) {
      alert('La DPAE doit être transmise avant de convertir en salarié');
      return;
    }

    if (!formData.bic || formData.bic.trim() === '') {
      alert('Le BIC doit être rempli. Vérifiez que l\'IBAN est valide.');
      return;
    }

    if (formData.casier_judiciaire_date) {
      const casierDate = new Date(formData.casier_judiciaire_date);
      const today = new Date();
      const diffMonths = (today.getFullYear() - casierDate.getFullYear()) * 12 + today.getMonth() - casierDate.getMonth();
      if (diffMonths > 3) {
        alert('Le casier judiciaire doit dater de moins de 3 mois');
        return;
      }
    }

    setLoading(true);

    try {
      const { data: profilData, error: profilError } = await supabase.from('profil').insert([{
        prenom: candidate.prenom,
        nom: candidate.nom,
        email: candidate.email,
        tel: candidate.tel,
        role: formData.role,
        date_entree: formData.date_entree,
        site_id: formData.site_id || null,
        secteur_id: formData.secteur_id || null,
        statut: 'actif',
        candidat_id: candidate.id,
        adresse: candidate.adresse,
        code_postal: candidate.code_postal,
        ville: candidate.ville,
        date_naissance: candidate.date_naissance,
        nationalite: candidate.nationalite,
        date_permis_conduire: candidate.date_permis_conduire,
        iban: formData.iban,
        bic: formData.bic,
        nir: (candidate as any).numero_securite_sociale,
        permis_categorie: (candidate as any).permis_categorie,
        permis_points: (candidate as any).permis_points,
        nom_naissance: (candidate as any).nom_naissance,
        lieu_naissance: (candidate as any).lieu_naissance,
        pays_naissance: (candidate as any).pays_naissance,
        complement_adresse: (candidate as any).complement_adresse,
      }]).select().single();

      if (profilError) throw profilError;

      const { data: documents } = await supabase
        .from('document')
        .select('*')
        .eq('proprietaire_id', candidate.id)
        .eq('proprietaire_type', 'candidat');

      if (documents && documents.length > 0) {
        const newDocuments = documents.map(doc => ({
          proprietaire_id: profilData.id,
          proprietaire_type: 'profil',
          type: doc.type,
          fichier_url: doc.fichier_url,
          date_emission: doc.date_emission,
          date_expiration: doc.date_expiration,
          statut: doc.statut,
        }));

        await supabase.from('document').insert(newDocuments);
      }

      await supabase.from('candidat').delete().eq('id', candidate.id);

      onSuccess();
    } catch (error) {
      console.error('Erreur conversion:', error);
      alert('Erreur lors de la conversion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Convertir en salarié</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{candidate.prenom} {candidate.nom}</span>
            <br />
            {candidate.email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle / Poste</label>
            <input
              type="text"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date d'entrée</label>
            <input
              type="date"
              required
              value={formData.date_entree}
              onChange={(e) => setFormData({ ...formData, date_entree: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <select
              value={formData.site_id}
              onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Aucun</option>
              {sites.map(site => (
                <option key={site.id} value={site.id}>{site.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
            <select
              value={formData.secteur_id}
              onChange={(e) => setFormData({ ...formData, secteur_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Aucun</option>
              {secteurs.map(secteur => (
                <option key={secteur.id} value={secteur.id}>{secteur.nom}</option>
              ))}
            </select>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Informations bancaires</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IBAN *</label>
                <input
                  type="text"
                  required
                  value={formData.iban}
                  onChange={(e) => { setFormData({ ...formData, iban: e.target.value }); validateIban(e.target.value); }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ibanError ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="FR1420041010050500013M02606"
                />
                {ibanError && <div className="text-red-600 text-sm mt-1">{ibanError}</div>}
                {ibanValidationMessage && <div className="text-green-600 text-sm mt-1">{ibanValidationMessage}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BIC *</label>
                <input
                  type="text"
                  required
                  value={formData.bic}
                  onChange={(e) => setFormData(prev => ({ ...prev, bic: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Auto-rempli après validation IBAN"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Documents et validations</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="visite_medicale"
                  checked={formData.visite_medicale_faite}
                  onChange={(e) => setFormData({ ...formData, visite_medicale_faite: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="visite_medicale" className="ml-2 block text-sm text-gray-900">
                  Visite médicale effectuée
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date du casier judiciaire <span className="text-xs text-gray-500">(doit dater de moins de 3 mois)</span>
                </label>
                <input
                  type="date"
                  value={formData.casier_judiciaire_date}
                  onChange={(e) => setFormData({ ...formData, casier_judiciaire_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                <input
                  type="checkbox"
                  id="dpae"
                  checked={formData.dpae_transmise}
                  onChange={(e) => setFormData({ ...formData, dpae_transmise: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="dpae" className="ml-2 block text-sm font-medium text-gray-900">
                  DPAE transmise au candidat * <span className="text-xs text-gray-600">(requis avant conversion)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || ibanError !== ''}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Conversion...' : 'Convertir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
