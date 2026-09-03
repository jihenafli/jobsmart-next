



const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const MODEL = 'openai/gpt-oss-20b';
console.log("🔥🔥🔥 NOUVELLE VERSION APPLY AGENT");
console.log("🔥 MODEL =", MODEL);
function clean(t) {
  return t
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

class ApplyAgent {

  // ============================================================
  // GÉNÉRER UNE LETTRE DE MOTIVATION PERSONNALISÉE
  // ============================================================
  async generateLetter(cvAnalysis, job) {

    console.log(
      `🤖 Apply Agent: génère lettre pour ${job.company}...`
    );

    try {

      const res = await groq.chat.completions.create({

        model: MODEL,

        temperature: 0.7,

        max_tokens: 900,

        messages: [
          {
            role: 'system',
            content: `
Tu es un expert senior en recrutement et en rédaction de lettres
de motivation professionnelles.

Ta mission est de rédiger une lettre de motivation personnalisée
à partir UNIQUEMENT des informations fournies sur le candidat et
l'offre d'emploi.

IMPORTANT :
- N'invente aucune expérience.
- N'invente aucune compétence.
- N'invente aucun diplôme.
- N'invente aucune entreprise.
- N'invente aucune certification.
- Utilise uniquement les informations présentes dans le profil.
- La lettre doit sembler écrite par un candidat humain.
- Elle doit être naturelle, professionnelle et spécifique au poste.
- Évite les phrases génériques et les clichés.
`
          },

          {
            role: 'user',
            content: `
PROFIL DU CANDIDAT

Résumé :
${cvAnalysis.summary || 'Non renseigné'}

Compétences clés :
${cvAnalysis.skills?.slice(0, 10).join(', ') || 'Non renseigné'}

Expérience / niveau :
${cvAnalysis.experience || 'Non renseigné'}

Formation :
${cvAnalysis.education || 'Non renseigné'}

Langues :
${cvAnalysis.languages?.join(', ') || 'Non renseigné'}

Points forts :
${cvAnalysis.strengths?.join(', ') || 'Non renseigné'}


POSTE VISÉ

Titre :
${job.title || 'Non renseigné'}

Entreprise :
${job.company || 'Non renseignée'}

Lieu :
${job.location || 'Non renseigné'}

Description :
${job.description?.slice(0, 800) || 'Non renseignée'}


RÈGLES STRICTES

1. Commence DIRECTEMENT par :
Madame, Monsieur,

2. Maximum 3 paragraphes.

3. Le premier paragraphe doit expliquer brièvement
   l'intérêt du candidat pour le poste.

4. Le deuxième paragraphe doit établir clairement le lien
   entre les compétences réelles du candidat et les besoins
   du poste.

5. Mentionne obligatoirement "${job.company || ''}"
   dans le deuxième paragraphe.

6. Utilise des compétences réellement présentes dans le CV.

7. Ne répète pas simplement la description de l'offre.

8. Ne prétends jamais que le candidat possède une compétence
   qui n'est pas présente dans son profil.

9. Le dernier paragraphe doit exprimer la disponibilité
   du candidat pour un entretien.

10. Termine par une formule de politesse professionnelle.

11. Aucune balise HTML.

12. Aucun Markdown.

13. Pas de titre "Lettre de motivation".

14. Pas de coordonnées inventées.

15. Pas de date inventée.

16. Pas de signature inventée.

17. Style professionnel, naturel et convaincant.

Retourne UNIQUEMENT la lettre.
`
          }
        ]
      });

      const letter = res.choices?.[0]?.message?.content;

      if (!letter) {
        throw new Error('Groq n’a retourné aucune lettre.');
      }

      console.log('✅ Lettre générée avec succès.');

      return letter.trim();

    } catch (error) {

      console.error(
        '❌ Erreur génération lettre:',
        error.message
      );

      throw error;
    }
  }


  // ============================================================
  // GÉNÉRER EMAIL DE CANDIDATURE
  // ============================================================
  async generateEmail(cvAnalysis, job, coverLetter) {

    console.log(
      `📧 Apply Agent: génère email pour ${job.company}...`
    );

    try {

      const res = await groq.chat.completions.create({

        model: MODEL,

        temperature: 0.3,

        max_tokens: 400,

        response_format: {
          type: 'json_object'
        },

        messages: [

          {
            role: 'system',
            content: `
Tu es un expert en recrutement.

Tu dois générer un email professionnel très court
pour accompagner une candidature.

Retourne UNIQUEMENT un objet JSON valide.

Format obligatoire :

{
  "subject": "...",
  "body": "..."
}

Le body doit contenir environ 3 à 4 lignes.

L'email doit être professionnel, naturel et concis.

N'invente aucune information concernant le candidat.
`
          },

          {
            role: 'user',
            content: `
CANDIDAT :

${cvAnalysis.summary || 'Non renseigné'}


POSTE :

${job.title || 'Non renseigné'}


ENTREPRISE :

${job.company || 'Non renseignée'}


LETTRE DE MOTIVATION :

${coverLetter || 'Non disponible'}


Génère maintenant l'email.

Le sujet doit suivre cette logique :

Candidature — [Titre du poste] chez [Entreprise]

Le corps doit :

- commencer par "Madame, Monsieur,"
- indiquer que le candidat souhaite postuler au poste
- mentionner le poste
- indiquer que le CV et la lettre sont joints
- terminer professionnellement
`
          }

        ]
      });


      const content =
        res.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(
          'Groq n’a retourné aucun email.'
        );
      }


      const cleaned = clean(content);

      const email = JSON.parse(cleaned);


      // Vérification minimale du JSON
      if (
        !email.subject ||
        !email.body
      ) {
        throw new Error(
          'Format email invalide.'
        );
      }


      console.log(
        '✅ Email généré avec succès.'
      );

      return {
        subject: email.subject.trim(),
        body: email.body.trim()
      };


    } catch (error) {

      console.error(
        '❌ Erreur génération email:',
        error.message
      );


      // Fallback si Groq échoue
      return {

        subject:
          `Candidature — ${job.title || 'poste'} chez ${job.company || 'votre entreprise'}`,

        body:
          `Madame, Monsieur,

Je souhaite vous adresser ma candidature pour le poste de ${job.title || 'poste'} au sein de ${job.company || 'votre entreprise'}.

Vous trouverez ci-joints mon CV ainsi que ma lettre de motivation.

Je reste à votre disposition pour tout échange complémentaire.

Cordialement`
      };
    }
  }
}


// ============================================================
// EXPORT
// ============================================================

module.exports = new ApplyAgent();




// const Groq = require('groq-sdk');
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// // const MODEL = 'openai/gpt-oss-20b';
// const MODEL = 'openai/gpt-oss-20b';
// function clean(t) { return t.replace(/```json/g,'').replace(/```/g,'').trim(); }

// class ApplyAgent {
//   // Générer lettre de motivation personnalisée
//   async generateLetter(cvAnalysis, job) {
//     console.log(`🤖 Apply Agent: génère lettre pour ${job.company}...`);
//     const res = await groq.chat.completions.create({
//       model: MODEL, temperature: 0.75, max_tokens: 900,
//       messages: [{ role: 'user', content: `Tu es un expert en recrutement. Génère une lettre de motivation professionnelle en français.

// PROFIL CANDIDAT:
// - Résumé: ${cvAnalysis.summary}
// - Compétences clés: ${cvAnalysis.skills?.slice(0,10).join(', ')}
// - Niveau: ${cvAnalysis.experience}
// - Formation: ${cvAnalysis.education}
// - Langues: ${cvAnalysis.languages?.join(', ')}
// - Points forts: ${cvAnalysis.strengths?.join(', ') || ''}

// POSTE VISÉ:
// - Titre: ${job.title}
// - Entreprise: ${job.company}
// - Lieu: ${job.location}
// - Description: ${job.description?.slice(0, 400)}

// RÈGLES STRICTES:
// 1. Commence DIRECTEMENT par "Madame, Monsieur,"
// 2. 3 paragraphes maximum
// 3. Cite SPÉCIFIQUEMENT des compétences du candidat liées au poste
// 4. Mentionne ${job.company} dans le 2ème paragraphe
// 5. Termine par une formule de politesse professionnelle
// 6. AUCUNE balise HTML ou markdown
// 7. Naturelle et convaincante, pas générique` }],
//     });
//     return res.choices[0].message.content.trim();
//   }

//   // Générer email de candidature
//   async generateEmail(cvAnalysis, job, coverLetter) {
//     const res = await groq.chat.completions.create({
//       model: MODEL, temperature: 0.5, max_tokens: 400,
//       messages: [{ role: 'user', content: `Génère un email court d'accompagnement pour cette candidature. JSON uniquement.

// Candidat: ${cvAnalysis.summary}
// Poste: ${job.title} chez ${job.company}

// JSON: {"subject": "Candidature — [Titre] chez [Entreprise]", "body": "Corps court de l'email 3-4 lignes"}` }],
//     });
//     try {
//       return JSON.parse(clean(res.choices[0].message.content));
//     } catch {
//       return {
//         subject: `Candidature — ${job.title} chez ${job.company}`,
//         body: `Madame, Monsieur,\n\nVeuillez trouver ci-joint ma candidature pour le poste de ${job.title}.\n\nCordialement`,
//       };
//     }
//   }
// }

// module.exports = new ApplyAgent();
