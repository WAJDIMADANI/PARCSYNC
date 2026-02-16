import { useState, useEffect } from 'react';
import { X, Upload, FileText, Calendar, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';

interface ContractTemplate {
  id: string;
  nom: string;
  type_contrat: string;
}

interface Poste {
  id: string;
  nom: string;
}

interface Secteur {
  id: string;
  nom: string;
}

interface ManualContractUploadModalProps {
  profilId: string;
  employeeName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualContractUploadModal({
  profilId,
  employeeName,
  onClose,
  onSuccess
}: ManualContractUploadModalProps) {
  const [typeContrat, setTypeContrat] = useState('');
  const [posteId, setPosteId] = useState('');
  const [secteurId, setSecteurId] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [dateSignature, setDateSignature] = useState('');
  const [notes, setNotes] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      setLoadingData(true);

      const [templatesResult, postesResult, secteursResult] = await Promise.all([
        supabase
          .from('modeles_contrats')
          .select('id, nom, type_contrat')
          .order('type_contrat, nom'),
        supabase
          .from('poste')
          .select('id, nom')
          .eq('actif', true)
          .order('nom'),
        supabase
          .from('secteur')
          .select('id, nom')
          .order('nom')
      ]);

      if (templatesResult.data) {
        setContractTemplates(templatesResult.data);
      }

      if (postesResult.data) {
        setPostes(postesResult.data);
      }

      if (secteursResult.data) {
        setSecteurs(secteursResult.data);
      }
    } catch (err: any) {
      console.error('Error loading form data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoadingData(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError('');

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Le fichier doit être au format PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier ne doit pas dépasser 10 MB');
      return;
    }

    setPdfFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!pdfFile) {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    if (!typeContrat) {
      setError('Le type de contrat est obligatoire');
      return;
    }

    if (!posteId) {
      setError('Le poste est obligatoire');
      return;
    }

    if (!dateDebut) {
      setError('La date de début est obligatoire');
      return;
    }

    if (!dateSignature) {
      setError('La date de signature est obligatoire');
      return;
    }

    try {
      setUploading(true);

      const fileExt = 'pdf';
      const fileName = `${profilId}/${crypto.randomUUID()}-manual.${fileExt}`;
      const filePath = `contrats/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Erreur lors de l\'upload du fichier');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const selectedPoste = postes.find(p => p.id === posteId);
      const selectedSecteur = secteurs.find(s => s.id === secteurId);

      const variables = {
        type_contrat: typeContrat,
        poste_id: posteId,
        poste: selectedPoste?.nom || 'Non renseigné',
        secteur_id: secteurId || null,
        secteur: selectedSecteur?.nom || null,
        date_debut: dateDebut,
        date_fin: dateFin || null,
        date_signature: dateSignature,
        notes: notes || '',
        source: 'manuel',
        uploaded_by_name: employeeName
      };

      const insertData = {
        profil_id: profilId,
        modele_id: null,
        fichier_signe_url: filePath,
        statut: 'signe',
        date_signature: dateSignature,
        variables: variables,
        yousign_signature_request_id: null,
        source: 'manuel',
        type_document: 'contrat',
        avenant_num: null
      };

      console.log('Attempting to insert contract with data:', insertData);

      const { data: insertedData, error: insertError } = await supabase
        .from('contrat')
        .insert(insertData)
        .select();

      if (insertError) {
        console.error('Insert error details:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        console.error('Supabase request failed', insertError);
        await supabase.storage.from('documents').remove([filePath]);
        throw new Error(`Erreur lors de l'enregistrement: ${insertError.message || 'Erreur inconnue'}`);
      }

      console.log('Contract inserted successfully:', insertedData);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error uploading manual contract:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ajouter un contrat manuel</h2>
            <p className="text-sm text-gray-500 mt-1">{employeeName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
            disabled={uploading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <div className="text-red-600 text-sm">{error}</div>
            </div>
          )}

          {loadingData ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="md" />
              <p className="ml-3 text-gray-500">Chargement des données...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de contrat <span className="text-red-500">*</span>
                </label>
                <select
                  value={typeContrat}
                  onChange={(e) => setTypeContrat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={uploading}
                >
                  <option value="">-- Sélectionner un type --</option>
                  {(() => {
                    const groupedTemplates = contractTemplates.reduce((acc, template) => {
                      const type = template.type_contrat;
                      if (!acc[type]) acc[type] = [];
                      acc[type].push(template);
                      return acc;
                    }, {} as Record<string, ContractTemplate[]>);

                    return Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
                      <optgroup key={type} label={type}>
                        {typeTemplates.map(template => (
                          <option key={template.id} value={template.nom}>
                            {template.nom}
                          </option>
                        ))}
                      </optgroup>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poste / Fonction <span className="text-red-500">*</span>
                </label>
                <select
                  value={posteId}
                  onChange={(e) => setPosteId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={uploading}
                >
                  <option value="">-- Sélectionner un poste --</option>
                  {postes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secteur
                </label>
                <select
                  value={secteurId}
                  onChange={(e) => setSecteurId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={uploading}
                >
                  <option value="">-- Sélectionner un secteur (optionnel) --</option>
                  {secteurs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de signature <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateSignature}
                  onChange={(e) => setDateSignature(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes / Commentaires
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes optionnelles sur ce contrat..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier PDF signé <span className="text-red-500">*</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : pdfFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {pdfFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{pdfFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPdfFile(null)}
                      className="ml-4 text-red-600 hover:text-red-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">
                      Glissez-déposez votre fichier PDF ici
                    </p>
                    <p className="text-sm text-gray-500 mb-4">ou</p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                      <Upload size={18} />
                      Sélectionner un fichier
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-3">
                      PDF uniquement, max 10 MB
                    </p>
                  </>
                )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={uploading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploading || !pdfFile || loadingData}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <LoadingSpinner size="sm" variant="white" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Enregistrer le contrat
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
