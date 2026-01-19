import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Send, Users, Loader2, CheckCircle } from 'lucide-react';

interface Profil {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  is_staff: boolean;
  date_sortie: string | null;
}

export function CRMEmailsNew() {
  const [mode, setMode] = useState<'all' | 'selected'>('selected');
  const [searchTerm, setSearchTerm] = useState('');
  const [profils, setProfils] = useState<Profil[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const [brevoTemplateId, setBrevoTemplateId] = useState('');
  const [tags, setTags] = useState('crm');
  const [params, setParams] = useState('{}');

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
        .not('email', 'is', null)
        .order('nom', { ascending: true });

      if (error) throw error;
      setProfils(data || []);
    } catch (error) {
      console.error('Erreur chargement profils:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfils = profils.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.matricule?.toLowerCase().includes(term) ||
      p.nom?.toLowerCase().includes(term) ||
      p.prenom?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term)
    );
  });

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProfils.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProfils.map(p => p.id)));
    }
  };

  const handleSend = async () => {
    if (mode === 'selected' && selectedIds.size === 0) {
      alert('Veuillez sélectionner au moins un salarié');
      return;
    }

    const templateId = parseInt(brevoTemplateId);
    if (!templateId || templateId <= 0) {
      alert('Veuillez entrer un ID de template Brevo valide');
      return;
    }

    let parsedParams = {};
    try {
      if (params.trim()) {
        parsedParams = JSON.parse(params);
      }
    } catch (e) {
      alert('Format JSON invalide pour les paramètres');
      return;
    }

    setSending(true);
    setSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const payload = {
        mode,
        brevo_template_id: templateId,
        params: parsedParams,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        ...(mode === 'selected' && { profilIds: Array.from(selectedIds) })
      };

      const { data, error } = await supabase.functions.invoke('envoyer-crm-bulk-email', {
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
      setSelectedIds(new Set());
      setBrevoTemplateId('');
      setParams('{}');

      setTimeout(() => setSuccess(false), 5000);
    } catch (error: any) {
      console.error('Erreur envoi:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const recipientCount = mode === 'all' ? profils.length : selectedIds.size;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Nouvel envoi d'emails</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mode d'envoi
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
                <span className="text-sm">Sélection manuelle</span>
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ID Template Brevo *
            </label>
            <input
              type="number"
              value={brevoTemplateId}
              onChange={(e) => setBrevoTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: 123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tags (séparés par des virgules)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: crm, newsletter"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Paramètres (JSON)
            </label>
            <textarea
              value={params}
              onChange={(e) => setParams(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder='{"key": "value"}'
            />
            <p className="text-xs text-slate-500 mt-1">Variables globales pour tous les destinataires</p>
          </div>
        </div>
      </div>

      {mode === 'selected' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              Sélectionner les destinataires ({selectedIds.size} sélectionnés)
            </h3>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectedIds.size === filteredProfils.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par matricule, nom, prénom..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredProfils.length && filteredProfils.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Matricule</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Nom</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Prénom</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProfils.map((profil) => (
                    <tr
                      key={profil.id}
                      onClick={() => handleToggleSelect(profil.id)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(profil.id)}
                          onChange={() => handleToggleSelect(profil.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-700">{profil.matricule}</td>
                      <td className="px-4 py-2 text-sm text-slate-900 font-medium">{profil.nom}</td>
                      <td className="px-4 py-2 text-sm text-slate-700">{profil.prenom}</td>
                      <td className="px-4 py-2 text-sm text-slate-600">{profil.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProfils.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  Aucun salarié trouvé
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-slate-600" />
            <span className="text-sm text-slate-700">
              {recipientCount} destinataire{recipientCount > 1 ? 's' : ''}
            </span>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !brevoTemplateId || (mode === 'selected' && selectedIds.size === 0)}
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
