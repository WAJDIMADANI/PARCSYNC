import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DemandeConfirmationRequest {
  email: string;
  prenom: string;
  sujet: string;
  poleNom: string;
  createdAt: string;
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
      throw new Error("BREVO_API_KEY not configured");
    }

    const { email, prenom, sujet, poleNom, createdAt }: DemandeConfirmationRequest = await req.json();

    // Formater la date
    const date = new Date(createdAt);
    const formattedDate = date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Préparer le contenu de l'email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; color: #555; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">TCA Transport</h1>
            <p style="margin: 10px 0 0 0;">Confirmation de demande</p>
          </div>
          <div class="content">
            <p>Bonjour ${prenom},</p>
            <p>Nous avons bien reçu votre demande.</p>

            <div class="info-box">
              <div class="info-row">
                <span class="label">Sujet:</span> ${sujet}
              </div>
              <div class="info-row">
                <span class="label">Pôle:</span> ${poleNom}
              </div>
              <div class="info-row">
                <span class="label">Date:</span> ${formattedDate}
              </div>
            </div>

            <p>Notre équipe va l'examiner rapidement et vous tiendra informé de son traitement.</p>

            <div class="footer">
              <p>Cordialement,<br><strong>L'équipe TCA</strong></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Envoyer l'email via Brevo
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "TCA Transport",
          email: "noreply@tca-transport.com",
        },
        to: [
          {
            email: email,
            name: prenom,
          },
        ],
        subject: "Demande reçue - TCA Transport",
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Brevo API error:", errorData);
      throw new Error(`Brevo API error: ${response.status}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.messageId,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send confirmation email",
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
