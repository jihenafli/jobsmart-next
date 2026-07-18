
const nodemailer = require('nodemailer');

class EmailAgent {
  _transporter() {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }

  // Envoyer candidature avec CV
  async sendApplication({ to, candidateName, candidateEmail, jobTitle, company, coverLetter, cvBuffer, cvFileName }) {
    if (!to) throw new Error('❌ Destinataire manquant');
    console.log(`🤖 Email Agent: envoi candidature à ${to}...`);
    console.log(`📧 FROM: ${process.env.EMAIL_USER}`);

    const attachments = cvBuffer
      ? [{ filename: cvFileName || `CV_${candidateName}.pdf`, content: cvBuffer, contentType: 'application/pdf' }]
      : [];

    const info = await this._transporter().sendMail({
      from: process.env.EMAIL_USER,
      replyTo: candidateEmail || process.env.EMAIL_USER,
      to,
      subject: `Candidature — ${jobTitle} chez ${company}`,
      html: `
<div style="font-family:Inter,Arial,sans-serif;max-width:650px;margin:0 auto;background:#080B12;color:#F0F4FF;border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#00D68F,#4F8EF7);padding:20px 28px;">
    <p style="margin:0;font-size:12px;font-weight:600;color:rgba(0,0,0,0.7);text-transform:uppercase;letter-spacing:1px;">Candidature via JobSmart AI</p>
  </div>
  <div style="padding:32px 28px;">
    <div style="white-space:pre-line;line-height:1.8;font-size:15px;color:#E0E7FF;">${coverLetter}</div>
    <hr style="margin:28px 0;border:none;border-top:1px solid rgba(255,255,255,0.08);">
    <p style="font-size:13px;color:#7A8499;margin:0;">
      <strong style="color:#F0F4FF;">${candidateName}</strong>${candidateEmail ? ` · ${candidateEmail}` : ''}<br/>
      ${attachments.length ? '📎 CV joint en pièce jointe' : ''}
    </p>
  </div>
</div>`,
      text: coverLetter,
      attachments,
    });

    console.log(`✅ EMAIL ENVOYÉ: ${info.messageId}`);
    console.log(`📨 Accepté: ${info.accepted}`);
    if (info.rejected?.length > 0) throw new Error(`❌ Rejeté: ${info.rejected}`);
    return info;
  }

  // Email de bienvenue
  async sendWelcome({ to, name }) {
    return this._transporter().sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: '🚀 Bienvenue sur JobSmart AI',
      html: `<div style="font-family:Arial;max-width:600px;margin:0 auto;">
        <h2 style="color:#00D68F;">Bienvenue ${name} !</h2>
        <p>Ton compte JobSmart AI est prêt. Upload ton CV et laisse nos 6 agents IA trouver ton prochain emploi.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background:#00D68F;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:20px;font-weight:600;">
          Commencer →
        </a>
      </div>`,
    });
  }
}




module.exports = new EmailAgent();

// const nodemailer = require('nodemailer');

// class EmailAgent {
//   _transporter() {
//     return nodemailer.createTransport({
//       service: 'gmail',
//       auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
//     });
//   }

//   // Envoyer candidature avec CV
//   async sendApplication({ to, candidateName, candidateEmail, jobTitle, company, coverLetter, cvBuffer, cvFileName }) {
//     if (!to) throw new Error('❌ Destinataire manquant');
//     console.log(`🤖 Email Agent: envoi candidature à ${to}...`);
//     console.log(`📧 FROM: ${process.env.EMAIL_USER}`);

//     const attachments = cvBuffer
//       ? [{ filename: cvFileName || `CV_${candidateName}.txt`, content: cvBuffer }]
//       : [];

//     const info = await this._transporter().sendMail({
//       from: process.env.EMAIL_USER,
//       replyTo: candidateEmail || process.env.EMAIL_USER,
//       to,
//       subject: `Candidature — ${jobTitle} chez ${company}`,
//       html: `
// <div style="font-family:Inter,Arial,sans-serif;max-width:650px;margin:0 auto;background:#080B12;color:#F0F4FF;border-radius:12px;overflow:hidden;">
//   <div style="background:linear-gradient(135deg,#00D68F,#4F8EF7);padding:20px 28px;">
//     <p style="margin:0;font-size:12px;font-weight:600;color:rgba(0,0,0,0.7);text-transform:uppercase;letter-spacing:1px;">Candidature via JobSmart AI</p>
//   </div>
//   <div style="padding:32px 28px;">
//     <div style="white-space:pre-line;line-height:1.8;font-size:15px;color:#E0E7FF;">${coverLetter}</div>
//     <hr style="margin:28px 0;border:none;border-top:1px solid rgba(255,255,255,0.08);">
//     <p style="font-size:13px;color:#7A8499;margin:0;">
//       <strong style="color:#F0F4FF;">${candidateName}</strong>${candidateEmail ? ` · ${candidateEmail}` : ''}<br/>
//       ${attachments.length ? '📎 CV joint en pièce jointe' : ''}
//     </p>
//   </div>
// </div>`,
//       text: coverLetter,
//       attachments,
//     });

//     console.log(`✅ EMAIL ENVOYÉ: ${info.messageId}`);
//     console.log(`📨 Accepté: ${info.accepted}`);
//     if (info.rejected?.length > 0) throw new Error(`❌ Rejeté: ${info.rejected}`);
//     return info;
//   }

//   // Email de bienvenue
//   async sendWelcome({ to, name }) {
//     return this._transporter().sendMail({
//       from: process.env.EMAIL_USER,
//       to,
//       subject: '🚀 Bienvenue sur JobSmart AI',
//       html: `<div style="font-family:Arial;max-width:600px;margin:0 auto;">
//         <h2 style="color:#00D68F;">Bienvenue ${name} !</h2>
//         <p>Ton compte JobSmart AI est prêt. Upload ton CV et laisse nos 6 agents IA trouver ton prochain emploi.</p>
//         <a href="${process.env.FRONTEND_URL}/dashboard" style="background:#00D68F;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:20px;font-weight:600;">
//           Commencer →
//         </a>
//       </div>`,
//     });
//   }
// }




// module.exports = new EmailAgent();


