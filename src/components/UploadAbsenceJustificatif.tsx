import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Upload, Camera, FileText, CheckCircle, AlertCircle, X, Loader } from 'lucide-react';

export default function UploadAbsenceJustificatif() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const profilId = useMemo(() => params.get('profil'), [params]);
  const token = useMemo(() => params.get('token'), [params]);
  const absenceId = useMemo(() => params.get('absence'), [params]);

  const supabase = useMemo<SupabaseClient | null>(() => {
    if (!token) return null;
    return createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        global: { headers: { 'x-upload-token': token } },
        auth: { persistSession: false, autoRefreshToken: false, storageKey: `supabase-upload-absence-${token.substring(0, 8)}` }
      }
    );
  }, [token]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [profilData, setProfilData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
  }, []);

  const loadData = useCallback(async () => {
    if (!supabase || !profilId || !token || !absenceId) {
      setError('Lien invalide — paramètres manquants');
      setLoading(false);
      return;
    }

    try {
      // Valider le token
      const { data: tokenData, error: tokenError } = await supabase
        .from('upload_tokens')
        .select('*')
        .eq('token', token)
        .eq('profil_id', profilId)
        .maybeSingle();

      if (tokenError) throw tokenError;
      if (!tokenData) throw new Error('Lien invalide ou expiré');
      if (new Date(tokenData.expires_at) < new Date()) throw new Error('Ce lien a expiré');

      setTokenValid(true);

      // Charger les infos du salarié
      const { data: profil, error: profilError } = await supabase
        .from('profil')
        .select('id, nom, prenom, email')
        .eq('id', profilId)
        .maybeSingle();

      if (profilError) throw profilError;
      if (!profil) throw new Error('Profil introuvable');

      setProfilData(profil);
    } catch (err) {
      console.error('Erreur loadData:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [supabase, profilId, token, absenceId]);

  useEffect(() => {
    if (!profilId || !token || !absenceId) {
      setError('Lien invalide');
      setLoading(false);
      return;
    }
    loadData();
  }, [profilId, token, absenceId, loadData]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      setError('Seuls les fichiers PDF et images sont acceptés');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier ne doit pas dépasser 10 Mo');
      return;
    }
    setSelectedFile(file);
    setError('');
  };

  const handleCameraCapture = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('La capture photo n\'est pas disponible sur ce navigateur');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setCameraStream(stream);
      setShowCameraModal(true);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') setError('Accès à la caméra refusé.');
        else if (err.name === 'NotFoundError') setError('Aucune caméra détectée.');
        else setError('Impossible d\'accéder à la caméra: ' + err.message);
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `justificatif-absence-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCameraStream();
      setSelectedFile(file);
      setShowCameraModal(false);
    }, 'image/jpeg', 0.9);
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !profilData || !supabase || !absenceId || !token || !profilId) return;

    setUploading(true);
    setError('');

    try {
      // 1. Upload vers Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${profilData.id}/justificatif-absence-${absenceId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      console.log('✅ Fichier uploadé dans le storage:', fileName);

      // 2. Appeler l'Edge Function pour mettre à jour compta_ar_events
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const updateResponse = await fetch(
        `${supabaseUrl}/functions/v1/update-absence-justificatif`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            absenceId,
            filePath: `ar-justificatifs/${fileName}`,
            token,
            profilId,
            profilName: `${profilData.prenom} ${profilData.nom}`,
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Erreur lors de la mise à jour: ${errorText}`);
      }

      console.log('✅ Absence mise à jour avec le justificatif');
      setUploadSuccess(true);

    } catch (err) {
      console.error('❌ Erreur upload:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
    } finally {
      setUploading(false);
    }
  };

  // --- RENDERS ---

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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

  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Justificatif envoyé !</h2>
          <p className="text-gray-600">
            Merci {profilData?.prenom}, votre justificatif d'absence a bien été reçu.
            Votre gestionnaire sera notifié automatiquement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-4 px-3 sm:py-8 sm:px-4"
      style={{ paddingBottom: 'max(12rem, calc(12rem + env(safe-area-inset-bottom, 20px)))', WebkitOverflowScrolling: 'touch', overflowY: 'auto', minHeight: '100dvh' } as React.CSSProperties}
    >
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-5 sm:px-8 sm:py-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">📋 Justificatif d'absence</h1>
            <p className="text-orange-100 text-sm sm:text-base">Bonjour {profilData?.prenom} {profilData?.nom}</p>
            <div className="mt-4 bg-white/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold text-sm">Progression</span>
                <span className="text-white font-bold text-lg">{uploadSuccess ? '1' : '0'} / 1</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden mt-2">
                <div className="h-full bg-green-400 transition-all duration-500" style={{ width: uploadSuccess ? '100%' : '0%' }} />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-8 pb-16">
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {isMobile && (
              <div className="mb-6 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg shadow-md">
                <p className="text-orange-800 text-sm font-medium">
                  <strong className="block mb-1 text-base">📱 Astuce mobile</strong>
                  Utilisez "Prendre une photo" pour capturer directement votre justificatif !
                </p>
              </div>
            )}

            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 shadow-lg hover:border-orange-300 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-7 h-7 text-orange-600 flex-shrink-0" />
                <h3 className="text-lg font-bold text-gray-800">Justificatif d'absence</h3>
              </div>

              {/* Si pas encore de fichier sélectionné */}
              {!selectedFile && (
                <>
                  <div className={`grid gap-3 mb-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {isMobile ? (
                      <>
                        <button
                          onClick={handleCameraCapture}
                          disabled={uploading}
                          className="flex items-center justify-center gap-3 px-6 py-5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 text-xl font-bold shadow-2xl transition-all active:scale-95 border-4 border-orange-700"
                          style={{ minHeight: '70px', touchAction: 'manipulation' }}
                        >
                          <Camera className="w-7 h-7" />
                          Prendre une photo
                        </button>
                        <label className="cursor-pointer block">
                          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                          <div className="flex items-center justify-center gap-3 px-6 py-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xl font-bold shadow-2xl transition-all active:scale-95 border-4 border-blue-700" style={{ minHeight: '70px', touchAction: 'manipulation' }}>
                            <Upload className="w-7 h-7" />
                            Choisir un fichier
                          </div>
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="cursor-pointer block">
                          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                          <div className="flex items-center justify-center gap-2 px-5 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-lg">
                            <Upload className="w-5 h-5" />
                            Choisir un fichier
                          </div>
                        </label>
                        <button
                          onClick={handleCameraCapture}
                          disabled={uploading}
                          className="flex items-center justify-center gap-2 px-5 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-all font-semibold shadow-lg"
                        >
                          <Camera className="w-5 h-5" />
                          Prendre une photo
                        </button>
                      </>
                    )}
                  </div>
                  {!isMobile && (
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors"
                    >
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Ou glissez-déposez votre fichier ici</p>
                    </div>
                  )}
                </>
              )}

              {/* Fichier sélectionné → bouton Envoyer */}
              {selectedFile && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
                      <span className="text-blue-800 font-semibold truncate text-lg">{selectedFile.name}</span>
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="text-blue-600 hover:text-blue-800 ml-2 p-2">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className={`w-full flex items-center justify-center gap-3 px-6 py-5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-bold shadow-2xl transition-all active:scale-95 border-4 border-green-700 ${isMobile ? 'text-xl' : 'text-lg'}`}
                    style={{ minHeight: isMobile ? '70px' : '56px', touchAction: 'manipulation' }}
                  >
                    {uploading ? (
                      <><Loader className="w-6 h-6 animate-spin" /> Envoi en cours...</>
                    ) : (
                      <><Upload className="w-6 h-6" /> Envoyer le justificatif</>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Formats acceptés */}
            <div className="mt-6 text-sm text-gray-500">
              <p className="font-semibold text-gray-700 mb-1">Formats acceptés :</p>
              <p>📄 PDF · 🖼️ Images (JPG, PNG) · 📏 Max 10 Mo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal caméra */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Prendre une photo</h3>
              <button onClick={() => { stopCameraStream(); setShowCameraModal(false); }} className="text-white hover:bg-white/10 rounded-lg p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="relative bg-black">
              <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[90%] h-[90%] border-2 border-dashed border-white/30 rounded-lg" />
              </div>
            </div>
            <div className="p-6 flex gap-3 justify-center">
              <button onClick={() => { stopCameraStream(); setShowCameraModal(false); }} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Annuler</button>
              <button onClick={capturePhoto} className="flex items-center gap-2 px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold shadow-lg">
                <Camera className="w-5 h-5" /> Capturer
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
}