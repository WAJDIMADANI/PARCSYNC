import React, { useEffect, useState } from 'react';
import { X, Calendar, FileText, Briefcase, Mail, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmployeeHistoryProps {
  profilId: string;
  employeeName: string;
  onClose: () => void;
}

interface TimelineEvent {
  id: string;
  source: string;
  type: string;
  date: string;
  description: string;
  metadata: any;
  created_at: string;
}

export default function EmployeeHistory({ profilId, employeeName, onClose }: EmployeeHistoryProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [profilId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('v_employee_timeline')
        .select('*')
        .eq('profil_id', profilId)
        .order('date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    if (type.includes('contrat')) return <Briefcase className="w-5 h-5" />;
    if (type === 'courrier') return <Mail className="w-5 h-5" />;
    if (type === 'embauche') return <TrendingUp className="w-5 h-5" />;
    if (type === 'depart') return <TrendingUp className="w-5 h-5 rotate-180" />;
    return <FileText className="w-5 h-5" />;
  };

  const getEventColor = (type: string) => {
    if (type === 'embauche') return 'bg-green-100 text-green-700';
    if (type === 'depart') return 'bg-red-100 text-red-700';
    if (type.includes('contrat')) return 'bg-blue-100 text-blue-700';
    if (type === 'courrier') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Historique</h2>
            <p className="text-gray-600 mt-1">{employeeName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Aucun événement enregistré</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={event.id} className="relative">
                  {index !== events.length - 1 && (
                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                  )}

                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getEventColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>

                    <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{event.description}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {formatDate(event.date)}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          event.source === 'event' ? 'bg-blue-100 text-blue-700' :
                          event.source === 'contrat' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {event.source === 'event' ? 'Événement' :
                           event.source === 'contrat' ? 'Contrat' : 'Courrier'}
                        </span>
                      </div>

                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {Object.entries(event.metadata).map(([key, value]) => (
                              value && (
                                <div key={key}>
                                  <span className="text-gray-500">{key}: </span>
                                  <span className="text-gray-900 font-medium">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
