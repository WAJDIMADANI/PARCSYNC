import { useState, useEffect } from 'react';
import { supabase, getStorageUrl } from '../lib/supabase';
import { FileText, Trash2, UserX } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { onVoirDocument } from '../lib/documentStorage';

interface Candidate {
  id: string;
  prenom: string;
  nom: string;
  email: string;
}

interface Document {
  id: string;
  proprietaire_id: string;
  proprietaire_type: string;
  type: string;
  fichier_url?: string;
  storage_path?: string;
  bucket?: string;
  created_at: string;
}


const DOCUMENT_TYPES = [
  { value: 'cv', label: 'CV' },
  { value: 'lettre_motivation', label: 'Lettre de motivation' },
  { value: 'ci_recto', label: 'CI Recto' },
  { value: 'ci_verso', label: 'CI Verso' },
  { value: 'rib', label: 'RIB' },
  { value: 'attestation_secu', label: 'Attestation Sécurité Sociale' },
  { value: 'permis_recto', label: 'Permis Recto' },
  { value: 'permis_verso', label: 'Permis Verso' },
  { value: 'autres', label: 'Autres' },
];

export function DocumentsManager() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [candidatesRes, documentsRes] = await Promise.all([
        supabase.from('candidat').select('id, prenom, nom, email').is('deleted_at', null).order('nom'),
        supabase.from('document').select('*').eq('proprietaire_type', 'candidat').order('created_at', { ascending: false })
      ]);

      if (candidatesRes.error) throw candidatesRes.error;
      if (documentsRes.error) throw documentsRes.error;

      const activeCandidates = candidatesRes.data || [];
      const activeCandidateIds = new Set(activeCandidates.map(c => c.id));

      // Filter documents to only show those belonging to active candidates
      const filteredDocuments = (documentsRes.data || []).filter(doc =>
        activeCandidateIds.has(doc.proprietaire_id)
      );

      setCandidates(activeCandidates);
      setDocuments(filteredDocuments);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (candidatId: string, type: string, file: File) => {
    setUploading(true);
    try {
      const fileName = `candidat_${candidatId}/${type}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('document').insert([{
        proprietaire_type: 'candidat',
        proprietaire_id: candidatId,
        type: type,
        fichier_url: fileName,
        date_emission: null,
        date_expiration: null
      }]);

      if (insertError) throw insertError;

      alert('Document uploadé avec succès');
      fetchData();
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, fileUrl: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer ce document',
      message: 'Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const pathMatch = fileUrl.match(/documents\/(.+)$/);
          if (pathMatch) {
            await supabase.storage.from('documents').remove([pathMatch[1]]);
          }

          const { error } = await supabase.from('document').delete().eq('id', docId);
          if (error) throw error;

          fetchData();
        } catch (error) {
          console.error('Erreur suppression:', error);
          alert('Erreur lors de la suppression');
        }
      }
    });
  };

  const handleViewDocument = async (doc: Document) => {
    await onVoirDocument(doc);
  };

  const handleDeleteCandidate = async (candidatId: string, candidateName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer définitivement le candidat',
      message: `Êtes-vous sûr de vouloir supprimer ${candidateName} et tous ses documents ? Cette action est irréversible et supprimera définitivement toutes les données associées.`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          // Get all documents for this candidate
          const candidateDocs = documents.filter(d => d.proprietaire_id === candidatId);

          // Delete all files from storage
          for (const doc of candidateDocs) {
            const pathMatch = doc.fichier_url.match(/documents\/(.+)$/);
            if (pathMatch) {
              await supabase.storage.from('documents').remove([pathMatch[1]]);
            }
          }

          // Delete all documents from database
          await supabase.from('document').delete().eq('proprietaire_id', candidatId);

          // Soft delete the candidate
          const { error } = await supabase
            .from('candidat')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', candidatId);

          if (error) throw error;

          fetchData();
        } catch (error) {
          console.error('Erreur suppression candidat:', error);
          alert('Erreur lors de la suppression du candidat');
        }
      }
    });
  };

  const getCandidateDocuments = (candidatId: string) => {
    return documents.filter(d => d.proprietaire_id === candidatId && d.proprietaire_type === 'candidat');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        type="danger"
      />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Documents</h1>
        <p className="text-gray-600 mt-1">{documents.length} document(s) au total</p>
      </div>

      <div className="space-y-6">
        {candidates.map(candidate => {
          const candidateDocs = getCandidateDocuments(candidate.id);
          const uploadedTypes = candidateDocs.map(d => d.type);
          const missingDocs = DOCUMENT_TYPES.filter(dt => !uploadedTypes.includes(dt.value));

          return (
            <div key={candidate.id} className="bg-white rounded-lg shadow-soft p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {candidate.prenom} {candidate.nom}
                  </h2>
                  <p className="text-sm text-gray-600">{candidate.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    missingDocs.length === 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {candidateDocs.length}/{DOCUMENT_TYPES.length} documents
                  </span>
                  <button
                    onClick={() => handleDeleteCandidate(candidate.id, `${candidate.prenom} ${candidate.nom}`)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer le candidat"
                  >
                    <UserX className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </div>

              {candidateDocs.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Documents reçus</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {candidateDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {DOCUMENT_TYPES.find(dt => dt.value === doc.type)?.label || doc.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleViewDocument(doc)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Voir"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id, doc.fichier_url || doc.storage_path || '')}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {missingDocs.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Documents manquants</h3>
                  <div className="flex flex-wrap gap-2">
                    {missingDocs.map(docType => (
                      <span
                        key={docType.value}
                        className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-sm"
                      >
                        {docType.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
