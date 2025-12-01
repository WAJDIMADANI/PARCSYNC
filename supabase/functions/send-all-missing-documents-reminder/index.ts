import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestPayload {
  profilId: string;
  employeeEmail: string;
  employeeName: string;
  missingDocuments: string[];
}

const documentLabels: Record<string, string> = {
  'permis_recto': 'Permis de conduire (Recto)',
  'permis_verso': 'Permis de conduire (Verso)',
  'cni_recto': 'Carte d\'identité (Recto)',
  'cni_verso': 'Carte d\'identité (Verso)',
  'carte_vitale': 'Carte vitale',
  'certificat_medical': 'Certificat médical',
  'rib': 'RIB',
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { profilId, employeeEmail, employeeName, missingDocuments }: RequestPayload = await req.json();

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const APP_URL = Deno.env.get("APP_URL") || "http://localhost:5173";

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const uploadLink = `${APP_URL}/upload-all-documents?profil=${profilId}`;

    const documentsList = missingDocuments
      .map(doc => `<li style="margin: 10px 0; padding: 10px; background-color: #fff; border-left: 4px solid #f97316; border-radius: 4px;"><strong>${documentLabels[doc] || doc}</strong></li>`)
      .join('');

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
        subject: "📋 Documents obligatoires manquants - PARC SYNC",
        htmlContent: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3); }
                .button:hover { box-shadow: 0 6px 8px rgba(249, 115, 22, 0.4); }
                .info-box { background-color: #fed7aa; border-left: 4px solid #f97316; padding: 15px; border-radius: 4px; margin: 20px 0; }
                .documents-list { background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #f97316; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                ul { list-style: none; padding: 0; }
                .camera-icon { font-size: 24px; margin-right: 8px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📋 Documents obligatoires manquants</h1>
                </div>
                <div class="content">
                  <p>Bonjour ${employeeName},</p>

                  <p>Votre dossier d'embauche nécessite encore quelques documents pour être complet.</p>

                  <div class="documents-list">
                    <h3 style="color: #f97316; margin-top: 0;">📄 Documents à télécharger :</h3>
                    <ul>
                      ${documentsList}
                    </ul>
                  </div>

                  <div class="info-box">
                    <strong>📱 Astuce mobile :</strong><br>
                    Sur votre téléphone, vous pourrez activer votre caméra pour prendre vos documents en photo directement !
                  </div>

                  <p>Cliquez sur le bouton ci-dessous pour accéder à la page de téléchargement :</p>

                  <div style="text-align: center;">
                    <a href="${uploadLink}" class="button">
                      <span class="camera-icon">📸</span>
                      Télécharger mes documents
                    </a>
                  </div>

                  <p><strong>Formats acceptés :</strong></p>
                  <ul style="list-style: disc; padding-left: 20px;">
                    <li>📄 PDF</li>
                    <li>🖼️ Images (JPG, PNG)</li>
                    <li>📏 Taille maximale : 10 Mo par fichier</li>
                  </ul>

                  <p><strong>Sur mobile :</strong> Vous pourrez utiliser votre caméra pour photographier vos documents directement depuis la page de téléchargement.</p>

                  <p>Une fois tous les documents téléchargés, votre dossier sera complet et nous pourrons finaliser votre embauche.</p>

                  <p>Si vous avez des questions ou besoin d'aide, n'hésitez pas à nous contacter.</p>

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
      JSON.stringify({ 
        success: true, 
        messageId: result.messageId,
        uploadLink: uploadLink
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending missing documents reminder email:", error);
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
