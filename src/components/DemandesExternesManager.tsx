import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PermissionGuard } from './PermissionGuard';
import { Mail, Clock, CheckCircle, XCircle, FileText, Download, User, Calendar, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface DemandeExterne {
  id: string;
  profil_id: string;
  pole_id: string;
  sujet: string;
  contenu: string;
  fichiers: { path: string; name: string; size: number }[];
  statut: 'nouveau' | 'en_cours' | 'traite' | 'refuse';
  created_at: string;
  profil: {
    prenom: string;
    nom: string;
    email: string;
    matricule_tca: string;
  };
  poles: {
    nom: string;
  };
}

export function DemandesExternesManager() {
  const [demandes, setDemandes] = useState<DemandeExterne[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'nouveau' | 'en_cours' | 'traite' | 'refuse'>('all');
  const [selectedDemande, setSelectedDemande] = useState<DemandeExterne | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDemandes();

    const channel = supabase
      .channel('demandes_externes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demandes_externes',
        },
        () => {
          fetchDemandes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDemandes = async () => {
    try {
      const { data, error } = await supabase
        .from('demandes_externes')
        .select(`
          *,
          profil:profil_id (prenom, nom, email, matricule_tca),
          poles:pole_id (nom)
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

  const updateStatut = async (demandeId: string, newStatut: string) => {
    setUpdating(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('demandes_externes')
        .update({ statut: newStatut })
        .eq('id', demandeId);

      if (error) throw error;
      await fetchDemandes();
      setSelectedDemande(null);
    } catch (err: any) {
      console.error('Error updating statut:', err);
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('demandes-externes')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading file:', err);
      alert('Erreur lors du téléchargement');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatutBadge = (statut: string) => {
    const styles = {
      nouveau: 'bg-blue-100 text-blue-700',
      en_cours: 'bg-yellow-100 text-yellow-700',
      traite: 'bg-green-100 text-green-700',
      refuse: 'bg-red-100 text-red-700',
    };

    const labels = {
      nouveau: 'Nouveau',
      en_cours: 'En cours',
      traite: 'Traité',
      refuse: 'Refusé',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[statut as keyof typeof styles]}`}>
        {labels[statut as keyof typeof labels]}
      </span>
    );
  };

  const filteredDemandes = filter === 'all'
    ? demandes
    : demandes.filter(d => d.statut === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Chargement des demandes..." />
      </div>
    );
  }

  return (
    <PermissionGuard permission="admin/utilisateurs">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Demandes Externes</h1>
            <p className="text-slate-600 mt-1">Gérez les demandes des chauffeurs externes</p>
          </div>
          <div className="flex items-center gap-2">
            {['all', 'nouveau', 'en_cours', 'traite', 'refuse'].map((f) => {
              const count = f === 'all' ? demandes.length : demandes.filter(d => d.statut === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' ? 'Toutes' : f.replace('_', ' ')} ({count})
                </button>
              );
            })}
          </div>
        </div>

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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Chauffeur
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Pôle
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Sujet
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDemandes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Aucune demande trouvée</p>
                    </td>
                  </tr>
                ) : (
                  filteredDemandes.map((demande) => (
                    <tr key={demande.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {demande.profil.prenom} {demande.profil.nom}
                            </p>
                            <p className="text-sm text-slate-600">
                              Mat. {demande.profil.matricule_tca}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                          {demande.poles.nom}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{demande.sujet}</p>
                        {demande.fichiers.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            {demande.fichiers.length} fichier(s) joint(s)
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4" />
                          {formatDate(demande.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatutBadge(demande.statut)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedDemande(demande)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          Voir détails
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedDemande && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedDemande.sujet}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    De {selectedDemande.profil.prenom} {selectedDemande.profil.nom} - {formatDate(selectedDemande.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDemande(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Chauffeur</p>
                    <p className="font-semibold text-slate-900">
                      {selectedDemande.profil.prenom} {selectedDemande.profil.nom}
                    </p>
                    <p className="text-sm text-slate-600">Mat. {selectedDemande.profil.matricule_tca}</p>
                    <p className="text-sm text-slate-600">{selectedDemande.profil.email}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Pôle destinataire</p>
                    <p className="font-semibold text-slate-900">{selectedDemande.poles.nom}</p>
                    <div className="mt-2">{getStatutBadge(selectedDemande.statut)}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Contenu de la demande</label>
                  <div className="p-4 bg-slate-50 rounded-lg whitespace-pre-wrap">
                    {selectedDemande.contenu}
                  </div>
                </div>

                {selectedDemande.fichiers.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Pièces jointes ({selectedDemande.fichiers.length})
                    </label>
                    <div className="space-y-2">
                      {selectedDemande.fichiers.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">{file.name}</p>
                              <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => downloadFile(file.path, file.name)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Télécharger
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Changer le statut
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['nouveau', 'en_cours', 'traite', 'refuse'].map((statut) => (
                      <button
                        key={statut}
                        onClick={() => updateStatut(selectedDemande.id, statut)}
                        disabled={updating || selectedDemande.statut === statut}
                        className={`px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 ${
                          selectedDemande.statut === statut
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {statut.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200">
                <button
                  onClick={() => setSelectedDemande(null)}
                  className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
