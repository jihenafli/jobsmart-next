
// app/api/cv/chat/route.ts
// Assistant CV IA — utilise Groq API (llama-3.3-70b-versatile)
// Bilingue FR/EN · Expert CV professionnel

import { NextRequest, NextResponse } from 'next/server';

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert professional CV/resume writer and career coach with 15+ years of experience in HR and recruitment across France, Canada, UK, and international markets.

Your role is to help users write, improve, and optimize their CV/resume in French or English.

CAPABILITIES:
- Write professional summaries (profil professionnel / personal statement)
- Improve experience bullet points with quantified metrics (numbers, %, impact)
- Suggest relevant skills for a given job title
- Give country-specific CV advice (France, Canada/Quebec, UK, USA)
- Correct grammar and tone
- Apply the STAR method (Situation, Task, Action, Result) to experience descriptions
- Optimize for ATS (Applicant Tracking Systems)
- Review and score CV sections

LANGUAGE RULES:
- Detect the language of the user's message and respond in the SAME language
- If the user writes in French → respond in French
- If the user writes in English → respond in English
- If the CV context is in French → default to French unless asked otherwise

RESPONSE RULES:
1. Be DIRECT and CONCRETE — no vague advice
2. When asked to WRITE something (summary, bullet, title) → give the FINAL TEXT ready to copy-paste, formatted cleanly
3. When improving bullets → give 2-3 improved versions with metrics
4. Keep responses under 250 words unless writing full sections
5. Use ✓ for good points, ⚠ for improvements needed, ✨ for rewrites
6. For ATS optimization → mention exact keywords to add
7. No excessive markdown — clean readable text

EXPERTISE AREAS:
- Tech/IT CVs (developers, data scientists, DevOps)
- Business/Finance CVs
- Healthcare CVs
- Student/Graduate CVs (first job, internship)
- Career change CVs
- Executive CVs`;

// ─── INTENT DETECTION ────────────────────────────────────────────────────────

function buildContextualPrompt(message: string, cvContext: string, lang: string): string {
  const isFrench = lang === 'fr' || /[àâäéèêëïîôùûüç]/i.test(message);
  const msgLower = message.toLowerCase();

  // Detect intent
  const isResumeRequest = /résumé|summary|profil|profile|rédige|write|génère|generate/i.test(msgLower);
  const isBulletRequest = /bullet|réalisation|achievement|améliore|improve|expérience|experience/i.test(msgLower);
  const isSkillRequest = /compétence|skill|technolog/i.test(msgLower);
  const isATSRequest = /ats|score|keyword|mot.clé/i.test(msgLower);
  const isCountryAdvice = /france|canada|québec|uk|angleterre|usa|amérique/i.test(msgLower);

  let instruction = '';

  if (isResumeRequest) {
    instruction = isFrench
      ? '\n\nINSTRUCTION SPÉCIALE: L\'utilisateur veut un texte rédigé. Fournis le TEXTE FINAL complet du résumé professionnel, prêt à copier-coller. Commence directement par le texte, pas d\'introduction.'
      : '\n\nSPECIAL INSTRUCTION: User wants written content. Provide the FINAL TEXT of the professional summary, ready to copy-paste. Start directly with the text, no introduction.';
  } else if (isBulletRequest) {
    instruction = isFrench
      ? '\n\nINSTRUCTION SPÉCIALE: Fournis 2-3 versions améliorées des bullet points avec métriques chiffrées (%, chiffres, impact). Format: "• [version améliorée]"'
      : '\n\nSPECIAL INSTRUCTION: Provide 2-3 improved bullet point versions with quantified metrics (%, numbers, impact). Format: "• [improved version]"';
  } else if (isSkillRequest) {
    instruction = isFrench
      ? '\n\nINSTRUCTION SPÉCIALE: Liste les compétences sous forme de tags séparés par des virgules, groupés par catégorie.'
      : '\n\nSPECIAL INSTRUCTION: List skills as comma-separated tags, grouped by category.';
  } else if (isATSRequest) {
    instruction = isFrench
      ? '\n\nINSTRUCTION SPÉCIALE: Donne un score ATS estimé sur 100, les mots-clés manquants, et 3 actions concrètes pour améliorer le score.'
      : '\n\nSPECIAL INSTRUCTION: Give an estimated ATS score out of 100, missing keywords, and 3 concrete actions to improve the score.';
  } else if (isCountryAdvice) {
    instruction = isFrench
      ? '\n\nINSTRUCTION SPÉCIALE: Donne des conseils SPÉCIFIQUES au pays mentionné (format, longueur, photo, sections obligatoires, ce qui est tabou).'
      : '\n\nSPECIAL INSTRUCTION: Give SPECIFIC advice for the mentioned country (format, length, photo, required sections, what to avoid).';
  }

  return `${cvContext ? `CURRENT CV CONTEXT:\n${cvContext}\n\n` : ''}USER MESSAGE: ${message}${instruction}`;
}

// ─── ROUTE HANDLER ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    console.log("🔥 API CHAT HIT");
    try {
        const body = await req.json();
console.log("BODY RECEIVED");

const { message, context, lang = 'fr' } = body;
console.log("MESSAGE");

if (!message) console.log("ERROR");

if (!body) {
  return NextResponse.json({ error: "Body invalide" }, { status: 400 });
}

// const { message, context, lang = "fr" } = body;

if (!message || typeof message !== "string") {
  return NextResponse.json({ error: " manquante" }, { status: 400 });
}
    
        if (!message?.trim()) {
          return NextResponse.json(
            { error: "Question manquante" },
            { status: 400 }
          );
        }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY manquante dans .env' }, { status: 500 });
    }

    const userPrompt = buildContextualPrompt(message, context || '', lang || 'fr');

    // ── Appel Groq API ──────────────────────────────────────────────────────
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Groq Error]', res.status, errText);
      return NextResponse.json({ error: `Erreur Groq API: ${res.status}` }, { status: 500 });
    }
    
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';

    if (!text) {
      return NextResponse.json({ error: 'Réponse vide de l\'IA.' }, { status: 500 });
    }

    return NextResponse.json({
      message: text,
      model: data.model,
      usage: data.usage,
    });

  } catch (err) {
    console.error('[CV Chat Error]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}