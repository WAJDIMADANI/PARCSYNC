import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { ConfirmModal } from './ConfirmModal';
import { GENRE_OPTIONS } from '../constants/genreOptions';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';

const STATUT_CANDIDATURE = [
  { value: 'candidature_recue', label: 'Candidature reçue' },
  { value: 'vivier', label: 'Vivier' },
  { value: 'entretien', label: 'Entretien' },
  { value: 'pre_embauche', label: 'Pré-embauche' },
  { value: 'candidature_rejetee', label: 'Candidature rejetée' }
];

interface VivierCandidate {
  id: string;
  candidat_id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  email: string | null;
  poste_souhaite: string | null;
  date_disponibilite: string | null;
  mois_disponibilite: string | null;
  created_at: string;
  updated_at: string;
  statut_candidature?: string;
  candidat_ville?: string;
  candidat_code_postal?: string;
  candidat_department_code?: string;
}

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

interface FullCandidate {
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
  complement_adresse?: string;
  code_postal?: string;
  ville?: string;
  department_code?: string;
  genre?: string;
  date_naissance?: string;
  nom_naissance?: string;
  lieu_naissance?: string;
  pays_naissance?: string;
  nationalite?: string;
  numero_securite_sociale?: string;
  date_permis_conduire?: string;
  type_piece_identite?: string;
  date_fin_validite_piece?: string;
  cv_url?: string;
  lettre_motivation_url?: string;
  carte_identite_recto_url?: string;
  carte_identite_verso_url?: string;
  consent_rgpd_at?: string;
  poste?: string;
  statut_candidature?: string;
  code_couleur_rh?: string;
  note_interne?: string | null;
}

export function VivierList() {
  const [candidates, setCandidates] = useState<VivierCandidate[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [fullCandidate, setFullCandidate] = useState<FullCandidate | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'date_disponibilite' | 'nom' | 'prenom'; direction: 'asc' | 'desc' }>({
    key: 'date_disponibilite',
    direction: 'asc',
  });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; newStatus: string; candidateId: string } | null>(null);
  const [departementFilter, setDepartementFilter] = useState<string>('');
  const [availableDepartements, setAvailableDepartements] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCandidateId) {
      fetchFullCandidate(selectedCandidateId);
    }
  }, [selectedCandidateId]);

  const fetchData = async () => {
    try {
      // Récupérer directement depuis la table candidat avec statut_candidature = 'vivier'
      const { data: candidatsData, error: candidatsError } = await supabase
        .from('candidat')
        .select('*')
        .eq('statut_candidature', 'vivier')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (candidatsError) throw candidatsError;

      // Transformer les données pour matcher le format attendu par le composant
      const vivierData = candidatsData?.map(c => ({
        candidat_id: c.id,
        candidat_nom: c.nom,
        candidat_prenom: c.prenom,
        candidat_email: c.email,
        candidat_telephone: c.tel,
        candidat_poste: c.poste,
        candidat_department_code: c.department_code,
        statut_candidature: c.statut_candidature || 'vivier',
        created_at: c.created_at,
        // Inclure tous les champs du candidat pour l'édition
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        email: c.email,
        tel: c.tel,
        poste: c.poste,
        department_code: c.department_code,
        adresse: c.adresse,
        code_postal: c.code_postal,
        ville: c.ville,
        genre: c.genre,
        date_naissance: c.date_naissance,
        nationalite: c.nationalite,
        date_permis_conduire: c.date_permis_conduire,
        cv_url: c.cv_url,
        lettre_motivation_url: c.lettre_motivation_url,
        carte_identite_recto_url: c.carte_identite_recto_url,
        carte_identite_verso_url: c.carte_identite_verso_url,
        site_id: c.site_id,
        secteur_id: c.secteur_id,
        type_piece_identite: c.type_piece_identite,
        date_fin_validite_piece: c.date_fin_validite_piece,
        code_couleur_rh: c.code_couleur_rh,
        note_interne: c.note_interne
      })) || [];

      // Extraire les départements uniques pour le filtre
      const depts = [...new Set(
        vivierData
          .map(v => v.candidat_department_code)
          .filter(d => d)
      )].sort();

      const [sitesRes, secteursRes, postesRes] = await Promise.all([
        supabase.from('site').select('*').order('nom'),
        supabase.from('secteur').select('*').order('nom'),
        supabase.from('poste').select('id, nom, description').eq('actif', true).order('nom')
      ]);

      if (sitesRes.error) throw sitesRes.error;
      if (secteursRes.error) throw secteursRes.error;
      if (postesRes.error) throw postesRes.error;

      setCandidates(vivierData);
      setAvailableDepartements(depts as string[]);
      setSites(sitesRes.data || []);
      setSecteurs(secteursRes.data || []);
      setPostes(postesRes.data || []);
    } catch (error) {
      console.error('Erreur chargement vivier:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFullCandidate = async (candidatId: string) => {
    try {
      const { data, error } = await supabase
        .from('candidat')
        .select('*')
        .eq('id', candidatId)
        .single();

      if (error) throw error;
      setFullCandidate(data);
    } catch (error) {
      console.error('Erreur chargement candidat complet:', error);
    }
  };

  const formatDisponibilite = (candidate: VivierCandidate): string => {
    if (candidate.date_disponibilite) {
      const date = new Date(candidate.date_disponibilite);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    if (candidate.mois_disponibilite) {
      const [year, month] = candidate.mois_disponibilite.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    return '-';
  };

  const getDisponibiliteSortValue = (candidate: VivierCandidate): number => {
    if (candidate.date_disponibilite) {
      return new Date(candidate.date_disponibilite).getTime();
    }
    if (candidate.mois_disponibilite) {
      return new Date(candidate.mois_disponibilite + '-01').getTime();
    }
    return 0;
  };

  const handleSort = (key: 'date_disponibilite' | 'nom' | 'prenom') => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedCandidates = [...candidates].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    if (sortConfig.key === 'date_disponibilite') {
      aValue = getDisponibiliteSortValue(a);
      bValue = getDisponibiliteSortValue(b);
    } else {
      aValue = a[sortConfig.key]?.toLowerCase() || '';
      bValue = b[sortConfig.key]?.toLowerCase() || '';
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredCandidates = sortedCandidates
    .filter((cand) => {
      const matchesSearch = `${cand.prenom} ${cand.nom} ${cand.email} ${cand.poste_souhaite}`.toLowerCase().includes(search.toLowerCase());
      const matchesDepartment = !departementFilter || cand.candidat_department_code === departementFilter;
      return matchesSearch && matchesDepartment;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement du vivier..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vivier</h1>
          <p className="text-gray-600 mt-1">{candidates.length} candidat(s) dans le vivier</p>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un candidat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="w-56">
          <select
            value={departementFilter}
            onChange={(e) => setDepartementFilter(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Tous les départements</option>
            {availableDepartements.map((dept) => (
              <option key={dept} value={dept}>
                Département {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">Aucun candidat dans le vivier</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-100 min-w-[1200px]">
              <thead className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50">
                <tr>
                  <th
                    className="w-32 px-2 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-50 transition-all duration-200"
                    onClick={() => handleSort('nom')}
                  >
                    <div className="flex items-center gap-1">
                      Nom
                      {sortConfig.key === 'nom' && (
                        <span className="text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="w-32 px-2 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-50 transition-all duration-200"
                    onClick={() => handleSort('prenom')}
                  >
                    <div className="flex items-center gap-1">
                      Prénom
                      {sortConfig.key === 'prenom' && (
                        <span className="text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="w-28 px-1 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Ville
                  </th>
                  <th className="w-16 px-1 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Dép.
                  </th>
                  <th className="w-28 px-1 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Téléphone
                  </th>
                  <th className="w-36 px-2 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Poste souhaité
                  </th>
                  <th
                    className="w-32 px-2 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-50 transition-all duration-200"
                    onClick={() => handleSort('date_disponibilite')}
                  >
                    <div className="flex items-center gap-1">
                      Disponibilité
                      {sortConfig.key === 'date_disponibilite' && (
                        <span className="text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="w-20 px-1 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Docs
                  </th>
                  <th className="w-44 px-2 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredCandidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:via-sky-50 hover:to-blue-50 cursor-pointer transition-all duration-200 group border-l-4 border-transparent hover:border-l-blue-500 hover:shadow-lg"
                  onClick={() => setSelectedCandidateId(candidate.candidat_id)}
                >
                  <td className="px-2 py-2 text-sm font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                    <div className="truncate" title={candidate.nom}>{candidate.nom}</div>
                  </td>
                  <td className="px-2 py-2 text-sm font-medium text-gray-900 group-hover:text-blue-900 transition-colors">
                    <div className="truncate" title={candidate.prenom}>{candidate.prenom}</div>
                  </td>
                  <td className="px-1 py-2 text-xs font-medium text-gray-600 group-hover:text-blue-700 transition-colors truncate" title={candidate.candidat_ville || candidate.ville || '-'}>
                    {candidate.candidat_ville || candidate.ville || '-'}
                  </td>
                  <td className="px-1 py-2 text-xs font-medium text-gray-600 group-hover:text-blue-700 transition-colors truncate">
                    {candidate.candidat_department_code || candidate.department_code || '-'}
                  </td>
                  <td className="px-1 py-2 text-xs font-medium text-gray-600 group-hover:text-blue-700 transition-colors truncate">
                    {candidate.tel || candidate.telephone || '-'}
                  </td>
                  <td className="px-2 py-2 text-sm font-medium text-gray-700 group-hover:text-blue-800 transition-colors">
                    <div className="truncate" title={candidate.poste || candidate.poste_souhaite || '-'}>{candidate.poste || candidate.poste_souhaite || '-'}</div>
                  </td>
                  <td className="px-2 py-2 text-xs font-medium text-gray-900 group-hover:text-blue-900 transition-colors">
                    <div className="truncate" title={formatDisponibilite(candidate)}>{formatDisponibilite(candidate)}</div>
                  </td>
                  <td className="px-1 py-2">
                    {(!candidate.cv_url && !candidate.lettre_motivation_url && !candidate.carte_identite_recto_url && !candidate.carte_identite_verso_url) ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300 whitespace-nowrap">
                        KO
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-300 whitespace-nowrap">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={candidate.statut_candidature || 'vivier'}
                      onChange={async (e) => {
                        try {
                          await supabase
                            .from('candidat')
                            .update({ statut_candidature: e.target.value })
                            .eq('id', candidate.candidat_id);
                          fetchData();
                        } catch (error) {
                          console.error('Erreur mise à jour statut:', error);
                        }
                      }}
                      className="text-[11px] border border-gray-200 rounded-md px-1.5 py-1 focus:ring-1 focus:ring-blue-400 focus:border-blue-500 bg-white hover:border-gray-300 transition-all w-full font-medium"
                    >
                      {STATUT_CANDIDATURE.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {fullCandidate && (
        <CandidateModal
          candidate={fullCandidate}
          sites={sites}
          secteurs={secteurs}
          postes={postes}
          onClose={() => {
            setSelectedCandidateId(null);
            setFullCandidate(null);
          }}
          onSuccess={() => {
            setSelectedCandidateId(null);
            setFullCandidate(null);
            fetchData();
          }}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title="Confirmer le changement de statut"
          message="Voulez-vous vraiment changer le statut de ce candidat ?"
          confirmText="Confirmer"
          cancelText="Annuler"
          type="info"
          onConfirm={async () => {
            try {
              await supabase
                .from('candidat')
                .update({ statut_candidature: confirmModal.newStatus })
                .eq('id', confirmModal.candidateId);

              if (confirmModal.newStatus !== 'vivier') {
                await supabase
                  .from('vivier')
                  .delete()
                  .eq('candidat_id', confirmModal.candidateId);
              }

              setConfirmModal(null);
              setSelectedCandidateId(null);
              setFullCandidate(null);
              fetchData();
            } catch (error) {
              console.error('Erreur mise à jour statut:', error);
              alert('Erreur lors de la mise à jour du statut');
            }
          }}
          onCancel={() => {
            setConfirmModal(null);
            fetchData();
          }}
        />
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
  candidate: FullCandidate;
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
  const [isViewMode, setIsViewMode] = useState(true);
  const [signedUrls, setSignedUrls] = useState<{
    cv?: string;
    lettre_motivation?: string;
    carte_identite_recto?: string;
    carte_identite_verso?: string;
  }>({});

  useEffect(() => {
    if (candidate) {
      generateSignedUrls();
    }
  }, [candidate]);

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
      // Mettre à jour le candidat
      const { error } = await supabase
        .from('candidat')
        .update(formData)
        .eq('id', candidate.id);
      if (error) throw error;

      // Si le statut change et n'est plus 'vivier', supprimer de la table vivier
      if (formData.statut_candidature !== 'vivier') {
        const { error: deleteError } = await supabase
          .from('vivier')
          .delete()
          .eq('candidat_id', candidate.id);
        if (deleteError) throw deleteError;
      }

      onSuccess();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'opération');
    } finally {
      setLoading(false);
    }
  };

  const STATUT_CANDIDATURE = [
    { value: 'candidature_recue', label: 'Candidature reçue' },
    { value: 'entretien', label: 'Entretien' },
    { value: 'pre_embauche', label: 'Pré-embauche' },
    { value: 'salarie', label: 'Salarié' },
    { value: 'vivier', label: 'Vivier' },
    { value: 'candidature_rejetee', label: 'Candidature rejetée' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isViewMode ? 'Fiche candidat - Vivier' : 'Modifier le candidat'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isViewMode && (
          <div className="mb-4">
            <button
              onClick={() => setIsViewMode(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Modifier
            </button>
          </div>
        )}

        {candidate.ville && candidate.department_code && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Localisation:</span> {candidate.ville} ({candidate.department_code})
            </p>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poste</label>
              <input
                type="text"
                disabled={isViewMode}
                value={formData.poste}
                onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
              <select
                disabled={isViewMode}
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Sélectionner</option>
                {GENRE_OPTIONS.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
              <input
                type="date"
                disabled={isViewMode}
                value={formData.date_naissance}
                onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Date permis de conduire</label>
              <input
                type="date"
                disabled={isViewMode}
                value={formData.date_permis_conduire}
                onChange={(e) => setFormData({ ...formData, date_permis_conduire: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            {candidate?.type_piece_identite === 'carte_sejour' && candidate?.date_fin_validite_piece && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin validité carte séjour</label>
                <input
                  type="date"
                  disabled
                  value={candidate.date_fin_validite_piece}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
            )}
          </div>

          <div>
            {isViewMode ? (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  disabled={true}
                  value={formData.adresse}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                />
              </>
            ) : (
              <AddressAutocompleteInput
                label="Adresse"
                value={formData.adresse}
                onChange={(value) => setFormData({ ...formData, adresse: value })}
                onAddressSelect={(data) => {
                  setFormData({
                    ...formData,
                    adresse: data.adresse,
                    code_postal: data.code_postal,
                    ville: data.ville,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tapez votre adresse..."
              />
            )}
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

          {!isViewMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut candidature</label>
              <select
                value={candidate.statut_candidature || 'candidature_recue'}
                onChange={(e) => {
                  setConfirmModal({
                    isOpen: true,
                    newStatus: e.target.value,
                    candidateId: candidate.id
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STATUT_CANDIDATURE.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

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

          {candidate && candidate.note_interne && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Note interne RH</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{candidate.note_interne}</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">Cette note est uniquement visible par l'équipe RH</p>
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
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'En cours...' : 'Modifier'}
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
