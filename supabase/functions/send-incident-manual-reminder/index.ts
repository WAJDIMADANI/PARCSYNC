import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  incident_id: string;
  profil_id: string;
  employee_email: string;
  employee_name: string;
  document_type: string;
  expiration_date: string;
  user_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const {
      incident_id,
      profil_id,
      employee_email,
      employee_name,
      document_type,
      expiration_date,
      user_id
    }: RequestPayload = await req.json();

    if (!incident_id || !employee_email || !employee_name || !document_type) {
      return new Response(
        JSON.stringify({ error: "Données manquantes (incident_id, email, nom, type)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const expDate = new Date(expiration_date);
    const today = new Date();
    const daysSinceExpiration = Math.ceil((today.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24));

    const documentLabel = getDocumentLabel(document_type);
    const subject = `Rappel urgent: Renouvellement de votre ${documentLabel}`;
    const emailBody = getEmailBody(employee_name, documentLabel, expDate.toLocaleDateString('fr-FR'), daysSinceExpiration);

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "ParcSync - RH",
          email: "noreply@parcsync.com",
        },
        to: [
          {
            email: employee_email,
            name: employee_name,
          },
        ],
        subject: subject,
        htmlContent: emailBody,
      }),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error("Erreur Brevo:", errorText);
      throw new Error(`Erreur Brevo: ${errorText}`);
    }

    const result = await brevoResponse.json();
    console.log("Email envoyé avec succès:", result);

    await supabase.from("incident_historique").insert({
      incident_id: incident_id,
      action: "email_envoye",
      notes: `Rappel manuel envoyé à ${employee_email}`,
      metadata: {
        type: "manuel",
        email: employee_email,
        days_since_expiration: daysSinceExpiration,
        brevo_message_id: result.messageId,
        sent_by_user_id: user_id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Rappel envoyé avec succès",
        messageId: result.messageId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending incident reminder:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erreur lors de l'envoi du rappel",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getDocumentLabel(type: string): string {
  switch (type) {
    case "titre_sejour":
      return "Titre de séjour";
    case "visite_medicale":
      return "Visite médicale";
    case "permis_conduire":
      return "Permis de conduire";
    case "contrat_cdd":
      return "Contrat CDD";
    default:
      return type;
  }
}

function getEmailBody(
  employeeName: string,
  documentLabel: string,
  expirationDate: string,
  daysSince: number
): string {
  const urgencyClass = daysSince > 30 ? "critical" : daysSince > 7 ? "urgent" : "recent";
  const urgencyColor = daysSince > 30 ? "#dc2626" : daysSince > 7 ? "#ea580c" : "#ca8a04";
  const urgencyText = daysSince > 30 ? "CRITIQUE" : daysSince > 7 ? "URGENT" : "ATTENTION";

  let specificMessage = "";
  if (documentLabel.includes("médicale")) {
    specificMessage = "Votre certificat médical doit être renouvelé pour garantir votre aptitude au poste. Merci de prendre rendez-vous avec un médecin du travail dans les plus brefs délais.";
  } else if (documentLabel.includes("séjour")) {
    specificMessage = "Le renouvellement de votre titre de séjour est essentiel pour la conformité de votre dossier administratif. Merci de nous transmettre votre nouveau titre dès son obtention.";
  } else if (documentLabel.includes("permis")) {
    specificMessage = "Votre permis de conduire doit être à jour pour exercer vos fonctions. Merci de nous fournir une copie de votre permis renouvelé.";
  } else if (documentLabel.includes("Contrat")) {
    specificMessage = "Votre contrat CDD arrive à échéance. Merci de prendre contact avec le service RH pour discuter du renouvellement.";
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
          }
          .urgency-badge {
            display: inline-block;
            background: white;
            color: ${urgencyColor};
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            margin-top: 10px;
          }
          .content {
            padding: 30px;
          }
          .alert-box {
            background: #fee2e2;
            border-left: 4px solid #dc2626;
            padding: 20px;
            margin: 20px 0;
            border-radius: 6px;
          }
          .alert-box strong {
            color: #991b1b;
            font-size: 16px;
          }
          .info-box {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: bold;
            color: #4b5563;
          }
          .info-value {
            color: #1f2937;
          }
          .action-section {
            background: #eff6ff;
            border: 2px solid #3b82f6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
          .action-section strong {
            color: #1e40af;
            font-size: 16px;
          }
          .footer {
            background: #f9fafb;
            padding: 20px;
            text-align: center;
            font-size: 13px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Rappel Document Expiré</h1>
            <span class="urgency-badge">${urgencyText}</span>
          </div>

          <div class="content">
            <p>Bonjour <strong>${employeeName}</strong>,</p>

            <div class="alert-box">
              <strong>📋 Document concerné : ${documentLabel}</strong><br>
              <p style="margin: 10px 0 0 0;">Ce document est expiré depuis <strong style="color: #dc2626;">${daysSince} jour${daysSince > 1 ? 's' : ''}</strong>.</p>
            </div>

            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Type de document :</span>
                <span class="info-value">${documentLabel}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date d'expiration :</span>
                <span class="info-value">${expirationDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Jours depuis expiration :</span>
                <span class="info-value" style="color: ${urgencyColor}; font-weight: bold;">${daysSince} jour${daysSince > 1 ? 's' : ''}</span>
              </div>
            </div>

            <p>${specificMessage}</p>

            <div class="action-section">
              <strong>📞 Action requise</strong>
              <p style="margin: 10px 0 0 0;">
                Merci de prendre contact avec le service RH dans les meilleurs délais pour régulariser votre situation.
              </p>
            </div>

            <p>Si vous avez déjà transmis le document renouvelé, merci de ne pas tenir compte de ce message.</p>

            <p>Pour toute question, n'hésitez pas à contacter le service RH.</p>

            <p style="margin-top: 30px;">
              Cordialement,<br>
              <strong>Le service RH - ParcSync</strong>
            </p>
          </div>

          <div class="footer">
            <p>Cet email a été envoyé automatiquement par le système de gestion RH.</p>
            <p>Merci de ne pas répondre directement à cet email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
