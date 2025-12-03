const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestPayload {
  employeeEmail: string;
  employeeName: string;
  contractId: string;
  variables: {
    poste: string;
    salaire: string;
    date_debut?: string;
    [key: string]: any;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { employeeEmail, employeeName, contractId, variables }: RequestPayload = await req.json();

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    console.log("Step 1: Downloading signed contract from Yousign...");

    const downloadResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/download-signed-contract`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ contractId })
      }
    );

    if (!downloadResponse.ok) {
      const errorData = await downloadResponse.text();
      throw new Error(`Failed to download signed contract: ${errorData}`);
    }

    const downloadResult = await downloadResponse.json();

    if (!downloadResult.success) {
      throw new Error(`Failed to download signed contract: ${downloadResult.error}`);
    }

    console.log("Step 2: Retrieving contract with storage path...");

    const contractResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=fichier_signe_url`,
      {
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );

    if (!contractResponse.ok) {
      throw new Error("Failed to retrieve contract");
    }

    const contracts = await contractResponse.json();
    const contract = contracts[0];

    if (!contract || !contract.fichier_signe_url) {
      throw new Error("Contract file not found in storage");
    }

    console.log("Step 3: Building public storage URL...");

    const pdfDownloadLink = `${SUPABASE_URL}/storage/v1/object/public/documents/${contract.fichier_signe_url}`;

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "PARC SYNC",
          email: "pierre.chopar12@gmail.com",
        },
        to: [
          {
            email: employeeEmail,
            name: employeeName,
          },
        ],
        subject: "Votre contrat de travail",
        htmlContent: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                .info-box { background-color: #e0f2fe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📄 Votre contrat de travail</h1>
                </div>
                <div class="content">
                  <p>Bonjour ${employeeName},</p>

                  <p>Votre contrat de travail signé est prêt ! Vous trouverez ci-dessous les informations principales :</p>

                  <div class="info-box">
                    <p><strong>📋 Poste :</strong> ${variables.poste}</p>
                    <p><strong>💰 Salaire brut mensuel :</strong> ${variables.salaire}</p>
                    ${variables.date_debut ? `<p><strong>📅 Date de début :</strong> ${new Date(variables.date_debut).toLocaleDateString('fr-FR')}</p>` : ''}
                  </div>

                  <p><strong>Action à faire :</strong></p>
                  <p>Téléchargez votre contrat signé en cliquant sur le bouton ci-dessous.</p>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${pdfDownloadLink}" class="button">📄 Télécharger le contrat (PDF)</a>
                  </div>

                  <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>

                  <p>Cordialement,<br>
                  <strong>L'équipe PARC SYNC</strong></p>
                </div>
                <div class="footer">
                  <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.text();
      throw new Error(`Brevo API error: ${brevoResponse.status} - ${errorData}`);
    }

    const result = await brevoResponse.json();

    console.log("Email sent successfully with signed contract PDF link");

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.messageId,
        pdfUrl: pdfDownloadLink
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending contract PDF email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
