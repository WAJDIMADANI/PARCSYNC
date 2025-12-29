import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  notification_id: string;
  profil_id: string;
  email: string;
  prenom: string;
  nom: string;
  type: string;
  date_echeance: string;
  subject: string;
  body: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("📧 [send-expiration-reminder] Starting email send process");

    const requestBody: RequestBody = await req.json();
    const {
      notification_id,
      profil_id,
      email,
      prenom,
      nom,
      type,
      date_echeance,
      subject,
      body,
    } = requestBody;

    console.log("📋 [send-expiration-reminder] Request data:", {
      notification_id,
      profil_id,
      email,
      type,
      date_echeance
    });

    if (!email || !notification_id) {
      console.error("❌ [send-expiration-reminder] Missing required fields");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email and notification_id are required",
          notification_id,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    if (!brevoApiKey) {
      console.error("❌ [send-expiration-reminder] BREVO_API_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured. Please contact administrator.",
          details: "BREVO_API_KEY is missing",
          notification_id,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Rappel Document</h1>
        </div>

        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
            ${body.replace(/\n/g, '<br>')}
          </p>

          <div style="margin-top: 30px; padding: 20px; background: white; border-left: 4px solid #ef4444; border-radius: 5px;">
            <p style="margin: 0; color: #991b1b; font-weight: bold;">⚠️ Date d'échéance: ${new Date(date_echeance).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        <div style="margin-top: 20px; padding: 20px; background: #f3f4f6; border-radius: 10px; text-align: center;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Cet email a été envoyé automatiquement par le système RH.
          </p>
        </div>
      </div>
    `;

    const brevoPayload = {
      sender: {
        name: "RH",
        email: "noreply@yourdomain.com"
      },
      to: [
        {
          email: email,
          name: `${prenom} ${nom}`
        }
      ],
      subject: subject,
      htmlContent: htmlContent,
      textContent: body,
    };

    console.log("📤 [send-expiration-reminder] Sending email via Brevo to:", email);

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    const responseText = await brevoResponse.text();
    console.log("📨 [send-expiration-reminder] Brevo API response status:", brevoResponse.status);
    console.log("📨 [send-expiration-reminder] Brevo API response:", responseText);

    if (!brevoResponse.ok) {
      console.error("❌ [send-expiration-reminder] Brevo API error:", {
        status: brevoResponse.status,
        response: responseText
      });

      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch {
        errorDetails = { message: responseText };
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send email via Brevo",
          details: errorDetails,
          status: brevoResponse.status,
          notification_id,
        }),
        {
          status: brevoResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { messageId: "unknown" };
    }

    console.log("✅ [send-expiration-reminder] Email sent successfully:", {
      notification_id,
      profil_id,
      email,
      type,
      brevo_message_id: result.messageId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully via Brevo",
        email_id: result.messageId,
        notification_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ [send-expiration-reminder] Unexpected error:", error);
    console.error("❌ [send-expiration-reminder] Error stack:", error.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send reminder email",
        details: error.stack || "No stack trace available",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
