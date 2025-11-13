import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
  jobTitle?: string;
  companyName?: string;
  useCases?: string[];
}

// Configuration IONOS SMTP
const SMTP_CONFIG = {
  host: 'smtp.ionos.fr',
  port: 465,
  secure: true,
  auth: {
    user: Deno.env.get('SMTP_USER') || 'contact@spectra-consulting.fr',
    pass: Deno.env.get('SMTP_PASSWORD') || ''
  }
};

const generateWelcomeEmailHTML = (data: WelcomeEmailRequest): string => {
  const firstName = data.fullName.split(' ')[0];
  const useCasesHTML = data.useCases && data.useCases.length > 0
    ? data.useCases.map(uc => {
        const labels: Record<string, string> = {
          cicd: '🚀 CI/CD Automation',
          infrastructure: '🏗️ Infrastructure as Code',
          security: '🔒 Security Hardening',
          monitoring: '📊 Monitoring Setup',
          deployment: '📦 Application Deployment',
          cloud: '☁️ Cloud Provisioning'
        };
        return `<li style="margin: 8px 0; color: #6b7280;">${labels[uc] || uc}</li>`;
      }).join('')
    : '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur CortexOps</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">

          <!-- Header avec gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">
                Bienvenue sur CortexOps ! 🎉
              </h1>
            </td>
          </tr>

          <!-- Contenu principal -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 18px; line-height: 1.6;">
                Bonjour <strong style="color: #ffffff;">${firstName}</strong>,
              </p>

              <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                Nous sommes ravis de vous accueillir parmi nos utilisateurs professionnels !
                Votre compte a été créé avec succès et vous disposez de <strong style="color: #3b82f6;">5 générations gratuites</strong> pour démarrer.
              </p>

              ${data.companyName ? `
              <div style="background-color: #334155; border-left: 4px solid #3b82f6; padding: 16px 20px; margin: 24px 0; border-radius: 8px;">
                <p style="margin: 0; color: #94a3b8; font-size: 14px;">VOTRE PROFIL</p>
                <p style="margin: 8px 0 0; color: #ffffff; font-size: 16px;">
                  <strong>${data.jobTitle || 'Professionnel'}</strong> chez <strong>${data.companyName}</strong>
                </p>
              </div>
              ` : ''}

              ${useCasesHTML ? `
              <div style="margin: 24px 0;">
                <p style="margin: 0 0 12px; color: #e2e8f0; font-size: 16px; font-weight: 600;">
                  Vos cas d'usage sélectionnés :
                </p>
                <ul style="margin: 0; padding-left: 20px;">
                  ${useCasesHTML}
                </ul>
              </div>
              ` : ''}

              <!-- Features Grid -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td width="50%" style="padding: 16px; background-color: #1e40af1a; border-radius: 8px;" align="center">
                    <p style="margin: 0; font-size: 36px;">5</p>
                    <p style="margin: 8px 0 0; color: #60a5fa; font-size: 14px; font-weight: 600;">Playbooks/mois</p>
                  </td>
                  <td width="10"></td>
                  <td width="50%" style="padding: 16px; background-color: #7c3aed1a; border-radius: 8px;" align="center">
                    <p style="margin: 0; font-size: 36px;">∞</p>
                    <p style="margin: 8px 0 0; color: #a78bfa; font-size: 14px; font-weight: 600;">Templates</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="https://cortexops.dev"
                       style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                      🚀 Commencer à générer
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Quick Start Guide -->
              <div style="background-color: #334155; padding: 24px; border-radius: 12px; margin: 32px 0;">
                <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px; font-weight: 600;">
                  🎯 Guide de démarrage rapide
                </h2>
                <ol style="margin: 0; padding-left: 20px; color: #cbd5e1; line-height: 1.8;">
                  <li style="margin: 8px 0;">Connectez-vous à votre dashboard</li>
                  <li style="margin: 8px 0;">Décrivez votre infrastructure en langage naturel</li>
                  <li style="margin: 8px 0;">CortexOps génère votre playbook Ansible</li>
                  <li style="margin: 8px 0;">Téléchargez et déployez en production !</li>
                </ol>
              </div>

              <!-- Resources -->
              <div style="margin: 32px 0;">
                <h3 style="margin: 0 0 16px; color: #e2e8f0; font-size: 18px; font-weight: 600;">
                  📚 Ressources utiles
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 12px 16px; background-color: #1e293b; border-radius: 8px; margin-bottom: 8px;">
                      <a href="https://cortexops.dev/docs" style="color: #60a5fa; text-decoration: none; font-size: 15px;">
                        📖 Documentation complète
                      </a>
                    </td>
                  </tr>
                  <tr><td height="8"></td></tr>
                  <tr>
                    <td style="padding: 12px 16px; background-color: #1e293b; border-radius: 8px;">
                      <a href="https://cortexops.dev/examples" style="color: #60a5fa; text-decoration: none; font-size: 15px;">
                        💡 Exemples de playbooks
                      </a>
                    </td>
                  </tr>
                  <tr><td height="8"></td></tr>
                  <tr>
                    <td style="padding: 12px 16px; background-color: #1e293b; border-radius: 8px;">
                      <a href="https://cortexops.dev/support" style="color: #60a5fa; text-decoration: none; font-size: 15px;">
                        💬 Support et communauté
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="margin: 32px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Des questions ? Répondez simplement à cet email, notre équipe est là pour vous aider !
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">
                <strong style="color: #94a3b8;">CortexOps</strong> - Générateur Ansible intelligent
              </p>
              <p style="margin: 0; color: #475569; font-size: 12px;">
                © 2025 CortexOps. Tous droits réservés.
              </p>
              <p style="margin: 12px 0 0; color: #475569; font-size: 12px;">
                <a href="https://cortexops.dev/privacy" style="color: #64748b; text-decoration: none; margin: 0 8px;">Confidentialité</a>
                <span style="color: #334155;">•</span>
                <a href="https://cortexops.dev/terms" style="color: #64748b; text-decoration: none; margin: 0 8px;">CGU</a>
                <span style="color: #334155;">•</span>
                <a href="https://cortexops.dev/unsubscribe" style="color: #64748b; text-decoration: none; margin: 0 8px;">Se désabonner</a>
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

// Fonction pour encoder en base64
function base64Encode(str: string): string {
  return btoa(str);
}

// Fonction pour envoyer l'email via SMTP
async function sendEmailViaSMTP(to: string, subject: string, htmlContent: string): Promise<boolean> {
  const smtpUser = Deno.env.get('SMTP_USER') || 'contact@spectra-consulting.fr';
  const smtpPassword = Deno.env.get('SMTP_PASSWORD');

  if (!smtpPassword) {
    console.error('SMTP_PASSWORD not configured');
    return false;
  }

  try {
    // Connexion SMTP via TLS
    const conn = await Deno.connectTls({
      hostname: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
    });

    const reader = conn.readable.getReader();
    const writer = conn.writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper pour lire les réponses
    async function readResponse(): Promise<string> {
      const { value } = await reader.read();
      return decoder.decode(value);
    }

    // Helper pour envoyer des commandes
    async function sendCommand(command: string): Promise<void> {
      await writer.write(encoder.encode(command + '\r\n'));
    }

    // 1. Lire le banner initial
    await readResponse();

    // 2. EHLO
    await sendCommand(`EHLO ${SMTP_CONFIG.host}`);
    await readResponse();

    // 3. AUTH LOGIN
    await sendCommand('AUTH LOGIN');
    await readResponse();

    // 4. Username (base64)
    await sendCommand(base64Encode(smtpUser));
    await readResponse();

    // 5. Password (base64)
    await sendCommand(base64Encode(smtpPassword));
    const authResponse = await readResponse();

    if (!authResponse.startsWith('235')) {
      console.error('Authentication failed:', authResponse);
      return false;
    }

    // 6. MAIL FROM
    await sendCommand(`MAIL FROM:<${smtpUser}>`);
    await readResponse();

    // 7. RCPT TO
    await sendCommand(`RCPT TO:<${to}>`);
    await readResponse();

    // 8. DATA
    await sendCommand('DATA');
    await readResponse();

    // 9. Message headers + body
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

    // 10. QUIT
    await sendCommand('QUIT');
    await readResponse();

    // Fermer la connexion
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
    const { email, fullName, jobTitle, companyName, useCases }: WelcomeEmailRequest = await req.json();

    if (!email || !fullName) {
      return new Response(
        JSON.stringify({ error: "Email and fullName are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const htmlContent = generateWelcomeEmailHTML({
      email,
      fullName,
      jobTitle,
      companyName,
      useCases
    });

    const firstName = fullName.split(' ')[0];
    const subject = `Bienvenue sur CortexOps, ${firstName} ! 🎉`;

    // Envoyer l'email via SMTP IONOS
    const success = await sendEmailViaSMTP(email, subject, htmlContent);

    if (!success) {
      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          preview: htmlContent // Retourner le HTML pour debug
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
        message: `Welcome email sent to ${email}`,
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
