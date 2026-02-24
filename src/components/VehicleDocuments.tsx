import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Upload, Download, Trash2, AlertTriangle, CheckCircle, Calendar, Plus } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface Document {
  id: string;
  type_document: string;
  nom_fichier: string;
  fichier_url: string;
  date_emission: string | null;
  date_expiration: string | null;
  actif: boolean;
  created_at: string;
}

interface VehicleDocumentsProps {
  vehicleId: string;
}

const DOCUMENT_TYPES: Record<string, { label: string; icon: string; requiresExpiration: boolean }> = {
  carte_grise: { label: 'Carte grise', icon: '📄', requiresExpiration: false },
  assurance: { label: 'Assurance', icon: '🛡️', requiresExpiration: true },
  carte_ris: { label: 'Carte CMI', icon: '🚗', requiresExpiration: true },
  controle_technique: { label: 'Contrôle technique', icon: '🔧', requiresExpiration: true },
  autre: { label: 'Autre', icon: '📋', requiresExpiration: false },
};

export function VehicleDocuments({ vehicleId }: VehicleDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [uploadData, setUploadData] = useState({
    date_emission: '',
    date_expiration: '',
  });

  useEffect(() => {
    fetchDocuments();
  }, [vehicleId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('document_vehicule')
        .select('*')
        .eq('vehicule_id', vehicleId)
        .eq('actif', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur chargement documents:', JSON.stringify(error, null, 2));
      console.error('Erreur détaillée:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[VehicleDocuments] Début upload fichier:', file.name, 'Type:', type);
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vehicleId}/${type}-${Date.now()}.${fileExt}`;

      console.log('[VehicleDocuments] Upload vers storage, chemin:', fileName);
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('documents-vehicules')
        .upload(fileName, file);

      if (uploadError) {
        console.error('[VehicleDocuments] Erreur storage upload:', JSON.stringify(uploadError, null, 2));
        throw uploadError;
      }

      console.log('[VehicleDocuments] Upload storage OK, insertion en DB...');
      const { error: dbError } = await supabase
        .from('document_vehicule')
        .insert([{
          vehicule_id: vehicleId,
          type_document: type,
          nom_fichier: file.name,
          fichier_url: fileName,
          date_emission: uploadData.date_emission || null,
          date_expiration: uploadData.date_expiration || null,
        }]);

      if (dbError) {
        console.error('[VehicleDocuments] Erreur insertion DB:', JSON.stringify(dbError, null, 2));
        console.error('[VehicleDocuments] Erreur détaillée:', dbError);
        throw dbError;
      }

      console.log('[VehicleDocuments] Document enregistré avec succès');
      setUploadData({ date_emission: '', date_expiration: '' });
      setSelectedType('');
      await fetchDocuments();
      alert('✓ Document ajouté avec succès');
    } catch (error: any) {
      console.error('[VehicleDocuments] Erreur upload document:', JSON.stringify(error, null, 2));
      console.error('[VehicleDocuments] Erreur détaillée:', error);

      let errorMessage = 'Erreur lors de l\'upload du document';
      if (error?.message?.includes('not found') || error?.statusCode === 404) {
        errorMessage = 'Erreur : Le bucket de stockage n\'existe pas. Exécutez FIX-COMPLET-MODULE-VEHICULES.sql';
      } else if (error?.message) {
        errorMessage = `Erreur : ${error.message}`;
      }

      alert(errorMessage + '\n\nVoir la console (F12) pour plus de détails.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents-vehicules')
        .createSignedUrl(doc.fichier_url, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Voulez-vous vraiment supprimer ce document?')) return;

    try {
      await supabase.storage
        .from('documents-vehicules')
        .remove([doc.fichier_url]);

      const { error } = await supabase
        .from('document_vehicule')
        .update({ actif: false })
        .eq('id', doc.id);

      if (error) throw error;

      fetchDocuments();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getDocumentStatus = (doc: Document) => {
    if (!doc.date_expiration) return null;

    const today = new Date();
    const expiration = new Date(doc.date_expiration);
    const diffDays = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { type: 'expired', label: 'Expiré', color: 'text-red-600', bgColor: 'bg-red-100' };
    } else if (diffDays <= 30) {
      return { type: 'expiring', label: `Expire dans ${diffDays} jours`, color: 'text-orange-600', bgColor: 'bg-orange-100' };
    } else {
      return { type: 'valid', label: 'Valide', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
  };

  const getTypeDocuments = (type: string) => {
    return documents.filter(d => d.type_document === type);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Chargement des documents..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Astuce:</strong> Gardez tous les documents à jour pour éviter les problèmes administratifs.
          Les documents expirant dans moins de 30 jours seront signalés.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {Object.entries(DOCUMENT_TYPES).map(([type, config]) => {
          const typeDocs = getTypeDocuments(type);
          const latestDoc = typeDocs[0];
          const status = latestDoc ? getDocumentStatus(latestDoc) : null;

          return (
            <div key={type} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900">{config.label}</h4>
                    {latestDoc && status && (
                      <div className="flex items-center gap-2 mt-1">
                        {status.type === 'expired' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                        {status.type === 'expiring' && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                        {status.type === 'valid' && <CheckCircle className="w-4 h-4 text-green-600" />}
                        <span className={`text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {!latestDoc && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Manquant
                  </span>
                )}
              </div>

              <div className="p-4 space-y-3">
                {typeDocs.length > 0 ? (
                  <>
                    {typeDocs.map((doc) => {
                      const docStatus = getDocumentStatus(doc);
                      return (
                        <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 mb-1">{doc.nom_fichier}</p>
                              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                {doc.date_emission && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Émis: {new Date(doc.date_emission).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                                {doc.date_expiration && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Expire: {new Date(doc.date_expiration).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                              </div>
                              {docStatus && (
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mt-2 ${docStatus.bgColor} ${docStatus.color}`}>
                                  {docStatus.type === 'expired' && <AlertTriangle className="w-3 h-3" />}
                                  {docStatus.type === 'expiring' && <AlertTriangle className="w-3 h-3" />}
                                  {docStatus.type === 'valid' && <CheckCircle className="w-3 h-3" />}
                                  {docStatus.label}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDownload(doc)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Télécharger"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(doc)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <p className="text-center text-gray-500 py-4">Aucun document de ce type</p>
                )}

                <div className="border-t border-gray-200 pt-3">
                  {selectedType === type ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Date d'émission</label>
                          <input
                            type="date"
                            value={uploadData.date_emission}
                            onChange={(e) => setUploadData({ ...uploadData, date_emission: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {config.requiresExpiration && (
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Date d'expiration</label>
                            <input
                              type="date"
                              value={uploadData.date_expiration}
                              onChange={(e) => setUploadData({ ...uploadData, date_expiration: e.target.value })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <label className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors text-sm">
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? 'Upload en cours...' : 'Choisir un fichier'}
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, type)}
                            disabled={uploading}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => {
                            setSelectedType('');
                            setUploadData({ date_emission: '', date_expiration: '' });
                          }}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedType(type)}
                      className="w-full inline-flex items-center justify-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter un document
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
