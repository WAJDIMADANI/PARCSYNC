/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Fonction helper pour formater les dates au format DD-MM-YYYY
function formatDateDDMMYYYY(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    return dateStr;
  }
}

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
    const APP_URL = Deno.env.get("APP_URL") || "http://localhost:5173";

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const contractSignatureLink = `${APP_URL}/contract-signature?contrat=${contractId}`;
    const pdfDownloadLink = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-contract-pdf?contractId=${contractId}`;

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
        subject: "Votre contrat de travail - Signature requise",
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
                .button { display: inline-block; background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                .info-box { background-color: #e0f2fe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .warning-box { background-color: #dc2626; color: white; padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center; border: 4px solid #991b1b; font-weight: bold; }
                .warning-box .main-text { font-size: 22px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
                .warning-box .sub-text { font-size: 16px; margin-top: 10px; }
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

                  <div class="warning-box">
                    <div class="main-text">⚠️ ATTENTION : CE LIEN N'EST VALABLE QUE 7 JOURS ⚠️</div>
                    <div class="sub-text">Vous devez signer votre contrat dans les 7 jours suivant la réception de cet email, sinon le lien de signature électronique expirera.</div>
                  </div>

                  <p>Votre contrat de travail est prêt ! Vous trouverez ci-dessous les informations principales :</p>

                  <div class="info-box">
                    <p><strong>📋 Poste :</strong> ${variables.poste}</p>
                    <p><strong>💰 Salaire brut mensuel :</strong> ${variables.salaire}</p>
                    ${variables.date_debut ? `<p><strong>📅 Date de début :</strong> ${formatDateDDMMYYYY(variables.date_debut)}</p>` : ''}
                  </div>

                  <p><strong>⚠️ Actions requises :</strong></p>
                  <ol>
                    <li><span style="color: #dc2626; font-weight: bold; font-size: 16px;">SIGNER DANS LES 7 JOURS (délai impératif)</span></li>
                    <li>Télécharger et lire attentivement votre contrat en PDF</li>
                    <li>Signer électroniquement le contrat</li>
                    <li>Effectuer votre visite médicale obligatoire (médecin agréé préfecture)</li>
                  </ol>

                  <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #dc2626; font-weight: bold; font-size: 18px; margin-bottom: 20px; text-transform: uppercase;">⏰ À SIGNER DANS LES 7 JOURS ⏰</p>
                    <a href="${pdfDownloadLink}" class="button" style="background-color: #dc2626; margin-bottom: 10px; display: inline-block;">📄 Télécharger le contrat (PDF)</a>
                    <br>
                    <a href="${contractSignatureLink}" class="button">📝 Signer le contrat en ligne</a>
                    <p style="color: #dc2626; font-weight: bold; font-size: 16px; margin-top: 20px;">Lien de signature valable uniquement 7 jours après réception</p>
                  </div>

                  <p><strong>Important :</strong> Une fois votre contrat signé et votre visite médicale obligatoire effectuée, votre employeur finalisera votre dossier en effectuant la DPAE (Déclaration Préalable à l'Embauche).</p>

                  <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>

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
    console.error("Error sending contract email:", error);
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
