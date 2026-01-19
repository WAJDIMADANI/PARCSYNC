import { useState } from 'react';
import { Send, History } from 'lucide-react';
import { CRMEmailsNew } from './CRMEmailsNew';
import { CRMEmailsHistory } from './CRMEmailsHistory';

type Tab = 'new' | 'history';

export function CRMEmails() {
  const [activeTab, setActiveTab] = useState<Tab>('new');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Envois d'emails groupés</h1>
        <p className="text-slate-600">
          Envoyez des emails groupés aux salariés via les templates Brevo
        </p>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'new'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Nouveau</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historique</span>
          </button>
        </div>
      </div>

      <div>
        {activeTab === 'new' && <CRMEmailsNew />}
        {activeTab === 'history' && <CRMEmailsHistory />}
      </div>
    </div>
  );
}
