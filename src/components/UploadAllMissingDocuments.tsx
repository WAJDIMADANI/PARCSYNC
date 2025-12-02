import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Camera, FileText, CheckCircle, AlertCircle, X, Loader, CreditCard, Car, Heart, Briefcase } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface MissingDocument {
  type: string;
  label: string;
  icon: any;
}

const DOCUMENT_CONFIG: Record<string, { label: string; icon: any }> = {
  'permis_recto': { label: 'Permis de conduire (Recto)', icon: Car },
  'permis_verso': { label: 'Permis de conduire (Verso)', icon: Car },
  'cni_recto': { label: 'Carte d\'identité (Recto)', icon: CreditCard },
  'cni_verso': { label: 'Carte d\'identité (Verso)', icon: CreditCard },
  'carte_vitale': { label: 'Carte vitale', icon: CreditCard },
  'certificat_medical': { label: 'Certificat médical', icon: Heart },
  'rib': { label: 'RIB', icon: Briefcase },
};

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

      console.log('📞 Appel 3: Récupération des documents manquants via RPC...');
      console.log('📞 Paramètres RPC: { p_profil_id:', profilId, '}');

      const { data: missingDocsResponse, error: missingError } = await supabase
        .rpc('get_missing_documents_for_profil', { p_profil_id: profilId })
        .single();

      console.log('📞 Réponse RPC brute:', missingDocsResponse);
      console.log('📞 Erreur RPC:', missingError);

      if (missingError) {
        console.error('❌ Erreur lors de la récupération des documents manquants:', missingError);
        throw missingError;
      }

      console.log('📊 === ANALYSE DE LA RÉPONSE RPC ===');
      console.log('📊 Type:', typeof missingDocsResponse);
      console.log('📊 Est un Array?', Array.isArray(missingDocsResponse));
      console.log('📊 Clés disponibles:', Object.keys(missingDocsResponse || {}));
      console.log('📊 Contenu complet:', JSON.stringify(missingDocsResponse, null, 2));

      // Essayer différentes structures possibles
      let missingDocsArray;
      if (Array.isArray(missingDocsResponse)) {
        console.log('📊 Structure: Array directement');
        missingDocsArray = missingDocsResponse;
      } else if (missingDocsResponse?.missing_documents) {
        console.log('📊 Structure: Objet avec clé "missing_documents"');
        missingDocsArray = missingDocsResponse.missing_documents;
      } else {
        console.log('📊 Structure: Inconnue, utilisation d\'un tableau vide');
        missingDocsArray = [];
      }

      console.log('📊 Array final à traiter:', missingDocsArray);
      console.log('📊 Longueur:', missingDocsArray.length);

      const docsArray: MissingDocument[] = [];

      if (Array.isArray(missingDocsArray) && missingDocsArray.length > 0) {
        console.log('📊 Traitement de', missingDocsArray.length, 'documents...');
        missingDocsArray.forEach((docType: string, index: number) => {
          console.log(`📊 [${index + 1}/${missingDocsArray.length}] Traitement du type:`, docType);
          const config = DOCUMENT_CONFIG[docType];
          if (config) {
            docsArray.push({
              type: docType,
              label: config.label,
              icon: config.icon
            });
            console.log('✅ Document ajouté:', docType, '→', config.label);
          } else {
            console.warn('⚠️ Config non trouvée pour le type de document:', docType);
            console.warn('⚠️ Types disponibles dans DOCUMENT_CONFIG:', Object.keys(DOCUMENT_CONFIG));
          }
        });
      } else {
        console.log('⚠️ Aucun document manquant ou format invalide');
      }

      console.log('📊 === RÉSULTAT FINAL ===');
      console.log('📊 Nombre de documents à afficher:', docsArray.length);
      console.log('📊 Documents:', docsArray.map(d => `${d.type} (${d.label})`).join(', '));
      console.log('📊 === FIN DE L\'ANALYSE ===');

      setMissingDocuments(docsArray);
      console.log('✅ setMissingDocuments appelé avec', docsArray.length, 'documents');

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

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profilData.id}/${documentType}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('document')
        .insert([{
          owner_type: 'profil',
          owner_id: profilData.id,
          type_document: documentType,
          url: urlData.publicUrl,
          nom_fichier: file.name,
        }]);

      if (insertError) throw insertError;

      setUploadedDocs(prev => new Set(prev).add(documentType));
      setMissingDocuments(prev => prev.filter(doc => doc.type !== documentType));

      const newSelectedFiles = { ...selectedFiles };
      delete newSelectedFiles[documentType];
      setSelectedFiles(newSelectedFiles);

    } catch (err) {
      console.error('Erreur upload:', err);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-8 py-6">
            <h1 className="text-3xl font-bold text-white mb-2">📋 Documents manquants</h1>
            <p className="text-orange-100">Bonjour {profilData?.prenom} {profilData?.nom}</p>
          </div>

          <div className="p-8">
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

                return (
                  <div key={doc.type} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-orange-300 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className="w-6 h-6 text-orange-600" />
                      <h3 className="text-lg font-bold text-gray-800">{doc.label}</h3>
                    </div>

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

                    {isUploaded && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-800 font-medium">Document téléchargé avec succès !</span>
                        </div>
                      </div>
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
