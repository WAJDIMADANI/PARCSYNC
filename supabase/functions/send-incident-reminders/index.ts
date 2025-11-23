import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: incidents, error: incidentsError } = await supabase
      .from("incident")
      .select(`
        *,
        profil:profil_id (
          prenom,
          nom,
          email,
          manager_id,
          manager:manager_id (
            email
          )
        )
      `)
      .in("statut", ["actif", "en_cours"])
      .order("date_creation_incident", { ascending: true });

    if (incidentsError) throw incidentsError;

    if (!incidents || incidents.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active incidents found", count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: rhUsers, error: rhError } = await supabase
      .from("profil")
      .select("email")
      .eq("role", "rh");

    if (rhError) throw rhError;

    const rhEmails = rhUsers?.map((u) => u.email).filter(Boolean) || [];

    let emailsSent = 0;
    const results = [];

    for (const incident of incidents) {
      const createdDate = new Date(incident.date_creation_incident);
      const today = new Date();
      const daysSinceCreation = Math.ceil(
        (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const shouldSendReminder =
        daysSinceCreation === 7 ||
        daysSinceCreation === 14 ||
        (daysSinceCreation > 14 && daysSinceCreation % 7 === 0);

      if (!shouldSendReminder) continue;

      const recipients = [];

      if (incident.profil?.email) {
        recipients.push({
          email: incident.profil.email,
          type: "employee",
          name: `${incident.profil.prenom} ${incident.profil.nom}`,
        });
      }

      if (incident.profil?.manager?.email) {
        recipients.push({
          email: incident.profil.manager.email,
          type: "manager",
          name: "Manager",
        });
      }

      rhEmails.forEach((email) => {
        recipients.push({
          email,
          type: "rh",
          name: "RH",
        });
      });

      const documentLabel = getDocumentLabel(incident.type);
      const expirationDate = new Date(incident.date_expiration_originale).toLocaleDateString("fr-FR");

      for (const recipient of recipients) {
        const subject = getEmailSubject(recipient.type, documentLabel, incident.profil?.prenom || "");
        const body = getEmailBody(
          recipient.type,
          incident.profil?.prenom || "",
          incident.profil?.nom || "",
          documentLabel,
          expirationDate,
          daysSinceCreation,
          incident.id,
          incident.statut
        );

        console.log(`Sending reminder to ${recipient.email} (${recipient.type})`);

        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send email to ${recipient.email}:`, emailError);
        }
      }

      await supabase.from("incident_historique").insert({
        incident_id: incident.id,
        action: "email_envoye",
        notes: `Rappel automatique envoyé après ${daysSinceCreation} jours`,
        metadata: {
          recipients_count: recipients.length,
          days_since_creation: daysSinceCreation,
        },
      });

      results.push({
        incident_id: incident.id,
        profil: `${incident.profil?.prenom} ${incident.profil?.nom}`,
        emails_sent: recipients.length,
        days_since_creation: daysSinceCreation,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        incidents_processed: results.length,
        emails_sent: emailsSent,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
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

function getEmailSubject(recipientType: string, documentLabel: string, prenom: string): string {
  if (recipientType === "employee") {
    return `Rappel urgent: Renouvellement de votre ${documentLabel}`;
  } else if (recipientType === "manager") {
    return `Action requise: ${documentLabel} expiré - ${prenom}`;
  } else {
    return `Incident non résolu: ${documentLabel} expiré - ${prenom}`;
  }
}

function getEmailBody(
  recipientType: string,
  prenom: string,
  nom: string,
  documentLabel: string,
  expirationDate: string,
  daysSince: number,
  incidentId: string,
  statut: string
): string {
  if (recipientType === "employee") {
    return `Bonjour ${prenom},

Nous vous rappelons que votre ${documentLabel} est expiré depuis ${daysSince} jours (date d'expiration: ${expirationDate}).

Pour assurer la continuité de votre dossier administratif, nous vous remercions de nous transmettre le document renouvelé dans les meilleurs délais.

Merci de prendre contact avec le service RH pour régulariser votre situation.

Cordialement,
Le service RH`;
  } else if (recipientType === "manager") {
    return `Bonjour,

Nous vous informons qu'un document important de votre collaborateur ${prenom} ${nom} est expiré depuis ${daysSince} jours.

Document concerné: ${documentLabel}
Date d'expiration: ${expirationDate}
Statut actuel: ${statut}

Merci de suivre ce dossier avec votre collaborateur et de vous assurer que le document soit renouvelé rapidement.

Cordialement,
Le service RH`;
  } else {
    return `Incident non résolu - Attention requise

Employé: ${prenom} ${nom}
Document: ${documentLabel}
Date d'expiration: ${expirationDate}
Jours depuis création: ${daysSince}
Statut: ${statut}
ID incident: ${incidentId}

Cet incident nécessite une action de votre part. Veuillez traiter ce dossier dans les meilleurs délais.

Accédez à la plateforme pour plus de détails et résoudre cet incident.

Cordialement,
Système de gestion RH`;
  }
}
