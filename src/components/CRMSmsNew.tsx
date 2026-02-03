import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Send, Users, Loader2, CheckCircle, X, AlertTriangle, Tag, MessageSquare } from 'lucide-react';

interface Profil {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  tel: string | null;
  date_sortie: string | null;
  secteur_id?: string | null;
}

interface Secteur {
  id: string;
  nom: string;
}

export function CRMSmsNew() {
  const [mode, setMode] = useState<'all' | 'selected' | 'sector'>('selected');
  const [searchTerm, setSearchTerm] = useState('');
  const [allProfils, setAllProfils] = useState<Profil[]>([]);
  const [selectedProfils, setSelectedProfils] = useState<Profil[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sendResult, setSendResult] = useState<{ successCount: number; total: number } | null>(null);

  const [message, setMessage] = useState('');

  // États pour le mode secteur
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [selectedSecteurs, setSelectedSecteurs] = useState<Secteur[]>([]);
  const [loadingSecteurs, setLoadingSecteurs] = useState(false);
  const [profilsBySecteur, setProfilsBySecteur] = useState<Profil[]>([]);
  const [loadingProfilsSecteur, setLoadingProfilsSecteur] = useState(false);

  useEffect(() => {
    loadProfils();
    loadSecteurs();
  }, []);

  const loadProfils = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profil')
        .select('id, matricule:matricule_tca, nom, prenom, tel, date_sortie, secteur_id')
        .is('date_sortie', null)
        .is('deleted_at', null)
        .not('tel', 'is', null)
        .order('nom', { ascending: true });

      if (error) {
        console.error('Erreur SQL:', error);
        throw error;
      }

      console.log('Profils chargés:', data?.length || 0, 'Erreur:', error);
      setAllProfils(data || []);
    } catch (error) {
      console.error('Erreur chargement profils:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSecteurs = async () => {
    setLoadingSecteurs(true);
    try {
      const { data, error } = await supabase
        .from('secteur')
        .select('id, nom')
        .order('nom', { ascending: true });

      if (error) throw error;
      setSecteurs(data || []);
    } catch (error) {
      console.error('Erreur chargement secteurs:', error);
    } finally {
      setLoadingSecteurs(false);
    }
  };

  // Charger les profils quand on sélectionne des secteurs
  useEffect(() => {
    if (mode === 'sector' && selectedSecteurs.length > 0) {
      loadProfilsBySecteur();
    } else {
      setProfilsBySecteur([]);
    }
  }, [selectedSecteurs, mode]);

  const loadProfilsBySecteur = async () => {
    if (selectedSecteurs.length === 0) {
      setProfilsBySecteur([]);
      return;
    }

    setLoadingProfilsSecteur(true);
    try {
      const secteurIds = selectedSecteurs.map(s => s.id);
      const { data, error } = await supabase
        .from('profil')
        .select('id, matricule:matricule_tca, nom, prenom, tel, date_sortie, secteur_id')
        .in('secteur_id', secteurIds)
        .is('date_sortie', null)
        .is('deleted_at', null)
        .not('tel', 'is', null)
        .order('nom', { ascending: true });

      if (error) throw error;
      setProfilsBySecteur(data || []);
    } catch (error) {
      console.error('Erreur chargement profils par secteur:', error);
    } finally {
      setLoadingProfilsSecteur(false);
    }
  };

  const filteredProfils = allProfils.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return false;

    const matriculeStr = p.matricule ? String(p.matricule).toLowerCase() : '';
    const nomStr = p.nom ? p.nom.toLowerCase() : '';
    const prenomStr = p.prenom ? p.prenom.toLowerCase() : '';

    return (
      matriculeStr.includes(term) ||
      nomStr.includes(term) ||
      prenomStr.includes(term)
    );
  });

  const handleSelectProfil = (profil: Profil) => {
    if (!selectedProfils.find(p => p.id === profil.id)) {
      setSelectedProfils([...selectedProfils, profil]);
    }
    setSearchTerm('');
    setShowSearchResults(false);
  };

  const handleRemoveProfil = (profilId: string) => {
    setSelectedProfils(selectedProfils.filter(p => p.id !== profilId));
  };

  const handleToggleSecteur = (secteur: Secteur) => {
    if (selectedSecteurs.find(s => s.id === secteur.id)) {
      setSelectedSecteurs(selectedSecteurs.filter(s => s.id !== secteur.id));
    } else {
      setSelectedSecteurs([...selectedSecteurs, secteur]);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      alert('Veuillez saisir un message');
      return;
    }

    if (mode === 'selected' && selectedProfils.length === 0) {
      alert('Veuillez sélectionner au moins un salarié');
      return;
    }

    if (mode === 'sector' && selectedSecteurs.length === 0) {
      alert('Veuillez sélectionner au moins un secteur');
      return;
    }

    // Vérifier si des profils sélectionnés ont un téléphone
    if (mode === 'selected') {
      const profilsWithTel = selectedProfils.filter(p => p.tel);
      const profilsWithoutTel = selectedProfils.filter(p => !p.tel);

      if (profilsWithTel.length === 0) {
        alert('Aucun des salariés sélectionnés n\'a de numéro de téléphone renseigné. Impossible d\'envoyer le SMS.');
        return;
      }

      if (profilsWithoutTel.length > 0) {
        const names = profilsWithoutTel.map(p => `${p.nom} ${p.prenom}`).join(', ');
        if (!confirm(`${profilsWithoutTel.length} salarié(s) n'ont pas de téléphone et ne recevront pas le SMS:\n\n${names}\n\nVoulez-vous continuer l'envoi pour les autres ?`)) {
          return;
        }
      }
    }

    // Vérifier pour le mode secteur
    if (mode === 'sector') {
      const profilsWithTel = profilsBySecteur.filter(p => p.tel);
      const profilsWithoutTel = profilsBySecteur.filter(p => !p.tel);

      if (profilsWithTel.length === 0) {
        alert('Aucun salarié dans les secteurs sélectionnés n\'a de numéro de téléphone renseigné. Impossible d\'envoyer le SMS.');
        return;
      }

      if (profilsWithoutTel.length > 0) {
        if (!confirm(`${profilsWithoutTel.length} salarié(s) dans les secteurs sélectionnés n'ont pas de téléphone et ne recevront pas le SMS.\n\nVoulez-vous continuer l'envoi pour les autres ?`)) {
          return;
        }
      }
    }

    setSending(true);
    setSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const payload = {
        mode,
        message,
        ...(mode === 'selected' && { profilIds: selectedProfils.map(p => p.id) }),
        ...(mode === 'sector' && { secteurIds: selectedSecteurs.map(s => s.id) })
      };

      console.log('[SMS] Payload envoyé:', payload);

      const { data, error } = await supabase.functions.invoke('send-simple-sms', {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('[SMS] Réponse function:', { data, error });

      if (error) {
        console.error('[SMS] Erreur invoke:', error);
        throw error;
      }

      if (!data?.ok) {
        console.error('[SMS] Réponse non-ok:', data);
        throw new Error(data?.error || 'Erreur inconnue');
      }

      if (!data.batchId) {
        console.warn('[SMS] Pas de batchId dans la réponse');
      }

      console.log('[SMS] Succès! BatchId:', data.batchId, 'Envoyés:', data.successCount);

      setSuccess(true);
      setSendResult({
        successCount: data.successCount || 0,
        total: data.total || 0
      });
      setSelectedProfils([]);
      setSelectedSecteurs([]);
      setMessage('');

      setTimeout(() => {
        setSuccess(false);
        setSendResult(null);
      }, 5000);
    } catch (error: any) {
      console.error('[SMS] Erreur globale:', error);
      alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSending(false);
    }
  };

  const recipientCount = mode === 'all'
    ? allProfils.filter(p => p.tel).length
    : mode === 'sector'
    ? profilsBySecteur.filter(p => p.tel).length
    : selectedProfils.filter(p => p.tel).length;

  const maxChars = 160;
  const charCount = message.length;
  const remainingChars = maxChars - charCount;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Nouvel envoi de SMS</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Destinataires
            </label>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="selected"
                  checked={mode === 'selected'}
                  onChange={(e) => setMode(e.target.value as 'selected')}
                  className="text-blue-600"
                />
                <span className="text-sm">Sélectionner des salariés</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="sector"
                  checked={mode === 'sector'}
                  onChange={(e) => setMode(e.target.value as 'sector')}
                  className="text-blue-600"
                />
                <span className="text-sm">Par secteur</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="all"
                  checked={mode === 'all'}
                  onChange={(e) => setMode(e.target.value as 'all')}
                  className="text-blue-600"
                />
                <span className="text-sm">Tous les salariés actifs</span>
              </label>
            </div>
          </div>

          {mode === 'selected' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rechercher des salariés *
                {allProfils.length > 0 && (
                  <span className="text-xs text-slate-500 font-normal ml-2">
                    ({allProfils.length} salariés disponibles)
                  </span>
                )}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearchResults(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => setShowSearchResults(searchTerm.trim().length > 0)}
                  onBlur={() => {
                    setTimeout(() => setShowSearchResults(false), 200);
                  }}
                  placeholder="Tapez le matricule, nom ou prénom..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 animate-spin" />
                )}

                {showSearchResults && searchTerm.trim().length > 0 && !loading && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProfils.length > 0 ? (
                      filteredProfils.slice(0, 10).map((profil) => (
                        <button
                          key={profil.id}
                          onClick={() => handleSelectProfil(profil)}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900">
                                  {profil.nom} {profil.prenom}
                                </span>
                                {!profil.tel && (
                                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                                    Pas de tél
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">
                                Matricule: {profil.matricule}
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 text-right">
                              {profil.tel || <span className="text-amber-600">Non renseigné</span>}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500 text-center">
                        Aucun salarié trouvé pour "{searchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!loading && allProfils.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  Aucun salarié disponible.
                </p>
              )}

              {selectedProfils.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedProfils.map((profil) => (
                      <div
                        key={profil.id}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                          profil.tel
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span>{profil.nom} {profil.prenom}</span>
                        <span className={profil.tel ? 'text-blue-500' : 'text-amber-600'}>
                          ({profil.matricule})
                        </span>
                        {!profil.tel && (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        <button
                          onClick={() => handleRemoveProfil(profil.id)}
                          className={profil.tel ? 'hover:text-blue-900' : 'hover:text-amber-900'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {selectedProfils.some(p => !p.tel) && (
                    <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p>
                        Certains salariés n'ont pas de téléphone renseigné. Le SMS ne leur sera pas envoyé.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {mode === 'sector' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sélectionner des secteurs *
                {secteurs.length > 0 && (
                  <span className="text-xs text-slate-500 font-normal ml-2">
                    ({secteurs.length} secteurs disponibles)
                  </span>
                )}
              </label>

              {loadingSecteurs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="border border-slate-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {secteurs.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      Aucun secteur disponible
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {secteurs.map((secteur) => (
                        <label
                          key={secteur.id}
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSecteurs.some(s => s.id === secteur.id)}
                            onChange={() => handleToggleSecteur(secteur)}
                            className="text-blue-600 rounded"
                          />
                          <Tag className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700 flex-1">
                            {secteur.nom}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedSecteurs.length > 0 && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedSecteurs.map((secteur) => (
                      <div
                        key={secteur.id}
                        className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                      >
                        <Tag className="w-3 h-3" />
                        <span>{secteur.nom}</span>
                        <button
                          onClick={() => handleToggleSecteur(secteur)}
                          className="hover:text-green-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {loadingProfilsSecteur ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Chargement des salariés...</span>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-900">
                          {profilsBySecteur.length} salarié{profilsBySecteur.length > 1 ? 's' : ''} trouvé{profilsBySecteur.length > 1 ? 's' : ''}
                        </span>
                        {profilsBySecteur.filter(p => p.tel).length < profilsBySecteur.length && (
                          <span className="text-amber-600">
                            ({profilsBySecteur.length - profilsBySecteur.filter(p => p.tel).length} sans tél ignoré{(profilsBySecteur.length - profilsBySecteur.filter(p => p.tel).length) > 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {profilsBySecteur.some(p => !p.tel) && (
                    <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p>
                        Certains salariés de ces secteurs n'ont pas de téléphone renseigné. Le SMS ne leur sera pas envoyé.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Message SMS *
              </label>
              <span className={`text-xs font-medium ${remainingChars < 0 ? 'text-red-600' : remainingChars < 20 ? 'text-amber-600' : 'text-slate-500'}`}>
                {charCount} / {maxChars} caractères
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={maxChars}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Écrivez votre message SMS ici..."
            />
            {remainingChars < 20 && remainingChars >= 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Plus que {remainingChars} caractère{remainingChars > 1 ? 's' : ''} disponible{remainingChars > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-slate-600" />
            <div className="flex flex-col">
              <span className="text-sm text-slate-700">
                {recipientCount} destinataire{recipientCount > 1 ? 's' : ''}
              </span>
              {mode === 'selected' && selectedProfils.length > recipientCount && (
                <span className="text-xs text-amber-600">
                  ({selectedProfils.length - recipientCount} sans téléphone)
                </span>
              )}
              {mode === 'sector' && profilsBySecteur.length > recipientCount && (
                <span className="text-xs text-amber-600">
                  ({profilsBySecteur.length - recipientCount} sans téléphone)
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !message || (mode === 'selected' && selectedProfils.length === 0) || (mode === 'sector' && selectedSecteurs.length === 0)}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Envoi en cours...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Envoyé avec succès !</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Envoyer</span>
              </>
            )}
          </button>
        </div>
      </div>

      {success && sendResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setSuccess(false);
              setSendResult(null);
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slideUp">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75" />
                <div className="relative bg-gradient-to-br from-green-400 to-green-600 rounded-full p-4">
                  <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-center text-slate-800 mb-2">
              SMS envoyés avec succès !
            </h3>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
              <div className="flex items-center justify-center gap-3 mb-2">
                <MessageSquare className="w-6 h-6 text-green-600" />
                <span className="text-4xl font-bold text-green-600">
                  {sendResult.successCount}
                </span>
              </div>
              <p className="text-center text-slate-600">
                {sendResult.successCount === sendResult.total ? (
                  <span className="font-medium">
                    {sendResult.total} destinataire{sendResult.total > 1 ? 's' : ''} ont reçu le SMS
                  </span>
                ) : (
                  <span>
                    sur {sendResult.total} destinataire{sendResult.total > 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>

            <p className="text-center text-slate-500 text-sm mb-6">
              Les SMS ont été envoyés et enregistrés dans l'historique
            </p>

            <button
              onClick={() => {
                setSuccess(false);
                setSendResult(null);
              }}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Fermer
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-pulse" />
              <span>Fermeture automatique dans 5 secondes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
