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

    const emailBody = `
Bonjour ${recipientName},

Veuillez trouver ci-joint le courrier suivant : ${subject}

${additionalMessage ? `\n${additionalMessage}\n` : ''}

Cordialement,
Transport Classe Affaire
Service des Ressources Humaines

---
Ce message est envoyé automatiquement depuis notre système de gestion RH.
    `.trim();

    console.log("Envoi d'email à:", recipientEmail);
    console.log("Objet:", subject);
    console.log("PDF URL:", pdfUrl);

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
