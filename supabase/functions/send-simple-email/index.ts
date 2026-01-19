import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  mode: 'all' | 'selected';
  subject: string;
  message: string;
  profilIds?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY non configurée');
    }

    const payload: RequestPayload = await req.json();
    const { mode, subject, message, profilIds } = payload;

    if (!subject || !message) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Sujet et message requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration Supabase manquante');
    }

    let profils = [];

    if (mode === 'all') {
      const response = await fetch(`${supabaseUrl}/rest/v1/profil?select=id,nom,prenom,email&is_staff=eq.true&date_sortie=is.null&email=not.is.null`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur récupération des profils');
      }

      profils = await response.json();
    } else if (mode === 'selected' && profilIds && profilIds.length > 0) {
      const idsFilter = profilIds.map(id => `id.eq.${id}`).join(',');
      const response = await fetch(`${supabaseUrl}/rest/v1/profil?select=id,nom,prenom,email&or=(${idsFilter})`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur récupération des profils sélectionnés');
      }

      profils = await response.json();
    } else {
      return new Response(
        JSON.stringify({ ok: false, error: 'Aucun destinataire spécifié' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (profils.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Aucun destinataire valide trouvé' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const profil of profils) {
      if (!profil.email) {
        failureCount++;
        errors.push(`${profil.nom} ${profil.prenom}: pas d'email`);
        continue;
      }

      try {
        const emailPayload = {
          sender: {
            name: "MAD IMPACT",
            email: "noreply@mad-impact.com"
          },
          to: [
            {
              email: profil.email,
              name: `${profil.prenom} ${profil.nom}`
            }
          ],
          subject: subject,
          htmlContent: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <p>Bonjour ${profil.prenom} ${profil.nom},</p>
                <div style="white-space: pre-wrap; margin: 20px 0;">
                  ${message}
                </div>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 12px;">
                  Cordialement,<br>
                  L'équipe MAD IMPACT
                </p>
              </div>
            </body>
            </html>
          `,
          tags: ["crm"]
        };

        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });

        if (!brevoResponse.ok) {
          const errorText = await brevoResponse.text();
          throw new Error(`Erreur Brevo: ${errorText}`);
        }

        successCount++;

        await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            profil_id: profil.id,
            email_to: profil.email,
            subject: subject,
            sent_at: new Date().toISOString(),
            statut: 'envoyé',
            type_email: 'crm_simple'
          }),
        });
      } catch (error) {
        console.error(`Erreur envoi à ${profil.email}:`, error);
        failureCount++;
        errors.push(`${profil.nom} ${profil.prenom}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        successCount,
        failureCount,
        total: profils.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
