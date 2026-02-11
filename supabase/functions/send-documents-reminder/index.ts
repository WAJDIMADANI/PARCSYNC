import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { profilId, employeeName, employeeEmail, missingDocuments } = await req.json();

    console.log('Envoi email de relance:', { profilId, employeeName, employeeEmail, missingDocuments });

    if (!employeeEmail || !employeeName || !missingDocuments || missingDocuments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Données manquantes' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const documentList = missingDocuments.map((doc: string) => `<li style="margin-bottom: 8px;">${doc}</li>`).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e0e0e0;
              border-top: none;
              border-radius: 0 0 10px 10px;
            }
            .warning-box {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .document-list {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .document-list ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">Documents manquants</h1>
          </div>

          <div class="content">
            <p>Bonjour <strong>${employeeName}</strong>,</p>

            <div class="warning-box">
              <strong>⚠️ Action requise</strong><br>
              Nous avons constaté que certains documents nécessaires à votre dossier n'ont pas encore été fournis.
            </div>

            <p>Pour finaliser votre dossier, merci de nous transmettre les documents suivants :</p>

            <div class="document-list">
              <strong>Documents manquants :</strong>
              <ul>
                ${documentList}
              </ul>
            </div>

            <p>
              <strong>Important :</strong> Votre contrat ne pourra être envoyé tant que tous les documents requis n'auront pas été fournis.
            </p>

            <p>Si vous avez des questions ou rencontrez des difficultés, n'hésitez pas à nous contacter.</p>

            <p>Cordialement,<br>
            <strong>L'équipe RH</strong></p>
          </div>

          <div class="footer">
            <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
          </div>
        </body>
      </html>
    `;

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY || '',
      },
      body: JSON.stringify({
        sender: {
          name: 'ParcSync - RH',
          email: 'noreply@parcsync.com',
        },
        to: [
          {
            email: employeeEmail,
            name: employeeName,
          },
        ],
        subject: `Documents manquants - Action requise`,
        trackClicks: false,
        trackOpens: false,
        htmlContent: emailHtml,
      }),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error('Erreur Brevo:', errorText);
      throw new Error(`Erreur Brevo: ${errorText}`);
    }

    const result = await brevoResponse.json();
    console.log('Email envoyé avec succès:', result);

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
