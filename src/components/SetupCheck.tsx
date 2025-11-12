import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, AlertCircle, Database, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface ConnectionStatus {
  connected: boolean;
  error?: string;
  tables?: string[];
  buckets?: string[];
}

export function SetupCheck() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const tableNames = ['site', 'secteur', 'candidat', 'profil', 'document', 'contrat', 'courrier', 'alerte', 'vehicule', 'carburant', 'amende'];
      const tableChecks = await Promise.all(
        tableNames.map(async (table) => {
          const { error } = await supabase.from(table).select('id').limit(1);
          return { table, ok: !error };
        })
      );

      const failedTables = tableChecks.filter(t => !t.ok);
      const successTables = tableChecks.filter(t => t.ok).map(t => t.table);

      const { data: buckets } = await supabase.storage.listBuckets();

      if (failedTables.length > 0) {
        setStatus({
          connected: false,
          error: `Tables non accessibles: ${failedTables.map(t => t.table).join(', ')}`,
          tables: successTables,
          buckets: buckets?.map(b => b.name) || []
        });
      } else {
        setStatus({
          connected: true,
          tables: successTables,
          buckets: buckets?.map(b => b.name) || []
        });
      }
    } catch (error: any) {
      setStatus({
        connected: false,
        error: error.message || 'Erreur de connexion'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Vérification de la configuration..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Setup Check</h1>
          <p className="text-gray-600 mt-1">Vérification de la connexion Supabase</p>
        </div>
        <button
          onClick={checkConnection}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Rafraîchir
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className={`bg-white rounded-lg shadow-lg p-6 border-2 ${
          status?.connected ? 'border-green-500' : 'border-red-500'
        }`}>
          <div className="flex items-center mb-4">
            {status?.connected ? (
              <CheckCircle className="w-12 h-12 text-green-500" />
            ) : (
              <XCircle className="w-12 h-12 text-red-500" />
            )}
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {status?.connected ? 'Connexion OK' : 'Connexion KO'}
              </h2>
              <p className="text-gray-600">
                {status?.connected
                  ? 'La connexion à Supabase fonctionne correctement'
                  : status?.error || 'Erreur de connexion'}
              </p>
            </div>
          </div>

          {status?.connected && (
            <div className="mt-6 space-y-4">
              <div>
                <div className="flex items-center mb-2">
                  <Database className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Tables accessibles</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {status.tables?.map((table) => (
                    <div key={table} className="flex items-center p-2 bg-green-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-900">{table}</span>
                    </div>
                  ))}
                </div>
              </div>

              {status.buckets && status.buckets.length > 0 && (
                <div>
                  <div className="flex items-center mb-2">
                    <Database className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Buckets Storage</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {status.buckets.map((bucket) => (
                      <div key={bucket} className="flex items-center p-2 bg-blue-50 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-900">{bucket}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!status?.connected && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-1">Actions recommandées:</h4>
                  <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                    <li>Vérifier les variables d'environnement Supabase</li>
                    <li>Exécuter le script SQL create-tables.sql</li>
                    <li>Vérifier les permissions RLS</li>
                    <li>Créer les buckets Storage nécessaires</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration attendue</h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 mb-1">Tables requises:</p>
              <p className="text-gray-600">site, secteur, candidat, profil, document, contrat, courrier, alerte, vehicule, carburant, amende</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 mb-1">Buckets Storage recommandés:</p>
              <p className="text-gray-600">documents, contrats, courriers</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 mb-1">Vues SQL:</p>
              <p className="text-gray-600">v_docs_expirant, v_contrats_cdd_fin, v_vehicules_actifs, v_amendes_impayees</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
