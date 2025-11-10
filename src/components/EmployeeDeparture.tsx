import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmployeeDepartureProps {
  profilId: string;
  employeeName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ChecklistItem {
  label: string;
  completed: boolean;
}

export default function EmployeeDeparture({ profilId, employeeName, onClose, onSuccess }: EmployeeDepartureProps) {
  const [dateSortie, setDateSortie] = useState('');
  const [motifDepart, setMotifDepart] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { label: 'Récupération des équipements (badge, clés, téléphone)', completed: false },
    { label: 'Restitution du véhicule de fonction', completed: false },
    { label: 'Solde de tout compte établi', completed: false },
    { label: 'Certificat de travail remis', completed: false },
    { label: 'Attestation Pôle Emploi remise', completed: false },
    { label: 'Accès informatiques désactivés', completed: false },
    { label: 'Documents RH signés et archivés', completed: false },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleChecklistItem = (index: number) => {
    const newChecklist = [...checklist];
    newChecklist[index].completed = !newChecklist[index].completed;
    setChecklist(newChecklist);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dateSortie || !motifDepart) {
      setError('Date de sortie et motif sont obligatoires');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const checklistObj = checklist.reduce((acc, item, idx) => {
        acc[`item_${idx}`] = item;
        return acc;
      }, {} as Record<string, ChecklistItem>);

      const { error: updateError } = await supabase
        .from('profil')
        .update({
          statut: 'inactif',
          date_sortie: dateSortie,
          motif_depart: motifDepart,
          commentaire_depart: commentaire || null,
          checklist_depart: checklistObj,
        })
        .eq('id', profilId);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erreur enregistrement départ:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const completionPercentage = Math.round(
    (checklist.filter(item => item.completed).length / checklist.length) * 100
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestion du départ</h2>
            <p className="text-gray-600 mt-1">{employeeName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de sortie <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateSortie}
                  onChange={(e) => setDateSortie(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motif du départ <span className="text-red-500">*</span>
                </label>
                <select
                  value={motifDepart}
                  onChange={(e) => setMotifDepart(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner...</option>
                  <option value="Démission">Démission</option>
                  <option value="Licenciement">Licenciement</option>
                  <option value="Rupture conventionnelle">Rupture conventionnelle</option>
                  <option value="Fin de contrat">Fin de contrat</option>
                  <option value="Retraite">Retraite</option>
                  <option value="Mutation">Mutation</option>
                  <option value="Abandon de poste">Abandon de poste</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commentaires / Notes internes
              </label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Notes internes sur les circonstances du départ..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Checklist de sortie</h3>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600">
                    {completionPercentage}% complété
                  </div>
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                {checklist.map((item, index) => (
                  <label
                    key={index}
                    className="flex items-start gap-3 cursor-pointer hover:bg-white p-3 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklistItem(index)}
                      className="mt-0.5 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className={`text-sm ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Important</p>
                  <p>Le passage du statut en "inactif" sera automatique. Un événement sera créé dans l'historique de l'employé.</p>
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer le départ'}
          </button>
        </div>
      </div>
    </div>
  );
}
