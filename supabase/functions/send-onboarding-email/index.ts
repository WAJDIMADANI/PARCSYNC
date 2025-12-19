import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestPayload {
  candidateEmail: string;
  candidateName: string;
  candidateId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { candidateEmail, candidateName, candidateId }: RequestPayload = await req.json();

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const APP_URL = Deno.env.get("APP_URL") || "http://localhost:5173";

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const onboardingLink = `${APP_URL}/onboarding?id=${candidateId}`;

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
            email: candidateEmail,
            name: candidateName,
          },
        ],
        subject: "Bienvenue chez TRANSPORT CLASSE AFFAIRE - Complétez votre dossier d'embauche",
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
                .button { display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Félicitations ${candidateName} !</h1>
                </div>
                <div class="content">
                  <p>Bonjour ${candidateName},</p>

                  <p>Nous sommes ravis de vous accueillir chez <strong><span style="color: #FFA500;">TRANSPORT</span> <span style="color: #4A90E2;">CLASSE AFFAIRE</span></strong> !</p>

                  <p>Pour finaliser votre embauche, merci de compléter votre dossier en cliquant sur le bouton ci-dessous :</p>

                  <div style="text-align: center;">
                    <a href="${onboardingLink}" class="button">Compléter mon dossier</a>
                  </div>

                  <p><strong>Informations à préparer :</strong></p>
                  <ul>
                    <li>📄 Votre pièce d'identité (carte d'identité ou passeport)</li>
                    <li>💳 Votre RIB (IBAN)</li>
                    <li>🔢 Votre numéro de sécurité sociale (NIR)</li>
                    <li>🚗 Votre permis de conduire</li>
                    <li>📋 Votre CV</li>
                  </ul>

                  <p>Une fois votre dossier complété, nous générerons votre contrat de travail et vous l'enverrons pour signature électronique.</p>

                  <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>

                  <p>À très bientôt,<br>
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
    console.error("Error sending email:", error);
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
