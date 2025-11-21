import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, CheckCircle, Upload, X } from 'lucide-react';
import { COUNTRIES } from '../lib/countries';

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

export function Apply() {
  const [sites, setSites] = useState<Site[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setAddressSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Erreur recherche adresse:', error);
    }
  };

  const selectAddress = (feature: any) => {
    const properties = feature.properties;
    const fullAddress = properties.name;

    setFormData({
      ...formData,
      adresse: fullAddress,
      code_postal: properties.postcode || '',
      ville: properties.city || '',
    });

    setShowSuggestions(false);
  };

  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    telephone: '',
    email: '',
    genre: '',
    date_naissance: '',
    pays_naissance: '',
    nationalite: '',
    adresse: '',
    code_postal: '',
    ville: '',
    date_permis_conduire: '',
    site_id: '',
    secteur_id: '',
    poste: '',
    type_piece_identite: 'carte_identite',
    date_fin_validite_piece: '',
    consentement_rgpd: false,
    accepte_vivier: false,
  });
  const [files, setFiles] = useState<{
    cv: File | null;
    lettre_motivation: File | null;
    carte_identite_recto: File | null;
    carte_identite_verso: File | null;
  }>({
    cv: null,
    lettre_motivation: null,
    carte_identite_recto: null,
    carte_identite_verso: null,
  });
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [ageError, setAgeError] = useState('');

  useEffect(() => {
    fetchSitesAndSecteurs();
  }, []);

  const fetchSitesAndSecteurs = async () => {
    try {
      const [sitesRes, secteursRes, postesRes] = await Promise.all([
        supabase.from('site').select('id, nom').order('nom'),
        supabase.from('secteur').select('id, nom').order('nom'),
        supabase.from('poste').select('id, nom, description').eq('actif', true).order('nom'),
      ]);

      if (sitesRes.data) setSites(sitesRes.data);
      if (secteursRes.data) setSecteurs(secteursRes.data);
      if (postesRes.data) setPostes(postesRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const calculateAge = (birthDate: string): number | null => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  const handleDateNaissanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setFormData({ ...formData, date_naissance: date });

    if (date) {
      const age = calculateAge(date);
      if (age !== null && age < 18) {
        setAgeError(`Vous devez avoir au moins 18 ans pour postuler. Vous en avez ${age}.`);
      } else if (age !== null && age >= 18) {
        setAgeError('');
      }
    } else {
      setAgeError('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof files) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Le fichier ne doit pas dépasser 10MB');
        return;
      }
      setFiles({ ...files, [field]: file });
      setError('');
    }
  };

  const removeFile = (field: keyof typeof files) => {
    setFiles({ ...files, [field]: null });
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('candidatures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('candidatures')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const age = calculateAge(formData.date_naissance);
    if (age === null || age < 18) {
      setError('Vous devez avoir au moins 18 ans pour postuler.');
      setLoading(false);
      return;
    }

    if (!formData.consentement_rgpd) {
      setError('Vous devez accepter la politique de confidentialité');
      setLoading(false);
      return;
    }

    if (!files.carte_identite_recto || !files.carte_identite_verso) {
      setError('Les deux faces de la pièce d\'identité sont obligatoires');
      setLoading(false);
      return;
    }

    if (formData.type_piece_identite === 'carte_sejour' && !formData.date_fin_validite_piece) {
      setError('La date de fin de validité est obligatoire pour une carte de séjour');
      setLoading(false);
      return;
    }

    try {
      setUploadProgress(true);

      const { data: existingCandidate } = await supabase
        .from('candidat')
        .select('id, deleted_at, can_reapply')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingCandidate && !existingCandidate.deleted_at) {
        throw new Error('Un compte avec cet email existe déjà. Veuillez contacter le service RH.');
      }

      if (existingCandidate && existingCandidate.deleted_at && !existingCandidate.can_reapply) {
        throw new Error('Votre candidature a été archivée. Veuillez contacter le service RH.');
      }

      const cvUrl = files.cv ? await uploadFile(files.cv, 'cv') : null;
      const lettreUrl = files.lettre_motivation ? await uploadFile(files.lettre_motivation, 'lettres') : null;
      const rectoUrl = await uploadFile(files.carte_identite_recto, 'cartes-identite');
      const versoUrl = await uploadFile(files.carte_identite_verso, 'cartes-identite');

      if (!rectoUrl || !versoUrl) {
        throw new Error('Erreur lors de l\'upload des pièces d\'identité');
      }

      const candidateData = {
        prenom: formData.prenom,
        nom: formData.nom,
        email: formData.email,
        tel: formData.telephone,
        genre: formData.genre,
        date_naissance: formData.date_naissance || null,
        pays_naissance: formData.pays_naissance || null,
        nationalite: formData.nationalite,
        adresse: formData.adresse,
        code_postal: formData.code_postal,
        ville: formData.ville,
        date_permis_conduire: formData.date_permis_conduire || null,
        site_id: formData.site_id || null,
        secteur_id: formData.secteur_id || null,
        poste: formData.poste || null,
        type_piece_identite: formData.type_piece_identite,
        date_fin_validite_piece: formData.date_fin_validite_piece || null,
        cv_url: cvUrl,
        lettre_motivation_url: lettreUrl,
        carte_identite_recto_url: rectoUrl,
        carte_identite_verso_url: versoUrl,
        accepte_vivier: formData.accepte_vivier,
        pipeline: 'nouveau',
        statut_candidature: 'candidature_recue',
        deleted_at: null,
        can_reapply: true,
      };

      let candidatId: string;
      let error;

      if (existingCandidate && existingCandidate.deleted_at) {
        const { error: updateError } = await supabase
          .from('candidat')
          .update(candidateData)
          .eq('id', existingCandidate.id);
        error = updateError;
        candidatId = existingCandidate.id;
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('candidat')
          .insert([candidateData])
          .select('id')
          .single();
        error = insertError;
        candidatId = insertData?.id;
      }

      if (error) throw error;

      // Créer les documents dans la table document
      const documents = [];
      if (cvUrl) {
        documents.push({
          owner_type: 'candidat',
          owner_id: candidatId,
          type_document: 'cv',
          file_url: cvUrl,
          file_name: 'cv.pdf'
        });
      }
      if (lettreUrl) {
        documents.push({
          owner_type: 'candidat',
          owner_id: candidatId,
          type_document: 'lettre_motivation',
          file_url: lettreUrl,
          file_name: 'lettre_motivation.pdf'
        });
      }

      if (documents.length > 0) {
        const { error: docError } = await supabase
          .from('document')
          .insert(documents);
        if (docError) console.error('Erreur création documents:', docError);
      }

      setSuccess(true);
      setFormData({
        prenom: '',
        nom: '',
        telephone: '',
        email: '',
        genre: '',
        date_naissance: '',
        nationalite: '',
        adresse: '',
        code_postal: '',
        ville: '',
        date_permis_conduire: '',
        site_id: '',
        secteur_id: '',
        poste: '',
        consentement_rgpd: false,
        accepte_vivier: false,
      });
      setFiles({
        cv: null,
        lettre_motivation: null,
        carte_identite_recto: null,
        carte_identite_verso: null,
      });
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
      setUploadProgress(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>

        <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md p-10 border border-slate-200 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur-2xl opacity-50"></div>
              <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-2xl">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-3">
            Candidature envoyée!
          </h2>
          <p className="text-slate-600 mb-6 font-medium">
            Merci pour votre candidature. Notre équipe RH prendra contact avec vous prochainement.
          </p>

          <button
            onClick={() => setSuccess(false)}
            className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-glow transform hover:scale-[1.02]"
          >
            Soumettre une autre candidature
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>

      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl p-10 border border-slate-200 my-8">
        <div className="flex items-center justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl blur-2xl opacity-50 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-primary-500 to-secondary-500 p-4 rounded-2xl">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
          Postuler
        </h1>
        <p className="text-center text-slate-600 mb-8 font-medium">
          Rejoignez TRANSPORT CLASSE AFFAIRE
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
              Informations personnelles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prenom" className="block text-sm font-semibold text-slate-700 mb-2">
                  Prénom *
                </label>
                <input
                  id="prenom"
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label htmlFor="nom" className="block text-sm font-semibold text-slate-700 mb-2">
                  Nom *
                </label>
                <input
                  id="nom"
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label htmlFor="telephone" className="block text-sm font-semibold text-slate-700 mb-2">
                  Téléphone *
                </label>
                <input
                  id="telephone"
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Genre auquel vous vous identifiez *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Homme', 'Femme', 'Autre'].map((g) => (
                    <label
                      key={g}
                      className={`flex items-center justify-center px-4 py-3 border-2 rounded-xl cursor-pointer transition-all ${
                        formData.genre === g
                          ? 'border-primary-500 bg-primary-50 text-primary-700 font-bold'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="genre"
                        value={g}
                        checked={formData.genre === g}
                        onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                        required
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{g}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
              Questions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date_naissance" className="block text-sm font-semibold text-slate-700 mb-2">
                  Date de naissance *
                </label>
                <input
                  id="date_naissance"
                  type="date"
                  value={formData.date_naissance}
                  onChange={handleDateNaissanceChange}
                  required
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium ${
                    ageError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-200 focus:ring-primary-500'
                  }`}
                />
                {ageError && (
                  <div className="mt-2 text-red-600 text-sm font-medium">
                    {ageError}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="pays_naissance" className="block text-sm font-semibold text-slate-700 mb-2">
                  Pays de naissance *
                </label>
                <select
                  id="pays_naissance"
                  value={formData.pays_naissance}
                  onChange={(e) => setFormData({ ...formData, pays_naissance: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                >
                  <option value="">Sélectionner un pays</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="nationalite" className="block text-sm font-semibold text-slate-700 mb-2">
                  Nationalité *
                </label>
                <select
                  id="nationalite"
                  value={formData.nationalite}
                  onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                >
                  <option value="">Sélectionner une nationalité</option>
                  <option value="Française">Française</option>
                  <option value="Suisse">Suisse</option>
                  <option value="Belge">Belge</option>
                  <option value="Allemande">Allemande</option>
                  <option value="Italienne">Italienne</option>
                  <option value="Afghane">Afghane</option>
                  <option value="Albanaise">Albanaise</option>
                  <option value="Algerienne">Algérienne</option>
                  <option value="Americaine">Américaine</option>
                  <option value="Andorrane">Andorrane</option>
                  <option value="Angolaise">Angolaise</option>
                  <option value="Antiguaise et barbudienne">Antiguaise et barbudienne</option>
                  <option value="Argentine">Argentine</option>
                  <option value="Armenienne">Arménienne</option>
                  <option value="Australienne">Australienne</option>
                  <option value="Autrichienne">Autrichienne</option>
                  <option value="Azerbaïdjanaise">Azerbaïdjanaise</option>
                  <option value="Bahamienne">Bahamienne</option>
                  <option value="Bahreinienne">Bahreïnienne</option>
                  <option value="Bangladaise">Bangladaise</option>
                  <option value="Barbadienne">Barbadienne</option>
                  <option value="Belizienne">Bélizienne</option>
                  <option value="Beninoise">Béninoise</option>
                  <option value="Bhoutanaise">Bhoutanaise</option>
                  <option value="Bielorusse">Biélorusse</option>
                  <option value="Birmane">Birmane</option>
                  <option value="Bissau-Guinéenne">Bissau-Guinéenne</option>
                  <option value="Bolivienne">Bolivienne</option>
                  <option value="Bosnienne">Bosnienne</option>
                  <option value="Botswanaise">Botswanaise</option>
                  <option value="Bresilienne">Brésilienne</option>
                  <option value="Britannique">Britannique</option>
                  <option value="Bruneienne">Brunéienne</option>
                  <option value="Bulgare">Bulgare</option>
                  <option value="Burkinabe">Burkinabé</option>
                  <option value="Burundaise">Burundaise</option>
                  <option value="Cambodgienne">Cambodgienne</option>
                  <option value="Camerounaise">Camerounaise</option>
                  <option value="Canadienne">Canadienne</option>
                  <option value="Cap-verdienne">Cap-verdienne</option>
                  <option value="Centrafricaine">Centrafricaine</option>
                  <option value="Chilienne">Chilienne</option>
                  <option value="Chinoise">Chinoise</option>
                  <option value="Chypriote">Chypriote</option>
                  <option value="Colombienne">Colombienne</option>
                  <option value="Comorienne">Comorienne</option>
                  <option value="Congolaise">Congolaise</option>
                  <option value="Costaricaine">Costaricaine</option>
                  <option value="Croate">Croate</option>
                  <option value="Cubaine">Cubaine</option>
                  <option value="Danoise">Danoise</option>
                  <option value="Djiboutienne">Djiboutienne</option>
                  <option value="Dominicaine">Dominicaine</option>
                  <option value="Dominiquaise">Dominiquaise</option>
                  <option value="Egyptienne">Égyptienne</option>
                  <option value="Emirienne">Émirienne</option>
                  <option value="Equato-guineenne">Équato-guinéenne</option>
                  <option value="Equatorienne">Équatorienne</option>
                  <option value="Erythreenne">Érythréenne</option>
                  <option value="Espagnole">Espagnole</option>
                  <option value="Est-timoraise">Est-timoraise</option>
                  <option value="Estonienne">Estonienne</option>
                  <option value="Ethiopienne">Éthiopienne</option>
                  <option value="Fidjienne">Fidjienne</option>
                  <option value="Finlandaise">Finlandaise</option>
                  <option value="Gabonaise">Gabonaise</option>
                  <option value="Gambienne">Gambienne</option>
                  <option value="Georgienne">Géorgienne</option>
                  <option value="Ghaneenne">Ghanéenne</option>
                  <option value="Grenadienne">Grenadienne</option>
                  <option value="Guatemalteque">Guatémaltèque</option>
                  <option value="Guineenne">Guinéenne</option>
                  <option value="Guyanienne">Guyanienne</option>
                  <option value="Haïtienne">Haïtienne</option>
                  <option value="Hellenique">Hellénique</option>
                  <option value="Hondurienne">Hondurienne</option>
                  <option value="Hongroise">Hongroise</option>
                  <option value="Indienne">Indienne</option>
                  <option value="Indonesienne">Indonésienne</option>
                  <option value="Irakienne">Irakienne</option>
                  <option value="Irlandaise">Irlandaise</option>
                  <option value="Islandaise">Islandaise</option>
                  <option value="Israélienne">Israélienne</option>
                  <option value="Ivoirienne">Ivoirienne</option>
                  <option value="Jamaïcaine">Jamaïcaine</option>
                  <option value="Japonaise">Japonaise</option>
                  <option value="Jordanienne">Jordanienne</option>
                  <option value="Kazakhstanaise">Kazakhstanaise</option>
                  <option value="Kenyane">Kényane</option>
                  <option value="Kirghize">Kirghize</option>
                  <option value="Kiribatienne">Kiribatienne</option>
                  <option value="Kittitienne-et-nevicienne">Kittitienne-et-névicienne</option>
                  <option value="Kossovienne">Kossovienne</option>
                  <option value="Koweitienne">Koweïtienne</option>
                  <option value="Laotienne">Laotienne</option>
                  <option value="Lesothane">Lesothane</option>
                  <option value="Lettone">Lettone</option>
                  <option value="Libanaise">Libanaise</option>
                  <option value="Liberienne">Libérienne</option>
                  <option value="Libyenne">Libyenne</option>
                  <option value="Liechtensteinoise">Liechtensteinoise</option>
                  <option value="Lituanienne">Lituanienne</option>
                  <option value="Luxembourgeoise">Luxembourgeoise</option>
                  <option value="Macedonienne">Macédonienne</option>
                  <option value="Malaisienne">Malaisienne</option>
                  <option value="Malawienne">Malawienne</option>
                  <option value="Maldivienne">Maldivienne</option>
                  <option value="Malgache">Malgache</option>
                  <option value="Malienne">Malienne</option>
                  <option value="Maltaise">Maltaise</option>
                  <option value="Marocaine">Marocaine</option>
                  <option value="Marshallaise">Marshallaise</option>
                  <option value="Mauricienne">Mauricienne</option>
                  <option value="Mauritanienne">Mauritanienne</option>
                  <option value="Mexicaine">Mexicaine</option>
                  <option value="Micronesienne">Micronésienne</option>
                  <option value="Moldave">Moldave</option>
                  <option value="Monegasque">Monégasque</option>
                  <option value="Mongole">Mongole</option>
                  <option value="Montenegrine">Monténégrine</option>
                  <option value="Mozambicaine">Mozambicaine</option>
                  <option value="Namibienne">Namibienne</option>
                  <option value="Nauruane">Nauruane</option>
                  <option value="Neerlandaise">Néerlandaise</option>
                  <option value="Neo-zelandaise">Néo-zélandaise</option>
                  <option value="Nepalaise">Népalaise</option>
                  <option value="Nicaraguayenne">Nicaraguayenne</option>
                  <option value="Nigeriane">Nigériane</option>
                  <option value="Nigerienne">Nigérienne</option>
                  <option value="Nord-coréenne">Nord-coréenne</option>
                  <option value="Norvegienne">Norvégienne</option>
                  <option value="Omanaise">Omanaise</option>
                  <option value="Ougandaise">Ougandaise</option>
                  <option value="Ouzbeke">Ouzbèke</option>
                  <option value="Pakistanaise">Pakistanaise</option>
                  <option value="Palau">Palau</option>
                  <option value="Palestinienne">Palestinienne</option>
                  <option value="Panameenne">Panaméenne</option>
                  <option value="Papouane-neoguineenne">Papouane-néoguinéenne</option>
                  <option value="Paraguayenne">Paraguayenne</option>
                  <option value="Peruvienne">Péruvienne</option>
                  <option value="Philippine">Philippine</option>
                  <option value="Polonaise">Polonaise</option>
                  <option value="Portoricaine">Portoricaine</option>
                  <option value="Portugaise">Portugaise</option>
                  <option value="Qatarienne">Qatarienne</option>
                  <option value="Roumaine">Roumaine</option>
                  <option value="Russe">Russe</option>
                  <option value="Rwandaise">Rwandaise</option>
                  <option value="Saint-Lucienne">Saint-Lucienne</option>
                  <option value="Saint-Marinaise">Saint-Marinaise</option>
                  <option value="Saint-Vincentaise-et-Grenadine">Saint-Vincentaise-et-Grenadine</option>
                  <option value="Salomonaise">Salomonaise</option>
                  <option value="Salvadorienne">Salvadorienne</option>
                  <option value="Samoane">Samoane</option>
                  <option value="Santomeenne">Santoméenne</option>
                  <option value="Saoudienne">Saoudienne</option>
                  <option value="Senegalaise">Sénégalaise</option>
                  <option value="Serbe">Serbe</option>
                  <option value="Seychelloise">Seychelloise</option>
                  <option value="Sierra-leonaise">Sierra-léonaise</option>
                  <option value="Singapourienne">Singapourienne</option>
                  <option value="Slovaque">Slovaque</option>
                  <option value="Slovene">Slovène</option>
                  <option value="Somalienne">Somalienne</option>
                  <option value="Soudanaise">Soudanaise</option>
                  <option value="Sri-lankaise">Sri-lankaise</option>
                  <option value="Sud-africaine">Sud-africaine</option>
                  <option value="Sud-coréenne">Sud-coréenne</option>
                  <option value="Suedoise">Suédoise</option>
                  <option value="Surinamaise">Surinamaise</option>
                  <option value="Swazie">Swazie</option>
                  <option value="Syrienne">Syrienne</option>
                  <option value="Tadjike">Tadjike</option>
                  <option value="Taiwanaise">Taïwanaise</option>
                  <option value="Tanzanienne">Tanzanienne</option>
                  <option value="Tchadienne">Tchadienne</option>
                  <option value="Tcheque">Tchèque</option>
                  <option value="Thaïlandaise">Thaïlandaise</option>
                  <option value="Togolaise">Togolaise</option>
                  <option value="Tonguienne">Tonguienne</option>
                  <option value="Trinidadienne">Trinidadienne</option>
                  <option value="Tunisienne">Tunisienne</option>
                  <option value="Turkmene">Turkmène</option>
                  <option value="Turque">Turque</option>
                  <option value="Tuvaluane">Tuvaluane</option>
                  <option value="Ukrainienne">Ukrainienne</option>
                  <option value="Uruguayenne">Uruguayenne</option>
                  <option value="Vanuatuane">Vanuatuane</option>
                  <option value="Venezuelienne">Vénézuélienne</option>
                  <option value="Vietnamienne">Vietnamienne</option>
                  <option value="Yemenite">Yéménite</option>
                  <option value="Zambienne">Zambienne</option>
                  <option value="Zimbabweenne">Zimbabwéenne</option>
                </select>
              </div>

              <div className="md:col-span-2 relative">
                <label htmlFor="adresse" className="block text-sm font-semibold text-slate-700 mb-2">
                  Adresse complète (n° + rue) *
                </label>
                <input
                  id="adresse"
                  type="text"
                  value={formData.adresse}
                  onChange={(e) => {
                    setFormData({ ...formData, adresse: e.target.value });
                    searchAddress(e.target.value);
                  }}
                  onFocus={() => formData.adresse.length >= 3 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  required
                  placeholder="Tapez votre adresse..."
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                />

                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                    {addressSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => selectAddress(suggestion)}
                        className="px-4 py-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 text-sm text-slate-700"
                      >
                        {suggestion.properties.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="code_postal" className="block text-sm font-semibold text-slate-700 mb-2">
                  Code postal *
                </label>
                <input
                  id="code_postal"
                  type="text"
                  value={formData.code_postal}
                  onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label htmlFor="ville" className="block text-sm font-semibold text-slate-700 mb-2">
                  Ville de résidence *
                </label>
                <input
                  id="ville"
                  type="text"
                  value={formData.ville}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label htmlFor="date_permis" className="block text-sm font-semibold text-slate-700 mb-2">
                  Date d'obtention du permis de conduire *
                </label>
                <input
                  id="date_permis"
                  type="date"
                  value={formData.date_permis_conduire}
                  onChange={(e) => setFormData({ ...formData, date_permis_conduire: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label htmlFor="poste" className="block text-sm font-semibold text-slate-700 mb-2">
                  Poste candidaté *
                </label>
                <select
                  id="poste"
                  value={formData.poste}
                  onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                >
                  <option value="">Sélectionner un poste</option>
                  {postes.map((poste) => (
                    <option key={poste.id} value={poste.nom}>
                      {poste.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="site" className="block text-sm font-semibold text-slate-700 mb-2">
                  Site (optionnel)
                </label>
                <select
                  id="site"
                  value={formData.site_id}
                  onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                >
                  <option value="">Sélectionner un site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="secteur" className="block text-sm font-semibold text-slate-700 mb-2">
                  Secteur (optionnel)
                </label>
                <select
                  id="secteur"
                  value={formData.secteur_id}
                  onChange={(e) => setFormData({ ...formData, secteur_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                >
                  <option value="">Sélectionner un secteur</option>
                  {secteurs.map((secteur) => (
                    <option key={secteur.id} value={secteur.id}>
                      {secteur.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
              Documents
            </h2>
            <div className="space-y-4">
              <FileUploadField
                label="CV (optionnel)"
                file={files.cv}
                onChange={(e) => handleFileChange(e, 'cv')}
                onRemove={() => removeFile('cv')}
                accept=".pdf,.doc,.docx"
              />

              <FileUploadField
                label="Lettre de motivation (optionnel)"
                file={files.lettre_motivation}
                onChange={(e) => handleFileChange(e, 'lettre_motivation')}
                onRemove={() => removeFile('lettre_motivation')}
                accept=".pdf,.doc,.docx"
              />

              <div>
                <label htmlFor="type_piece_identite" className="block text-sm font-semibold text-slate-700 mb-2">
                  Type de pièce d'identité *
                </label>
                <select
                  id="type_piece_identite"
                  value={formData.type_piece_identite}
                  onChange={(e) => setFormData({ ...formData, type_piece_identite: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                  required
                >
                  <option value="carte_identite">Carte d'identité</option>
                  <option value="passeport">Passeport</option>
                  <option value="carte_sejour">Carte de séjour</option>
                </select>
              </div>

              {formData.type_piece_identite === 'carte_sejour' && (
                <div>
                  <label htmlFor="date_fin_validite_piece" className="block text-sm font-semibold text-slate-700 mb-2">
                    Date de fin de validité *
                  </label>
                  <input
                    type="date"
                    id="date_fin_validite_piece"
                    value={formData.date_fin_validite_piece}
                    onChange={(e) => setFormData({ ...formData, date_fin_validite_piece: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium"
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">La date de fin de validité de votre carte de séjour</p>
                </div>
              )}

              <FileUploadField
                label={`${formData.type_piece_identite === 'carte_identite' ? "Carte d'identité" : formData.type_piece_identite === 'passeport' ? 'Passeport' : 'Carte de séjour'} RECTO *`}
                file={files.carte_identite_recto}
                onChange={(e) => handleFileChange(e, 'carte_identite_recto')}
                onRemove={() => removeFile('carte_identite_recto')}
                accept="image/*,.pdf"
                required
              />

              <FileUploadField
                label={`${formData.type_piece_identite === 'carte_identite' ? "Carte d'identité" : formData.type_piece_identite === 'passeport' ? 'Passeport' : 'Carte de séjour'} VERSO *`}
                file={files.carte_identite_verso}
                onChange={(e) => handleFileChange(e, 'carte_identite_verso')}
                onRemove={() => removeFile('carte_identite_verso')}
                accept="image/*,.pdf"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-6 border-2 border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.consentement_rgpd}
                  onChange={(e) =>
                    setFormData({ ...formData, consentement_rgpd: e.target.checked })
                  }
                  required
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-primary-500 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700 font-medium">
                  J'ai lu et j'accepte la Politique de confidentialité *
                </span>
              </label>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border-2 border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.accepte_vivier}
                  onChange={(e) =>
                    setFormData({ ...formData, accepte_vivier: e.target.checked })
                  }
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-primary-500 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700 font-medium">
                  Oui, PARCSYNC peut m'ajouter au vivier de talents et me contacter au sujet de futures opportunités d'emploi.
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || uploadProgress || ageError !== ''}
            className={`w-full font-bold py-4 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-glow transform hover:scale-[1.02] ${
              loading || uploadProgress || ageError !== ''
                ? 'bg-slate-300 text-slate-500'
                : 'bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white'
            }`}
          >
            {uploadProgress ? 'Upload des fichiers...' : loading ? 'Envoi en cours...' : 'Envoyer ma candidature'}
          </button>

          <p className="text-xs text-center text-slate-500 font-medium">
            * Champs obligatoires
          </p>
        </form>
      </div>
    </div>
  );
}

function FileUploadField({
  label,
  file,
  onChange,
  onRemove,
  accept,
  required = false,
}: {
  label: string;
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  accept?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>
      {file ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-sm font-medium text-green-700 flex-1 truncate">
            {file.name}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 hover:bg-green-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-green-600" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all group">
          <Upload className="w-6 h-6 text-slate-400 group-hover:text-primary-500 transition-colors" />
          <span className="text-sm font-medium text-slate-600 group-hover:text-primary-600 transition-colors">
            Charger un fichier (max. 10MB)
          </span>
          <input
            type="file"
            onChange={onChange}
            accept={accept}
            required={required}
            className="sr-only"
          />
        </label>
      )}
    </div>
  );
}
