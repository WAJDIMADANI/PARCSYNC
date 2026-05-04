import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Building, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Compte {
  id: string;
  nom: string;
  banque: string | null;
  iban: string | null;
  bic: string | null;
  notes: string | null;
  actif: boolean;
}

export function ComptesBancairesManager() {
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formNom, setFormNom] = useState('');
  const [formBanque, setFormBanque] = useState('');
  const [formIban, setFormIban] = useState('');
  const [formBic, setFormBic] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => { fetchComptes(); }, []);

  const fetchComptes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comptes_bancaires')
        .select('*')
        .order('nom');
      if (error) throw error;
      setComptes(data || []);
    } catch (err) {
      console.error('Erreur chargement comptes:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormNom('');
    setFormBanque('');
    setFormIban('');
    setFormBic('');
    setFormNotes('');
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (c: Compte) => {
    setEditId(c.id);
    setFormNom(c.nom);
    setFormBanque(c.banque || '');
    setFormIban(c.iban || '');
    setFormBic(c.bic || '');
    setFormNotes(c.notes || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formNom.trim()) return alert('Le nom du compte est obligatoire');
    setSaving(true);
    try {
      const payload = {
        nom: formNom.trim(),
        banque: formBanque.trim() || null,
        iban: formIban.trim() || null,
        bic: formBic.trim() || null,
        notes: formNotes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editId) {
        const { error } = await supabase.from('comptes_bancaires').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('comptes_bancaires').insert(payload);
        if (error) throw error;
      }

      resetForm();
      await fetchComptes();
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActif = async (c: Compte) => {
    try {
      await supabase.from('comptes_bancaires').update({ actif: !c.actif, updated_at: new Date().toISOString() }).eq('id', c.id);
      await fetchComptes();
    } catch (err) {
      console.error('Erreur toggle:', err);
    }
  };

  const handleDelete = async (c: Compte) => {
    if (!confirm('Supprimer le compte "' + c.nom + '" ? Cette action est irréversible.')) return;
    try {
      const { error } = await supabase.from('comptes_bancaires').delete().eq('id', c.id);
      if (error) throw error;
      await fetchComptes();
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression. Ce compte est peut-être utilisé dans des paiements.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Comptes bancaires</h1>
          <p className="text-gray-600 mt-1">{comptes.length} compte{comptes.length > 1 ? 's' : ''} enregistré{comptes.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <Plus className="w-4 h-4" /> Ajouter un compte
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white border border-blue-200 rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editId ? 'Modifier le compte' : 'Nouveau compte bancaire'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du compte *</label>
              <input type="text" value={formNom} onChange={(e) => setFormNom(e.target.value)}
                placeholder="Ex: Compte courant TCA" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banque</label>
              <input type="text" value={formBanque} onChange={(e) => setFormBanque(e.target.value)}
                placeholder="Ex: BNP Paribas" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
              <input type="text" value={formIban} onChange={(e) => setFormIban(e.target.value)}
                placeholder="FR76 XXXX XXXX XXXX" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BIC</label>
              <input type="text" value={formBic} onChange={(e) => setFormBic(e.target.value)}
                placeholder="BNPAFRPP" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Remarques..." className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving || !formNom.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editId ? 'Enregistrer' : 'Créer le compte'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {comptes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">Aucun compte bancaire</p>
          <p className="text-gray-500 text-sm mt-1">Ajoutez vos comptes pour les utiliser lors du pointage des paiements</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Banque</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IBAN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">BIC</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {comptes.map(c => (
                <tr key={c.id} className={`hover:bg-gray-50 ${!c.actif ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">{c.nom}</div>
                    {c.notes && <div className="text-xs text-gray-500">{c.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.banque || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono text-xs">{c.iban || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono text-xs">{c.bic || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggleActif(c)}
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.actif ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Modifier">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}