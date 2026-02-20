import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Calendar, FileText, CreditCard, AlertCircle, Mail, CheckCircle, X, Loader2, User } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { NotificationModal } from './NotificationModal';
import { Pagination } from './Pagination';

interface Notification {
  id: string;
  type: 'titre_sejour' | 'visite_medicale' | 'permis_conduire' | 'contrat_cdd' | 'avenant_1' | 'avenant_2';
  profil_id: string;
  date_echeance: string;
  date_notification: string;
  statut: 'active' | 'email_envoye' | 'resolue' | 'ignoree';
  email_envoye_at: string | null;
  metadata: any;
  created_at: string;
  profil?: {
    prenom: string;
    nom: string;
    email: string;
  };
}

interface NotificationsListProps {
  initialTab?: 'titre_sejour' | 'visite_medicale' | 'permis_conduire' | 'contrat_cdd' | 'avenant_1' | 'avenant_2';
  onViewProfile?: (profilId: string) => void;
}

export function NotificationsList({ initialTab, onViewProfile }: NotificationsListProps = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'titre_sejour' | 'visite_medicale' | 'permis_conduire' | 'contrat_cdd' | 'avenant_1' | 'avenant_2'>(initialTab || 'titre_sejour');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      // 1. Récupérer les notifications existantes (documents)
      const { data: notifData, error: notifError } = await supabase
        .from('v_notifications_ui')
        .select(`
          *,
          profil:profil_id(prenom, nom, email, statut)
        `)
        .order('date_echeance', { ascending: true });

      if (notifError) {
        console.error('❌ SUPABASE ERROR (notifications):', notifError);
        throw notifError;
      }

      // 2. Récupérer les contrats CDD qui expirent dans les 30 prochains jours
      // RÈGLE MÉTIER : date_fin between today and today + 30 days, statut = actif
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);

      const { data: contratData, error: contratError } = await supabase
        .from('contrat')
        .select(`
          id,
          profil_id,
          date_fin,
          type,
          statut,
          avenant_1_date_fin,
          avenant_2_date_fin,
          profil:profil_id(prenom, nom, email, statut)
        `)
        .eq('statut', 'actif')
        .gte('date_fin', today.toISOString().split('T')[0])
        .lte('date_fin', futureDate.toISOString().split('T')[0])
        .neq('profil.statut', 'inactif');

      if (contratError) {
        console.error('❌ SUPABASE ERROR (contrats):', contratError);
      }

      // 3. Transformer les contrats en format notification
      const contratNotifications: Notification[] = (contratData || []).map(contrat => ({
        id: `contrat-${contrat.id}`,
        type: 'contrat_cdd' as const,
        profil_id: contrat.profil_id,
        date_echeance: contrat.date_fin,
        date_notification: new Date().toISOString(),
        statut: 'active' as const,
        email_envoye_at: null,
        metadata: {
          contrat_id: contrat.id,
          contrat_type: contrat.type,
          source: 'contrat_db' // Pour identifier que ça vient de la DB
        },
        created_at: new Date().toISOString(),
        profil: contrat.profil
      }));

      // 4. Récupérer les avenants 1 qui expirent dans les 30 prochains jours
      const { data: avenant1Data, error: avenant1Error } = await supabase
        .from('contrat')
        .select(`
          id,
          profil_id,
          avenant_1_date_fin,
          type,
          statut,
          profil:profil_id(prenom, nom, email, statut)
        `)
        .eq('statut', 'actif')
        .not('avenant_1_date_fin', 'is', null)
        .gte('avenant_1_date_fin', today.toISOString().split('T')[0])
        .lte('avenant_1_date_fin', futureDate.toISOString().split('T')[0])
        .neq('profil.statut', 'inactif');

      if (avenant1Error) {
        console.error('❌ SUPABASE ERROR (avenants 1):', avenant1Error);
      }

      const avenant1Notifications: Notification[] = (avenant1Data || []).map(contrat => ({
        id: `avenant1-${contrat.id}`,
        type: 'avenant_1' as const,
        profil_id: contrat.profil_id,
        date_echeance: contrat.avenant_1_date_fin!,
        date_notification: new Date().toISOString(),
        statut: 'active' as const,
        email_envoye_at: null,
        metadata: {
          contrat_id: contrat.id,
          contrat_type: contrat.type,
          source: 'contrat_db'
        },
        created_at: new Date().toISOString(),
        profil: contrat.profil
      }));

      // 5. Récupérer les avenants 2 qui expirent dans les 30 prochains jours
      const { data: avenant2Data, error: avenant2Error } = await supabase
        .from('contrat')
        .select(`
          id,
          profil_id,
          avenant_2_date_fin,
          type,
          statut,
          profil:profil_id(prenom, nom, email, statut)
        `)
        .eq('statut', 'actif')
        .not('avenant_2_date_fin', 'is', null)
        .gte('avenant_2_date_fin', today.toISOString().split('T')[0])
        .lte('avenant_2_date_fin', futureDate.toISOString().split('T')[0])
        .neq('profil.statut', 'inactif');

      if (avenant2Error) {
        console.error('❌ SUPABASE ERROR (avenants 2):', avenant2Error);
      }

      const avenant2Notifications: Notification[] = (avenant2Data || []).map(contrat => ({
        id: `avenant2-${contrat.id}`,
        type: 'avenant_2' as const,
        profil_id: contrat.profil_id,
        date_echeance: contrat.avenant_2_date_fin!,
        date_notification: new Date().toISOString(),
        statut: 'active' as const,
        email_envoye_at: null,
        metadata: {
          contrat_id: contrat.id,
          contrat_type: contrat.type,
          source: 'contrat_db'
        },
        created_at: new Date().toISOString(),
        profil: contrat.profil
      }));

      // 6. Combiner toutes les notifications et éliminer les doublons
      // Stratégie : si une notification existe déjà pour le même type + profil_id + date_echeance,
      // on garde celle de la table notification (car elle peut avoir un statut mis à jour)
      const allNotifications = [...(notifData || [])];

      const existingKeys = new Set(
        allNotifications.map(n => `${n.type}-${n.profil_id}-${n.date_echeance}`)
      );

      // Ajouter les contrats qui n'ont pas déjà une notification
      [...contratNotifications, ...avenant1Notifications, ...avenant2Notifications].forEach(n => {
        const key = `${n.type}-${n.profil_id}-${n.date_echeance}`;
        if (!existingKeys.has(key)) {
          allNotifications.push(n);
        }
      });

      console.log('✅ Notifications totales:', {
        documents: notifData?.length || 0,
        contrats: contratNotifications.length,
        avenants1: avenant1Notifications.length,
        avenants2: avenant2Notifications.length,
        total: allNotifications.length
      });

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyLevel = (dateEcheance: string): 'critical' | 'urgent' | 'warning' => {
    const days = Math.ceil((new Date(dateEcheance).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return 'critical';
    if (days <= 15) return 'urgent';
    return 'warning';
  };

  const getUrgencyColor = (level: 'critical' | 'urgent' | 'warning') => {
    switch (level) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'urgent': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'warning': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    }
  };

  const handleViewProfile = (e: React.MouseEvent, profilId: string) => {
    e.stopPropagation(); // Empêche l'ouverture du NotificationModal
    if (onViewProfile) {
      onViewProfile(profilId);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'titre_sejour': return 'Pièce d\'identité';
      case 'visite_medicale': return 'Visite médicale';
      case 'permis_conduire': return 'Permis de conduire';
      case 'cdd': return 'Contrat CDD';
      case 'contrat_cdd': return 'Contrat CDD';
      case 'avenant_1': return 'Avenant 1';
      case 'avenant_2': return 'Avenant 2';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'titre_sejour': return <CreditCard className="w-5 h-5" />;
      case 'visite_medicale': return <FileText className="w-5 h-5" />;
      case 'permis_conduire': return <CreditCard className="w-5 h-5" />;
      case 'cdd': return <Calendar className="w-5 h-5" />;
      case 'contrat_cdd': return <Calendar className="w-5 h-5" />;
      case 'avenant_1': return <FileText className="w-5 h-5" />;
      case 'avenant_2': return <FileText className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const filteredNotifications = notifications
    .filter(n => {
      if (activeTab === 'contrat_cdd') {
        // Gérer à la fois 'cdd' (depuis v_notifications_ui) et 'contrat_cdd' (depuis contrat)
        return n.type === 'cdd' || n.type === 'contrat_cdd';
      }
      return n.type === activeTab;
    })
    .filter(n => filterStatut === 'all' || n.statut === filterStatut)
    .filter(n => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        n.profil?.nom?.toLowerCase().includes(searchLower) ||
        n.profil?.prenom?.toLowerCase().includes(searchLower) ||
        n.profil?.email?.toLowerCase().includes(searchLower)
      );
    });

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterStatut, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  const getTabCount = (type: string) => {
    const filtered = notifications.filter(n => {
      if (type === 'contrat_cdd') {
        // Compter à la fois 'cdd' (depuis v_notifications_ui) et 'contrat_cdd' (depuis contrat)
        if (n.type !== 'cdd' && n.type !== 'contrat_cdd') return false;
      } else if (n.type !== type) {
        return false;
      }
      if (n.statut === 'resolue' || n.statut === 'ignoree') return false;
      return true;
    });

    return filtered.length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des notifications..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-600" />
          Notifications de documents
        </h1>
        <p className="text-gray-600 mt-2">Suivi des documents et contrats arrivant à échéance</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setActiveTab('titre_sejour')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
            activeTab === 'titre_sejour'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          Pièces d'identité
          {getTabCount('titre_sejour') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'titre_sejour' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {getTabCount('titre_sejour')}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('visite_medicale')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
            activeTab === 'visite_medicale'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <FileText className="w-5 h-5" />
          Visites médicales
          {getTabCount('visite_medicale') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'visite_medicale' ? 'bg-white text-green-600' : 'bg-green-100 text-green-600'
            }`}>
              {getTabCount('visite_medicale')}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('permis_conduire')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
            activeTab === 'permis_conduire'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          Permis de conduire
          {getTabCount('permis_conduire') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'permis_conduire' ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-600'
            }`}>
              {getTabCount('permis_conduire')}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('contrat_cdd')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
            activeTab === 'contrat_cdd'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          Contrats CDD
          {getTabCount('contrat_cdd') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'contrat_cdd' ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'
            }`}>
              {getTabCount('contrat_cdd')}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('avenant_1')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
            activeTab === 'avenant_1'
              ? 'bg-cyan-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <FileText className="w-5 h-5" />
          Avenant 1
          {getTabCount('avenant_1') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'avenant_1' ? 'bg-white text-cyan-600' : 'bg-cyan-100 text-cyan-600'
            }`}>
              {getTabCount('avenant_1')}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('avenant_2')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
            activeTab === 'avenant_2'
              ? 'bg-teal-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <FileText className="w-5 h-5" />
          Avenant 2
          {getTabCount('avenant_2') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'avenant_2' ? 'bg-white text-teal-600' : 'bg-teal-100 text-teal-600'
            }`}>
              {getTabCount('avenant_2')}
            </span>
          )}
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Rechercher par nom, prénom ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actives</option>
          <option value="email_envoye">Email envoyé</option>
          <option value="resolue">Résolues</option>
          <option value="ignoree">Ignorées</option>
        </select>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune notification</h3>
          <p className="text-gray-600">
            {searchTerm || filterStatut !== 'all'
              ? 'Aucune notification ne correspond à vos critères de recherche'
              : `Aucune notification de type "${getTypeLabel(activeTab)}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedNotifications.map((notification) => {
            const urgency = getUrgencyLevel(notification.date_echeance);
            const daysRemaining = Math.ceil(
              (new Date(notification.date_echeance).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={notification.id}
                onClick={() => setSelectedNotification(notification)}
                className={`bg-white rounded-lg border-2 p-5 cursor-pointer transition-all hover:shadow-lg ${getUrgencyColor(urgency)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${
                        urgency === 'critical' ? 'bg-red-200' :
                        urgency === 'urgent' ? 'bg-orange-200' : 'bg-yellow-200'
                      }`}>
                        {getTypeIcon(notification.type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">
                          {notification.profil?.prenom} {notification.profil?.nom}
                        </h3>
                        <p className="text-sm text-gray-600">{notification.profil?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 ml-14 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">
                          Expire le: {new Date(notification.date_echeance).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className={`px-3 py-1 rounded-full font-bold ${
                        daysRemaining <= 0 ? 'bg-red-600 text-white' :
                        daysRemaining <= 7 ? 'bg-red-500 text-white' :
                        daysRemaining <= 15 ? 'bg-orange-500 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>
                        {daysRemaining <= 0 ? 'EXPIRÉ' : `${daysRemaining} jours restants`}
                      </div>
                      {notification.statut === 'email_envoye' && notification.email_envoye_at && (
                        <div className="flex items-center gap-1 text-green-700">
                          <Mail className="w-4 h-4" />
                          <span>Email envoyé le {new Date(notification.email_envoye_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleViewProfile(e, notification.profil_id)}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="Voir le profil du salarié"
                    >
                      <User className="w-5 h-5" />
                    </button>
                    {notification.statut === 'resolue' && (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                    {notification.statut === 'ignoree' && (
                      <X className="w-6 h-6 text-gray-500" />
                    )}
                    <AlertCircle className={`w-6 h-6 ${
                      urgency === 'critical' ? 'text-red-600' :
                      urgency === 'urgent' ? 'text-orange-600' : 'text-yellow-600'
                    }`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredNotifications.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredNotifications.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}

      {selectedNotification && (
        <NotificationModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onUpdate={fetchNotifications}
        />
      )}
    </div>
  );
}
