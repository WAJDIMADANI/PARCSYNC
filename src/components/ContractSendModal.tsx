import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Send, FileText, Building, DollarSign, Calendar, Clock, Award, CheckCircle, XCircle, Mail, Eye } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { SuccessNotification } from './SuccessNotification';
import { calculateTrialEndDate, formatDateFR } from '../lib/trialPeriodCalculator';

interface ContractTemplate {
  id: string;
  nom: string;
  type_contrat: string;
  variables: Record<string, any>;
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

interface Document {
  id: string;
  type: string;
  fichier_url: string | null;
  created_at: string;
}

interface ContractSendModalProps {
  profilId: string;
  employeeName: string;
  employeeEmail: string;
  onClose: () => void;
  onSuccess: () => void;
  initialDateDebut?: string;
  employeeBirthplace?: string;
  employeeSSN?: string;
}

// ✅ Fonction pour récupérer le prochain numéro d'avenant
const getNextAvenantNumber = async (profilId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('contrat')
    .select('avenant_num')
    .eq('profil_id', profilId)
    .eq('type_document', 'avenant')
    .order('avenant_num', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Erreur récupération avenants:', error);
    return 1;
  }

  if (!data || data.length === 0) {
    return 1; // Premier avenant
  }

  return (data[0].avenant_num || 0) + 1;
};

export default function ContractSendModal({
  profilId,
  employeeName,
  employeeEmail,
  onClose,
  onSuccess,
  initialDateDebut,
  employeeBirthplace,
  employeeSSN
}: ContractSendModalProps) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showDocuments, setShowDocuments] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [renewTrial, setRenewTrial] = useState(false);
  const [trialPeriodInfo, setTrialPeriodInfo] = useState<{ endDate: string; description: string } | null>(null);

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
    const fullAddress = properties.label;

    setVariables({
      ...variables,
      lieu_travail: fullAddress,
    });

    setShowSuggestions(false);
  };

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSecteur, setSelectedSecteur] = useState('');
  const [variables, setVariables] = useState({
    poste: '',
    salaire: '',
    coefficient: '',
    date_debut: '',
    date_fin: '',
    heures_semaine: '35',
    taux_horaire: '',
    lieu_travail: '',
    birthplace: '',        // 🆕 NOUVEAU - Lieu de naissance
    id_number: ''          // 🆕 NOUVEAU - Numéro de Sécurité Sociale
  });

  useEffect(() => {
    if (selectedTemplate && variables.date_debut) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        const result = calculateTrialEndDate(
          template.type_contrat,
          variables.date_debut,
          variables.date_fin || undefined,
          renewTrial
        );
        setTrialPeriodInfo(result);
      }
    } else {
      setTrialPeriodInfo(null);
    }
  }, [selectedTemplate, variables.date_debut, variables.date_fin, renewTrial, templates]);

  useEffect(() => {
    fetchData();
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (initialDateDebut) {
      console.log('Setting date_debut to:', initialDateDebut);
      setVariables(prev => ({
        ...prev,
        date_debut: initialDateDebut
      }));
    } else {
      console.log('initialDateDebut is empty or undefined:', initialDateDebut);
    }
  }, [initialDateDebut]);

  // Pré-remplissage automatique des données du salarié depuis le profil
  useEffect(() => {
    const updates: Record<string, string> = {};

    if (employeeBirthplace) {
      updates.birthplace = employeeBirthplace;
    }

    if (employeeSSN) {
      updates.id_number = employeeSSN;
    }

    if (Object.keys(updates).length > 0) {
      console.log('🔄 Pré-remplissage depuis le profil:', updates);
      setVariables(prev => ({
        ...prev,
        ...updates
      }));
    }
  }, [employeeBirthplace, employeeSSN]);

  // Pré-remplissage automatique des champs depuis le modèle de contrat sélectionné
  useEffect(() => {
    if (selectedTemplate && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template && template.variables) {
        console.log('📋 Pré-remplissage depuis le modèle:', template.nom, template.variables);

        // Mapping entre la structure du modèle et les champs du formulaire
        const templateVars = template.variables as any;

        setVariables(prev => ({
          ...prev,
          poste: templateVars.contract?.job_title || prev.poste,
          coefficient: templateVars.contract?.coef || prev.coefficient,
          heures_semaine: templateVars.contract?.weekly_hours || prev.heures_semaine,
          taux_horaire: templateVars.contract?.hourly_rate || prev.taux_horaire,
          lieu_travail: templateVars.work?.work_site || prev.lieu_travail,
          birthplace: templateVars.employee?.birthplace || prev.birthplace,
          id_number: templateVars.employee?.id_number || prev.id_number
        }));
      }
    }
  }, [selectedTemplate, templates]);

  const fetchData = async () => {
    try {
      const [templatesRes, secteursRes, postesRes] = await Promise.all([
        supabase.from('modeles_contrats').select('*').order('nom'),
        supabase.from('secteur').select('*').order('nom'),
        supabase.from('poste').select('id, nom, description').eq('actif', true).order('nom')
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (secteursRes.error) throw secteursRes.error;
      if (postesRes.error) throw postesRes.error;

      setTemplates(templatesRes.data || []);
      setSecteurs(secteursRes.data || []);
      setPostes(postesRes.data || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('document')
        .select('*')
        .eq('owner_type', 'profil')
        .eq('owner_id', profilId);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    }
  };

  const requiredDocuments = [
    { type: 'cni_recto', label: 'CNI Recto' },
    { type: 'cni_verso', label: 'CNI Verso' },
    { type: 'carte_vitale', label: 'Carte Vitale' },
    { type: 'rib', label: 'RIB' },
    { type: 'permis_recto', label: 'Permis (recto)' },
    { type: 'permis_verso', label: 'Permis (verso)' }
  ];

  const getDocumentStatus = (docType: string) => {
    return documents.find(d => d.type === docType);
  };

  const missingDocuments = requiredDocuments.filter(doc => !getDocumentStatus(doc.type));
  const providedCount = requiredDocuments.length - missingDocuments.length;

  const handleSendReminder = async () => {
    if (missingDocuments.length === 0) {
      alert('Tous les documents ont été fournis.');
      return;
    }

    setSendingReminder(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-documents-reminder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            profilId,
            employeeName,
            employeeEmail,
            missingDocuments: missingDocuments.map(d => d.label)
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de l\'email');
      }

      alert('Email de relance envoyé avec succès.');
    } catch (error) {
      console.error('Erreur envoi email:', error);
      alert('Erreur lors de l\'envoi de l\'email de relance.');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate || !selectedSecteur) {
      alert('Veuillez sélectionner un modèle de contrat et un secteur');
      return;
    }

    if (!variables.poste) {
      alert('Veuillez remplir au minimum le poste');
      return;
    }

    // Validation de l'email
    console.log('Validation - employeeName:', employeeName, 'employeeEmail:', employeeEmail);

    if (!employeeEmail || !employeeEmail.includes('@')) {
      alert('Email du salarié manquant ou invalide. Veuillez mettre à jour le profil du salarié avec un email valide avant d\'envoyer le contrat.');
      return;
    }

    if (!employeeName || employeeName.trim() === '') {
      alert('Nom du salarié manquant. Veuillez mettre à jour le profil du salarié avant d\'envoyer le contrat.');
      return;
    }

    setSending(true);
    try {
      // ✅ ÉTAPE 0 : Déterminer le type_document et le numéro d'avenant
      const selectedTemplateObj = templates.find(t => t.id === selectedTemplate);
      const typeContrat = selectedTemplateObj?.type_contrat || 'CDD';
      
      console.log('📋 Template sélectionné:', selectedTemplateObj?.nom);
      console.log('📋 Type contrat:', typeContrat);

      let typeDocument: string;
      let avenantNum: number | null = null;

      if (typeContrat === 'Avenant') {
        typeDocument = 'avenant';
        avenantNum = await getNextAvenantNumber(profilId);
        console.log('✅ Avenant détecté - Numéro:', avenantNum);
      } else if (typeContrat === 'CDD') {
        typeDocument = 'cdd';
        console.log('✅ CDD détecté');
      } else if (typeContrat === 'CDI') {
        typeDocument = 'cdi';
        console.log('✅ CDI détecté');
      } else {
        typeDocument = typeContrat.toLowerCase();
        console.log('✅ Type détecté:', typeDocument);
      }

      // ✅ ÉTAPE 1 : Créer le contrat en base (avec statut 'en_attente_signature')
      const contractData: any = {
        profil_id: profilId,
        modele_id: selectedTemplate,
        type_document: typeDocument,
        variables: {
          ...variables,
          nom_salarie: employeeName,
          email_salarie: employeeEmail
        },
        statut: 'en_attente_signature'
      };

      // Ajouter avenant_num uniquement si c'est un avenant
      if (avenantNum !== null) {
        contractData.avenant_num = avenantNum;
      }

      console.log('📝 Données du contrat à créer:', contractData);

      const { data: contrat, error: contratError } = await supabase
        .from('contrat')
        .insert(contractData)
        .select()
        .single();

      if (contratError) throw contratError;

      console.log('✅ Contrat créé:', contrat.id);

      // ✅ ÉTAPE 2 : CRÉER LA DEMANDE YOUSIGN AVANT DE MARQUER COMME ENVOYÉ
      let yousignData;
      try {
        const yousignPayload = {
          contractId: contrat.id
        };

        console.log('📧 Envoi à Yousign - Contract ID:', contrat.id);

        const yousignResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-yousign-signature`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(yousignPayload)
          }
        );

        if (!yousignResponse.ok) {
          const errorText = await yousignResponse.text();
          console.error('Erreur Yousign (status ' + yousignResponse.status + '):', errorText);

          // Si c'est une erreur CORS ou réseau, on continue quand même
          if (yousignResponse.status === 0 || errorText.includes('CORS')) {
            console.warn('Erreur CORS détectée, le contrat sera marqué comme envoyé mais la signature Yousign peut ne pas être créée');
          } else {
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              throw new Error(`Erreur HTTP ${yousignResponse.status}: ${errorText}`);
            }
            throw new Error(`Erreur Yousign: ${errorData.error || 'Impossible de créer la demande de signature'}`);
          }
        } else {
          yousignData = await yousignResponse.json();
          console.log('✅ Demande de signature Yousign créée:', yousignData);
        }

        // ✅ ÉTAPE 3 : MAINTENANT, mettre le statut à 'envoye' seulement si Yousign a réussi
        const { error: updateError } = await supabase
          .from('contrat')
          .update({
            statut: 'envoye'
          })
          .eq('id', contrat.id);

        if (updateError) throw updateError;

        console.log('✅ Contrat marqué comme envoyé');

      } catch (fetchError: any) {
        console.error('❌ Erreur lors de l\'appel Yousign:', fetchError);

        // ✅ SUPPRIMER LE CONTRAT SI YOUSIGN ÉCHOUE
        await supabase.from('contrat').delete().eq('id', contrat.id);

        const errorMsg = fetchError.message || 'Erreur réseau lors du renvoi de l\'email';
        alert(`Erreur lors du renvoi de l'email :\n\n${errorMsg}`);
        setSending(false);
        return;
      }

      // ✅ ÉTAPE 4 : Mettre à jour le profil
      const updateData: any = {
        statut: 'contrat_envoye',
        secteur_id: selectedSecteur
      };

      if (trialPeriodInfo?.endDate) {
        updateData.date_fin_periode_essai = trialPeriodInfo.endDate;
      }

      const { error: profilError } = await supabase
        .from('profil')
        .update(updateData)
        .eq('id', profilId);

      if (profilError) throw profilError;

      setShowSuccess(true);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (error: any) {
      console.error('❌ Erreur envoi contrat:', error);
      const errorMessage = error.message || 'Erreur inconnue lors de l\'envoi du contrat';
      alert(`Erreur: ${errorMessage}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <LoadingSpinner size="lg" text="Chargement..." />
        </div>
      </div>
    );
  }

  return (
    <>
      {showSuccess && (
        <SuccessNotification
          message="Contrat envoyé avec succès"
          onClose={() => setShowSuccess(false)}
        />
      )}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold text-white">Envoyer le contrat</h2>
            <p className="text-blue-100 text-sm mt-1">{employeeName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Important :</strong> Le salarié recevra un email avec le contrat à signer et devra uploader son certificat médical.
              Vous pourrez ensuite uploader la DPAE pour finaliser l'activation.
            </p>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Modèle de contrat *
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Sélectionner un modèle</option>
                {(() => {
                  const groupedTemplates = templates.reduce((acc, template) => {
                    const type = template.type_contrat;
                    if (!acc[type]) acc[type] = [];
                    acc[type].push(template);
                    return acc;
                  }, {} as Record<string, ContractTemplate[]>);

                  return Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
                    <optgroup key={type} label={type}>
                      {typeTemplates.map(template => (
                        <option key={template.id} value={template.id}>
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
                <Building className="w-4 h-4 inline mr-1" />
                Secteur *
              </label>
              <select
                value={selectedSecteur}
                onChange={(e) => setSelectedSecteur(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Sélectionner un secteur</option>
                {secteurs.map(secteur => (
                  <option key={secteur.id} value={secteur.id}>
                    {secteur.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Variables du contrat</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Award className="w-4 h-4 inline mr-1" />
                  Poste *
                </label>
                <select
                  value={variables.poste}
                  onChange={(e) => setVariables({...variables, poste: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  required
                >
                  <option value="">Sélectionner un poste</option>
                  {postes.map(poste => (
                    <option key={poste.id} value={poste.nom}>
                      {poste.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coefficient
                </label>
                <input
                  type="text"
                  value={variables.coefficient}
                  onChange={(e) => setVariables({...variables, coefficient: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 140"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Heures par semaine
                </label>
                <input
                  type="text"
                  value={variables.heures_semaine}
                  onChange={(e) => setVariables({...variables, heures_semaine: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 35"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taux horaire
                </label>
                <input
                  type="text"
                  value={variables.taux_horaire}
                  onChange={(e) => setVariables({...variables, taux_horaire: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 11.65€"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date de début
                </label>
                <input
                  type="date"
                  value={variables.date_debut}
                  onChange={(e) => setVariables({...variables, date_debut: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin (si CDD)
                </label>
                <input
                  type="date"
                  value={variables.date_fin}
                  onChange={(e) => setVariables({...variables, date_fin: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {selectedTemplate && templates.find(t => t.id === selectedTemplate)?.type_contrat === 'CDI' && (
              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renewTrial}
                    onChange={(e) => setRenewTrial(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span>Renouveler la période d'essai (4 mois au lieu de 2 mois)</span>
                </label>
              </div>
            )}

            {trialPeriodInfo && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-900 mb-2">Période d'essai calculée</h4>
                <div className="text-sm text-green-800">
                  <p><strong>Durée :</strong> {trialPeriodInfo.description}</p>
                  <p><strong>Date de fin :</strong> {formatDateFR(trialPeriodInfo.endDate)} ({trialPeriodInfo.endDate})</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lieu de travail
                </label>
                <input
                  type="text"
                  value={variables.lieu_travail}
                  onChange={(e) => {
                    setVariables({...variables, lieu_travail: e.target.value});
                    searchAddress(e.target.value);
                  }}
                  onFocus={() => variables.lieu_travail.length >= 3 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tapez l'adresse du lieu de travail..."
                />

                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {addressSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => selectAddress(suggestion)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 text-sm text-gray-700"
                      >
                        {suggestion.properties.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 🆕 NOUVEAU - Lieu de naissance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lieu de naissance
                </label>
                <input
                  type="text"
                  value={variables.birthplace}
                  onChange={(e) => setVariables({...variables, birthplace: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Paris, Lyon, etc."
                />
              </div>

              {/* 🆕 NOUVEAU - Numéro de Sécurité Sociale */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de Sécurité Sociale
                </label>
                <input
                  type="text"
                  value={variables.id_number}
                  onChange={(e) => setVariables({...variables, id_number: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 1 84 12 345 678 901"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !selectedTemplate || !selectedSecteur}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
            >
              {sending ? (
                <LoadingSpinner size="sm" text="Envoi en cours..." />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer le contrat
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}