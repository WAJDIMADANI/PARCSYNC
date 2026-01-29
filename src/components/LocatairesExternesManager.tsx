import React, { useState, useEffect } from 'react';
import { Search, User, Building2, Phone, Mail, MapPin, Edit2, History, Car, Plus, Filter, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Pagination } from './Pagination';

interface LocataireExterne {
  id: string;
  type: 'personne' | 'entreprise';
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  notes: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

interface LocataireHistory {
  id: string;
  type: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  notes: string | null;
  changed_at: string;
}

interface Attribution {
  id: string;
  date_debut: string;
  date_fin: string | null;
  notes: string | null;
  vehicule: {
    immatriculation: string;
    marque: string;
    modele: string;
  };
}

export default function LocatairesExternesManager() {
  const [locataires, setLocataires] = useState<LocataireExterne[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'personne' | 'entreprise'>('all');
  const [actifFilter, setActifFilter] = useState<'all' | 'actif' | 'inactif'>('actif');

  const [selectedLocataire, setSelectedLocataire] = useState<LocataireExterne | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<LocataireHistory[]>([]);
  const [attributions, setAttributions] = useState<Attribution[]>([]);

  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nom: '',
    telephone: '',
    email: '',
    adresse: '',
    notes: ''
  });

  const [createMode, setCreateMode] = useState(false);
  const [createType, setCreateType] = useState<'personne' | 'entreprise'>('personne');
  const [createFormData, setCreateFormData] = useState({
    nom: '',
    telephone: '',
    email: '',
    adresse: '',
    notes: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    loadLocataires();
  }, [currentPage, searchTerm, typeFilter, actifFilter]);

  const loadLocataires = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('locataire_externe')
        .select('*', { count: 'exact' })
        .order('nom');

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      if (actifFilter !== 'all') {
        query = query.eq('actif', actifFilter === 'actif');
      }

      if (searchTerm) {
        query = query.ilike('nom', `%${searchTerm}%`);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setLocataires(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erreur chargement locataires:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocataireDetails = async (locataireId: string) => {
    try {
      const [historyRes, attributionsRes] = await Promise.all([
        supabase
          .from('locataire_externe_history')
          .select('*')
          .eq('locataire_externe_id', locataireId)
          .order('changed_at', { ascending: false }),
        supabase
          .from('attribution_vehicule')
          .select(`
            id,
            date_debut,
            date_fin,
            notes,
            vehicule:vehicule_id(immatriculation, marque, modele)
          `)
          .eq('locataire_externe_id', locataireId)
          .order('date_debut', { ascending: false })
      ]);

      if (historyRes.error) throw historyRes.error;
      if (attributionsRes.error) throw attributionsRes.error;

      setHistory(historyRes.data || []);
      setAttributions(attributionsRes.data || []);
    } catch (error) {
      console.error('Erreur chargement détails:', error);
    }
  };

  const handleSelectLocataire = async (locataire: LocataireExterne) => {
    setSelectedLocataire(locataire);
    setEditMode(false);
    setEditFormData({
      nom: locataire.nom,
      telephone: locataire.telephone || '',
      email: locataire.email || '',
      adresse: locataire.adresse || '',
      notes: locataire.notes || ''
    });
    await loadLocataireDetails(locataire.id);
  };

  const handleUpdateLocataire = async () => {
    if (!selectedLocataire) return;

    try {
      const { error } = await supabase
        .from('locataire_externe')
        .update({
          nom: editFormData.nom,
          telephone: editFormData.telephone || null,
          email: editFormData.email || null,
          adresse: editFormData.adresse || null,
          notes: editFormData.notes || null
        })
        .eq('id', selectedLocataire.id);

      if (error) throw error;

      alert('Locataire mis à jour avec succès');
      setEditMode(false);
      loadLocataires();

      const updated = { ...selectedLocataire, ...editFormData };
      setSelectedLocataire(updated);
      await loadLocataireDetails(selectedLocataire.id);
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleToggleActif = async (locataire: LocataireExterne) => {
    try {
      const { error } = await supabase
        .from('locataire_externe')
        .update({ actif: !locataire.actif })
        .eq('id', locataire.id);

      if (error) throw error;

      loadLocataires();
      if (selectedLocataire?.id === locataire.id) {
        setSelectedLocataire({ ...selectedLocataire, actif: !locataire.actif });
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la modification du statut');
    }
  };

  const handleCreateLocataire = async () => {
    if (!createFormData.nom.trim()) {
      alert('Le nom est obligatoire');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('locataire_externe')
        .insert([{
          type: createType,
          nom: createFormData.nom.trim(),
          telephone: createFormData.telephone.trim() || null,
          email: createFormData.email.trim() || null,
          adresse: createFormData.adresse.trim() || null,
          notes: createFormData.notes.trim() || null,
          actif: true
        }])
        .select()
        .single();

      if (error) throw error;

      alert('Locataire créé avec succès');
      setCreateMode(false);
      setCreateFormData({ nom: '', telephone: '', email: '', adresse: '', notes: '' });
      loadLocataires();
      if (data) {
        handleSelectLocataire(data);
      }
    } catch (error) {
      console.error('Erreur création:', error);
      alert('Erreur lors de la création');
    }
  };

  const activeAttributions = attributions.filter(a => !a.date_fin || new Date(a.date_fin) >= new Date());
  const pastAttributions = attributions.filter(a => a.date_fin && new Date(a.date_fin) < new Date());

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Carnet d'adresses des locataires externes</h1>
        <p className="text-gray-600 mt-1">
          Gérez les personnes et entreprises externes louant des véhicules
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Locataires</h2>
              <button
                onClick={() => {
                  setCreateMode(true);
                  setSelectedLocataire(null);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Nouveau</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous types</option>
                  <option value="personne">Personnes</option>
                  <option value="entreprise">Entreprises</option>
                </select>

                <select
                  value={actifFilter}
                  onChange={(e) => {
                    setActifFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="actif">Actifs</option>
                  <option value="all">Tous</option>
                  <option value="inactif">Inactifs</option>
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Chargement...</div>
              ) : locataires.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Aucun locataire trouvé</div>
              ) : (
                locataires.map((locataire) => (
                  <button
                    key={locataire.id}
                    onClick={() => handleSelectLocataire(locataire)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedLocataire?.id === locataire.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {locataire.type === 'personne' ? (
                        <User className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Building2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 truncate">
                            {locataire.nom}
                          </span>
                          {!locataire.actif && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              Inactif
                            </span>
                          )}
                        </div>
                        {locataire.telephone && (
                          <div className="text-xs text-gray-500 truncate">{locataire.telephone}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {totalCount > itemsPerPage && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalCount}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {createMode ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Nouveau locataire externe</h2>
                <button
                  onClick={() => setCreateMode(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <div className="flex gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className={`border-2 rounded-lg p-3 transition-all ${
                        createType === 'personne'
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="createType"
                          value="personne"
                          checked={createType === 'personne'}
                          onChange={(e) => setCreateType(e.target.value as any)}
                          className="sr-only"
                        />
                        <div className="flex items-center space-x-2">
                          <User className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Personne</span>
                        </div>
                      </div>
                    </label>

                    <label className="flex-1 cursor-pointer">
                      <div className={`border-2 rounded-lg p-3 transition-all ${
                        createType === 'entreprise'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="createType"
                          value="entreprise"
                          checked={createType === 'entreprise'}
                          onChange={(e) => setCreateType(e.target.value as any)}
                          className="sr-only"
                        />
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-5 w-5 text-purple-600" />
                          <span className="font-medium">Entreprise</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {createType === 'personne' ? 'Nom complet' : 'Raison sociale'} *
                  </label>
                  <input
                    type="text"
                    value={createFormData.nom}
                    onChange={(e) => setCreateFormData({ ...createFormData, nom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={createFormData.telephone}
                    onChange={(e) => setCreateFormData({ ...createFormData, telephone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <textarea
                    value={createFormData.adresse}
                    onChange={(e) => setCreateFormData({ ...createFormData, adresse: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={createFormData.notes}
                    onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setCreateMode(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateLocataire}
                    disabled={!createFormData.nom.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    Créer
                  </button>
                </div>
              </div>
            </div>
          ) : selectedLocataire ? (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {selectedLocataire.type === 'personne' ? (
                      <User className="h-6 w-6 text-green-600" />
                    ) : (
                      <Building2 className="h-6 w-6 text-purple-600" />
                    )}
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{selectedLocataire.nom}</h2>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          selectedLocataire.type === 'personne'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {selectedLocataire.type === 'personne' ? 'Personne' : 'Entreprise'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          selectedLocataire.actif
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedLocataire.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {!editMode && (
                      <button
                        onClick={() => setEditMode(true)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Modifier"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleActif(selectedLocataire)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        selectedLocataire.actif
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {selectedLocataire.actif ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </div>
                </div>

                {editMode ? (
                  <div className="space-y-4 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                      <input
                        type="text"
                        value={editFormData.nom}
                        onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                      <input
                        type="tel"
                        value={editFormData.telephone}
                        onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                      <textarea
                        value={editFormData.adresse}
                        onChange={(e) => setEditFormData({ ...editFormData, adresse: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={editFormData.notes}
                        onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => setEditMode(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleUpdateLocataire}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    {selectedLocataire.telephone && (
                      <div className="flex items-center space-x-2 text-gray-700">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{selectedLocataire.telephone}</span>
                      </div>
                    )}
                    {selectedLocataire.email && (
                      <div className="flex items-center space-x-2 text-gray-700">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{selectedLocataire.email}</span>
                      </div>
                    )}
                    {selectedLocataire.adresse && (
                      <div className="flex items-start space-x-2 text-gray-700">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span>{selectedLocataire.adresse}</span>
                      </div>
                    )}
                    {selectedLocataire.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs font-medium text-gray-600 mb-1">Notes</div>
                        <div className="text-sm text-gray-700">{selectedLocataire.notes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Véhicules attribués</h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {activeAttributions.length} actif{activeAttributions.length > 1 ? 's' : ''}
                  </span>
                </div>

                {activeAttributions.length > 0 ? (
                  <div className="space-y-3">
                    {activeAttributions.map((attr) => (
                      <div key={attr.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Car className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {(attr.vehicule as any)?.immatriculation}
                            </div>
                            <div className="text-sm text-gray-600">
                              {(attr.vehicule as any)?.marque} {(attr.vehicule as any)?.modele}
                            </div>
                            <div className="text-xs text-gray-500">
                              Depuis le {new Date(attr.date_debut).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                          En cours
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucun véhicule actuellement attribué</p>
                )}

                {pastAttributions.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Attributions passées</h4>
                    <div className="space-y-2">
                      {pastAttributions.map((attr) => (
                        <div key={attr.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Car className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {(attr.vehicule as any)?.immatriculation}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(attr.date_debut).toLocaleDateString('fr-FR')} - {attr.date_fin ? new Date(attr.date_fin).toLocaleDateString('fr-FR') : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {history.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Historique des modifications</h3>
                    <History className="h-5 w-5 text-gray-400" />
                  </div>

                  <div className="space-y-4">
                    {history.map((entry) => (
                      <div key={entry.id} className="border-l-2 border-gray-300 pl-4 py-2">
                        <div className="text-xs text-gray-500 mb-2">
                          {new Date(entry.changed_at).toLocaleString('fr-FR')}
                        </div>
                        <div className="text-sm space-y-1">
                          <div><span className="font-medium">Nom:</span> {entry.nom}</div>
                          {entry.telephone && (
                            <div><span className="font-medium">Tél:</span> {entry.telephone}</div>
                          )}
                          {entry.email && (
                            <div><span className="font-medium">Email:</span> {entry.email}</div>
                          )}
                          {entry.adresse && (
                            <div><span className="font-medium">Adresse:</span> {entry.adresse}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Sélectionnez un locataire dans la liste pour voir ses détails
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
