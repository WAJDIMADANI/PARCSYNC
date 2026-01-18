import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, CheckCircle, Upload, X } from 'lucide-react';
import { COUNTRIES } from '../lib/countries';
import { validateIban as validateIbanUtil } from '../utils/ibanValidator';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';

interface Site {
  id: string;
  nom: string;
}

interface Secteur {
  id: string;
  nom: string;
}

type DocumentType =
  | 'cni_recto'
  | 'cni_verso'
  | 'carte_vitale'
  | 'rib'
  | 'permis_recto'
  | 'permis_verso'
  | 'casier_judiciaire'
  | 'attestation_points'
  | 'cv'
  | 'lettre_motivation';

export function OnboardingForm() {
  const [candidatId, setCandidatId] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [ibanError, setIbanError] = useState('');
  const [ibanValidationMessage, setIbanValidationMessage] = useState('');

  const validateIban = async (iban: string) => {
    if (!iban || iban.length < 15) {
      setIbanError('');
      return;
    }

    try {
      const result = await validateIbanUtil(iban);

      if (result.valid) {
        setIbanError('');
        setIbanValidationMessage(
          result.error
            ? `✅ IBAN valide (${result.error})`
            : '✅ IBAN valide'
        );
        setFormData(prev => ({ ...prev, iban: result.cleanIban }));
      } else {
        setIbanError(result.error || '❌ IBAN invalide');
        setIbanValidationMessage('');
      }
    } catch (e) {
      console.error('IBAN validation error:', e);
      setIbanError('❌ Erreur validation');
      setIbanValidationMessage('');
    }
  };

  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    telephone: '',
    email: '',
    genre: '',
    date_naissance: '',
    nom_naissance: '',
    lieu_naissance: '',
    pays_naissance: '',
    nationalite: '',
    numero_securite_sociale: '',
    adresse: '',
    complement_adresse: '',
    code_postal: '',
    ville: '',
    date_permis_conduire: '',
    iban: '',
    bic: '',
    nir: '',
    site_id: '',
    secteur_id: '',
    type_piece_identite: 'carte_identite',
    titre_sejour_fin_validite: '',
    consentement_rgpd: false,
  });
  const [files, setFiles] = useState<Record<DocumentType, File | null>>({
    cni_recto: null,
    cni_verso: null,
    carte_vitale: null,
    rib: null,
    permis_recto: null,
    permis_verso: null,
    casier_judiciaire: null,
    attestation_points: null,
    cv: null,
    lettre_motivation: null,
  });
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      setCandidatId(id);
      fetchCandidatData(id);
    } else {
      // Tenter de restaurer les données depuis localStorage
      const savedData = localStorage.getItem('onboarding_form_data');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setFormData(parsedData);
          setRestoredFromStorage(true);
          console.log('✅ Données du formulaire restaurées depuis localStorage');
          // Masquer le message après 5 secondes
          setTimeout(() => setRestoredFromStorage(false), 5000);
        } catch (err) {
          console.error('Erreur lors de la restauration des données:', err);
        }
      }
    }
    fetchSitesAndSecteurs();
  }, []);

  // Sauvegarder automatiquement les données du formulaire
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('onboarding_form_data', JSON.stringify(formData));
    }, 1000); // Débounce de 1 seconde

    return () => clearTimeout(timeoutId);
  }, [formData]);

  const fetchCandidatData = async (id: string) => {
    try {
      console.log('🔍 Fetching candidat with id:', id);
      const { data, error } = await supabase
        .from('candidat')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      console.log('📦 Candidat data:', data);
      console.log('❌ Candidat error:', error);

      if (error) throw error;

      if (data) {
        console.log('✅ Setting form data with candidat info');
        setFormData({
          prenom: data.prenom || '',
          nom: data.nom || '',
          telephone: data.tel || '',
          email: data.email || '',
          genre: data.genre || '',
          date_naissance: data.date_naissance || '',
          nom_naissance: data.nom_naissance || '',
          lieu_naissance: data.lieu_naissance || '',
          pays_naissance: data.pays_naissance || '',
          nationalite: data.nationalite || '',
          numero_securite_sociale: data.numero_securite_sociale || '',
          adresse: data.adresse || '',
          complement_adresse: data.complement_adresse || '',
          code_postal: data.code_postal || '',
          ville: data.ville || '',
          date_permis_conduire: data.date_permis_conduire || '',
          iban: data.iban || '',
          bic: data.bic || '',
          nir: data.nir || '',
          site_id: data.site_id || '',
          secteur_id: data.secteur_id || '',
          consentement_rgpd: false,
        });
      } else {
        console.log('⚠️ No candidat found, resetting candidatId');
        setCandidatId(null);
      }
    } catch (err) {
      console.error('💥 Error fetching candidat:', err);
      setError('Impossible de charger les données du candidat');
      setCandidatId(null);
    }
  };

  const fetchSitesAndSecteurs = async () => {
    try {
      const [sitesRes, secteursRes] = await Promise.all([
        supabase.from('site').select('id, nom').order('nom'),
        supabase.from('secteur').select('id, nom').order('nom'),
      ]);

      if (sitesRes.data) setSites(sitesRes.data);
      if (secteursRes.data) setSecteurs(secteursRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: DocumentType) => {
    e.preventDefault();
    e.stopPropagation();

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

  const removeFile = (field: DocumentType) => {
    setFiles({ ...files, [field]: null });
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
      console.log('📤 Uploading file:', file.name, 'to path:', path);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      console.log('📤 Full file path:', filePath);
      const { error: uploadError } = await supabase.storage
        .from('candidatures')
        .upload(filePath, file);

      if (uploadError) {
        console.error('❌ Upload error for', file.name, ':', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('candidatures')
        .getPublicUrl(filePath);

      console.log('✅ File uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (err) {
      console.error('❌ Upload error for', file.name, ':', err);
      alert(`Erreur lors de l'upload de ${file.name}: ${err}`);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('📤 Submit - candidatId:', candidatId);
    console.log('📤 Submit - formData.email:', formData.email);
    console.log('📤 Submit - formData:', formData);

    if (!formData.consentement_rgpd) {
      setError('Vous devez accepter la politique de confidentialité');
      setLoading(false);
      return;
    }

    if (!formData.bic || formData.bic.trim() === '') {
      setError('Le BIC doit être rempli. Vérifiez que l\'IBAN est valide.');
      setLoading(false);
      return;
    }

    const requiredFiles: DocumentType[] = ['cni_recto', 'cni_verso', 'carte_vitale', 'rib', 'permis_recto', 'permis_verso'];
    const missingFiles = requiredFiles.filter(f => !files[f]);

    if (missingFiles.length > 0) {
      setError('Tous les documents obligatoires doivent être fournis');
      setLoading(false);
      return;
    }

    try {
      setUploadProgress(true);

      let finalEmployeeId: string;
      let ownerType: 'candidat' | 'profil' = 'profil';

      console.log('🔄 Checking if employee already exists with email:', formData.email);

      const { data: existingEmployee } = await supabase
        .from('profil')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingEmployee) {
        console.log('⚠️ Employee already exists with id:', existingEmployee.id);
        finalEmployeeId = existingEmployee.id;

        console.log('🔄 Updating existing employee data');
        const { error: updateError } = await supabase
          .from('profil')
          .update({
            prenom: formData.prenom,
            nom: formData.nom,
            tel: formData.telephone,
            genre: formData.genre,
            date_naissance: formData.date_naissance || null,
            nom_naissance: formData.nom_naissance || null,
            lieu_naissance: formData.lieu_naissance || null,
            pays_naissance: formData.pays_naissance || null,
            nationalite: formData.nationalite,
            nir: formData.numero_securite_sociale || null,
            adresse: formData.adresse,
            complement_adresse: formData.complement_adresse || null,
            code_postal: formData.code_postal,
            ville: formData.ville,
            date_permis_conduire: formData.date_permis_conduire || null,
            iban: formData.iban,
            bic: formData.bic || null,
            site_id: formData.site_id || null,
            secteur_id: formData.secteur_id || null,
            type_piece_identite: formData.type_piece_identite,
          })
          .eq('id', finalEmployeeId);

        if (updateError) throw updateError;
        console.log('✅ Employee updated successfully');
      } else {
        console.log('🔄 Creating new employee from onboarding:', candidatId);

        const { data: employeeData, error: insertError } = await supabase
          .from('profil')
          .insert([
            {
              prenom: formData.prenom,
              nom: formData.nom,
              email: formData.email,
              tel: formData.telephone,
              genre: formData.genre,
              date_naissance: formData.date_naissance || null,
              nom_naissance: formData.nom_naissance || null,
              lieu_naissance: formData.lieu_naissance || null,
              pays_naissance: formData.pays_naissance || null,
              nationalite: formData.nationalite,
              nir: formData.numero_securite_sociale || null,
              adresse: formData.adresse,
              complement_adresse: formData.complement_adresse || null,
              code_postal: formData.code_postal,
              ville: formData.ville,
              date_permis_conduire: formData.date_permis_conduire || null,
              iban: formData.iban,
              bic: formData.bic || null,
              site_id: formData.site_id || null,
              secteur_id: formData.secteur_id || null,
              type_piece_identite: formData.type_piece_identite,
              candidat_id: candidatId || null,
              statut: 'en_attente_contrat',
              role: 'salarie',
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error creating employee:', insertError);
          throw insertError;
        }
        finalEmployeeId = employeeData.id;
        console.log('✅ Employee created successfully:', finalEmployeeId);
      }

      if (candidatId) {
        console.log('🗑️ Archiving candidat:', candidatId);
        await supabase
          .from('candidat')
          .update({ pipeline: 'converti_salarie' })
          .eq('id', candidatId);
      }

      const documentUploads: Promise<any>[] = [];

      console.log('📤 Starting document uploads for employee:', finalEmployeeId);
      console.log('📤 Files to upload:', Object.keys(files).filter(k => files[k as DocumentType]));

      for (const [docType, file] of Object.entries(files)) {
        if (file) {
          const uploadPromise = (async () => {
            try {
              const fileUrl = await uploadFile(file, `documents/${docType}`);
              console.log('✅ Inserting document record for', docType, ':', fileUrl);
              const { error: insertError } = await supabase.from('document').insert([
                {
                  owner_type: ownerType,
                  owner_id: finalEmployeeId,
                  type_document: docType,
                  file_url: fileUrl,
                  file_name: file.name,
                  date_emission: null,
                  date_expiration: null
                },
              ]);
              if (insertError) {
                console.error('❌ Error inserting document record:', insertError);
                throw insertError;
              }
              console.log('✅ Document record inserted for', docType);
            } catch (err) {
              console.error('❌ Error uploading document', docType, ':', err);
              throw err;
            }
          })();
          documentUploads.push(uploadPromise);
        }
      }

      await Promise.all(documentUploads);

      // Nettoyer localStorage après succès
      localStorage.removeItem('onboarding_form_data');
      console.log('✅ Données de localStorage nettoyées après soumission réussie');

      setSuccess(true);
      setFormData({
        prenom: '',
        nom: '',
        telephone: '',
        email: '',
        genre: '',
        date_naissance: '',
        nom_naissance: '',
        lieu_naissance: '',
        pays_naissance: '',
        nationalite: '',
        numero_securite_sociale: '',
        adresse: '',
        complement_adresse: '',
        code_postal: '',
        ville: '',
        date_permis_conduire: '',
        iban: '',
        bic: '',
        nir: '',
        site_id: '',
        secteur_id: '',
        consentement_rgpd: false,
      });
      setFiles({
        cni_recto: null,
        cni_verso: null,
        carte_vitale: null,
        rib: null,
        permis_recto: null,
        permis_verso: null,
        casier_judiciaire: null,
        attestation_points: null,
        cv: null,
        lettre_motivation: null,
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
            Inscription terminée!
          </h2>
          <p className="text-slate-600 mb-6 font-medium">
            Merci d'avoir complété votre dossier d'embauche. Notre équipe RH va traiter votre demande et prendra contact avec vous prochainement.
          </p>

          <button
            onClick={() => setSuccess(false)}
            className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-glow transform hover:scale-[1.02]"
          >
            Soumettre un autre dossier
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
          Dossier d'embauche
        </h1>
        <p className="text-center text-slate-600 mb-8 font-medium">
          Complétez votre dossier pour finaliser votre embauche
        </p>

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            // Empêcher la soumission du formulaire avec la touche Enter
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'submit') {
              e.preventDefault();
            }
          }}
          className="space-y-8"
        >
          {restoredFromStorage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm font-medium">
              Vos données ont été restaurées automatiquement
            </div>
          )}

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
              <FormInput label="Prénom *" value={formData.prenom} onChange={(v) => setFormData({ ...formData, prenom: v })} required />
              <FormInput label="Nom *" value={formData.nom} onChange={(v) => setFormData({ ...formData, nom: v })} required />
              <FormInput label="Téléphone *" type="tel" value={formData.telephone} onChange={(v) => setFormData({ ...formData, telephone: v })} required />
              <FormInput label="Email *" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} required />

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Genre *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Homme', 'Femme', 'Autre'].map((g) => (
                    <label
                      key={g}
                      className={`flex items-center justify-center px-4 py-3 border-2 rounded-xl cursor-pointer transition-all ${
                        formData.genre === g ? 'border-primary-500 bg-primary-50 text-primary-700 font-bold' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <input type="radio" name="genre" value={g} checked={formData.genre === g} onChange={(e) => setFormData({ ...formData, genre: e.target.value })} required className="sr-only" />
                      <span className="text-sm font-medium">{g}</span>
                    </label>
                  ))}
                </div>
              </div>

              <FormInput label="Date de naissance *" type="date" value={formData.date_naissance} onChange={(v) => setFormData({ ...formData, date_naissance: v })} required />

              {formData.genre === 'Femme' && (
                <FormInput
                  label="Nom de naissance (nom de jeune fille)"
                  value={formData.nom_naissance}
                  onChange={(v) => setFormData({ ...formData, nom_naissance: v })}
                  placeholder="Nom de jeune fille"
                />
              )}

              <FormInput label="Lieu de naissance *" value={formData.lieu_naissance} onChange={(v) => setFormData({ ...formData, lieu_naissance: v })} required />

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Pays de naissance *</label>
                <select
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
              <FormInput label="Nationalité *" value={formData.nationalite} onChange={(v) => setFormData({ ...formData, nationalite: v })} required />
              <FormInput label="Numéro de Sécurité Sociale *" value={formData.numero_securite_sociale} onChange={(v) => setFormData({ ...formData, numero_securite_sociale: v })} placeholder="X XX XX XX XXX XXX XX" required />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
              Adresse
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <AddressAutocompleteInput
                  label="Adresse complète *"
                  value={formData.adresse}
                  onChange={(value) => setFormData({ ...formData, adresse: value })}
                  onAddressSelect={(data) => {
                    setFormData({
                      ...formData,
                      adresse: data.adresse,
                      code_postal: data.code_postal,
                      ville: data.ville,
                    });
                  }}
                  required
                  placeholder="Tapez votre adresse..."
                />
              </div>
              <div className="md:col-span-2">
                <FormInput label="Complément d'adresse" value={formData.complement_adresse} onChange={(v) => setFormData({ ...formData, complement_adresse: v })} placeholder="Bâtiment, étage, appartement..." />
              </div>
              <FormInput label="Code postal *" value={formData.code_postal} onChange={(v) => setFormData({ ...formData, code_postal: v })} required />
              <FormInput label="Ville *" value={formData.ville} onChange={(v) => setFormData({ ...formData, ville: v })} required />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
              Permis de conduire
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <FormInput label="Date d'obtention *" type="date" value={formData.date_permis_conduire} onChange={(v) => setFormData({ ...formData, date_permis_conduire: v })} required />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
              Informations bancaires
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">IBAN *</label>
                <input
                  type="text"
                  value={formData.iban}
                  onChange={(e) => { setFormData({...formData, iban: e.target.value}); validateIban(e.target.value); }}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium ${ibanError ? 'border-red-500' : 'border-slate-200'}`}
                  placeholder="FR1420041010050500013M02606"
                  required
                />
                {ibanError && <div className="text-red-600 text-sm mt-1">{ibanError}</div>}
                {ibanValidationMessage && <div className="text-green-600 text-sm mt-1">{ibanValidationMessage}</div>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">BIC *</label>
                <input
                  type="text"
                  value={formData.bic}
                  onChange={(e) => setFormData({...formData, bic: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  placeholder="Ex: BNPAFRPP"
                  required
                />
              </div>
            </div>
          </div>


          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
              Documents obligatoires
            </h2>
            <div className="space-y-4">
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
              <FileUploadField label="Carte d'identité RECTO *" file={files.cni_recto} onChange={(e) => handleFileChange(e, 'cni_recto')} onRemove={() => removeFile('cni_recto')} accept="image/*,.pdf" required />
              <FileUploadField label="Carte d'identité VERSO *" file={files.cni_verso} onChange={(e) => handleFileChange(e, 'cni_verso')} onRemove={() => removeFile('cni_verso')} accept="image/*,.pdf" required />
              <FileUploadField label="Carte Vitale ou attestation *" file={files.carte_vitale} onChange={(e) => handleFileChange(e, 'carte_vitale')} onRemove={() => removeFile('carte_vitale')} accept="image/*,.pdf" required />
              <FileUploadField label="RIB *" file={files.rib} onChange={(e) => handleFileChange(e, 'rib')} onRemove={() => removeFile('rib')} accept="image/*,.pdf" required />
              <FileUploadField label="Permis de conduire RECTO *" file={files.permis_recto} onChange={(e) => handleFileChange(e, 'permis_recto')} onRemove={() => removeFile('permis_recto')} accept="image/*,.pdf" required />
              <FileUploadField label="Permis de conduire VERSO *" file={files.permis_verso} onChange={(e) => handleFileChange(e, 'permis_verso')} onRemove={() => removeFile('permis_verso')} accept="image/*,.pdf" required />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
              Documents optionnels
            </h2>
            <div className="space-y-4">
              <FileUploadField label="CV" file={files.cv} onChange={(e) => handleFileChange(e, 'cv')} onRemove={() => removeFile('cv')} accept=".pdf,.doc,.docx" />
              <FileUploadField label="Lettre de motivation" file={files.lettre_motivation} onChange={(e) => handleFileChange(e, 'lettre_motivation')} onRemove={() => removeFile('lettre_motivation')} accept=".pdf,.doc,.docx" />
              <FileUploadField label="Casier judiciaire" file={files.casier_judiciaire} onChange={(e) => handleFileChange(e, 'casier_judiciaire')} onRemove={() => removeFile('casier_judiciaire')} accept=".pdf" />
              <FileUploadField label="Attestation de points de permis" file={files.attestation_points} onChange={(e) => handleFileChange(e, 'attestation_points')} onRemove={() => removeFile('attestation_points')} accept=".pdf" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-6 border-2 border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={formData.consentement_rgpd} onChange={(e) => setFormData({ ...formData, consentement_rgpd: e.target.checked })} required className="mt-1 w-5 h-5 rounded border-slate-300 text-primary-500 focus:ring-2 focus:ring-primary-500 cursor-pointer" />
                <span className="text-sm text-slate-700 font-medium">
                  J'ai lu et j'accepte la Politique de confidentialité (RGPD) et autorise le traitement de mes données personnelles dans le cadre de mon embauche *
                </span>
              </label>
            </div>
          </div>

          <button type="submit" disabled={loading || uploadProgress || ibanError !== ''} className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-glow transform hover:scale-[1.02]">
            {uploadProgress ? 'Upload des fichiers...' : loading ? 'Envoi en cours...' : 'Valider mon dossier d\'embauche'}
          </button>

          <p className="text-xs text-center text-slate-500 font-medium">* Champs obligatoires</p>
        </form>
      </div>
    </div>
  );
}

function FormInput({ label, type = 'text', value, onChange, required = false, placeholder = '' }: { label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium" />
    </div>
  );
}

function FileUploadField({ label, file, onChange, onRemove, accept, required = false }: { label: string; file: File | null; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemove: () => void; accept?: string; required?: boolean }) {
  const handleLabelClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    // Permettre le clic sur le label, mais empêcher la propagation
    e.stopPropagation();
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      {file ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-sm font-medium text-green-700 flex-1 truncate">{file.name}</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 hover:bg-green-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-green-600" />
          </button>
        </div>
      ) : (
        <label
          onClick={handleLabelClick}
          className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all group"
        >
          <Upload className="w-6 h-6 text-slate-400 group-hover:text-primary-500 transition-colors" />
          <span className="text-sm font-medium text-slate-600 group-hover:text-primary-600 transition-colors">Charger un fichier (max. 10MB)</span>
          <input
            type="file"
            onChange={onChange}
            accept={accept}
            required={required}
            onClick={(e) => e.stopPropagation()}
            className="sr-only"
          />
        </label>
      )}
    </div>
  );
}
