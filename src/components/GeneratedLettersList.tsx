import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Plus, Search, Eye, Download, Trash2 } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { GenerateLetterWizard } from './GenerateLetterWizard';
import { LetterPreviewModal } from './LetterPreviewModal';
import { ConfirmModal } from './ConfirmModal';

interface GeneratedLetter {
  id: string;
  profil_id: string;
  modele_nom: string;
  sujet: string;
  contenu_genere: string;
  variables_remplies: Record<string, any>;
  fichier_pdf_url: string | null;
  status: string;
  created_at: string;
  profil?: {
    prenom: string;
    nom: string;
    matricule_tca: string;
  };
}

export function GeneratedLettersList() {
  const [letters, setLetters] = useState<GeneratedLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [previewLetter, setPreviewLetter] = useState<GeneratedLetter | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean, letter: GeneratedLetter | null }>({ show: false, letter: null });

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    try {
      const { data, error } = await supabase
        .from('courrier_genere')
        .select('*, profil:profil_id(prenom, nom, matricule_tca)')
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
    if (!letter.fichier_pdf_url) return;

    try {
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
    } catch (error) {
      console.error('Erreur téléchargement:', error);
    }
  };

  const handleDelete = async (letter: GeneratedLetter) => {
    setDeleteConfirm({ show: true, letter });
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
      l.profil?.matricule_tca?.toLowerCase().includes(searchLower)
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
                  Salarié
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modèle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sujet
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
                    <div className="text-sm font-medium text-gray-900">
                      {letter.profil ? `${letter.profil.prenom} ${letter.profil.nom}` : '-'}
                    </div>
                    {letter.profil?.matricule_tca && (
                      <div className="text-xs text-gray-500">{letter.profil.matricule_tca}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      {letter.modele_nom}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {letter.sujet}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setPreviewLetter(letter)}
                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                        title="Prévisualiser"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {letter.fichier_pdf_url && (
                        <button
                          onClick={() => handleDownload(letter)}
                          className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded"
                          title="Télécharger PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
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
        <GenerateLetterWizard
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
    </div>
  );
}
