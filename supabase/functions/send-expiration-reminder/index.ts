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
    }: RequestBody = await req.json();

    if (!email || !notification_id) {
      return new Response(
        JSON.stringify({ error: "Email and notification_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "Email service not configured. Please contact administrator.",
          details: "RESEND_API_KEY is missing"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailData = {
      from: "RH <noreply@yourdomain.com>",
      to: [email],
      subject: subject,
      text: body,
      html: `
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
      `,
    };

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(emailData),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await resendResponse.json();

    console.log("Email sent successfully:", {
      notification_id,
      profil_id,
      email,
      type,
      resend_id: result.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        email_id: result.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-expiration-reminder:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send reminder email",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
