import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Send, Users, Loader2, CheckCircle, X, AlertTriangle } from 'lucide-react';

interface Profil {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  email: string | null;
  is_staff: boolean;
  date_sortie: string | null;
}

export function CRMEmailsNew() {
  const [mode, setMode] = useState<'all' | 'selected'>('selected');
  const [searchTerm, setSearchTerm] = useState('');
  const [allProfils, setAllProfils] = useState<Profil[]>([]);
  const [selectedProfils, setSelectedProfils] = useState<Profil[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfils();
  }, []);

  const loadProfils = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profil')
        .select('id, matricule, nom, prenom, email, is_staff, date_sortie')
        .eq('is_staff', true)
        .is('date_sortie', null)
        .order('nom', { ascending: true });

      if (error) throw error;
      setAllProfils(data || []);
    } catch (error) {
      console.error('Erreur chargement profils:', error);
    } finally {
      setLoading(false);
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

  const handleSend = async () => {
    if (!subject.trim()) {
      alert('Veuillez saisir un objet');
      return;
    }

    if (!message.trim()) {
      alert('Veuillez saisir un message');
      return;
    }

    if (mode === 'selected' && selectedProfils.length === 0) {
      alert('Veuillez sélectionner au moins un salarié');
      return;
    }

    // Vérifier si des profils sélectionnés ont un email
    if (mode === 'selected') {
      const profilsWithEmail = selectedProfils.filter(p => p.email);
      const profilsWithoutEmail = selectedProfils.filter(p => !p.email);

      if (profilsWithEmail.length === 0) {
        alert('Aucun des salariés sélectionnés n\'a d\'email renseigné. Impossible d\'envoyer l\'email.');
        return;
      }

      if (profilsWithoutEmail.length > 0) {
        const names = profilsWithoutEmail.map(p => `${p.nom} ${p.prenom}`).join(', ');
        if (!confirm(`${profilsWithoutEmail.length} salarié(s) n'ont pas d'email et ne recevront pas l'email:\n\n${names}\n\nVoulez-vous continuer l'envoi pour les autres ?`)) {
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
        subject,
        message,
        ...(mode === 'selected' && { profilIds: selectedProfils.map(p => p.id) })
      };

      const { data, error } = await supabase.functions.invoke('send-simple-email', {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(data?.error || 'Erreur inconnue');
      }

      setSuccess(true);
      setSelectedProfils([]);
      setSubject('');
      setMessage('');

      setTimeout(() => setSuccess(false), 5000);
    } catch (error: any) {
      console.error('Erreur envoi:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const recipientCount = mode === 'all'
    ? allProfils.filter(p => p.email).length
    : selectedProfils.filter(p => p.email).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Nouvel envoi d'email</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Destinataires
            </label>
            <div className="flex gap-4">
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
                                {!profil.email && (
                                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                                    Pas d'email
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">
                                Matricule: {profil.matricule}
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 text-right">
                              {profil.email || <span className="text-amber-600">Non renseigné</span>}
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
                          profil.email
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span>{profil.nom} {profil.prenom}</span>
                        <span className={profil.email ? 'text-blue-500' : 'text-amber-600'}>
                          ({profil.matricule})
                        </span>
                        {!profil.email && (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        <button
                          onClick={() => handleRemoveProfil(profil.id)}
                          className={profil.email ? 'hover:text-blue-900' : 'hover:text-amber-900'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {selectedProfils.some(p => !p.email) && (
                    <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p>
                        Certains salariés n'ont pas d'email renseigné. L'email ne leur sera pas envoyé.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Objet de l'email *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Rappel important"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Écrivez votre message ici..."
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-slate-600" />
            <div className="flex flex-col">
              <span className="text-sm text-slate-700">
                {recipientCount} destinataire{recipientCount > 1 ? 's' : ''}
              </span>
              {mode === 'selected' && selectedProfils.length > recipientCount && (
                <span className="text-xs text-amber-600">
                  ({selectedProfils.length - recipientCount} sans email)
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !subject || !message || (mode === 'selected' && selectedProfils.length === 0)}
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
    </div>
  );
}
