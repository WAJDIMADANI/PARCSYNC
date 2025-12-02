import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Camera, FileText, CheckCircle, AlertCircle, X, Loader } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { REQUIRED_DOCUMENTS_MAP } from '../constants/requiredDocuments';

interface MissingDocument {
  type: string;
  label: string;
  icon: any;
  alreadyUploaded?: boolean;
}

export default function UploadAllMissingDocuments() {
  const params = new URLSearchParams(window.location.search);
  const profilId = params.get('profil');
  const token = params.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [profilData, setProfilData] = useState<any>(null);
  const [missingDocuments, setMissingDocuments] = useState<MissingDocument[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set());
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [currentDocumentType, setCurrentDocumentType] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    console.log('🔄 useEffect triggered');
    console.log('🔄 profilId:', profilId);
    console.log('🔄 token:', token);

    if (!profilId || !token) {
      console.error('❌ Lien invalide ou token manquant');
      setError('Lien invalide');
      setLoading(false);
      return;
    }

    console.log('✅ Paramètres valides, appel de loadData()...');
    loadData();
  }, [profilId, token]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadData = async () => {
    console.log('🚀 === DÉBUT DE loadData() ===');
    console.log('🚀 profilId reçu:', profilId);
    console.log('🚀 token reçu:', token);

    try {
      console.log('📞 Appel 1: Vérification du token...');
      const { data: tokenData, error: tokenError } = await supabase
        .from('upload_tokens')
        .select('*')
        .eq('token', token)
        .eq('profil_id', profilId)
        .maybeSingle();

      console.log('📞 Réponse token:', { tokenData, tokenError });

      if (tokenError) throw tokenError;
      if (!tokenData) throw new Error('Lien invalide ou expiré');

      if (new Date(tokenData.expires_at) < new Date()) {
        throw new Error('Ce lien a expiré');
      }

      console.log('✅ Token valide!');
      setTokenValid(true);

      console.log('📞 Appel 2: Récupération du profil...');
      const { data: profil, error: profilError } = await supabase
        .from('profil')
        .select('id, nom, prenom, email')
        .eq('id', profilId)
        .maybeSingle();

      console.log('📞 Réponse profil:', { profil, profilError });

      if (profilError) throw profilError;
      if (!profil) throw new Error('Profil introuvable');

      console.log('✅ Profil trouvé:', profil.prenom, profil.nom);
      setProfilData(profil);

      const requestedDocsParam = params.get('docs');
      let docsToDisplay: MissingDocument[] = [];

      if (requestedDocsParam) {
        console.log('🎯 Paramètre "docs" détecté dans l\'URL:', requestedDocsParam);
        const requestedDocsList = requestedDocsParam.split(',');
        console.log('🎯 Documents demandés:', requestedDocsList);

        console.log('📞 Appel 3: Vérification du statut des documents demandés...');
        const { data: existingDocs, error: docsError } = await supabase
          .from('document')
          .select('type_document')
          .eq('profil_id', profilId)
          .in('type_document', requestedDocsList);

        if (docsError) {
          console.error('❌ Erreur lors de la vérification des documents:', docsError);
        }

        const existingDocTypes = new Set(existingDocs?.map(d => d.type_document) || []);
        console.log('📊 Documents déjà uploadés:', Array.from(existingDocTypes));

        requestedDocsList.forEach((docType: string) => {
          const config = REQUIRED_DOCUMENTS_MAP[docType];
          if (config) {
            const alreadyExists = existingDocTypes.has(docType);
            docsToDisplay.push({
              type: docType,
              label: config.label,
              icon: config.icon,
              alreadyUploaded: alreadyExists
            });
            console.log(`✅ Document ajouté: ${docType} → ${config.label} (${alreadyExists ? 'Déjà uploadé' : 'À uploader'})`);
          } else {
            console.warn('⚠️ Config non trouvée pour le type de document:', docType);
          }
        });

        console.log('🎯 Documents à afficher:', docsToDisplay.length);
      } else {
        console.log('📞 Appel 3: Récupération des documents manquants via RPC...');
        const { data: missingDocsResponse, error: missingError } = await supabase
          .rpc('get_missing_documents_for_profil', { p_profil_id: profilId })
          .single();

        console.log('📞 Réponse RPC brute:', missingDocsResponse);

        if (missingError) {
          console.error('❌ Erreur lors de la récupération des documents manquants:', missingError);
          throw missingError;
        }

        let missingDocsArray;
        if (missingDocsResponse?.missing_documents && Array.isArray(missingDocsResponse.missing_documents)) {
          missingDocsArray = missingDocsResponse.missing_documents;
        } else if (Array.isArray(missingDocsResponse)) {
          missingDocsArray = missingDocsResponse;
        } else {
          missingDocsArray = [];
        }

        console.log('📊 Documents manquants:', missingDocsArray.length);

        if (Array.isArray(missingDocsArray) && missingDocsArray.length > 0) {
          missingDocsArray.forEach((docType: string) => {
            const config = REQUIRED_DOCUMENTS_MAP[docType];
            if (config) {
              docsToDisplay.push({
                type: docType,
                label: config.label,
                icon: config.icon,
                alreadyUploaded: false
              });
            }
          });
        }
      }

      console.log('📊 === RÉSULTAT FINAL ===');
      console.log('📊 Nombre de documents à afficher:', docsToDisplay.length);
      console.log('📊 Documents:', docsToDisplay.map(d => `${d.type} (${d.label}) ${d.alreadyUploaded ? '[Déjà uploadé]' : ''}`).join(', '));

      setMissingDocuments(docsToDisplay);
      console.log('✅ setMissingDocuments appelé avec', docsToDisplay.length, 'documents');

    } catch (err) {
      console.error('❌ === ERREUR DANS loadData() ===');
      console.error('❌ Type:', err);
      console.error('❌ Message:', err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('❌ Stack:', err instanceof Error ? err.stack : 'N/A');
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      console.log('🏁 === FIN DE loadData() - setLoading(false) ===');
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile, documentType);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, documentType: string) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile, documentType);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const validateAndSetFile = (file: File, documentType: string) => {
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      setError('Seuls les fichiers PDF et images sont acceptés');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier ne doit pas dépasser 10 Mo');
      return;
    }
    setSelectedFiles(prev => ({ ...prev, [documentType]: file }));
    setError('');
  };

  const handleCameraCapture = async (documentType: string) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('La capture photo n\'est pas disponible sur ce navigateur');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      setCameraStream(stream);
      setCurrentDocumentType(documentType);
      setShowCameraModal(true);

    } catch (err) {
      console.error('Erreur accès caméra:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
        } else if (err.name === 'NotFoundError') {
          setError('Aucune caméra détectée sur cet appareil.');
        } else {
          setError('Impossible d\'accéder à la caméra: ' + err.message);
        }
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    context?.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], `${currentDocumentType}-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });

      stopCameraStream();

      setSelectedFiles(prev => ({
        ...prev,
        [currentDocumentType]: file
      }));

      setShowCameraModal(false);
    }, 'image/jpeg', 0.9);
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const handleUpload = async (documentType: string) => {
    const file = selectedFiles[documentType];
    if (!file || !profilData) return;

    setUploadingDocs(prev => new Set(prev).add(documentType));
    setError('');
    setSuccessMessage('');

    try {
      console.log('🚀 Début de l\'upload pour:', documentType);

      const fileExt = file.name.split('.').pop();
      const fileName = `${profilData.id}/${documentType}-${Date.now()}.${fileExt}`;

      console.log('📤 Upload du fichier vers le storage...');
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('❌ Erreur storage:', uploadError);
        throw uploadError;
      }

      console.log('✅ Fichier uploadé avec succès');

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      console.log('💾 Insertion dans la base de données...');
      const { error: insertError } = await supabase
        .from('document')
        .insert([{
          owner_type: 'profil',
          owner_id: profilData.id,
          type_document: documentType,
          file_url: urlData.publicUrl,
          file_name: file.name,
          storage_path: fileName,
          bucket: 'documents',
          statut: 'valide'
        }]);

      if (insertError) {
        console.error('❌ Erreur insertion DB:', insertError);
        throw insertError;
      }

      console.log('✅ Document enregistré dans la base de données');

      setUploadedDocs(prev => new Set(prev).add(documentType));

      const newSelectedFiles = { ...selectedFiles };
      delete newSelectedFiles[documentType];
      setSelectedFiles(newSelectedFiles);

      const docConfig = REQUIRED_DOCUMENTS_MAP[documentType];
      const docLabel = docConfig?.label || documentType;
      setSuccessMessage(`${docLabel} a été envoyé avec succès !`);

      console.log('🔄 Rechargement des données du profil...');
      await loadData();
      console.log('✅ Upload terminé avec succès');

    } catch (err) {
      console.error('❌ Erreur upload:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally {
      setUploadingDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentType);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Erreur</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const docsNeedingUpload = missingDocuments.filter(doc => !doc.alreadyUploaded);
  const allDocsCompleted = docsNeedingUpload.length === 0 ||
                           docsNeedingUpload.every(doc => uploadedDocs.has(doc.type));

  if (allDocsCompleted && missingDocuments.length > 0) {
    const hasDocsFilter = params.get('docs');
    const allAlreadyUploaded = docsNeedingUpload.length === 0;

    const successMessage = allAlreadyUploaded
      ? 'Tous les documents demandés ont déjà été envoyés !'
      : hasDocsFilter
      ? 'Tous les documents demandés ont été téléchargés !'
      : 'Tous les documents sont complets !';

    const thankYouMessage = allAlreadyUploaded
      ? 'Les documents que vous avez été invité à envoyer ont déjà été téléchargés précédemment. Aucune action supplémentaire n\'est nécessaire.'
      : hasDocsFilter
      ? 'Merci d\'avoir téléchargé les documents demandés. Votre dossier sera examiné prochainement.'
      : 'Merci d\'avoir téléchargé tous vos documents. Votre dossier est maintenant complet.';

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{successMessage}</h2>
          <p className="text-gray-600">{thankYouMessage}</p>
        </div>
      </div>
    );
  }

  if (missingDocuments.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Tous les documents sont complets !</h2>
          <p className="text-gray-600">Merci d'avoir téléchargé tous vos documents. Votre dossier est maintenant complet.</p>
        </div>
      </div>
    );
  }

  const alreadyUploadedCount = missingDocuments.filter(doc => doc.alreadyUploaded).length;
  const docsToUploadCount = missingDocuments.length - alreadyUploadedCount;
  const totalDocs = missingDocuments.length;
  const completedDocs = alreadyUploadedCount + uploadedDocs.size;
  const documentTitle = totalDocs === 1 ? '📋 Document manquant' : '📋 Documents manquants';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-8 py-6">
            <h1 className="text-3xl font-bold text-white mb-2">{documentTitle}</h1>
            <p className="text-orange-100">Bonjour {profilData?.prenom} {profilData?.nom}</p>
            <div className="mt-4 bg-white/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold">Progression</span>
                <span className="text-white font-bold">{completedDocs} / {totalDocs}</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-green-400 transition-all duration-500 ease-out"
                  style={{ width: `${totalDocs > 0 ? ((completedDocs / totalDocs) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-8">
            {successMessage && (
              <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-green-700 font-semibold">{successMessage}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            <div className="mb-6 bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
              <p className="text-orange-800">
                <strong>📱 Astuce mobile :</strong> Utilisez le bouton "Prendre une photo" pour capturer vos documents directement avec votre caméra !
              </p>
            </div>

            <div className="space-y-6">
              {missingDocuments.map((doc) => {
                const Icon = doc.icon;
                const isUploading = uploadingDocs.has(doc.type);
                const isUploaded = uploadedDocs.has(doc.type);
                const hasFile = selectedFiles[doc.type];
                const alreadyUploaded = doc.alreadyUploaded;

                return (
                  <div key={doc.type} className={`bg-white border-2 rounded-xl p-6 transition-colors ${alreadyUploaded ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-orange-300'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-6 h-6 ${alreadyUploaded ? 'text-green-600' : 'text-orange-600'}`} />
                        <h3 className="text-lg font-bold text-gray-800">{doc.label}</h3>
                      </div>
                      {alreadyUploaded && (
                        <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-semibold">Déjà envoyé</span>
                        </div>
                      )}
                    </div>

                    {alreadyUploaded ? (
                      <div className="bg-green-100 border border-green-300 rounded-lg p-6 text-center">
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                        <p className="text-green-800 font-semibold text-lg">
                          Ce document a déjà été téléchargé
                        </p>
                        <p className="text-green-700 text-sm mt-2">
                          Vous n'avez pas besoin de l'envoyer à nouveau
                        </p>
                      </div>
                    ) : (
                      <>
                    {!hasFile && !isUploaded && (
                      <>
                        <div className={`grid gap-3 mb-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {isMobile ? (
                            <>
                              <button
                                onClick={() => handleCameraCapture(doc.type)}
                                disabled={isUploading}
                                className="flex items-center justify-center gap-2 px-6 py-4 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 text-lg font-bold shadow-lg transition-all"
                              >
                                <Camera className="w-6 h-6" />
                                Prendre une photo
                              </button>

                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  onChange={(e) => handleFileSelect(e, doc.type)}
                                  disabled={isUploading}
                                />
                                <div className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-lg font-bold transition-all">
                                  <Upload className="w-6 h-6" />
                                  Choisir un fichier
                                </div>
                              </label>
                            </>
                          ) : (
                            <>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  onChange={(e) => handleFileSelect(e, doc.type)}
                                  disabled={isUploading}
                                />
                                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all">
                                  <Upload className="w-5 h-5" />
                                  Choisir un fichier
                                </div>
                              </label>

                              <button
                                onClick={() => handleCameraCapture(doc.type)}
                                disabled={isUploading}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-all"
                              >
                                <Camera className="w-5 h-5" />
                                Prendre une photo
                              </button>
                            </>
                          )}
                        </div>

                        <div
                          onDrop={(e) => handleDrop(e, doc.type)}
                          onDragOver={handleDragOver}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 transition-colors"
                        >
                          <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">Ou glissez-déposez votre fichier ici</p>
                        </div>
                      </>
                    )}

                    {hasFile && !isUploaded && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <span className="text-blue-800 font-medium">{hasFile.name}</span>
                          </div>
                          <button
                            onClick={() => {
                              const newFiles = { ...selectedFiles };
                              delete newFiles[doc.type];
                              setSelectedFiles(newFiles);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleUpload(doc.type)}
                          disabled={isUploading}
                          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold"
                        >
                          {isUploading ? (
                            <>
                              <Loader className="w-5 h-5 animate-spin" />
                              Téléchargement en cours...
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5" />
                              Envoyer
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {!alreadyUploaded && isUploaded && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-800 font-medium">Document téléchargé avec succès !</span>
                        </div>
                      </div>
                    )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Prendre une photo</h3>
              <button
                onClick={() => {
                  stopCameraStream();
                  setShowCameraModal(false);
                }}
                className="text-white hover:bg-white/10 rounded-lg p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-auto"
              />

              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[90%] h-[90%] border-2 border-dashed border-white/30 rounded-lg" />
              </div>
            </div>

            <div className="p-6 flex gap-3 justify-center">
              <button
                onClick={() => {
                  stopCameraStream();
                  setShowCameraModal(false);
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={capturePhoto}
                className="flex items-center gap-2 px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold shadow-lg"
              >
                <Camera className="w-5 h-5" />
                Capturer
              </button>
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
}
