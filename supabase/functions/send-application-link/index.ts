import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestPayload {
  candidateEmail: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { candidateEmail }: RequestPayload = await req.json();

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const APP_URL = Deno.env.get("APP_URL") || "http://localhost:5173";

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const applicationLink = `${APP_URL}/apply`;

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
          },
        ],
        subject: "Postulez chez TRANSPORT CLASSE AFFAIRE - Formulaire de candidature",
        tags: ["application"],
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
                  <h1>🚀 Rejoignez <span style="color: #FFA500;">TRANSPORT</span> <span style="color: #4A90E2;">CLASSE AFFAIRE</span></h1>
                </div>
                <div class="content">
                  <p>Bonjour,</p>

                  <p>Nous vous invitons à postuler chez <strong><span style="color: #FFA500;">TRANSPORT</span> <span style="color: #4A90E2;">CLASSE AFFAIRE</span></strong> !</p>

                  <p>Pour soumettre votre candidature, cliquez sur le bouton ci-dessous et remplissez le formulaire :</p>

                  <div style="text-align: center;">
                    <a href="${applicationLink}" class="button">Postuler maintenant</a>
                  </div>

                  <p style="text-align: center; margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 6px; font-family: monospace; font-size: 14px; word-break: break-all;">
                    Ou copiez ce lien : ${applicationLink}
                  </p>

                  <p><strong>Informations à préparer :</strong></p>
                  <ul>
                    <li>📄 Vos documents d'identité<br/>(carte d'identité, carte vitale, permis de conduire)</li>
                  </ul>

                  <p>Le formulaire ne prend que quelques minutes à compléter.</p>

                  <p>Nous avons hâte de recevoir votre candidature !</p>

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
