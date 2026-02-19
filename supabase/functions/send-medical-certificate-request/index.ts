import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestPayload {
  contractId: string;
  employeeEmail: string;
  employeeName: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { contractId, employeeEmail, employeeName }: RequestPayload = await req.json();

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const APP_URL = Deno.env.get("APP_URL") || "http://localhost:5173";

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const uploadLink = `${APP_URL}/upload-medical-certificate?contract=${contractId}`;

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "TRANSPORT CLASSE AFFAIRE",
          email: "pierre.chopar12@gmail.com",
        },
        to: [
          {
            email: employeeEmail,
            name: employeeName,
          },
        ],
        subject: "📋 Visite médicale obligatoire requise - TRANSPORT CLASSE AFFAIRE",
        htmlContent: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #8b5cf6; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background-color: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                .info-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📋 Visite médicale obligatoire requise</h1>
                </div>
                <div class="content">
                  <p>Bonjour ${employeeName},</p>

                  <p>Nous avons besoin de votre <strong>visite médicale obligatoire (médecin agréé préfecture)</strong> pour finaliser votre dossier d'embauche.</p>

                  <div class="info-box">
                    <strong>📌 Document requis :</strong><br>
                    Visite médicale obligatoire (médecin agréé préfecture) de moins de 3 mois attestant que vous êtes apte à exercer votre fonction.
                  </div>

                  <p>Vous pouvez télécharger ce document en cliquant sur le bouton ci-dessous :</p>

                  <div style="text-align: center;">
                    <a href="${uploadLink}" class="button">📤 Télécharger ma visite médicale obligatoire</a>
                  </div>

                  <p><strong>Formats acceptés :</strong></p>
                  <ul>
                    <li>📄 PDF</li>
                    <li>🖼️ Images (JPG, PNG)</li>
                    <li>📏 Taille maximale : 10 Mo</li>
                  </ul>

                  <p>Une fois le document téléchargé, votre dossier sera complet et nous pourrons finaliser votre embauche.</p>

                  <p>Si vous avez des questions ou besoin d'aide, n'hésitez pas à nous contacter.</p>

                  <p>Cordialement,<br>
                  <strong>L'équipe <span style="color: #FFA500;">TRANSPORT</span> <span style="color: #4A90E2;">CLASSE AFFAIRE</span></strong></p>
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

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending medical certificate request email:", error);
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
