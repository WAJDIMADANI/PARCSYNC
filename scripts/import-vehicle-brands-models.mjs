#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables manquantes : VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY');
  console.error('💡 Vérifiez que votre fichier .env contient ces variables');
  process.exit(1);
}

console.log(`🔑 Utilisation de la clé : ${SUPABASE_KEY.includes('service_role') ? 'SERVICE ROLE' : 'ANON'}`);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const stats = {
  brandsInserted: 0,
  brandsIgnored: 0,
  modelsInserted: 0,
  modelsIgnored: 0,
  errors: [],
};

async function fetchWithTimeout(url, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function importBrands() {
  console.log('\n📦 Étape 1 : Récupération des marques depuis NHTSA...');

  const response = await fetchWithTimeout(
    'https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json'
  );

  if (!response.ok) {
    throw new Error(`NHTSA API erreur: ${response.status}`);
  }

  const data = await response.json();
  const makes = data.Results || [];

  console.log(`✅ ${makes.length} marques trouvées sur NHTSA`);

  console.log('🔍 Vérification des marques existantes...');
  const { data: existingBrands } = await supabase
    .from('vehicle_reference_brands')
    .select('source_id')
    .eq('source', 'nhtsa');

  const existingIds = new Set(existingBrands?.map(b => b.source_id) || []);
  console.log(`📊 ${existingIds.size} marques déjà en base`);

  const brandsToInsert = makes
    .filter(make => make.Make_Name && !existingIds.has(String(make.Make_ID)))
    .map(make => ({
      name: make.Make_Name.trim(),
      source: 'nhtsa',
      source_id: String(make.Make_ID),
    }));

  console.log(`➕ ${brandsToInsert.length} nouvelles marques à insérer`);

  if (brandsToInsert.length === 0) {
    console.log('⏭️  Aucune nouvelle marque à ajouter');
    stats.brandsIgnored = makes.length;
    return makes;
  }

  const BATCH_SIZE = 100;
  for (let i = 0; i < brandsToInsert.length; i += BATCH_SIZE) {
    const batch = brandsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('vehicle_reference_brands')
      .insert(batch);

    if (error) {
      console.error(`❌ Erreur batch ${i}-${i + batch.length}:`, error.message);
      stats.errors.push(`Brands batch ${i}: ${error.message}`);
    } else {
      stats.brandsInserted += batch.length;
      console.log(`✅ Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} marques insérées`);
    }
  }

  stats.brandsIgnored = makes.length - stats.brandsInserted;
  console.log(`\n📊 Marques : ${stats.brandsInserted} insérées, ${stats.brandsIgnored} ignorées`);

  return makes;
}

async function importModels(makes) {
  console.log('\n📦 Étape 2 : Récupération des modèles depuis NHTSA...');

  console.log('🔍 Chargement de la correspondance marques...');
  const { data: allBrands } = await supabase
    .from('vehicle_reference_brands')
    .select('id, source_id, name')
    .eq('source', 'nhtsa');

  if (!allBrands || allBrands.length === 0) {
    throw new Error('Aucune marque NHTSA en base');
  }

  console.log(`✅ ${allBrands.length} marques chargées`);

  const brandMap = new Map();
  allBrands.forEach(brand => {
    if (brand.source_id) {
      brandMap.set(brand.source_id, brand.id);
    }
  });

  console.log('🔍 Vérification des modèles existants...');
  const { data: existingModels } = await supabase
    .from('vehicle_reference_models')
    .select('source_id')
    .eq('source', 'nhtsa');

  const existingModelIds = new Set(existingModels?.map(m => m.source_id) || []);
  console.log(`📊 ${existingModelIds.size} modèles déjà en base`);

  const modelsToInsert = [];
  let processedMakes = 0;
  let failedMakes = 0;

  console.log(`\n🚀 Traitement de ${makes.length} marques...`);

  for (const make of makes) {
    try {
      const brandId = brandMap.get(String(make.Make_ID));
      if (!brandId) {
        failedMakes++;
        continue;
      }

      const response = await fetchWithTimeout(
        `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/${make.Make_ID}?format=json`,
        10000
      );

      if (!response.ok) {
        failedMakes++;
        continue;
      }

      const data = await response.json();
      const models = data.Results || [];

      let newModelsForMake = 0;

      for (const model of models) {
        if (model.Model_Name && !existingModelIds.has(String(model.Model_ID))) {
          modelsToInsert.push({
            brand_id: brandId,
            name: model.Model_Name.trim(),
            source: 'nhtsa',
            source_id: String(model.Model_ID),
            vehicle_type: model.VehicleTypeName || null,
          });
          newModelsForMake++;
        }
      }

      processedMakes++;

      if (processedMakes % 50 === 0) {
        console.log(`📊 Progression : ${processedMakes}/${makes.length} marques (${modelsToInsert.length} modèles en attente)`);
      }

      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (error) {
      failedMakes++;
      if (error.name === 'AbortError') {
        stats.errors.push(`Timeout pour marque ${make.Make_ID}`);
      } else {
        stats.errors.push(`Erreur marque ${make.Make_ID}: ${error.message}`);
      }
    }
  }

  console.log(`\n✅ ${processedMakes} marques traitées avec succès`);
  if (failedMakes > 0) {
    console.log(`⚠️  ${failedMakes} marques en échec`);
  }
  console.log(`➕ ${modelsToInsert.length} nouveaux modèles à insérer`);

  if (modelsToInsert.length === 0) {
    console.log('⏭️  Aucun nouveau modèle à ajouter');
    return;
  }

  const BATCH_SIZE = 100;
  for (let i = 0; i < modelsToInsert.length; i += BATCH_SIZE) {
    const batch = modelsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('vehicle_reference_models')
      .insert(batch);

    if (error) {
      console.error(`❌ Erreur batch ${i}-${i + batch.length}:`, error.message);
      stats.errors.push(`Models batch ${i}: ${error.message}`);
    } else {
      stats.modelsInserted += batch.length;
      console.log(`✅ Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} modèles insérés`);
    }
  }

  console.log(`\n📊 Modèles : ${stats.modelsInserted} insérés`);
}

async function main() {
  console.log('🚀 Import massif des marques et modèles de véhicules');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const startTime = Date.now();

  try {
    const makes = await importBrands();
    await importModels(makes);

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Import terminé avec succès !');
    console.log(`⏱️  Durée : ${duration}s`);
    console.log('\n📊 Statistiques :');
    console.log(`   - Marques insérées : ${stats.brandsInserted}`);
    console.log(`   - Marques ignorées : ${stats.brandsIgnored}`);
    console.log(`   - Modèles insérés : ${stats.modelsInserted}`);
    console.log(`   - Modèles ignorés : ${stats.modelsIgnored}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  ${stats.errors.length} erreur(s) rencontrée(s)`);
      if (stats.errors.length <= 10) {
        stats.errors.forEach(err => console.log(`   - ${err}`));
      } else {
        console.log(`   (${stats.errors.length} erreurs - trop nombreuses pour les afficher)`);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Erreur fatale :', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
