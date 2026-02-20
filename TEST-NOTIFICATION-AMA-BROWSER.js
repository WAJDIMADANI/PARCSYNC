/**
 * TEST À EXÉCUTER DANS LA CONSOLE DU NAVIGATEUR
 *
 * Instructions :
 * 1. Ouvrir l'application dans le navigateur
 * 2. Se connecter avec un compte admin
 * 3. Ouvrir la console développeur (F12)
 * 4. Copier-coller ce code complet
 * 5. Observer les résultats
 */

(async () => {
  console.clear();
  console.log('🔍 === TEST DIAGNOSTIC NOTIFICATION AMA GOUFADO ===');
  console.log('');

  // IDs à tester
  const AMA_PROFIL_ID = '5c432ff4-4d5a-424f-bb87-4a413349cc18';
  const AMA_CONTRAT_ID = '28254d58-efe1-4634-9ef1-d1f020a218b3';

  // Importer supabase depuis l'app
  const { supabase } = await import('./src/lib/supabase.ts');

  console.log('✅ Supabase client importé');
  console.log('');

  // ============================================================
  // TEST 1 : Vérifier que le contrat existe et est accessible
  // ============================================================
  console.log('📊 TEST 1 : Accès au contrat d\'Ama');
  console.log('─────────────────────────────────────');

  const { data: contratAma, error: errorContrat } = await supabase
    .from('contrat')
    .select('*')
    .eq('id', AMA_CONTRAT_ID)
    .maybeSingle();

  if (errorContrat) {
    console.error('❌ ERREUR RLS ou autre:', errorContrat);
  } else if (!contratAma) {
    console.error('❌ Contrat non trouvé');
  } else {
    console.log('✅ Contrat trouvé:', contratAma);
    console.log('   - Date fin:', contratAma.date_fin);
    console.log('   - Statut:', contratAma.statut);
    console.log('   - Type:', contratAma.type || '(null)');
  }
  console.log('');

  // ============================================================
  // TEST 2 : Vérifier l'accès au profil via join
  // ============================================================
  console.log('👤 TEST 2 : Accès au profil d\'Ama via join');
  console.log('─────────────────────────────────────────────');

  const { data: contratAvecProfil, error: errorJoin } = await supabase
    .from('contrat')
    .select(`
      id,
      profil_id,
      date_fin,
      statut,
      profil:profil_id(prenom, nom, email, statut)
    `)
    .eq('id', AMA_CONTRAT_ID)
    .maybeSingle();

  if (errorJoin) {
    console.error('❌ ERREUR sur le join:', errorJoin);
  } else if (!contratAvecProfil) {
    console.error('❌ Contrat non trouvé avec join');
  } else {
    console.log('✅ Contrat avec profil:', contratAvecProfil);
    if (!contratAvecProfil.profil) {
      console.error('⚠️  PROBLÈME : profil est null ! (RLS bloque l\'accès)');
    } else {
      console.log('   - Profil:', contratAvecProfil.profil);
    }
  }
  console.log('');

  // ============================================================
  // TEST 3 : Requête EXACTE du code (sans filtre profil.statut)
  // ============================================================
  console.log('🔎 TEST 3 : Requête EXACTE du code (sans .neq sur profil)');
  console.log('──────────────────────────────────────────────────────────');

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 30);

  console.log('   Dates calculées (JS) :');
  console.log('   - today:', today.toISOString());
  console.log('   - today (formaté):', today.toISOString().split('T')[0]);
  console.log('   - futureDate (formaté):', futureDate.toISOString().split('T')[0]);
  console.log('');

  const { data: contratsData, error: errorContrats } = await supabase
    .from('contrat')
    .select(`
      id,
      profil_id,
      date_fin,
      type,
      statut,
      profil:profil_id(prenom, nom, email, statut)
    `)
    .eq('statut', 'actif')
    .gte('date_fin', today.toISOString().split('T')[0])
    .lte('date_fin', futureDate.toISOString().split('T')[0]);

  if (errorContrats) {
    console.error('❌ ERREUR sur la requête contrats:', errorContrats);
  } else {
    console.log(`✅ ${contratsData?.length || 0} contrats récupérés`);

    // Chercher Ama
    const amaContrat = contratsData?.find(c => c.profil_id === AMA_PROFIL_ID);

    if (amaContrat) {
      console.log('✅ Ama TROUVÉE dans les résultats !');
      console.log('   Contrat Ama:', amaContrat);

      if (!amaContrat.profil) {
        console.error('⚠️  PROBLÈME : profil d\'Ama est null !');
        console.error('   → Le RLS bloque l\'accès au profil');
      } else {
        console.log('   Profil Ama accessible:', amaContrat.profil);
      }
    } else {
      console.error('❌ Ama NON TROUVÉE dans les résultats');
      console.log('   Contrats récupérés:', contratsData);
    }

    // Vérifier les profils null
    const contratsProfilNull = contratsData?.filter(c => !c.profil) || [];
    if (contratsProfilNull.length > 0) {
      console.warn(`⚠️  ${contratsProfilNull.length} contrat(s) ont profil = null :`);
      contratsProfilNull.forEach(c => {
        console.log(`   - ${c.id} (profil_id: ${c.profil_id})`);
      });
    }
  }
  console.log('');

  // ============================================================
  // TEST 4 : Requête AVEC le filtre .neq('profil.statut')
  // ============================================================
  console.log('🔎 TEST 4 : Requête AVEC .neq("profil.statut", "inactif")');
  console.log('───────────────────────────────────────────────────────────');

  const { data: contratsDataFiltre, error: errorContratsFiltre } = await supabase
    .from('contrat')
    .select(`
      id,
      profil_id,
      date_fin,
      type,
      statut,
      profil:profil_id(prenom, nom, email, statut)
    `)
    .eq('statut', 'actif')
    .gte('date_fin', today.toISOString().split('T')[0])
    .lte('date_fin', futureDate.toISOString().split('T')[0])
    .neq('profil.statut', 'inactif');

  if (errorContratsFiltre) {
    console.error('❌ ERREUR sur la requête avec filtre:', errorContratsFiltre);
  } else {
    console.log(`✅ ${contratsDataFiltre?.length || 0} contrats récupérés (avec filtre)`);

    const amaContratFiltre = contratsDataFiltre?.find(c => c.profil_id === AMA_PROFIL_ID);

    if (amaContratFiltre) {
      console.log('✅ Ama TROUVÉE avec le filtre .neq()');
    } else {
      console.error('❌ Ama DISPARUE avec le filtre .neq() !');
      console.error('   → Le filtre .neq("profil.statut") cause le problème');
    }

    // Comparaison
    const diff = (contratsData?.length || 0) - (contratsDataFiltre?.length || 0);
    if (diff !== 0) {
      console.warn(`⚠️  Différence de ${diff} contrat(s) entre les deux requêtes`);
    }
  }
  console.log('');

  // ============================================================
  // TEST 5 : Vérifier les notifications existantes
  // ============================================================
  console.log('📬 TEST 5 : Notifications existantes pour Ama');
  console.log('──────────────────────────────────────────────');

  const { data: notifAma, error: errorNotif } = await supabase
    .from('notification')
    .select('*')
    .eq('profil_id', AMA_PROFIL_ID);

  if (errorNotif) {
    console.error('❌ ERREUR:', errorNotif);
  } else if (!notifAma || notifAma.length === 0) {
    console.log('ℹ️  Aucune notification dans la table notification');
  } else {
    console.log(`✅ ${notifAma.length} notification(s) trouvée(s):`, notifAma);
  }
  console.log('');

  // ============================================================
  // TEST 6 : Vue v_notifications_ui
  // ============================================================
  console.log('📋 TEST 6 : Vue v_notifications_ui pour Ama');
  console.log('───────────────────────────────────────────────');

  const { data: vueNotifAma, error: errorVue } = await supabase
    .from('v_notifications_ui')
    .select('*')
    .eq('profil_id', AMA_PROFIL_ID);

  if (errorVue) {
    console.error('❌ ERREUR:', errorVue);
  } else if (!vueNotifAma || vueNotifAma.length === 0) {
    console.log('ℹ️  Aucune notification dans v_notifications_ui');
  } else {
    console.log(`✅ ${vueNotifAma.length} notification(s) dans la vue:`, vueNotifAma);
  }
  console.log('');

  // ============================================================
  // RÉSUMÉ
  // ============================================================
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 RÉSUMÉ DU DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const results = {
    'Contrat accessible': !!contratAma,
    'Profil accessible via join': !!(contratAvecProfil?.profil),
    'Ama dans requête sans filtre': !!(contratsData?.find(c => c.profil_id === AMA_PROFIL_ID)),
    'Ama dans requête avec .neq()': !!(contratsDataFiltre?.find(c => c.profil_id === AMA_PROFIL_ID)),
    'Notifications existantes': (notifAma?.length || 0) > 0,
  };

  Object.entries(results).forEach(([test, success]) => {
    const icon = success ? '✅' : '❌';
    console.log(`${icon} ${test}`);
  });

  console.log('');
  console.log('🔍 DIAGNOSTIC :');

  if (!results['Contrat accessible']) {
    console.error('🚨 PROBLÈME RLS : Le contrat n\'est pas accessible');
  } else if (!results['Profil accessible via join']) {
    console.error('🚨 PROBLÈME RLS : Le profil n\'est pas accessible via join');
    console.error('   → Les RLS sur la table "profil" bloquent l\'accès');
  } else if (!results['Ama dans requête avec .neq()']) {
    console.error('🚨 PROBLÈME FILTRE : .neq("profil.statut", "inactif") élimine Ama');
    console.error('   → Ce filtre ne fonctionne pas correctement avec Supabase');
  } else if (results['Ama dans requête sans filtre']) {
    console.log('✅ Ama devrait apparaître dans les notifications');
    console.log('   → Vérifier les logs dans fetchNotifications()');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
})();
