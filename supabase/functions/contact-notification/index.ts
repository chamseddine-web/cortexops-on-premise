import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContactNotificationRequest {
  contactId: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  subject: string;
  message: string;
  planInterest?: string;
}

const SMTP_CONFIG = {
  host: 'smtp.ionos.fr',
  port: 465,
  secure: true,
  auth: {
    user: Deno.env.get('SMTP_USER') || 'contact@spectra-consulting.fr',
    pass: Deno.env.get('SMTP_PASSWORD') || ''
  }
};

function base64Encode(str: string): string {
  return btoa(str);
}

const generateAdminNotificationHTML = (data: ContactNotificationRequest): string => {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle demande de contact</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🔔 Nouvelle demande de contact
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px;">
                Une nouvelle demande de contact a été soumise via CortexOps.
              </p>

              <!-- Contact Details -->
              <div style="background-color: #334155; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px; font-weight: 600;">
                  👤 Informations du contact
                </h2>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8; font-size: 14px; width: 120px;">Nom :</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600;">${data.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Email :</td>
                    <td style="padding: 8px 0;">
                      <a href="mailto:${data.email}" style="color: #60a5fa; text-decoration: none; font-size: 14px;">
                        ${data.email}
                      </a>
                    </td>
                  </tr>
                  ${data.company ? `
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Entreprise :</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px;">${data.company}</td>
                  </tr>
                  ` : ''}
                  ${data.phone ? `
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Téléphone :</td>
                    <td style="padding: 8px 0;">
                      <a href="tel:${data.phone}" style="color: #60a5fa; text-decoration: none; font-size: 14px;">
                        ${data.phone}
                      </a>
                    </td>
                  </tr>
                  ` : ''}
                  ${data.planInterest ? `
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Plan :</td>
                    <td style="padding: 8px 0;">
                      <span style="background-color: #3b82f6; color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                        ${data.planInterest}
                      </span>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- Message -->
              <div style="background-color: #334155; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="margin: 0 0 12px; color: #ffffff; font-size: 18px; font-weight: 600;">
                  📝 Sujet
                </h3>
                <p style="margin: 0; color: #e2e8f0; font-size: 16px; font-weight: 600;">
                  ${data.subject}
                </p>
              </div>

              <div style="background-color: #1e293b; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <h3 style="margin: 0 0 12px; color: #ffffff; font-size: 18px; font-weight: 600;">
                  💬 Message
                </h3>
                <p style="margin: 0; color: #cbd5e1; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
${data.message}
                </p>
              </div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject)}"
                       style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                      📧 Répondre au contact
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; padding: 16px; background-color: #1e293b; border-radius: 8px; color: #94a3b8; font-size: 13px; text-align: center;">
                ID de la demande : <code style="color: #60a5fa;">${data.contactId}</code>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                CortexOps Admin Notifications
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

const generateUserConfirmationHTML = (data: ContactNotificationRequest): string => {
  const firstName = data.name.split(' ')[0];

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de votre demande</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">
                ✅ Message bien reçu !
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 18px; line-height: 1.6;">
                Bonjour <strong style="color: #ffffff;">${firstName}</strong>,
              </p>

              <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                Merci d'avoir pris le temps de nous contacter. Nous avons bien reçu votre demande concernant
                <strong style="color: #60a5fa;">${data.subject}</strong>.
              </p>

              <div style="background-color: #334155; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 8px;">
                <p style="margin: 0; color: #94a3b8; font-size: 14px; font-weight: 600;">VOTRE MESSAGE</p>
                <p style="margin: 12px 0 0; color: #e2e8f0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
${data.message}
                </p>
              </div>

              <!-- Timeline -->
              <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; margin: 32px 0;">
                <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 600;">
                  ⏱️ Prochaines étapes
                </h2>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 12px 0;">
                      <div style="display: flex; align-items: flex-start;">
                        <div style="width: 32px; height: 32px; background-color: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 16px;">1</div>
                        <div>
                          <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">Analyse de votre demande</p>
                          <p style="margin: 4px 0 0; color: #94a3b8; font-size: 14px;">Notre équipe examine votre demande</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0;">
                      <div style="display: flex; align-items: flex-start;">
                        <div style="width: 32px; height: 32px; background-color: #8b5cf6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 16px;">2</div>
                        <div>
                          <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">Réponse personnalisée</p>
                          <p style="margin: 4px 0 0; color: #94a3b8; font-size: 14px;">Sous 24 heures ouvrées maximum</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0;">
                      <div style="display: flex; align-items: flex-start;">
                        <div style="width: 32px; height: 32px; background-color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 16px;">3</div>
                        <div>
                          <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">Discussion et accompagnement</p>
                          <p style="margin: 4px 0 0; color: #94a3b8; font-size: 14px;">Nous vous accompagnons dans votre projet</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              ${data.planInterest ? `
              <div style="background-color: #3b82f61a; border: 1px solid #3b82f6; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
                <p style="margin: 0 0 8px; color: #60a5fa; font-size: 14px; font-weight: 600;">PLAN D'INTÉRÊT</p>
                <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">${data.planInterest}</p>
              </div>
              ` : ''}

              <p style="margin: 32px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                En attendant, n'hésitez pas à explorer notre plateforme et à consulter notre documentation.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="https://cortexops.dev"
                       style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      🚀 Découvrir CortexOps
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0 0 8px; color: #94a3b8; font-size: 14px;">
                <strong style="color: #94a3b8;">CortexOps</strong> - Générateur Ansible intelligent
              </p>
              <p style="margin: 0; color: #475569; font-size: 12px;">
                © 2025 CortexOps. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

async function sendEmailViaSMTP(to: string, subject: string, htmlContent: string): Promise<boolean> {
  const smtpUser = Deno.env.get('SMTP_USER') || 'contact@spectra-consulting.fr';
  const smtpPassword = Deno.env.get('SMTP_PASSWORD');

  if (!smtpPassword) {
    console.error('SMTP_PASSWORD not configured');
    return false;
  }

  try {
    const conn = await Deno.connectTls({
      hostname: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
    });

    const reader = conn.readable.getReader();
    const writer = conn.writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function readResponse(): Promise<string> {
      const { value } = await reader.read();
      return decoder.decode(value);
    }

    async function sendCommand(command: string): Promise<void> {
      await writer.write(encoder.encode(command + '\r\n'));
    }

    await readResponse();
    await sendCommand(`EHLO ${SMTP_CONFIG.host}`);
    await readResponse();
    await sendCommand('AUTH LOGIN');
    await readResponse();
    await sendCommand(base64Encode(smtpUser));
    await readResponse();
    await sendCommand(base64Encode(smtpPassword));
    const authResponse = await readResponse();

    if (!authResponse.startsWith('235')) {
      console.error('Authentication failed:', authResponse);
      return false;
    }

    await sendCommand(`MAIL FROM:<${smtpUser}>`);
    await readResponse();
    await sendCommand(`RCPT TO:<${to}>`);
    await readResponse();
    await sendCommand('DATA');
    await readResponse();

    const message = [
      `From: CortexOps <${smtpUser}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      htmlContent,
      '.'
    ].join('\r\n');

    await sendCommand(message);
    await readResponse();
    await sendCommand('QUIT');
    await readResponse();

    await writer.close();
    await reader.cancel();

    console.log(`Email sent successfully to ${to}`);
    return true;

  } catch (error) {
    console.error('SMTP Error:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const data: ContactNotificationRequest = await req.json();

    if (!data.email || !data.name || !data.subject || !data.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'contact@spectra-consulting.fr';

    // Send notification to admin
    const adminHtml = generateAdminNotificationHTML(data);
    const adminSuccess = await sendEmailViaSMTP(
      adminEmail,
      `🔔 Nouvelle demande de contact : ${data.subject}`,
      adminHtml
    );

    // Send confirmation to user
    const userHtml = generateUserConfirmationHTML(data);
    const userSuccess = await sendEmailViaSMTP(
      data.email,
      'Confirmation de votre demande de contact - CortexOps',
      userHtml
    );

    if (!adminSuccess && !userSuccess) {
      return new Response(
        JSON.stringify({
          error: "Failed to send emails",
          adminSuccess,
          userSuccess
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contact notifications sent",
        adminSuccess,
        userSuccess
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
