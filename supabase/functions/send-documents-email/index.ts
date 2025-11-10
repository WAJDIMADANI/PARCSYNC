/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentInfo {
  type: string;
  label: string;
  url: string;
}

interface RequestPayload {
  employeeEmail: string;
  employeeName: string;
  documents: DocumentInfo[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { employeeEmail, employeeName, documents }: RequestPayload = await req.json();

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    if (!documents || documents.length === 0) {
      throw new Error("Aucun document à envoyer");
    }

    // Générer la liste HTML des documents
    const documentsList = documents.map(doc => `
      <div style="margin: 10px 0; padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #1e40af;">📄 ${doc.label}</p>
        <a href="${doc.url}" style="display: inline-block; margin-top: 8px; color: #2563eb; text-decoration: none; font-weight: 500;">
          🔗 Télécharger ce document
        </a>
      </div>
    `).join('');

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
        subject: `Vos documents - ${documents.length} document${documents.length > 1 ? 's' : ''} disponible${documents.length > 1 ? 's' : ''}`,
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
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📁 Vos documents</h1>
                </div>
                <div class="content">
                  <p>Bonjour ${employeeName},</p>

                  <p>Vous trouverez ci-dessous ${documents.length === 1 ? 'le document que vous avez demandé' : `les ${documents.length} documents que vous avez demandés`} :</p>

                  ${documentsList}

                  <p style="margin-top: 30px;">Cliquez sur les liens pour télécharger vos documents. Ces liens sont sécurisés et accessibles uniquement par vous.</p>

                  <p style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                    <strong>💡 Conseil :</strong> Nous vous recommandons de sauvegarder ces documents dans un endroit sûr sur votre ordinateur ou votre cloud personnel.
                  </p>

                  <p style="margin-top: 30px;">Si vous avez des questions ou besoin d'aide, n'hésitez pas à nous contacter.</p>

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
    console.error("Error sending documents email:", error);
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
