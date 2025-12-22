import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  email: string;
  nom: string;
  prenom: string;
  resetLink: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY manquante");
      return new Response(
        JSON.stringify({ error: "Configuration Brevo manquante" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json() as RequestBody;
    const { email, nom, prenom, resetLink } = body;

    if (!email || !resetLink) {
      return new Response(
        JSON.stringify({ error: "Email et lien de réinitialisation requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailContent = {
      sender: {
        name: "TCA",
        email: "noreply@madimpact.fr",
      },
      to: [
        {
          email: email,
          name: `${prenom} ${nom}`,
        },
      ],
      subject: "Invitation à rejoindre TCA",
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
              }
              .container {
                max-width: 600px;
                margin: 40px auto;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
              }
              .content {
                padding: 40px 30px;
              }
              .content h2 {
                color: #667eea;
                margin-top: 0;
                font-size: 22px;
              }
              .content p {
                margin: 16px 0;
                color: #555;
              }
              .button {
                display: inline-block;
                padding: 14px 32px;
                margin: 24px 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white !important;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                text-align: center;
              }
              .button:hover {
                opacity: 0.9;
              }
              .footer {
                background: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #e9ecef;
              }
              .info-box {
                background: #f8f9fa;
                border-left: 4px solid #667eea;
                padding: 16px;
                margin: 20px 0;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Bienvenue sur TCA</h1>
              </div>
              <div class="content">
                <h2>Bonjour ${prenom} ${nom},</h2>
                <p>Vous avez été invité(e) à rejoindre la plateforme <strong>TCA</strong>.</p>
                <p>Pour accéder à votre compte, vous devez d'abord définir votre mot de passe en cliquant sur le bouton ci-dessous :</p>

                <div style="text-align: center;">
                  <a href="${resetLink}" class="button">Définir mon mot de passe</a>
                </div>

                <div class="info-box">
                  <p style="margin: 0; font-size: 14px;">
                    <strong>⏰ Important :</strong> Ce lien expire dans 24 heures pour des raisons de sécurité.
                  </p>
                </div>

                <p>Une fois votre mot de passe défini, vous pourrez accéder à toutes les fonctionnalités de la plateforme.</p>

                <p style="margin-top: 32px; color: #666; font-size: 14px;">
                  Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email en toute sécurité.
                </p>
              </div>
              <div class="footer">
                <p style="margin: 0;">
                  Cordialement,<br>
                  <strong>L'équipe TCA</strong>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    console.log("Envoi email via Brevo à:", email);

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify(emailContent),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error("Erreur Brevo:", brevoResponse.status, errorText);
      throw new Error(`Erreur Brevo: ${brevoResponse.status} - ${errorText}`);
    }

    const result = await brevoResponse.json();
    console.log("Email envoyé avec succès:", result);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.messageId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erreur lors de l'envoi de l'email"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
