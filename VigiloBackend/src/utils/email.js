import nodemailer from "nodemailer";

/**
 * OBJET TEMPLATES
 * Regroupe tous tes designs HTML
 */
const templates = {
  // Styles communs pour la cohérence visuelle
  commonStyles: `
    <style>
      .mail-body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
      .header { padding: 30px; text-align: center; color: white; }
      .content { padding: 30px; }
      .footer { padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
      .btn { display: inline-block; padding: 12px 25px; color: white !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
      .info-box { background: #f8fafc; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0; }
      .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    </style>
  `,

  confirmation_candidat: (data) => `
    <html>
      <head>${templates.commonStyles}</head>
      <body class="mail-body">
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <h1 style="margin:0;">Candidature Reçue</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.nom}</strong>,</p>
            <p>Merci de votre intérêt ! Votre candidature pour le poste suivant a bien été enregistrée :</p>
            <div class="info-box">
              <h3 style="margin:0; color:#4a5568;">${data.titreOffre}</h3>
              <p style="margin:5px 0 0 0; color:#718096; font-size:14px;">Référence : #${data.id}</p>
            </div>
            <p>Notre équipe RH va étudier votre dossier. Vous pouvez suivre l'évolution en cliquant ici :</p>
            <div style="text-align: center;">
              <a href="${data.lienSuivi || "#"}" class="btn" style="background-color: #667eea;">Suivre ma candidature</a>
            </div>
          </div>
          <div class="footer">© ${new Date().getFullYear()} Vigilo - Message automatique</div>
        </div>
      </body>
    </html>
  `,

  notification_entreprise: (data) => `
    <html>
      <head>${templates.commonStyles}</head>
      <body class="mail-body">
        <div class="container">
          <div class="header" style="background: #2d3748;">
            <h2 style="margin:0;">Nouvelle Candidature</h2>
          </div>
          <div class="content">
            <p>Une nouvelle candidature a été soumise pour : <strong>${data.offre}</strong></p>
            <div class="info-box" style="border-left-color: #ff9800;">
              <p style="margin:0;"><strong>Candidat :</strong> ${data.candidat?.nomComplet || "N/A"}</p>
              <p style="margin:5px 0;"><strong>Email :</strong> ${data.candidat?.email || "N/A"}</p>
            </div>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/admin/candidatures" class="btn" style="background-color: #2d3748;">Voir sur le Dashboard</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `,

  candidat_selectionne: (data) => `
    <html>
      <head>${templates.commonStyles}</head>
      <body class="mail-body">
        <div class="container">
          <div class="header" style="background: #48bb78;">
            <h1 style="margin:0;">Bonne nouvelle !</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.nom}</strong>,</p>
            <p>Votre profil a retenu notre attention pour le poste de <strong>${data.offre}</strong>.</p>
            <div class="status-badge" style="background: #c6f6d5; color: #22543d;">Profil Sélectionné</div>
            ${data.commentaire ? `<div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-top: 20px; font-style: italic;">"${data.commentaire}"</div>` : ""}
            <p>Un membre de notre équipe vous contactera bientôt.</p>
          </div>
        </div>
      </body>
    </html>
  `,

  candidat_refuse: (data) => `
    <html>
      <head>${templates.commonStyles}</head>
      <body class="mail-body">
        <div class="container">
          <div class="header" style="background: #718096;">
            <h2 style="margin:0;">Réponse à votre candidature</h2>
          </div>
          <div class="content">
            <p>Bonjour ${data.nom},</p>
            <p>Après étude, nous ne pouvons pas donner de suite favorable pour le poste de <strong>${data.offre}</strong>.</p>
            <div class="status-badge" style="background: #edf2f7; color: #4a5568;">Dossier clôturé</div>
          </div>
        </div>
      </body>
    </html>
  `,
  notification_rh: (data) => `
    <html>
      <head>${templates.commonStyles}</head>
      <body class="mail-body">
        <div class="container">
          <div class="header" style="background: #4a5568;"><h2>Notification Collaborateur</h2></div>
          <div class="content">
            <p>Bonjour <strong>${data.userName}</strong>,</p>
            <p>Une nouvelle candidature de <strong>${data.candidat}</strong> a été reçue pour l'offre <strong>${data.titreOffre}</strong>.</p>
          </div>
        </div>
      </body>
    </html>
  `,

  invitation_entretien: (data) => `
    <html>
      <head>${templates.commonStyles}</head>
      <body class="mail-body">
        <div class="container">
          <div class="header" style="background: #3182ce;"><h1>Invitation à un entretien</h1></div>
          <div class="content">
            <p>Bonjour <strong>${data.nom}</strong>,</p>
            <p>Nous souhaitons vous rencontrer pour le poste de <strong>${data.offre}</strong>.</p>
            <div class="info-box">
              <p><strong>Date et Heure :</strong> ${data.dateEntretien}</p>
            </div>
            ${data.commentaire ? `<p>Note de l'équipe : ${data.commentaire}</p>` : ""}
          </div>
        </div>
      </body>
    </html>
  `,

  // Ajoute aussi les versions simples pour les autres statuts
  candidat_statut_update: (data) => `
    <html>
      <head>${templates.commonStyles}</head>
      <body class="mail-body">
        <div class="container">
          <div class="header" style="background: #667eea;"><h2>Mise à jour de votre dossier</h2></div>
          <div class="content">
            <p>Bonjour ${data.nom}, le statut de votre candidature pour <strong>${data.offre}</strong> est désormais : <strong>${data.statut}</strong>.</p>
          </div>
        </div>
      </body>
    </html>
  `,
};

/**
 * FONCTION D'ENVOI HYBRIDE
 * Elle accepte :
 * 1. L'ancien format : sendEmail(to, subject, html) -> Utilisé dans register.js
 * 2. Le nouveau format : sendEmail({ to, subject, template, data }) -> Utilisé dans recrutement.js
 */
async function sendEmail(arg1, arg2, arg3) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let finalOptions = {
      from: `"msg vigilo" <${process.env.EMAIL_USER}>`,
    };

    // --- LOGIQUE DE DETECTION ---
    if (typeof arg1 === "object" && arg1.template) {
      // Cas Nouveau : On a envoyé un objet { to, subject, template, data }
      const { to, subject, template, data } = arg1;
      finalOptions.to = to;
      finalOptions.subject = subject;

      // On génère le HTML depuis l'objet templates
      if (templates[template]) {
        finalOptions.html = templates[template](data);
      } else {
        finalOptions.html = `<p>${subject}</p>`; // Sécurité
      }
    } else {
      // Cas Ancien : On a envoyé (email, sujet, htmlBrut)
      finalOptions.to = arg1;
      finalOptions.subject = arg2;
      finalOptions.html = arg3;
    }

    const info = await transporter.sendMail(finalOptions);
    console.log(`✅ Email envoyé avec succès : ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    throw error;
  }
}

export { sendEmail, templates };
