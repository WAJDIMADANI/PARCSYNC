import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Plus, Search, Eye, Download, Trash2, Mail, Edit, Copy, Calendar, ChevronDown } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { GenerateLetterV2Wizard } from './GenerateLetterV2Wizard';
import { LetterPreviewModal } from './LetterPreviewModal';
import { ConfirmModal } from './ConfirmModal';
import { SendEmailModal } from './SendEmailModal';
import { EditLetterModal } from './EditLetterModal';
import { StatusChangeModal } from './StatusChangeModal';
import { DownloadWithDateModal } from './DownloadWithDateModal';
import { SuccessNotification } from './SuccessNotification';

interface GeneratedLetter {
  id: string;
  profil_id: string;
  modele_nom: string;
  sujet: string;
  contenu_genere: string;
  variables_remplies: Record<string, any>;
  fichier_pdf_url: string | null;
  status: string;
  canal?: string;
  sent_to?: string | null;
  sent_at?: string | null;
  date_envoi_poste?: string | null;
  created_at: string;
  created_by?: string;
  envoye_par?: string;
  archived?: boolean;
  pdf_generation_method?: string;
  fichier_word_genere_url?: string | null;
  created_by_user?: {
    prenom: string;
    nom: string;
    email: string;
  };
  envoye_par_user?: {
    prenom: string;
    nom: string;
    email: string;
  };
  profil?: {
    prenom: string;
    nom: string;
    matricule_tca: string;
    email: string;
  };
}

export function GeneratedLettersList() {
  const { user } = useAuth();
  const [letters, setLetters] = useState<GeneratedLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [previewLetter, setPreviewLetter] = useState<GeneratedLetter | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean, letter: GeneratedLetter | null }>({ show: false, letter: null });
  const [sendEmailLetter, setSendEmailLetter] = useState<GeneratedLetter | null>(null);
  const [editLetter, setEditLetter] = useState<GeneratedLetter | null>(null);
  const [statusChangeLetter, setStatusChangeLetter] = useState<GeneratedLetter | null>(null);
  const [downloadLetter, setDownloadLetter] = useState<GeneratedLetter | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    try {
      const { data, error } = await supabase
        .from('courrier_genere')
        .select(`
          *,
          profil:profil_id(prenom, nom, matricule_tca, email),
          created_by_user:app_utilisateur!courrier_genere_created_by_fkey(prenom, nom, email),
          envoye_par_user:app_utilisateur!courrier_genere_envoye_par_fkey(prenom, nom, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLetters(data || []);
    } catch (error) {
      console.error('Erreur chargement courriers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (letter: GeneratedLetter) => {
    if (!letter.fichier_pdf_url && !letter.fichier_word_genere_url) return;
    setDownloadLetter(letter);
  };

  const handleDownloadConfirm = async (letter: GeneratedLetter, markAsSent: boolean, dateEnvoi?: Date) => {
    if (!letter.fichier_pdf_url) return;

    try {
      if (markAsSent && dateEnvoi && user) {
        // Récupérer l'ID app_utilisateur à partir de auth.users.id
        const { data: appUser } = await supabase
          .from('app_utilisateur')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        const { error } = await supabase
          .from('courrier_genere')
          .update({
            status: 'envoye',
            date_envoi_poste: dateEnvoi.toISOString(),
            envoye_par: appUser?.id || null
          })
          .eq('id', letter.id);

        if (error) throw error;
        setSuccessMessage('Courrier marqué comme envoyé avec succès!');
        await fetchLetters();
      }

      const response = await fetch(letter.fichier_pdf_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${letter.modele_nom}_${letter.profil?.nom}_${new Date(letter.created_at).toLocaleDateString('fr-FR')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setDownloadLetter(null);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
    }
  };

  const handleDelete = async (letter: GeneratedLetter) => {
    setDeleteConfirm({ show: true, letter });
  };

  const handleDuplicate = async (letter: GeneratedLetter) => {
    try {
      // Récupérer l'utilisateur authentifié
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[duplicate] Auth error:', authError);
        throw authError || new Error('Utilisateur non authentifié');
      }
      console.log('[duplicate] auth uid', user.id);

      // Récupérer l'app_utilisateur.id correspondant
      const { data: appUser, error: appUserError } = await supabase
        .from('app_utilisateur')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (appUserError || !appUser) {
        console.error('[duplicate] app_utilisateur introuvable:', appUserError);
        throw appUserError || new Error('app_utilisateur introuvable pour cet utilisateur');
      }
      console.log('[duplicate] appUser.id', appUser.id);

      const payload = {
        profil_id: letter.profil_id,
        modele_courrier_id: null,
        modele_nom: `${letter.modele_nom} (Copie)`,
        sujet: letter.sujet,
        contenu_genere: letter.contenu_genere,
        variables_remplies: letter.variables_remplies,
        fichier_pdf_url: null,
        status: 'brouillon',
        canal: letter.canal || 'courrier',
        created_by: appUser.id
      };

      console.log('[duplicate] payload.created_by', payload.created_by);

      const { error } = await supabase
        .from('courrier_genere')
        .insert(payload);

      if (error) {
        console.error('[duplicate] insert error', error);
        throw error;
      }

      fetchLetters();
    } catch (error) {
      console.error('Erreur duplication:', error);
    }
  };

  const handleSendEmail = (letter: GeneratedLetter) => {
    setSendEmailLetter(letter);
  };

  const handleEdit = (letter: GeneratedLetter) => {
    setEditLetter(letter);
  };

  const handleEmailSent = async () => {
    await fetchLetters();
    setSendEmailLetter(null);
  };

  const handleEditSaved = async () => {
    await fetchLetters();
    setEditLetter(null);
  };

  const handleStatusChange = async (newStatus: string, dateEnvoi?: Date) => {
    if (!statusChangeLetter) return;

    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'envoye' && dateEnvoi && user) {
        // Récupérer l'ID app_utilisateur à partir de auth.users.id
        const { data: appUser } = await supabase
          .from('app_utilisateur')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        updateData.date_envoi_poste = dateEnvoi.toISOString();
        updateData.envoye_par = appUser?.id || null;
      } else if (newStatus === 'generated') {
        updateData.date_envoi_poste = null;
        updateData.envoye_par = null;
      }

      const { error } = await supabase
        .from('courrier_genere')
        .update(updateData)
        .eq('id', statusChangeLetter.id);

      if (error) throw error;

      setSuccessMessage(`Statut changé en "${newStatus === 'envoye' ? 'Envoyé' : 'Généré'}" avec succès!`);
      await fetchLetters();
      setStatusChangeLetter(null);
    } catch (error) {
      console.error('Erreur changement statut:', error);
    }
  };

  const openStatusMenu = (letter: GeneratedLetter) => {
    setStatusChangeLetter(letter);
    setShowStatusDropdown(null);
  };

  const getStatusBadge = (status: string, sent_at?: string | null, date_envoi_poste?: string | null) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'brouillon': { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
      'generated': { label: 'Généré', color: 'bg-blue-100 text-blue-700' },
      'pret': { label: 'Prêt', color: 'bg-blue-100 text-blue-700' },
      'envoye': { label: 'Envoyé', color: 'bg-green-100 text-green-700' },
      'erreur': { label: 'Erreur', color: 'bg-red-100 text-red-700' }
    };

    const statusInfo = statusMap[status] || statusMap['generated'];

    if (sent_at || status === 'envoye') {
      return {
        label: 'Envoyé',
        color: 'bg-green-100 text-green-700',
        date: date_envoi_poste
      };
    }

    return { ...statusInfo, date: null };
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.letter) return;

    try {
      const { error } = await supabase
        .from('courrier_genere')
        .delete()
        .eq('id', deleteConfirm.letter.id);

      if (error) throw error;
      fetchLetters();
    } catch (error) {
      console.error('Erreur suppression:', error);
    } finally {
      setDeleteConfirm({ show: false, letter: null });
    }
  };

  const filteredLetters = letters.filter(l => {
    const searchLower = search.toLowerCase();
    return (
      l.modele_nom.toLowerCase().includes(searchLower) ||
      l.sujet.toLowerCase().includes(searchLower) ||
      `${l.profil?.prenom} ${l.profil?.nom}`.toLowerCase().includes(searchLower) ||
      l.profil?.matricule_tca?.toLowerCase().includes(searchLower) ||
      `${l.created_by_user?.prenom} ${l.created_by_user?.nom}`.toLowerCase().includes(searchLower) ||
      `${l.envoye_par_user?.prenom} ${l.envoye_par_user?.nom}`.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des courriers..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Courriers Générés</h1>
            <p className="text-gray-600 mt-1">Courriers créés depuis les modèles personnalisables</p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Générer un courrier
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total de courriers</div>
            <div className="text-2xl font-bold text-gray-900">{letters.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Ce mois</div>
            <div className="text-2xl font-bold text-blue-600">
              {letters.filter(l => {
                const date = new Date(l.created_at);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Cette semaine</div>
            <div className="text-2xl font-bold text-green-600">
              {letters.filter(l => {
                const date = new Date(l.created_at);
                const now = new Date();
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return date >= weekAgo;
              }).length}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un courrier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredLetters.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">Aucun courrier généré</p>
          <p className="text-gray-500 text-sm mb-4">
            Créez votre premier courrier depuis un modèle
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Générer un courrier
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Créé par
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salarié
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Modèle
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Sujet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLetters.map((letter) => (
                <tr key={letter.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>
                      {new Date(letter.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(letter.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {letter.created_by_user
                        ? `${letter.created_by_user.prenom} ${letter.created_by_user.nom}`
                        : '-'
                      }
                    </div>
                    {letter.created_by_user?.email && (
                      <div className="text-xs text-gray-500">{letter.created_by_user.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {letter.profil ? `${letter.profil.prenom} ${letter.profil.nom}` : '-'}
                    </div>
                    {letter.profil?.matricule_tca && (
                      <div className="text-xs text-gray-500">{letter.profil.matricule_tca}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 max-w-[120px] truncate block" title={letter.modele_nom}>
                        {letter.modele_nom}
                      </span>
                      {letter.archived && letter.pdf_generation_method === 'word_legacy' && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-amber-100 text-amber-700 flex items-center gap-1">
                          📄 Archivé
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    <div className="max-w-[150px] truncate" title={letter.sujet}>
                      {letter.sujet}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openStatusMenu(letter)}
                          className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 hover:opacity-80 transition-all ${getStatusBadge(letter.status, letter.sent_at, letter.date_envoi_poste).color}`}
                        >
                          {getStatusBadge(letter.status, letter.sent_at, letter.date_envoi_poste).label}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {letter.date_envoi_poste && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(letter.date_envoi_poste).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                      </div>
                      {letter.envoye_par_user && (letter.status === 'envoye' || letter.sent_at) && (
                        <div className="text-xs text-gray-500">
                          Envoyé par {letter.envoye_par_user.prenom} {letter.envoye_par_user.nom}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => setPreviewLetter(letter)}
                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                        title="Prévisualiser"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(letter.status === 'brouillon' || !letter.sent_at) && (
                        <button
                          onClick={() => handleEdit(letter)}
                          className="text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-50 rounded"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {letter.fichier_pdf_url && (
                        <button
                          onClick={() => handleDownload(letter)}
                          className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded"
                          title="Télécharger PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {letter.fichier_pdf_url && !letter.sent_at && letter.profil?.email && (
                        <button
                          onClick={() => handleSendEmail(letter)}
                          className="text-orange-600 hover:text-orange-800 p-1 hover:bg-orange-50 rounded"
                          title="Envoyer par email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicate(letter)}
                        className="text-cyan-600 hover:text-cyan-800 p-1 hover:bg-cyan-50 rounded"
                        title="Dupliquer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(letter)}
                        className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
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
      )}

      {showWizard && (
        <GenerateLetterV2Wizard
          onClose={() => setShowWizard(false)}
          onComplete={() => {
            setShowWizard(false);
            fetchLetters();
          }}
        />
      )}

      {previewLetter && (
        <LetterPreviewModal
          letter={previewLetter}
          onClose={() => setPreviewLetter(null)}
          onDownload={() => handleDownload(previewLetter)}
        />
      )}

      {deleteConfirm.show && deleteConfirm.letter && (
        <ConfirmModal
          isOpen={deleteConfirm.show}
          title="Supprimer le courrier"
          message={`Êtes-vous sûr de vouloir supprimer ce courrier pour ${deleteConfirm.letter.profil?.prenom} ${deleteConfirm.letter.profil?.nom} ? Cette action est irréversible.`}
          confirmText="Supprimer"
          type="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm({ show: false, letter: null })}
        />
      )}

      {sendEmailLetter && sendEmailLetter.profil && (
        <SendEmailModal
          letter={sendEmailLetter}
          profil={sendEmailLetter.profil}
          onClose={() => setSendEmailLetter(null)}
          onSuccess={handleEmailSent}
        />
      )}

      {editLetter && (
        <EditLetterModal
          letter={editLetter}
          onClose={() => setEditLetter(null)}
          onSave={handleEditSaved}
        />
      )}

      {statusChangeLetter && (
        <StatusChangeModal
          isOpen={true}
          currentStatus={statusChangeLetter.status}
          onConfirm={handleStatusChange}
          onCancel={() => setStatusChangeLetter(null)}
          letterSubject={statusChangeLetter.sujet}
        />
      )}

      {downloadLetter && (
        <DownloadWithDateModal
          isOpen={true}
          onConfirm={(markAsSent, dateEnvoi) => handleDownloadConfirm(downloadLetter, markAsSent, dateEnvoi)}
          onCancel={() => setDownloadLetter(null)}
          letterSubject={downloadLetter.sujet}
        />
      )}

      {successMessage && (
        <SuccessNotification
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />
      )}
    </div>
  );
}
