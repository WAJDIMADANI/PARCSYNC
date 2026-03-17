import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ImportStats {
  brandsInserted: number;
  brandsSkipped: number;
  modelsInserted: number;
  modelsSkipped: number;
  errors: string[];
}

interface NHTSAMake {
  Make_ID: number;
  Make_Name: string;
}

interface NHTSAModel {
  Model_ID: number;
  Model_Name: string;
  Make_ID: number;
  Make_Name: string;
  VehicleTypeId?: number;
  VehicleTypeName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please login.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[Import] User authenticated: ${user.email}`);


    const { mode } = await req.json();

    if (mode === 'status') {
      const { data: brands } = await supabase
        .from('vehicle_reference_brands')
        .select('id, source')
        .limit(1000);

      const { data: models } = await supabase
        .from('vehicle_reference_models')
        .select('id, source')
        .limit(1000);

      return new Response(
        JSON.stringify({
          totalBrands: brands?.length || 0,
          totalModels: models?.length || 0,
          nhtsaBrands: brands?.filter(b => b.source === 'nhtsa').length || 0,
          nhtsaModels: models?.filter(m => m.source === 'nhtsa').length || 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const stats: ImportStats = {
      brandsInserted: 0,
      brandsSkipped: 0,
      modelsInserted: 0,
      modelsSkipped: 0,
      errors: [],
    };

    console.log('[Import] Starting NHTSA vehicle references import...');

    console.log('[Import] Step 1: Fetching makes from NHTSA...');
    const makesResponse = await fetch(
      'https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json',
      { signal: AbortSignal.timeout(30000) }
    );

    if (!makesResponse.ok) {
      throw new Error(`NHTSA API error: ${makesResponse.status}`);
    }

    const makesData = await makesResponse.json();
    const makes: NHTSAMake[] = makesData.Results || [];
    console.log(`[Import] Found ${makes.length} makes from NHTSA`);

    const { data: existingBrands } = await supabase
      .from('vehicle_reference_brands')
      .select('source_id')
      .eq('source', 'nhtsa');

    const existingBrandIds = new Set(existingBrands?.map(b => b.source_id) || []);

    const brandsToInsert = makes
      .filter(make => make.Make_Name && !existingBrandIds.has(String(make.Make_ID)))
      .map(make => ({
        name: make.Make_Name.trim(),
        source: 'nhtsa',
        source_id: String(make.Make_ID),
      }));

    console.log(`[Import] Inserting ${brandsToInsert.length} new brands...`);

    if (brandsToInsert.length > 0) {
      const BATCH_SIZE = 100;
      for (let i = 0; i < brandsToInsert.length; i += BATCH_SIZE) {
        const batch = brandsToInsert.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from('vehicle_reference_brands')
          .insert(batch);

        if (insertError) {
          console.error(`[Import] Error inserting brands batch ${i}:`, insertError);
          stats.errors.push(`Brands batch ${i}: ${insertError.message}`);
        } else {
          stats.brandsInserted += batch.length;
        }
      }
    }

    stats.brandsSkipped = makes.length - stats.brandsInserted;
    console.log(`[Import] Brands: ${stats.brandsInserted} inserted, ${stats.brandsSkipped} skipped`);

    console.log('[Import] Step 2: Fetching all brands from database...');
    const { data: allBrands } = await supabase
      .from('vehicle_reference_brands')
      .select('id, source_id')
      .eq('source', 'nhtsa');

    if (!allBrands || allBrands.length === 0) {
      throw new Error('No NHTSA brands found in database');
    }

    console.log(`[Import] Found ${allBrands.length} NHTSA brands in database`);

    const brandMap = new Map<string, string>();
    allBrands.forEach(brand => {
      if (brand.source_id) {
        brandMap.set(brand.source_id, brand.id);
      }
    });

    console.log('[Import] Step 3: Fetching models by make...');
    const { data: existingModels } = await supabase
      .from('vehicle_reference_models')
      .select('source_id')
      .eq('source', 'nhtsa');

    const existingModelIds = new Set(existingModels?.map(m => m.source_id) || []);

    const modelsToInsert: any[] = [];
    let processedMakes = 0;

    for (const make of makes.slice(0, 50)) {
      try {
        console.log(`[Import] Fetching models for ${make.Make_Name} (${make.Make_ID})...`);

        const modelsResponse = await fetch(
          `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/${make.Make_ID}?format=json`,
          { signal: AbortSignal.timeout(10000) }
        );

        if (!modelsResponse.ok) {
          console.warn(`[Import] Failed to fetch models for make ${make.Make_ID}`);
          continue;
        }

        const modelsData = await modelsResponse.json();
        const models: NHTSAModel[] = modelsData.Results || [];

        const brandId = brandMap.get(String(make.Make_ID));
        if (!brandId) {
          console.warn(`[Import] Brand ID not found for make ${make.Make_ID}`);
          continue;
        }

        for (const model of models) {
          if (model.Model_Name && !existingModelIds.has(String(model.Model_ID))) {
            modelsToInsert.push({
              brand_id: brandId,
              name: model.Model_Name.trim(),
              source: 'nhtsa',
              source_id: String(model.Model_ID),
              vehicle_type: model.VehicleTypeName || null,
            });
          }
        }

        processedMakes++;

        if (processedMakes % 10 === 0) {
          console.log(`[Import] Processed ${processedMakes} makes...`);
        }

        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`[Import] Error fetching models for make ${make.Make_ID}:`, error);
        stats.errors.push(`Models for make ${make.Make_ID}: ${error.message}`);
      }
    }

    console.log(`[Import] Total models to insert: ${modelsToInsert.length}`);

    if (modelsToInsert.length > 0) {
      const BATCH_SIZE = 100;
      for (let i = 0; i < modelsToInsert.length; i += BATCH_SIZE) {
        const batch = modelsToInsert.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from('vehicle_reference_models')
          .insert(batch);

        if (insertError) {
          console.error(`[Import] Error inserting models batch ${i}:`, insertError);
          stats.errors.push(`Models batch ${i}: ${insertError.message}`);
        } else {
          stats.modelsInserted += batch.length;
        }
      }
    }

    console.log(`[Import] Models: ${stats.modelsInserted} inserted`);
    console.log('[Import] Import completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        message: `Import completed: ${stats.brandsInserted} brands, ${stats.modelsInserted} models inserted`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[Import] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
