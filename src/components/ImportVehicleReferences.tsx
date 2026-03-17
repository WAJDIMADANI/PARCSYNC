import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, AlertCircle, CheckCircle, RefreshCw, Database } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface ImportStats {
  brandsInserted: number;
  brandsSkipped: number;
  modelsInserted: number;
  modelsSkipped: number;
  errors: string[];
}

interface StatusData {
  totalBrands: number;
  totalModels: number;
  nhtsaBrands: number;
  nhtsaModels: number;
}

export function ImportVehicleReferences() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-vehicle-references`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mode: 'status' }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Error fetching status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    setStats(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found. Please login.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-vehicle-references`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mode: 'import' }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error ${response.status}`);
      }

      if (result.success) {
        setStats(result.stats);
        setSuccess(true);
        await fetchStatus();
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during import');
      console.error('Import error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Database className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Import massif de références véhicules</h2>
              <p className="text-sm text-gray-600">Source : NHTSA vPIC Database</p>
            </div>
          </div>
          <button
            onClick={fetchStatus}
            disabled={loadingStatus}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualiser les statistiques"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loadingStatus ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Marques</div>
              <div className="text-2xl font-bold text-blue-900">{status.totalBrands}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Marques NHTSA</div>
              <div className="text-2xl font-bold text-green-900">{status.nhtsaBrands}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Total Modèles</div>
              <div className="text-2xl font-bold text-purple-900">{status.totalModels}</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">Modèles NHTSA</div>
              <div className="text-2xl font-bold text-orange-900">{status.nhtsaModels}</div>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-2">Information importante</p>
              <ul className="list-disc list-inside space-y-1">
                <li>L'import peut prendre plusieurs minutes</li>
                <li>Les doublons sont automatiquement ignorés</li>
                <li>L'import traite les 50 premières marques avec leurs modèles</li>
                <li>Vous pouvez relancer l'import pour continuer si interrompu</li>
                <li>Cet import ne modifie pas le modal "Nouveau véhicule"</li>
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-800">Erreur</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && stats && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
            <div className="flex">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-green-800 mb-2">Import réussi</p>
                <div className="grid grid-cols-2 gap-4 text-sm text-green-700">
                  <div>
                    <span className="font-medium">Marques insérées :</span> {stats.brandsInserted}
                  </div>
                  <div>
                    <span className="font-medium">Marques ignorées :</span> {stats.brandsSkipped}
                  </div>
                  <div>
                    <span className="font-medium">Modèles insérés :</span> {stats.modelsInserted}
                  </div>
                  <div>
                    <span className="font-medium">Modèles ignorés :</span> {stats.modelsSkipped}
                  </div>
                </div>
                {stats.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium text-orange-700 mb-1">Erreurs rencontrées :</p>
                    <ul className="list-disc list-inside text-sm text-orange-600 space-y-1">
                      {stats.errors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {stats.errors.length > 5 && (
                        <li>... et {stats.errors.length - 5} autres erreurs</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-semibold"
          >
            {loading ? (
              <>
                <LoadingSpinner />
                <span>Import en cours...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Lancer l'import depuis NHTSA</span>
              </>
            )}
          </button>

          <div className="text-xs text-gray-500 text-center">
            <p>Les données sont importées depuis la base NHTSA vPIC (National Highway Traffic Safety Administration)</p>
            <p className="mt-1">API publique : https://vpic.nhtsa.dot.gov/api/</p>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Comment ça marche ?</h3>
        <ol className="space-y-3 text-sm text-gray-700">
          <li className="flex">
            <span className="font-bold text-blue-600 mr-3">1.</span>
            <span>L'import récupère toutes les marques depuis l'API NHTSA</span>
          </li>
          <li className="flex">
            <span className="font-bold text-blue-600 mr-3">2.</span>
            <span>Les marques sont insérées dans la table vehicle_reference_brands avec source='nhtsa'</span>
          </li>
          <li className="flex">
            <span className="font-bold text-blue-600 mr-3">3.</span>
            <span>Pour chaque marque, les modèles sont récupérés et insérés dans vehicle_reference_models</span>
          </li>
          <li className="flex">
            <span className="font-bold text-blue-600 mr-3">4.</span>
            <span>Les doublons sont détectés via source_id et automatiquement ignorés</span>
          </li>
          <li className="flex">
            <span className="font-bold text-blue-600 mr-3">5.</span>
            <span>Les combobox du modal "Nouveau véhicule" sont automatiquement alimentés</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
