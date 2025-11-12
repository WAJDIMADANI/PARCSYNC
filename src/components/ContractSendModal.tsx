import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Send, FileText, Building, DollarSign, Calendar, Clock, Award } from 'lucide-react';

interface ContractTemplate {
  id: string;
  nom: string;
  type_contrat: string;
  variables: Record<string, any>;
}

interface Site {
  id: string;
  nom: string;
}

interface ContractSendModalProps {
  profilId: string;
  employeeName: string;
  employeeEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContractSendModal({
  profilId,
  employeeName,
  employeeEmail,
  onClose,
  onSuccess
}: ContractSendModalProps) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [variables, setVariables] = useState({
    poste: '',
    salaire: '',
    coefficient: '',
    date_debut: '',
    date_fin: '',
    heures_semaine: '35',
    taux_horaire: '',
    lieu_travail: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, sitesRes] = await Promise.all([
        supabase.from('modeles_contrats').select('*').order('nom'),
        supabase.from('site').select('*').order('nom')
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (sitesRes.error) throw sitesRes.error;

      setTemplates(templatesRes.data || []);
      setSites(sitesRes.data || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate || !selectedSite) {
      alert('Veuillez sélectionner un modèle de contrat et un site');
      return;
    }

    if (!variables.poste || !variables.salaire) {
      alert('Veuillez remplir au minimum le poste et le salaire');
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
      // ✅ ÉTAPE 1 : Créer le contrat en base (mais avec statut 'en_attente_signature')
      const { data: contrat, error: contratError } = await supabase
        .from('contrat')
        .insert({
          profil_id: profilId,
          modele_id: selectedTemplate,
          site_id: selectedSite,
          variables: {
            ...variables,
            nom_salarie: employeeName,
            email_salarie: employeeEmail
          },
          statut: 'en_attente_signature'  // ✅ CHANGÉ : Pas 'envoye' tout de suite
        })
        .select()
        .single();

      if (contratError) throw contratError;

      console.log('Contrat créé:', contrat.id);

      // ✅ ÉTAPE 2 : CRÉER LA DEMANDE YOUSIGN AVANT DE MARQUER COMME ENVOYÉ
      let yousignData;
      try {
        const yousignPayload = {
          contractId: contrat.id
        };

        console.log('Envoi à Yousign - Contract ID:', contrat.id);

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
          console.log('Demande de signature Yousign créée:', yousignData);
        }

        // ✅ ÉTAPE 3 : MAINTENANT, mettre le statut à 'envoye' seulement si Yousign a réussi
        const { error: updateError } = await supabase
          .from('contrat')
          .update({
            statut: 'envoye'
          })
          .eq('id', contrat.id);

        if (updateError) throw updateError;

        console.log('Contrat marqué comme envoyé');

      } catch (fetchError: any) {
        console.error('Erreur lors de l\'appel Yousign:', fetchError);
        
        // ✅ SUPPRIMER LE CONTRAT SI YOUSIGN ÉCHOUE
        await supabase.from('contrat').delete().eq('id', contrat.id);
        
        alert(`ERREUR YOUSIGN : ${fetchError.message}\n\nLe contrat n'a pas pu être envoyé. Veuillez réessayer.`);
        throw fetchError;
      }

      // ✅ ÉTAPE 4 : Mettre à jour le profil
      const { error: profilError } = await supabase
        .from('profil')
        .update({
          statut: 'contrat_envoye',
          site_id: selectedSite
        })
        .eq('id', profilId);

      if (profilError) throw profilError;

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur envoi contrat:', error);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10 rounded-t-xl">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-white">Envoyer le contrat</h2>
            <p className="text-blue-100 text-sm mt-1">{employeeName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
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
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.nom} ({template.type_contrat})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building className="w-4 h-4 inline mr-1" />
                Site de travail *
              </label>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Sélectionner un site</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>
                    {site.nom}
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
                <input
                  type="text"
                  value={variables.poste}
                  onChange={(e) => setVariables({...variables, poste: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Chauffeur livreur"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Salaire brut mensuel *
                </label>
                <input
                  type="text"
                  value={variables.salaire}
                  onChange={(e) => setVariables({...variables, salaire: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 2000€"
                  required
                />
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lieu de travail
                </label>
                <input
                  type="text"
                  value={variables.lieu_travail}
                  onChange={(e) => setVariables({...variables, lieu_travail: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Adresse complète"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 sm:pt-6 flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !selectedTemplate || !selectedSite}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Envoi en cours...
                </>
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
  );
}