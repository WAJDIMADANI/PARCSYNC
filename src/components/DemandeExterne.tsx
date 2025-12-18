import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, FileText, CheckCircle, AlertCircle, Search, Loader, Send, User } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface Profil {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  matricule_tca: string;
  poste: string | null;
}

interface Pole {
  id: string;
  nom: string;
}

interface FileItem {
  file: File;
  path?: string;
}

export function DemandeExterne() {
  const [matricule, setMatricule] = useState('');
  const [chauffeur, setChauffeur] = useState<Profil | null>(null);
  const [poles, setPoles] = useState<Pole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poleId, setPoleId] = useState('');
  const [sujet, setSujet] = useState('');
  const [contenu, setContenu] = useState('');
  const [fichiers, setFichiers] = useState<FileItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const searchChauffeur = async () => {
    if (!matricule.trim()) {
      setError('Veuillez entrer un matricule');
      return;
    }

    setLoading(true);
    setError(null);
    setChauffeur(null);

    try {
      const { data: profil, error: profilError } = await supabase
        .from('profil')
        .select('id, prenom, nom, email, matricule_tca, poste')
        .eq('matricule_tca', matricule.trim())
        .maybeSingle();

      if (profilError) throw profilError;

      if (!profil) {
        setError('Matricule non trouvé. Veuillez vérifier votre matricule.');
        return;
      }

      setChauffeur(profil);

      const { data: polesData, error: polesError } = await supabase
        .from('poles')
        .select('id, nom')
        .eq('actif', true)
        .order('nom');

      if (polesError) throw polesError;
      setPoles(polesData || []);
    } catch (err: any) {
      console.error('Error searching chauffeur:', err);
      setError(err.message || 'Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (fichiers.length + files.length > 3) {
      setError('Maximum 3 fichiers autorisés');
      return;
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`Le fichier ${file.name} dépasse 5MB`);
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'png', 'jpg', 'jpeg'].includes(ext || '')) {
        setError(`Type de fichier non autorisé: ${file.name}`);
        return;
      }
    }

    setFichiers([...fichiers, ...files.map(file => ({ file }))]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFichiers(fichiers.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chauffeur) {
      setError('Veuillez d\'abord rechercher votre matricule');
      return;
    }

    if (!poleId) {
      setError('Veuillez sélectionner un pôle');
      return;
    }

    if (sujet.length === 0 || sujet.length > 200) {
      setError('Le sujet doit contenir entre 1 et 200 caractères');
      return;
    }

    if (contenu.length < 10) {
      setError('Le contenu doit contenir au moins 10 caractères');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let uploadedFiles: { path: string; name: string; size: number }[] = [];

      if (fichiers.length > 0) {
        for (const item of fichiers) {
          const timestamp = Date.now();
          const fileName = `${timestamp}_${item.file.name}`;
          const filePath = `demandes-externes/${chauffeur.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('demandes-externes')
            .upload(filePath, item.file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Erreur lors de l'upload de ${item.file.name}`);
          }

          uploadedFiles.push({
            path: filePath,
            name: item.file.name,
            size: item.file.size,
          });
        }
      }

      const { data: demande, error: demandeError } = await supabase
        .from('demandes_externes')
        .insert({
          profil_id: chauffeur.id,
          pole_id: poleId,
          sujet: sujet.trim(),
          contenu: contenu.trim(),
          fichiers: uploadedFiles,
          statut: 'nouveau',
        })
        .select()
        .single();

      if (demandeError) throw demandeError;

      const { data: utilisateurs } = await supabase
        .from('app_utilisateur')
        .select('id')
        .eq('pole_id', poleId)
        .eq('actif', true);

      if (utilisateurs && utilisateurs.length > 0) {
        const poleInfo = poles.find(p => p.id === poleId);
        const notifications = utilisateurs.map(user => ({
          utilisateur_id: user.id,
          type: 'demande_externe',
          titre: sujet.trim(),
          description: `Demande de ${chauffeur.prenom} ${chauffeur.nom} - Matricule ${chauffeur.matricule_tca}`,
          contenu: contenu.trim(),
          reference_id: demande.id,
          reference_type: 'demande_externe',
          statut: 'nouveau',
          lu: false,
        }));

        await supabase.from('inbox').insert(notifications);

        console.log(`${utilisateurs.length} personne(s) du pôle ${poleInfo?.nom} notifiée(s)`);
      }

      const poleInfo = poles.find(p => p.id === poleId);

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        await fetch(`${supabaseUrl}/functions/v1/send-demande-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            email: chauffeur.email,
            prenom: chauffeur.prenom,
            sujet: sujet.trim(),
            poleNom: poleInfo?.nom || 'Non spécifié',
            createdAt: new Date().toISOString(),
          }),
        });
      } catch (emailError) {
        console.warn('Email confirmation non envoyé:', emailError);
      }

      setSuccess(true);
      setTimeout(() => {
        resetForm();
      }, 5000);
    } catch (err: any) {
      console.error('Error submitting demande:', err);
      setError(err.message || 'Erreur lors de l\'envoi de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setMatricule('');
    setChauffeur(null);
    setPoleId('');
    setSujet('');
    setContenu('');
    setFichiers([]);
    setSuccess(false);
    setError(null);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Demande envoyée avec succès!
            </h2>
            <p className="text-slate-600">
              Notre équipe va l'examiner rapidement.
            </p>
          </div>
          <button
            onClick={resetForm}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
          >
            Envoyer une autre demande
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Demande Externe
          </h1>
          <p className="text-slate-600">
            Envoyez une demande à nos équipes
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Entrez votre matricule TCA *
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchChauffeur()}
                placeholder="Ex: 928"
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading || !!chauffeur}
              />
              <button
                onClick={searchChauffeur}
                disabled={loading || !!chauffeur}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Recherche...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Rechercher
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {chauffeur && (
            <>
              <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Vos informations</h3>
                    <p className="text-sm text-slate-600">Matricule: {chauffeur.matricule_tca}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nom</label>
                    <p className="font-semibold text-slate-900">{chauffeur.prenom} {chauffeur.nom}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <p className="font-semibold text-slate-900">{chauffeur.email}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Poste</label>
                    <p className="font-semibold text-slate-900">{chauffeur.poste || 'Non spécifié'}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setChauffeur(null);
                    setMatricule('');
                  }}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Changer de matricule
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Pôle destinataire *
                  </label>
                  <select
                    value={poleId}
                    onChange={(e) => setPoleId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    required
                  >
                    <option value="">-- Sélectionnez un pôle --</option>
                    {poles.map((pole) => (
                      <option key={pole.id} value={pole.id}>
                        {pole.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Sujet *
                    </label>
                    <span className={`text-xs ${sujet.length > 200 ? 'text-red-600' : 'text-slate-500'}`}>
                      {sujet.length}/200
                    </span>
                  </div>
                  <input
                    type="text"
                    value={sujet}
                    onChange={(e) => setSujet(e.target.value)}
                    placeholder="Ex: Problème de véhicule, Demande de document..."
                    maxLength={200}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Contenu * (minimum 10 caractères)
                  </label>
                  <textarea
                    value={contenu}
                    onChange={(e) => setContenu(e.target.value)}
                    placeholder="Décrivez votre demande en détail..."
                    rows={6}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {contenu.length} caractère(s)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Pièces jointes (optionnel)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={fichiers.length >= 3}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`cursor-pointer ${fichiers.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-700">
                        Cliquez pour ajouter des fichiers
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        PDF, PNG, JPG - Max 5MB par fichier - Max 3 fichiers
                      </p>
                    </label>
                  </div>

                  {fichiers.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {fichiers.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                        >
                          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {item.file.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatFileSize(item.file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-1 hover:bg-slate-200 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-slate-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !chauffeur || !poleId || !sujet || contenu.length < 10}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-lg"
                >
                  {submitting ? (
                    <>
                      <Loader className="w-6 h-6 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-6 h-6" />
                      Envoyer la demande
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
