import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { COUNTRIES } from '../lib/countries';
import { useAuth } from '../contexts/AuthContext';

interface Site {
  id: string;
  nom: string;
}

interface Secteur {
  id: string;
  nom: string;
}

export function ImportSalarieTest() {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    matricule_tca: '',
    prenom: '',
    nom: '',
    nom_naissance: '',
    genre: '',
    date_naissance: '',
    lieu_naissance: '',
    pays_naissance: '',
    nationalite: '',
    email: '',
    tel: '',
    adresse: '',
    complement_adresse: '',
    code_postal: '',
    ville: '',
    type_piece_identite: '',
    numero_securite_sociale: '',
    nir: '',
    iban: '',
    bic: '',
    date_permis_conduire: '',
    permis_categorie: '',
    permis_points: '',
    titre_sejour_fin_validite: '',
    secteur_id: '',
    site_id: '',
    date_entree: '',
    date_visite_medicale: '',
    date_fin_visite_medicale: '',
    periode_essai: '',
    modele_contrat: '',
    contrat_type: 'cdi',
    contrat_date_debut: '',
    contrat_date_fin: '',
    contrat_remuneration_brut: '',
    contrat_duree_hebdo_hours: '',
    avenant_1_date: '',
    avenant_1_date_fin: '',
    avenant_1_type: '',
    avenant_2_date: '',
    avenant_2_date_fin: '',
    avenant_2_type: '',
  });

  useEffect(() => {
    fetchSitesAndSecteurs();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: existingEmployee } = await supabase
        .from('profil')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingEmployee) {
        throw new Error('Un salarié avec cet email existe déjà');
      }

      const { data: employeeData, error: insertError } = await supabase
        .from('profil')
        .insert([
          {
            matricule_tca: formData.matricule_tca || null,
            prenom: formData.prenom,
            nom: formData.nom,
            email: formData.email,
            tel: formData.tel || null,
            genre: formData.genre || null,
            date_naissance: formData.date_naissance || null,
            lieu_naissance: formData.lieu_naissance || null,
            pays_naissance: formData.pays_naissance || null,
            nationalite: formData.nationalite || null,
            adresse: formData.adresse || null,
            complement_adresse: formData.complement_adresse || null,
            code_postal: formData.code_postal || null,
            ville: formData.ville || null,
            type_piece_identite: formData.type_piece_identite || null,
            numero_securite_sociale: formData.numero_securite_sociale || null,
            nir: formData.nir || null,
            iban: formData.iban || null,
            bic: formData.bic || null,
            date_permis_conduire: formData.date_permis_conduire || null,
            permis_categorie: formData.permis_categorie || null,
            permis_points: formData.permis_points ? parseInt(formData.permis_points) : null,
            titre_sejour_fin_validite: formData.titre_sejour_fin_validite || null,
            date_visite_medicale: formData.date_visite_medicale || null,
            date_fin_visite_medicale: formData.date_fin_visite_medicale || null,
            periode_essai: formData.periode_essai || null,
            modele_contrat: formData.modele_contrat || null,
            site_id: formData.site_id || null,
            secteur_id: formData.secteur_id || null,
            date_entree: formData.date_entree || null,
            statut: 'actif',
            role: 'salarie',
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      if (formData.contrat_date_debut) {
        const { error: contratError } = await supabase.from('contrat').insert([
          {
            profil_id: employeeData.id,
            type: formData.contrat_type,
            date_debut: formData.contrat_date_debut,
            date_fin: formData.contrat_date_fin || null,
            remuneration_brut: formData.contrat_remuneration_brut
              ? parseFloat(formData.contrat_remuneration_brut)
              : null,
            duree_hebdo_hours: formData.contrat_duree_hebdo_hours
              ? parseFloat(formData.contrat_duree_hebdo_hours)
              : null,
            esign: 'signed',
          },
        ]);

        if (contratError) throw contratError;
      }

      const avenants = [
        {
          date_debut: formData.avenant_1_date,
          date_fin: formData.avenant_1_date_fin,
          type: formData.avenant_1_type
        },
        {
          date_debut: formData.avenant_2_date,
          date_fin: formData.avenant_2_date_fin,
          type: formData.avenant_2_type
        },
      ].filter((a) => a.date_debut && a.type);

      if (avenants.length > 0) {
        const avenantInserts = avenants.map((a) => ({
          profil_id: employeeData.id,
          type: 'avenant',
          date_debut: a.date_debut,
          date_fin: a.date_fin || null,
          remuneration_brut: null,
          duree_hebdo_hours: null,
          esign: 'signed',
        }));

        const { error: avenantError } = await supabase
          .from('contrat')
          .insert(avenantInserts);

        if (avenantError) throw avenantError;
      }

      setSuccess(true);
      setFormData({
        matricule_tca: '',
        prenom: '',
        nom: '',
        nom_naissance: '',
        genre: '',
        date_naissance: '',
        lieu_naissance: '',
        pays_naissance: '',
        nationalite: '',
        email: '',
        tel: '',
        adresse: '',
        complement_adresse: '',
        code_postal: '',
        ville: '',
        type_piece_identite: '',
        numero_securite_sociale: '',
        nir: '',
        iban: '',
        bic: '',
        date_permis_conduire: '',
        permis_categorie: '',
        permis_points: '',
        titre_sejour_fin_validite: '',
        secteur_id: '',
        site_id: '',
        date_entree: '',
        date_visite_medicale: '',
        date_fin_visite_medicale: '',
        periode_essai: '',
        modele_contrat: '',
        contrat_type: 'cdi',
        contrat_date_debut: '',
        contrat_date_fin: '',
        contrat_remuneration_brut: '',
        contrat_duree_hebdo_hours: '',
        avenant_1_date: '',
        avenant_1_date_fin: '',
        avenant_1_type: '',
        avenant_2_date: '',
        avenant_2_date_fin: '',
        avenant_2_type: '',
      });

      setTimeout(() => {
        setSuccess(false);
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Salarié créé avec succès</h2>
        <p className="text-gray-600">Redirection vers la liste des salariés...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <UserPlus className="w-6 h-6 text-primary-500" />
          <h2 className="text-2xl font-bold text-gray-900">Import Salarié Test</h2>
        </div>
        <p className="text-gray-600 mt-2">
          Formulaire de test pour créer un salarié avec toutes les données de l'Excel
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
            Identification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Matricule TCA"
              value={formData.matricule_tca}
              onChange={(v) => setFormData({ ...formData, matricule_tca: v })}
              placeholder="Ex: 12345"
            />
            <FormInput
              label="Prénom *"
              value={formData.prenom}
              onChange={(v) => setFormData({ ...formData, prenom: v })}
              required
            />
            <FormInput
              label="Nom *"
              value={formData.nom}
              onChange={(v) => setFormData({ ...formData, nom: v })}
              required
            />
            <FormInput
              label="Nom de naissance"
              value={formData.nom_naissance}
              onChange={(v) => setFormData({ ...formData, nom_naissance: v })}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
            État civil
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Genre</label>
              <select
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Sélectionner</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <FormInput
              label="Date de naissance"
              type="date"
              value={formData.date_naissance}
              onChange={(v) => setFormData({ ...formData, date_naissance: v })}
            />
            <FormInput
              label="Lieu de naissance"
              value={formData.lieu_naissance}
              onChange={(v) => setFormData({ ...formData, lieu_naissance: v })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays de naissance
              </label>
              <select
                value={formData.pays_naissance}
                onChange={(e) => setFormData({ ...formData, pays_naissance: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Sélectionner un pays</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
            <FormInput
              label="Nationalité"
              value={formData.nationalite}
              onChange={(v) => setFormData({ ...formData, nationalite: v })}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(v) => setFormData({ ...formData, email: v })}
              required
            />
            <FormInput
              label="Téléphone"
              type="tel"
              value={formData.tel}
              onChange={(v) => setFormData({ ...formData, tel: v })}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Adresse</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormInput
                label="Adresse complète"
                value={formData.adresse}
                onChange={(v) => setFormData({ ...formData, adresse: v })}
              />
            </div>
            <div className="md:col-span-2">
              <FormInput
                label="Complément d'adresse"
                value={formData.complement_adresse}
                onChange={(v) => setFormData({ ...formData, complement_adresse: v })}
              />
            </div>
            <FormInput
              label="Code postal"
              value={formData.code_postal}
              onChange={(v) => setFormData({ ...formData, code_postal: v })}
            />
            <FormInput
              label="Ville"
              value={formData.ville}
              onChange={(v) => setFormData({ ...formData, ville: v })}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
            Documents d'identité
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Type de pièce d'identité"
              value={formData.type_piece_identite}
              onChange={(v) => setFormData({ ...formData, type_piece_identite: v })}
              placeholder="Ex: CNI, Passeport, Titre de séjour"
            />
            <FormInput
              label="Numéro de Sécurité Sociale"
              value={formData.numero_securite_sociale}
              onChange={(v) => setFormData({ ...formData, numero_securite_sociale: v })}
              placeholder="X XX XX XX XXX XXX XX"
            />
            <FormInput
              label="NIR"
              value={formData.nir}
              onChange={(v) => setFormData({ ...formData, nir: v })}
            />
            <FormInput
              label="Fin de validité titre de séjour"
              type="date"
              value={formData.titre_sejour_fin_validite}
              onChange={(v) => setFormData({ ...formData, titre_sejour_fin_validite: v })}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
            Informations bancaires
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="IBAN"
              value={formData.iban}
              onChange={(v) => setFormData({ ...formData, iban: v })}
              placeholder="FR1420041010050500013M02606"
            />
            <FormInput
              label="BIC"
              value={formData.bic}
              onChange={(v) => setFormData({ ...formData, bic: v })}
              placeholder="BNPAFRPP"
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
            Permis de conduire
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormInput
              label="Date d'obtention"
              type="date"
              value={formData.date_permis_conduire}
              onChange={(v) => setFormData({ ...formData, date_permis_conduire: v })}
            />
            <FormInput
              label="Catégorie"
              value={formData.permis_categorie}
              onChange={(v) => setFormData({ ...formData, permis_categorie: v })}
              placeholder="Ex: B"
            />
            <FormInput
              label="Points"
              type="number"
              value={formData.permis_points}
              onChange={(v) => setFormData({ ...formData, permis_points: v })}
              placeholder="12"
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Affectation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secteur *</label>
              <select
                value={formData.secteur_id}
                onChange={(e) => setFormData({ ...formData, secteur_id: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Sélectionner un secteur</option>
                {secteurs.map((secteur) => (
                  <option key={secteur.id} value={secteur.id}>
                    {secteur.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
              <select
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Sélectionner un site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.nom}
                  </option>
                ))}
              </select>
            </div>
            <FormInput
              label="Date d'entrée"
              type="date"
              value={formData.date_entree}
              onChange={(v) => setFormData({ ...formData, date_entree: v })}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
            Visite médicale & Contrat
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Date visite médicale"
              type="date"
              value={formData.date_visite_medicale}
              onChange={(v) => setFormData({ ...formData, date_visite_medicale: v })}
            />
            <FormInput
              label="Date fin visite médicale"
              type="date"
              value={formData.date_fin_visite_medicale}
              onChange={(v) => setFormData({ ...formData, date_fin_visite_medicale: v })}
            />
            <FormInput
              label="Fin période d'essai"
              type="date"
              value={formData.periode_essai}
              onChange={(v) => setFormData({ ...formData, periode_essai: v })}
            />
            <FormInput
              label="Modèle de contrat"
              value={formData.modele_contrat}
              onChange={(v) => setFormData({ ...formData, modele_contrat: v })}
              placeholder="Ex: CDI Standard"
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
            Contrat principal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={formData.contrat_type}
                onChange={(e) => setFormData({ ...formData, contrat_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="cdi">CDI</option>
                <option value="cdd">CDD</option>
                <option value="interim">Intérim</option>
              </select>
            </div>
            <FormInput
              label="Date de début"
              type="date"
              value={formData.contrat_date_debut}
              onChange={(v) => setFormData({ ...formData, contrat_date_debut: v })}
            />
            <FormInput
              label="Date de fin (si CDD)"
              type="date"
              value={formData.contrat_date_fin}
              onChange={(v) => setFormData({ ...formData, contrat_date_fin: v })}
            />
            <FormInput
              label="Rémunération brute"
              type="number"
              value={formData.contrat_remuneration_brut}
              onChange={(v) => setFormData({ ...formData, contrat_remuneration_brut: v })}
              placeholder="Ex: 2000"
            />
            <FormInput
              label="Heures hebdomadaires"
              type="number"
              value={formData.contrat_duree_hebdo_hours}
              onChange={(v) => setFormData({ ...formData, contrat_duree_hebdo_hours: v })}
              placeholder="Ex: 35"
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
            Avenants (optionnel)
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <FormInput
                label="Avenant 1 - Date début"
                type="date"
                value={formData.avenant_1_date}
                onChange={(v) => setFormData({ ...formData, avenant_1_date: v })}
              />
              <FormInput
                label="Avenant 1 - Date fin"
                type="date"
                value={formData.avenant_1_date_fin}
                onChange={(v) => setFormData({ ...formData, avenant_1_date_fin: v })}
              />
              <FormInput
                label="Avenant 1 - Type"
                value={formData.avenant_1_type}
                onChange={(v) => setFormData({ ...formData, avenant_1_type: v })}
                placeholder="Ex: Augmentation salaire"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <FormInput
                label="Avenant 2 - Date début"
                type="date"
                value={formData.avenant_2_date}
                onChange={(v) => setFormData({ ...formData, avenant_2_date: v })}
              />
              <FormInput
                label="Avenant 2 - Date fin"
                type="date"
                value={formData.avenant_2_date_fin}
                onChange={(v) => setFormData({ ...formData, avenant_2_date_fin: v })}
              />
              <FormInput
                label="Avenant 2 - Type"
                value={formData.avenant_2_type}
                onChange={(v) => setFormData({ ...formData, avenant_2_type: v })}
                placeholder="Ex: Changement horaires"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Création en cours...' : 'Créer le salarié'}
          </button>
        </div>

        <p className="text-xs text-center text-gray-500">
          * Champs obligatoires: Prénom, Nom, Email, Secteur
        </p>
      </form>
    </div>
  );
}

function FormInput({
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  placeholder = '',
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      />
    </div>
  );
}
