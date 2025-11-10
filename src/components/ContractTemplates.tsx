import { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, Download, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ContractVariables {
  employer_name: string;
  employer_address: string;
  employer_siren: string;
  employer_siret: string;
  employer_naf: string;
  employee: {
    first_name: string;
    last_name: string;
    birthday: string;
    birthplace: string;
    address_1: string;
    zip: string;
    city: string;
    nationality: string;
    id_number: string;
  };
  contract: {
    job_title: string;
    group: string;
    coef: string;
    contract_start: string;
    contract_end: string;
    trial_end_date: string;
    weekly_hours: string;
    annual_hours: string;
    hourly_rate: string;
  };
  work: {
    work_site: string;
    work_area: string;
  };
  annex: {
    hours_morning: string;
    hours_evening: string;
    monthly_hours_estimate: string;
  };
}

interface ContractTemplate {
  id: string;
  nom: string;
  type_contrat: string;
  fichier_url: string;
  fichier_nom: string;
  variables: ContractVariables;
  created_at: string;
}

const CONTRACT_TYPES = [
  { value: 'CDI', label: 'CDI - Contrat à Durée Indéterminée' },
  { value: 'CDD', label: 'CDD - Contrat à Durée Déterminée' },
  { value: 'Stage', label: 'Stage' },
  { value: 'Intérim', label: 'Intérim' },
  { value: 'Apprentissage', label: 'Apprentissage' },
  { value: 'Professionnalisation', label: 'Professionnalisation' },
];

const getDefaultVariables = (): ContractVariables => ({
  employer_name: 'TRANSPORT CLASSE AFFAIRE',
  employer_address: '111 Avenue Victor Hugo, 75116 Paris',
  employer_siren: '504265075',
  employer_siret: '50426507500029',
  employer_naf: '4939B',
  employee: {
    first_name: '',
    last_name: '',
    birthday: '',
    birthplace: '',
    address_1: '',
    zip: '',
    city: '',
    nationality: '',
    id_number: ''
  },
  contract: {
    job_title: 'Conducteur scolaire',
    group: '7 bis',
    coef: '137 V',
    contract_start: '',
    contract_end: '',
    trial_end_date: '',
    weekly_hours: '12-15',
    annual_hours: '550',
    hourly_rate: '13,046'
  },
  work: {
    work_site: '157 rue de la Nouvelle France, 93100 Montreuil',
    work_area: 'Île-de-France'
  },
  annex: {
    hours_morning: '1h30',
    hours_evening: '1h30',
    monthly_hours_estimate: '65'
  }
});

export function ContractTemplates() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    type_contrat: 'CDI',
    file: null as File | null,
  });
  const [editingVariables, setEditingVariables] = useState<string | null>(null);
  const [variablesData, setVariablesData] = useState<ContractVariables>(getDefaultVariables());

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('modeles_contrats')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erreur chargement modèles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setFormData({ ...formData, file });
    } else {
      alert('Seuls les fichiers PDF sont acceptés');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) return;

    setUploading(true);
    try {
      const fileExt = 'pdf';
      const fileName = `${Date.now()}_${formData.nom.replace(/[^a-z0-9]/gi, '_')}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('modeles-contrats')
        .upload(filePath, formData.file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('modeles-contrats')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('modeles_contrats')
        .insert({
          nom: formData.nom,
          type_contrat: formData.type_contrat,
          fichier_url: urlData.publicUrl,
          fichier_nom: formData.file.name,
          variables: getDefaultVariables(),
        });

      if (dbError) throw dbError;

      setShowAddModal(false);
      setFormData({ nom: '', type_contrat: 'CDI', file: null });
      loadTemplates();
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l\'ajout du modèle');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fichierUrl: string) => {
    if (!confirm('Supprimer ce modèle ?')) return;

    try {
      const fileName = fichierUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('modeles-contrats')
          .remove([fileName]);
      }

      const { error } = await supabase
        .from('modeles_contrats')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleDownload = async (fichierUrl: string, fichierNom: string) => {
    try {
      const fileName = fichierUrl.split('/').pop();
      if (!fileName) return;

      const { data, error } = await supabase.storage
        .from('modeles-contrats')
        .download(fileName);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fichierNom;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Modèles de Contrats</h1>
          <p className="text-slate-600">Gérez vos modèles de contrats (CDI, CDD, Stage, etc.)</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Ajouter un modèle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <FileText className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{template.nom}</h3>
                  <span className="inline-block px-2 py-1 bg-accent-100 text-accent-700 text-xs rounded-full mt-1">
                    {template.type_contrat}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Fichier: {template.fichier_nom}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingVariables(template.id);
                  const vars = template.variables as any;
                  if (vars && typeof vars === 'object' && Object.keys(vars).length > 0) {
                    setVariablesData({
                      ...getDefaultVariables(),
                      ...vars,
                      employee: { ...getDefaultVariables().employee, ...(vars.employee || {}) },
                      contract: { ...getDefaultVariables().contract, ...(vars.contract || {}) },
                      work: { ...getDefaultVariables().work, ...(vars.work || {}) },
                      annex: { ...getDefaultVariables().annex, ...(vars.annex || {}) }
                    });
                  } else {
                    setVariablesData(getDefaultVariables());
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent-50 text-accent-700 rounded-lg hover:bg-accent-100 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Variables
              </button>
              <button
                onClick={() => handleDownload(template.fichier_url, template.fichier_nom)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                Télécharger
              </button>
              <button
                onClick={() => handleDelete(template.id, template.fichier_url)}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-12">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">Aucun modèle de contrat</p>
            <p className="text-sm text-slate-500">Ajoutez votre premier modèle pour commencer</p>
          </div>
        )}
      </div>

      {editingVariables && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-900">Variables du contrat</h2>
              <button
                onClick={() => setEditingVariables(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const { error } = await supabase
                    .from('modeles_contrats')
                    .update({ variables: variablesData })
                    .eq('id', editingVariables);

                  if (error) throw error;
                  setEditingVariables(null);
                  loadTemplates();
                } catch (error) {
                  console.error('Erreur mise à jour:', error);
                  alert('Erreur lors de la mise à jour');
                }
              }}
              className="p-6 space-y-6 max-h-[70vh] overflow-y-auto"
            >
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Informations employeur</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom entreprise</label>
                    <input
                      type="text"
                      value={variablesData.employer_name}
                      onChange={(e) => setVariablesData({...variablesData, employer_name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                    <input
                      type="text"
                      value={variablesData.employer_address}
                      onChange={(e) => setVariablesData({...variablesData, employer_address: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SIREN</label>
                    <input
                      type="text"
                      value={variablesData.employer_siren}
                      onChange={(e) => setVariablesData({...variablesData, employer_siren: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SIRET</label>
                    <input
                      type="text"
                      value={variablesData.employer_siret}
                      onChange={(e) => setVariablesData({...variablesData, employer_siret: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Code NAF</label>
                    <input
                      type="text"
                      value={variablesData.employer_naf}
                      onChange={(e) => setVariablesData({...variablesData, employer_naf: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Détails du contrat</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Poste</label>
                    <input
                      type="text"
                      value={variablesData.contract.job_title}
                      onChange={(e) => setVariablesData({...variablesData, contract: {...variablesData.contract, job_title: e.target.value}})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Groupe</label>
                    <input
                      type="text"
                      value={variablesData.contract.group}
                      onChange={(e) => setVariablesData({...variablesData, contract: {...variablesData.contract, group: e.target.value}})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Coefficient</label>
                    <input
                      type="text"
                      value={variablesData.contract.coef}
                      onChange={(e) => setVariablesData({...variablesData, contract: {...variablesData.contract, coef: e.target.value}})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Heures hebdo</label>
                    <input
                      type="text"
                      value={variablesData.contract.weekly_hours}
                      onChange={(e) => setVariablesData({...variablesData, contract: {...variablesData.contract, weekly_hours: e.target.value}})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Heures annuelles</label>
                    <input
                      type="text"
                      value={variablesData.contract.annual_hours}
                      onChange={(e) => setVariablesData({...variablesData, contract: {...variablesData.contract, annual_hours: e.target.value}})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Taux horaire</label>
                    <input
                      type="text"
                      value={variablesData.contract.hourly_rate}
                      onChange={(e) => setVariablesData({...variablesData, contract: {...variablesData.contract, hourly_rate: e.target.value}})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Lieu de travail</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Site</label>
                    <input
                      type="text"
                      value={variablesData.work.work_site}
                      onChange={(e) => setVariablesData({...variablesData, work: {...variablesData.work, work_site: e.target.value}})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Zone</label>
                    <input
                      type="text"
                      value={variablesData.work.work_area}
                      onChange={(e) => setVariablesData({...variablesData, work: {...variablesData.work, work_area: e.target.value}})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Annexe - Horaires</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Heures matin</label>
                    <input
                      type="text"
                      value={variablesData.annex.hours_morning}
                      onChange={(e) => setVariablesData({...variablesData, annex: {...variablesData.annex, hours_morning: e.target.value}})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Heures soir</label>
                    <input
                      type="text"
                      value={variablesData.annex.hours_evening}
                      onChange={(e) => setVariablesData({...variablesData, annex: {...variablesData.annex, hours_evening: e.target.value}})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Heures mensuelles estimées</label>
                    <input
                      type="text"
                      value={variablesData.annex.monthly_hours_estimate}
                      onChange={(e) => setVariablesData({...variablesData, annex: {...variablesData.annex, monthly_hours_estimate: e.target.value}})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>Note:</strong> Les champs employé (nom, prénom, date de naissance, etc.) seront remplis automatiquement lors de la génération du contrat.
                </p>
              </div>

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setEditingVariables(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Ajouter un modèle</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom du modèle
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: CDI Commercial"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type de contrat
                </label>
                <select
                  value={formData.type_contrat}
                  onChange={(e) => setFormData({ ...formData, type_contrat: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {CONTRACT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fichier PDF
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    required
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    {formData.file ? (
                      <p className="text-sm text-slate-700">{formData.file.name}</p>
                    ) : (
                      <>
                        <p className="text-sm text-slate-600">Cliquez pour sélectionner un PDF</p>
                        <p className="text-xs text-slate-500 mt-1">Max 10 MB</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Upload...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
