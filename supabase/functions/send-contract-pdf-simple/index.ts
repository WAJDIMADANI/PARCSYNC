import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const { contractId, employeeEmail, employeeName, variables } = await req.json();

    if (!contractId) {
      return new Response(JSON.stringify({
        error: "contractId required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    console.log("Downloading signed PDF for contract:", contractId);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const YOUSIGN_API_KEY = Deno.env.get("YOUSIGN_API_KEY");
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

    const contractResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=yousign_signature_request_id,profil_id,variables,profil:profil_id(prenom,nom,email)`,
      {
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": SUPABASE_SERVICE_ROLE_KEY
        }
      }
    );

    if (!contractResponse.ok) {
      return new Response(JSON.stringify({
        error: "Contract not found"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const contracts = await contractResponse.json();
    if (!contracts || contracts.length === 0) {
      return new Response(JSON.stringify({
        error: "Contract not found"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const contract = contracts[0];
    const signatureRequestId = contract.yousign_signature_request_id;
    const profilId = contract.profil_id;

    const finalEmployeeEmail = employeeEmail || contract.profil?.email;
    const finalEmployeeName = employeeName || `${contract.profil?.prenom || ''} ${contract.profil?.nom || ''}`.trim();
    const finalVariables = variables || contract.variables || {};

    if (!signatureRequestId) {
      return new Response(JSON.stringify({
        error: "No signature request ID"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    console.log("Signature request ID:", signatureRequestId);

    const srResponse = await fetch(
      `https://api.yousign.app/v3/signature_requests/${signatureRequestId}`,
      {
        headers: {
          "Authorization": `Bearer ${YOUSIGN_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!srResponse.ok) {
      const errText = await srResponse.text();
      console.error("Yousign API error:", errText);
      return new Response(JSON.stringify({
        error: "Failed to fetch signature request from Yousign"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const srData = await srResponse.json();
    const documents = srData.documents || [];

    if (documents.length === 0) {
      return new Response(JSON.stringify({
        error: "No documents found in signature request"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const documentId = documents[0].id;
    console.log("Document ID:", documentId);

    const downloadUrl = `https://api.yousign.app/v3/signature_requests/${signatureRequestId}/documents/${documentId}/download`;
    console.log("Downloading from:", downloadUrl);

    const pdfResponse = await fetch(downloadUrl, {
      headers: {
        "Authorization": `Bearer ${YOUSIGN_API_KEY}`
      }
    });

    if (!pdfResponse.ok) {
      const errText = await pdfResponse.text();
      console.error("PDF download error:", errText);
      return new Response(JSON.stringify({
        error: "Failed to download PDF from Yousign"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const pdfBlob = await pdfResponse.blob();
    console.log("PDF downloaded, size:", pdfBlob.size);

    const fileName = `documents/contrats/${profilId}/${contractId}-signed.pdf`;
    console.log("Uploading to storage:", fileName);

    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/documents/${fileName}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/pdf"
        },
        body: pdfBlob
      }
    );

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      console.error("Storage upload error:", errText);
      return new Response(JSON.stringify({
        error: "Failed to upload PDF to storage"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    console.log("PDF uploaded successfully");

    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          fichier_signe_url: fileName,
          signed_storage_path: fileName
        })
      }
    );

    if (!updateResponse.ok) {
      const errText = await updateResponse.text();
      console.error("Database update error:", errText);
    }

    console.log("✅ PDF downloaded and stored successfully");

    const downloadLink = `${SUPABASE_URL}/storage/v1/object/public/documents/${fileName}`;

    let emailSent = false;
    let messageId = null;

    if (finalEmployeeEmail && BREVO_API_KEY) {
      console.log("Sending email to:", finalEmployeeEmail);

      try {
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
                email: finalEmployeeEmail,
                name: finalEmployeeName,
              },
            ],
            subject: "✅ Votre contrat de travail signé est disponible",
            htmlContent: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #16a34a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                    .info-box { background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>✅ Contrat signé et disponible</h1>
                    </div>
                    <div class="content">
                      <p>Bonjour ${finalEmployeeName},</p>

                      <p><strong>Félicitations !</strong> Votre contrat de travail a été signé avec succès et est maintenant disponible en téléchargement.</p>

                      <div class="info-box">
                        <p style="margin: 0;"><strong>📄 Votre contrat signé est prêt</strong></p>
                        ${finalVariables.poste ? `<p style="margin: 10px 0 0 0;"><strong>📋 Poste :</strong> ${finalVariables.poste}</p>` : ''}
                        ${finalVariables.salaire ? `<p style="margin: 5px 0 0 0;"><strong>💰 Salaire brut mensuel :</strong> ${finalVariables.salaire}</p>` : ''}
                        ${finalVariables.date_debut ? `<p style="margin: 5px 0 0 0;"><strong>📅 Date de début :</strong> ${formatDateDDMMYYYY(finalVariables.date_debut)}</p>` : ''}
                      </div>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${downloadLink}" class="button">📥 Télécharger votre contrat signé (PDF)</a>
                      </div>

                      <p><strong>Important :</strong></p>
                      <ul>
                        <li>Conservez précieusement ce document</li>
                        <li>Ce contrat fait foi entre vous et votre employeur</li>
                        <li>Vous pouvez le télécharger à tout moment via ce lien</li>
                      </ul>

                      <p>Si vous avez des questions concernant votre contrat, n'hésitez pas à nous contacter.</p>

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

        if (brevoResponse.ok) {
          const result = await brevoResponse.json();
          emailSent = true;
          messageId = result.messageId;
          console.log("✅ Email sent successfully, messageId:", messageId);
        } else {
          const errorData = await brevoResponse.text();
          console.error("Brevo API error:", brevoResponse.status, errorData);
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    } else {
      console.warn("Email not sent: missing email address or Brevo API key");
    }

    return new Response(JSON.stringify({
      success: true,
      message: emailSent
        ? "PDF downloaded, stored and email sent successfully"
        : "PDF downloaded and stored successfully (email not sent)",
      url: downloadLink,
      fileName: `contrat-${contractId}-signed.pdf`,
      emailSent,
      messageId
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
