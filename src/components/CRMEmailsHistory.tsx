import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle, Clock, Mail, ChevronDown, ChevronRight } from 'lucide-react';

interface EmailBatch {
  id: string;
  created_at: string;
  created_by: string;
  mode: 'all' | 'selected';
  brevo_template_id: number;
  params: Record<string, unknown>;
  tags: string[];
  status: 'sending' | 'sent' | 'partial' | 'failed';
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  creator?: {
    prenom: string;
    nom: string;
    email: string;
  };
}

interface EmailRecipient {
  id: string;
  batch_id: string;
  profil_id: string;
  email: string;
  full_name: string;
  status: 'pending' | 'sent' | 'failed';
  error: any;
  created_at: string;
}

export function CRMEmailsHistory() {
  const [batches, setBatches] = useState<EmailBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Record<string, EmailRecipient[]>>({});
  const [loadingRecipients, setLoadingRecipients] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_email_batches')
        .select(`
          *,
          creator:created_by (
            prenom,
            nom,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error('Erreur chargement batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipients = async (batchId: string) => {
    if (recipients[batchId]) return;

    setLoadingRecipients(prev => ({ ...prev, [batchId]: true }));
    try {
      const { data, error } = await supabase
        .from('crm_email_recipients')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRecipients(prev => ({ ...prev, [batchId]: data || [] }));
    } catch (error) {
      console.error('Erreur chargement recipients:', error);
    } finally {
      setLoadingRecipients(prev => ({ ...prev, [batchId]: false }));
    }
  };

  const toggleBatch = (batchId: string) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null);
    } else {
      setExpandedBatch(batchId);
      loadRecipients(batchId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            Envoyé
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <XCircle className="w-3 h-3" />
            Échoué
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            Partiel
          </span>
        );
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" />
            En cours
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 text-lg">Aucun envoi d'emails pour le moment</p>
        <p className="text-slate-500 text-sm mt-2">Les envois d'emails apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Historique des envois</h2>
        <p className="text-sm text-slate-600">{batches.length} envoi{batches.length > 1 ? 's' : ''} au total</p>
      </div>

      <div className="space-y-3">
        {batches.map((batch) => {
          const isExpanded = expandedBatch === batch.id;
          const batchRecipients = recipients[batch.id] || [];
          const isLoadingRecips = loadingRecipients[batch.id];

          return (
            <div key={batch.id} className="bg-white rounded-lg shadow">
              <div
                onClick={() => toggleBatch(batch.id)}
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-slate-900">
                          Template #{batch.brevo_template_id}
                        </span>
                        {getStatusBadge(batch.status)}
                        <span className="text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded-full">
                          {batch.mode === 'all' ? 'Tous les salariés' : 'Sélection'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-600">Créé le:</span>
                          <span className="ml-2 text-slate-900 font-medium">
                            {formatDate(batch.created_at)}
                          </span>
                        </div>
                        {batch.sent_at && (
                          <div>
                            <span className="text-slate-600">Envoyé le:</span>
                            <span className="ml-2 text-slate-900 font-medium">
                              {formatDate(batch.sent_at)}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-600">Créé par:</span>
                          <span className="ml-2 text-slate-900 font-medium">
                            {batch.creator?.prenom} {batch.creator?.nom}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-600">Destinataires:</span>
                          <span className="ml-2 text-slate-900 font-medium">
                            {batch.total_recipients}
                          </span>
                        </div>
                      </div>

                      {(batch.sent_count > 0 || batch.failed_count > 0) && (
                        <div className="mt-2 flex gap-4 text-sm">
                          {batch.sent_count > 0 && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>{batch.sent_count} envoyés</span>
                            </div>
                          )}
                          {batch.failed_count > 0 && (
                            <div className="flex items-center gap-1 text-red-600">
                              <XCircle className="w-4 h-4" />
                              <span>{batch.failed_count} échoués</span>
                            </div>
                          )}
                        </div>
                      )}

                      {batch.tags && batch.tags.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {batch.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-200 p-4 bg-slate-50">
                  {isLoadingRecips ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  ) : batchRecipients.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">
                      Aucun destinataire trouvé
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                              Nom complet
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                              Email
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                              Statut
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {batchRecipients.map((recipient) => (
                            <tr key={recipient.id}>
                              <td className="px-3 py-2 text-slate-900">{recipient.full_name}</td>
                              <td className="px-3 py-2 text-slate-600">{recipient.email}</td>
                              <td className="px-3 py-2">{getStatusBadge(recipient.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
