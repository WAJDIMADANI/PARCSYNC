import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';
import { MapPin, Phone, Mail, Building, User, ChevronDown, ChevronUp, FileDown, Loader2, Send, Clock, CheckCircle2 } from 'lucide-react';
import { generateContractLocationPurePdf, formatDateFr, formatDateLongFr } from '../lib/contractLocationPureGenerator';

interface Props {
  vehicleId: string;
}

const TYPE_LABELS: Record<string, string> = {
  location_pure: 'Location pure',
  location_vente_particulier: 'Loc-vente particulier',
  location_vente_societe: 'Loc-vente societe',
  loa: 'LOA',
};

BACKUP  function VehicleLocations({ vehicleId }: Props) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [sendingSignature, setSendingSignature] = useState<string | null>(null);
  const [confirmSendModal, setConfirmSendModal] = useState<{ loc: any; email: string } | null>(null);

  useEffect(() => {
    fetchLocations();
  }, [vehicleId]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select(`
          id, type_location, reference_contrat, date_debut, date_fin, duree_mois,
          montant_mensuel, montant_mensuel_ht, montant_mensuel_ttc,
          montant_total_ht, montant_total_ttc, apport_initial,
          depot_garantie, km_depart, km_inclus, cout_km_supplementaire,
          valeur_residuelle, mensualites_payees, reste_a_payer_ttc,
          statut, notes, contrat_pdf_path, signature_status, yousign_sent_at, yousign_signed_at, contrat_signed_pdf_path,
          loueur:locataire_id(id, nom, prenom, type, telephone, email, adresse, siret, permis_numero, permis_validite, date_naissance, nationalite, lieu_naissance),
          vehicule:vehicule_id(immatriculation, marque, modele, energie, date_premiere_mise_en_circulation)
        `)
        .eq('vehicule_id', vehicleId)
        .order('date_debut', { ascending: false });
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Erreur chargement locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async (loc: any) => {
    if (generatingPdf) return;
    setGeneratingPdf(loc.id);
    try {
      const loueur = loc.loueur;
      const vehicule = loc.vehicule || {};
      const pdfPath = await generateContractLocationPurePdf({
        locationId: loc.id,
        reference: loc.reference_contrat || 'N/A',
        dateContrat: formatDateFr(loc.date_debut),
        locataireCivilite: loueur?.type === 'particulier' ? 'M.' : '',
        locataireNom: loueur?.nom || '',
        locatairePrenom: loueur?.prenom || '',
        locataireDateNaissance: formatDateFr(loueur?.date_naissance),
        locataireLieuNaissance: loueur?.lieu_naissance || '',
        locataireNationalite: loueur?.nationalite || '',
        locataireAdresse: loueur?.adresse || '',
        marque: vehicule.marque || '',
        modele: vehicule.modele || '',
        immatriculation: vehicule.immatriculation || '',
        carburant: vehicule.energie || '',
        date1ereImmat: formatDateFr(vehicule.date_premiere_mise_en_circulation),
        valeurResiduelle: loc.valeur_residuelle ? String(loc.valeur_residuelle) : '',
        dateDebut: formatDateLongFr(loc.date_debut),
        dateFin: formatDateLongFr(loc.date_fin),
        dureeMois: loc.duree_mois ? String(loc.duree_mois) : '',
        mensualiteTtc: loc.montant_mensuel_ttc ? Number(loc.montant_mensuel_ttc).toFixed(2) : '',
        depotGarantie: loc.depot_garantie ? String(loc.depot_garantie) : '',
        kmInclus: loc.km_inclus ? String(loc.km_inclus) : '',
        dateSignature: formatDateFr(loc.date_debut),
      });
      if (pdfPath) {
        const { data: signedUrl } = await supabase.storage.from('edl-documents').createSignedUrl(pdfPath, 300);
        if (signedUrl?.signedUrl) {
          window.open(signedUrl.signedUrl, '_blank');
        }
        await fetchLocations();
      }
    } catch (err) {
      console.error('Erreur generation PDF contrat:', err);
      alert('Erreur lors de la generation du PDF');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDownloadPdf = async (pdfPath: string) => {
    const { data: signedUrl } = await supabase.storage.from('edl-documents').createSignedUrl(pdfPath, 300);
    if (signedUrl?.signedUrl) window.open(signedUrl.signedUrl, '_blank');
  };

  const handleDownloadSignedPdf = async (path: string) => {
    const { data: signedUrl } = await supabase.storage.from('edl-documents').createSignedUrl(path, 300);
    if (signedUrl?.signedUrl) window.open(signedUrl.signedUrl, '_blank');
  };

  const handleAskSendSignature = (loc: any) => {
    const email = loc.loueur?.email;
    if (!email || !email.includes('@')) {
      alert('Email du locataire manquant ou invalide. Modifiez la fiche du loueur avant d\'envoyer pour signature.');
      return;
    }
    setConfirmSendModal({ loc, email });
  };

  const handleConfirmSendSignature = async () => {
    if (!confirmSendModal) return;
    const loc = confirmSendModal.loc;
    setSendingSignature(loc.id);
    setConfirmSendModal(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session non disponible');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-yousign-signature-location`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ locationId: loc.id }),
        }
      );

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Erreur ${response.status}`);
      }

      alert(`Email de signature envoyé à ${result.signerEmail} avec succès !`);
      await fetchLocations();
    } catch (err: any) {
      console.error('Erreur envoi signature:', err);
      alert('Erreur lors de l\'envoi pour signature : ' + (err.message || 'inconnue'));
    } finally {
      setSendingSignature(null);
    }
  };

  const getStatutBadge = (statut: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      en_cours:  { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'En cours' },
      terminee:  { bg: 'bg-gray-100',    text: 'text-gray-600',    label: 'Terminee' },
      en_retard: { bg: 'bg-red-100',     text: 'text-red-700',     label: 'En retard' },
      annulee:   { bg: 'bg-orange-100',  text: 'text-orange-700',  label: 'Annulee' },
    };
    const c = config[statut] || { bg: 'bg-gray-100', text: 'text-gray-600', label: statut };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
  };

  if (loading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">Aucune location enregistree</p>
        <p className="text-gray-400 text-sm mt-1">Les locations apparaitront ici apres creation via la page Locations</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {locations.map((loc) => {
        const loueur = loc.loueur;
        const loueurNom = loueur
          ? loueur.type === 'particulier'
            ? ((loueur.prenom || '') + ' ' + (loueur.nom || '')).trim()
            : loueur.nom
          : '';
        const isExpanded = expandedId === loc.id;
        const typeLabel = TYPE_LABELS[loc.type_location] || loc.type_location;
        const isVente = loc.type_location === 'location_vente_particulier' || loc.type_location === 'location_vente_societe';

        return (
          <div key={loc.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Ligne resume */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : loc.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-gray-900">{loueurNom}</span>
                  <span className="text-xs text-gray-500">{typeLabel}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>Debut : {formatDate(loc.date_debut)}</span>
                  <span>Fin : {formatDate(loc.date_fin)}</span>
                  <span className="font-medium">{loc.montant_mensuel_ttc || loc.montant_mensuel ? (loc.montant_mensuel_ttc || loc.montant_mensuel) + ' EUR/mois' : ''}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatutBadge(loc.statut)}
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>

            {/* Details deplies */}
            {isExpanded && (
              <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                {/* Coordonnees locataire */}
                {loueur && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      {loueur.type === 'entreprise' ? 'Locataire (Societe)' : 'Locataire (Particulier)'}
                    </p>
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="col-span-2 font-semibold text-gray-900 text-base">
                          {loueur.type === 'particulier' ? ((loueur.prenom || '') + ' ' + loueur.nom).trim() : loueur.nom}
                        </div>
                        {loueur.telephone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700">{loueur.telephone}</span>
                          </div>
                        )}
                        {loueur.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700 text-xs">{loueur.email}</span>
                          </div>
                        )}
                        {loueur.adresse && (
                          <div className="col-span-2 flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                            <span className="text-gray-700 text-xs">{loueur.adresse}</span>
                          </div>
                        )}
                        {loueur.siret && (
                          <div className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700 text-xs">SIRET: {loueur.siret}</span>
                          </div>
                        )}
                        {loueur.permis_numero && (
                          <div className="text-xs text-gray-600">Permis : {loueur.permis_numero}{loueur.permis_validite ? ' (val. ' + formatDate(loueur.permis_validite) + ')' : ''}</div>
                        )}
                        {loueur.date_naissance && (
                          <div className="text-xs text-gray-600">Ne(e) le : {formatDate(loueur.date_naissance)}{loueur.lieu_naissance ? ' a ' + loueur.lieu_naissance : ''}{loueur.nationalite ? ' - ' + loueur.nationalite : ''}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Details financiers */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Details financiers</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {loc.reference_contrat && <div><span className="text-gray-500">Reference :</span> <strong>{loc.reference_contrat}</strong></div>}
                    {loc.duree_mois && <div><span className="text-gray-500">Duree :</span> <strong>{loc.duree_mois} mois</strong></div>}
                    {loc.montant_mensuel_ttc && <div><span className="text-gray-500">Mensualite TTC :</span> <strong>{loc.montant_mensuel_ttc} EUR</strong></div>}
                    {loc.montant_mensuel_ht && <div><span className="text-gray-500">Mensualite HT :</span> <strong>{loc.montant_mensuel_ht} EUR</strong></div>}
                    {loc.montant_total_ttc && <div><span className="text-gray-500">Total TTC :</span> <strong className="text-emerald-700">{loc.montant_total_ttc} EUR</strong></div>}
                    {loc.montant_total_ht && <div><span className="text-gray-500">Total HT :</span> <strong>{loc.montant_total_ht} EUR</strong></div>}
                    {isVente && loc.apport_initial && <div><span className="text-gray-500">Apport initial :</span> <strong>{loc.apport_initial} EUR</strong></div>}
                    {!isVente && loc.depot_garantie && <div><span className="text-gray-500">Depot garantie :</span> <strong>{loc.depot_garantie} EUR</strong></div>}
                    {loc.km_depart && <div><span className="text-gray-500">Km depart :</span> <strong>{parseInt(loc.km_depart).toLocaleString()} km</strong></div>}
                    {!isVente && loc.km_inclus && <div><span className="text-gray-500">Km inclus :</span> <strong>{loc.km_inclus} km</strong></div>}
                    {!isVente && loc.valeur_residuelle && <div><span className="text-gray-500">Valeur residuelle :</span> <strong>{loc.valeur_residuelle} EUR</strong></div>}
                  </div>
                </div>

                {/* Suivi paiements */}
                {loc.duree_mois && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Suivi paiements</p>
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">{loc.mensualites_payees || 0} / {loc.duree_mois} mensualites payees</span>
                        <span className="font-semibold text-gray-900">Reste : {loc.reste_a_payer_ttc || loc.montant_total_ttc || ''} EUR</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: loc.duree_mois > 0 ? Math.min(100, ((loc.mensualites_payees || 0) / loc.duree_mois) * 100) + '%' : '0%' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {loc.notes && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                    <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">{loc.notes}</p>
                  </div>
                )}

                {/* Bouton PDF contrat + signature electronique */}
                <div className="pt-2 border-t border-gray-200 space-y-2">
                  {/* Cas 1 : pas de PDF generé */}
                  {!loc.contrat_pdf_path && (
                    <button onClick={() => handleGeneratePdf(loc)} disabled={generatingPdf === loc.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm disabled:opacity-50">
                      {generatingPdf === loc.id ? (<><Loader2 className="w-4 h-4 animate-spin" /> Generation en cours...</>) : (<><FileDown className="w-4 h-4" /> Generer le contrat PDF</>)}
                    </button>
                  )}

                  {/* Cas 2 : PDF généré, statut draft (pas encore envoyé) */}
                  {loc.contrat_pdf_path && loc.signature_status === 'draft' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => handleDownloadPdf(loc.contrat_pdf_path)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                        <FileDown className="w-4 h-4" /> Telecharger le contrat
                      </button>
                      <button onClick={() => handleGeneratePdf(loc)} disabled={generatingPdf === loc.id}
                        className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                        {generatingPdf === loc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Regenerer
                      </button>
                      <button onClick={() => handleAskSendSignature(loc)} disabled={sendingSignature === loc.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm disabled:opacity-50">
                        {sendingSignature === loc.id ? (<><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</>) : (<><Send className="w-4 h-4" /> Envoyer pour signature</>)}
                      </button>
                    </div>
                  )}

                  {/* Cas 3 : envoyé pour signature, en attente */}
                  {loc.signature_status === 'sent' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium">
                        <Clock className="w-4 h-4" />
                        Envoye pour signature {loc.yousign_sent_at ? `le ${formatDate(loc.yousign_sent_at)}` : ''}
                      </span>
                      <button onClick={() => handleDownloadPdf(loc.contrat_pdf_path)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                        <FileDown className="w-4 h-4" /> Telecharger l'original
                      </button>
                    </div>
                  )}

                  {/* Cas 4 : signé */}
                  {loc.signature_status === 'signed' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Signe {loc.yousign_signed_at ? `le ${formatDate(loc.yousign_signed_at)}` : ''}
                      </span>
                      {loc.contrat_signed_pdf_path && (
                        <button onClick={() => handleDownloadSignedPdf(loc.contrat_signed_pdf_path)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm">
                          <FileDown className="w-4 h-4" /> Telecharger le PDF signe
                        </button>
                      )}
                      {loc.contrat_pdf_path && (
                        <button onClick={() => handleDownloadPdf(loc.contrat_pdf_path)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                          <FileDown className="w-4 h-4" /> Original
                        </button>
                      )}
                    </div>
                  )}

                  {/* Cas 5 : decline ou expired */}
                  {(loc.signature_status === 'declined' || loc.signature_status === 'expired') && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
                        {loc.signature_status === 'declined' ? 'Signature refusee' : 'Signature expiree'}
                      </span>
                      <button onClick={() => handleAskSendSignature(loc)} disabled={sendingSignature === loc.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm disabled:opacity-50">
                        <Send className="w-4 h-4" /> Renvoyer pour signature
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Modal de confirmation envoi signature */}
      {confirmSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Send className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Envoyer pour signature</h3>
                <p className="text-sm text-gray-500">Envoi via YouSign</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-2">Un email avec le contrat sera envoye a :</p>
            <p className="text-base font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg mb-4">{confirmSendModal.email}</p>
            <p className="text-xs text-gray-500 mb-6">Le destinataire recevra un email avec un lien pour signer electroniquement le contrat. Cette action ne peut pas etre annulee.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmSendModal(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium text-sm">
                Annuler
              </button>
              <button onClick={handleConfirmSendSignature}
                className="inline-flex items-center gap-2 px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 font-medium text-sm">
                <Send className="w-4 h-4" /> Confirmer l'envoi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}