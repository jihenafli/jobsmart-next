const nodemailer = require('nodemailer');

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendApplication({
  to,
  candidateName,
  candidateEmail,
  jobTitle,
  company,
  coverLetter,
  cvBuffer,
  cvFileName,
}) {
  console.log("=================================");
  console.log("EMAIL SERVICE APPELÉ");
  console.log("TO =", to);
  console.log("EMAIL_USER =", process.env.EMAIL_USER);
  console.log("=================================");

  if (!to) throw new Error("Email destinataire manquant (to)");

  const attachments = cvBuffer
    ? [{
        filename: cvFileName || `CV_${candidateName}.pdf`,
        content: cvBuffer,
        contentType: 'application/pdf',
      }]
    : [];

  const info = await getTransporter().sendMail({
    // from: `"${candidateName}" <${process.env.EMAIL_USER}>`,
    from: process.env.EMAIL_USER,
replyTo: candidateEmail || process.env.EMAIL_USER,
    to,
    subject: `Candidature — ${jobTitle} chez ${company}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;">
        <p>${coverLetter}</p>
        <hr/>
        <p><strong>${candidateName}</strong> ${candidateEmail || ''}</p>
      </div>
    `,
    text: coverLetter,
    attachments,
  });

  console.log("✅ EMAIL ENVOYÉ");
  console.log("MESSAGE ID:", info.messageId);

  return info;
}

async function sendWelcomeEmail({ to, name }) {
  return getTransporter().sendMail({
    // from: `"JobSmart AI" <${process.env.EMAIL_USER}>`,
    from: process.env.EMAIL_USER,
    to,
    subject: 'Bienvenue sur JobSmart AI 🚀',
    html: `<h2>Bienvenue ${name}</h2>`,
  });
}

module.exports = { sendApplication, sendWelcomeEmail };


// const nodemailer = require('nodemailer');

// function getTransporter() {
//   return nodemailer.createTransport({
//     service: 'gmail',
//     auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
//   });
// }

// async function sendApplication({ to, candidateName, candidateEmail, jobTitle, company, coverLetter, cvBuffer, cvFileName }) {
//   const attachments = cvBuffer
//     ? [{ filename: cvFileName || `CV_${candidateName}.pdf`, content: cvBuffer, contentType: 'application/pdf' }]
//     : [];

//   return getTransporter().sendMail({
//     from: `"${candidateName}" <${process.env.EMAIL_USER}>`,
//     to,
//     subject: `Candidature — ${jobTitle} chez ${company}`,
//     html: `<div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;">
//       <div style="background:#1D9E75;padding:12px 20px;border-radius:8px 8px 0 0;">
//         <p style="margin:0;color:white;font-size:12px;">Candidature via JobSmart AI</p>
//       </div>
//       <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
//         <div style="white-space:pre-line;line-height:1.8;font-size:15px;">${coverLetter}</div>
//         <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;">
//         <p style="font-size:13px;color:#999;margin:0;">
//           <strong>${candidateName}</strong>${candidateEmail ? ` · ${candidateEmail}` : ''}<br/>
//           ${attachments.length > 0 ? '📎 CV joint en pièce jointe' : ''}
//         </p>
//       </div>
//     </div>`,
//     text: coverLetter,
//     attachments,
//   });
// }

// async function sendWelcomeEmail({ to, name }) {
//   return getTransporter().sendMail({
//     from: `" <${process.env.EMAIL_USER}>`,
//     to,
//     subject: 'Bienvenue sur JobSmart AI 🚀',
//     html: `<div style="font-family:Arial;max-width:600px;margin:0 auto;">
//       <h2 style="color:#1D9E75;">Bienvenue ${name} !</h2>
//       <p>Ton compte est prêt. Upload ton CV et trouve ton emploi !</p>
//       <a href="${process.env.FRONTEND_URL}" style="background:#1D9E75;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">Commencer →</a>
//     </div>`,
//   });
// }

// module.exports = { sendApplication, sendWelcomeEmail };
