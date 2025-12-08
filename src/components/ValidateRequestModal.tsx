import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, XCircle, ArrowRight, Send, MessageSquare, Clock, User, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../contexts/PermissionsContext';

interface Message {
  id: string;
  demande_validation_id: string;
  auteur_id: string;
  message: string;
  lu: boolean;
  created_at: string;
  auteur?: {
    nom: string;
    prenom: string;
    email: string;
  };
}

interface Validation {
  id: string;
  demande_id: string;
  demandeur_id: string;
  validateur_id: string;
  type_action: string;
  priorite: 'normale' | 'urgente';
  statut: 'en_attente' | 'approuvee' | 'rejetee' | 'transferee';
  message_demande: string;
  commentaire_validateur: string | null;
  created_at: string;
  responded_at: string | null;

  type_demande: string;
  demande_description: string;
  demande_statut: string;
  nom_salarie: string | null;
  prenom_salarie: string | null;
  matricule_salarie: string | null;

  demandeur_email: string;
  demandeur_nom: string;
  demandeur_prenom: string;

  validateur_email: string | null;
  validateur_nom: string | null;
  validateur_prenom: string | null;
}

interface ValidateRequestModalProps {
  validation: Validation;
  onClose: () => void;
  onSuccess: () => void;
}

export function ValidateRequestModal({ validation, onClose, onSuccess }: ValidateRequestModalProps) {
  const { appUser } = usePermissions();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    markMessagesAsRead();

    const channel = supabase
      .channel(`messages-${validation.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_validation',
        filter: `demande_validation_id=eq.${validation.id}`,
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [validation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('message_validation')
        .select(`
          *,
          auteur:auteur_id(nom, prenom, email)
        `)
        .eq('demande_validation_id', validation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
    }
  };

  const markMessagesAsRead = async () => {
    if (!appUser) return;

    try {
      await supabase.rpc('marquer_messages_lus', {
        p_demande_validation_id: validation.id,
        p_utilisateur_id: appUser.id,
      });
    } catch (err: any) {
      console.error('Error marking messages as read:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !appUser) return;

    setSendingMessage(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('message_validation')
        .insert({
          demande_validation_id: validation.id,
          auteur_id: appUser.id,
          message: newMessage.trim(),
        });

      if (insertError) throw insertError;

      setNewMessage('');
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleApprove = async () => {
    if (!commentaire.trim()) {
      setError('Veuillez saisir un commentaire');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('demande_validation')
        .update({
          statut: 'approuvee',
          commentaire_validateur: commentaire,
          responded_at: new Date().toISOString(),
        })
        .eq('id', validation.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error approving validation:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!commentaire.trim()) {
      setError('Veuillez saisir un commentaire');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('demande_validation')
        .update({
          statut: 'rejetee',
          commentaire_validateur: commentaire,
          responded_at: new Date().toISOString(),
        })
        .eq('id', validation.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error rejecting validation:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeActionLabel = (type: string) => {
    switch (type) {
      case 'modification_demande': return 'Modification de la demande';
      case 'suppression_demande': return 'Suppression de la demande';
      case 'changement_priorite': return 'Changement de priorité';
      case 'reassignation': return 'Réassignation';
      case 'autre': return 'Autre';
      default: return type;
    }
  };

  const isReadOnly = validation.statut !== 'en_attente';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Demande de Validation</h2>
                <p className="text-purple-100 text-sm mt-1">
                  {validation.prenom_salarie} {validation.nom_salarie} - {validation.type_demande}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Erreur</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-600" />
                Informations de la demande
              </h3>

              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Type d'action</p>
                  <p className="text-sm text-slate-900 mt-1">{getTypeActionLabel(validation.type_action)}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Priorité</p>
                  {validation.priorite === 'urgente' ? (
                    <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Urgent
                    </span>
                  ) : (
                    <p className="text-sm text-slate-900 mt-1">Normale</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Demandeur</p>
                  <p className="text-sm text-slate-900 mt-1">
                    {validation.demandeur_prenom} {validation.demandeur_nom}
                  </p>
                  <p className="text-xs text-slate-600">{validation.demandeur_email}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date</p>
                  <p className="text-sm text-slate-900 mt-1">
                    {new Date(validation.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs font-medium text-blue-800 uppercase tracking-wide mb-2">Message de demande</p>
                <p className="text-sm text-blue-900 whitespace-pre-wrap">{validation.message_demande}</p>
              </div>
            </div>

            <div className="space-y-4 flex flex-col h-full">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-slate-600" />
                Conversation
              </h3>

              <div className="flex-1 bg-slate-50 rounded-lg p-4 space-y-3 overflow-y-auto max-h-96">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-600">Aucun message</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isCurrentUser = msg.auteur_id === appUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            isCurrentUser
                              ? 'bg-purple-600 text-white'
                              : 'bg-white border border-slate-200'
                          }`}
                        >
                          <p className="text-xs font-medium mb-1">
                            {msg.auteur?.prenom} {msg.auteur?.nom}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className={`text-xs mt-1 ${isCurrentUser ? 'text-purple-200' : 'text-slate-500'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {!isReadOnly && (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrire un message..."
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {!isReadOnly && (
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Votre commentaire de validation
                </label>
                <textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={4}
                  placeholder="Expliquez votre décision..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  required
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          {isReadOnly ? (
            <div className="flex justify-between items-center">
              <div>
                {validation.statut === 'approuvee' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                    <CheckCircle className="w-4 h-4" />
                    Approuvée
                  </span>
                )}
                {validation.statut === 'rejetee' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                    <XCircle className="w-4 h-4" />
                    Rejetée
                  </span>
                )}
                {validation.commentaire_validateur && (
                  <p className="text-sm text-slate-600 mt-2">
                    Commentaire : {validation.commentaire_validateur}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-white transition-colors"
              >
                Fermer
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={submitting || !commentaire.trim()}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Rejeter
                  </>
                )}
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting || !commentaire.trim()}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Approuver
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
