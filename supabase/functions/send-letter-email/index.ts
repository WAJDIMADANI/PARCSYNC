import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const {
      letterId,
      recipientEmail,
      recipientName,
      subject,
      pdfUrl,
      additionalMessage
    } = await req.json();

    if (!letterId || !recipientEmail || !subject || !pdfUrl) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Envoi d'email à:", recipientEmail);
    console.log("Objet:", subject);
    console.log("PDF URL:", pdfUrl);

    // Créer le contenu HTML de l'email avec le lien de téléchargement
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .document-box { margin: 10px 0; padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; }
            .download-link { display: inline-block; margin-top: 8px; color: #2563eb; text-decoration: none; font-weight: 500; }
            .message-box { margin-top: 20px; padding: 15px; background-color: #fff; border: 1px solid #e5e7eb; border-radius: 4px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 ${subject}</h1>
            </div>
            <div class="content">
              <p>Bonjour ${recipientName},</p>

              <p>Vous trouverez ci-dessous le courrier concernant : <strong>${subject}</strong></p>

              <div class="document-box">
                <p style="margin: 0; font-weight: bold; color: #1e40af;">📄 ${subject}</p>
                <a href="${pdfUrl}" class="download-link">
                  🔗 Télécharger le courrier (PDF)
                </a>
              </div>

              ${additionalMessage ? `
              <div class="message-box">
                <p style="margin: 0; font-weight: bold; color: #374151; margin-bottom: 8px;">Message du service RH :</p>
                <p style="margin: 0; color: #4b5563;">${additionalMessage}</p>
              </div>
              ` : ''}

              <p style="margin-top: 30px;">Cliquez sur le lien pour télécharger votre courrier. Ce lien est sécurisé et accessible uniquement par vous.</p>

              <p style="margin-top: 20px;">Si vous avez des questions ou besoin d'aide, n'hésitez pas à nous contacter.</p>

              <p style="margin-top: 30px;">Cordialement,<br>
              <strong>PARC SYNC - Service des Ressources Humaines</strong></p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Envoyer l'email via Brevo
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
            email: recipientEmail,
            name: recipientName,
          },
        ],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.text();
      throw new Error(`Erreur Brevo API: ${brevoResponse.status} - ${errorData}`);
    }

    const brevoResult = await brevoResponse.json();
    console.log("Email envoyé avec succès via Brevo, messageId:", brevoResult.messageId);

    // Mettre à jour le courrier uniquement si l'envoi a réussi
    const { error: updateError } = await supabase
      .from("courrier_genere")
      .update({
        status: "envoye",
        sent_to: recipientEmail,
        sent_at: new Date().toISOString(),
      })
      .eq("id", letterId);

    if (updateError) {
      console.error("Erreur mise à jour:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email envoyé avec succès",
        messageId: brevoResult.messageId,
        details: {
          to: recipientEmail,
          subject: subject,
          sentAt: new Date().toISOString()
        }
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Erreur dans send-letter-email:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Erreur lors de l'envoi de l'email",
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
