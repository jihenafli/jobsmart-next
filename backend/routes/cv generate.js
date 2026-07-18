// ─────────────────────────────────────────────────────────────────────────────
// FICHIER : app/api/cv/generate/route.ts
// RÔLE    : Proxy serveur → appel Anthropic (évite CORS) + génère le JSON CV
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, template } = await req.json();

    if (!prompt || prompt.trim().length < 20) {
      return NextResponse.json(
        { error: 'Décris ton profil (minimum 20 caractères).' },
        { status: 400 }
      );
    }

    const aiPrompt = `Tu es un expert RH international spécialisé en rédaction de CV ATS optimisés.

MISSION : Analyser le profil et générer un CV complet, structuré, professionnel et optimisé ATS.

PROFIL DE L'UTILISATEUR :
${prompt}

RÈGLES ABSOLUES :
1. Retourne UNIQUEMENT du JSON valide — aucun texte avant/après, aucune balise markdown
2. Chaque bullet point d'expérience DOIT contenir un chiffre ou % concret
3. Le summary : 3-4 phrases percutantes commençant par "[Titre] avec [N] ans d'expérience..."
4. atsScore entre 88 et 97 selon la richesse du profil fourni
5. skills groupés par catégorie (max 4 catégories, 4-6 items chacune)
6. Si une info manque (email, phone...), génère des valeurs réalistes et cohérentes avec le profil
7. experiences : minimum 2 expériences avec 3 bullets chacune
8. betterAnswers : un objet avec des réponses modèles pour les questions d'entretien clés

FORMAT JSON EXACT À RETOURNER :
{
  "fullName": "Prénom Nom",
  "jobTitle": "Titre exact du poste",
  "email": "prenom.nom@gmail.com",
  "phone": "+216 XX XXX XXX",
  "location": "Ville, Pays",
  "linkedin": "linkedin.com/in/prenom-nom",
  "github": "github.com/prenomnom",
  "summary": "Développeur Full Stack avec 4 ans d'expérience en React et Node.js. Spécialisé dans les architectures SaaS scalables ayant servi 15 000+ utilisateurs actifs. Passionné par la performance frontend et les bonnes pratiques DevOps.",
  "experiences": [
    {
      "company": "IntelliSoft",
      "role": "Développeur Full Stack Senior",
      "period": "Jan 2022 – Présent",
      "location": "Tunis, Tunisie",
      "bullets": [
        "Conçu et déployé une architecture microservices React/Node.js réduisant la latence API de 45%",
        "Géré une équipe de 5 développeurs juniors sur 3 projets clients en parallèle",
        "Intégré des pipelines CI/CD avec GitHub Actions, réduisant les bugs en production de 60%"
      ]
    },
    {
      "company": "Telnet",
      "role": "Développeur Frontend",
      "period": "Sep 2020 – Déc 2021",
      "location": "Tunis, Tunisie",
      "bullets": [
        "Développé 12 composants React réutilisables adoptés par 3 équipes produit",
        "Amélioré le score Lighthouse de 58 à 94 en optimisant les bundles webpack",
        "Livré 8 sprints consécutifs à temps sur un projet e-commerce à 50k utilisateurs"
      ]
    }
  ],
  "education": [
    {
      "degree": "Licence en Génie Logiciel",
      "school": "ESPRIT",
      "period": "2017 – 2020",
      "detail": "Mention Bien · Spécialisation Développement Web"
    }
  ],
  "skills": [
    { "category": "Frontend", "items": ["React", "Next.js", "TypeScript", "Tailwind CSS"] },
    { "category": "Backend",  "items": ["Node.js", "NestJS", "PostgreSQL", "MongoDB"] },
    { "category": "DevOps",   "items": ["Docker", "AWS", "CI/CD", "Linux"] },
    { "category": "Outils",   "items": ["Git", "Jira", "Figma", "VS Code"] }
  ],
  "languages": [
    { "lang": "Arabe",   "level": "Natif" },
    { "lang": "Français","level": "Courant (C1)" },
    { "lang": "Anglais", "level": "Professionnel (B2)" }
  ],
  "certifications": [
    "AWS Cloud Practitioner – 2023",
    "Meta Frontend Developer – 2022"
  ],
  "atsScore": 94,
  "atsBreakdown": [
    { "label": "Mots-clés", "score": 96 },
    { "label": "Structure",  "score": 93 },
    { "label": "Format",     "score": 95 },
    { "label": "Lisibilité", "score": 92 }
  ],
  "template": "${template || 'modern'}"
}`;

    // ── Appel Anthropic côté serveur (pas de CORS ici) ──
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2500,
        messages: [{ role: 'user', content: aiPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error('Anthropic error:', err);
      return NextResponse.json({ error: 'Erreur API Anthropic.' }, { status: 500 });
    }

    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData.content
      ?.filter((b: { type: string }) => b.type === 'text')
      .map((b: { type: string; text: string }) => b.text)
      .join('') || '';

    // ── Parse JSON robuste ──
    const clean = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonStart = clean.indexOf('{');
    const jsonEnd   = clean.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: 'L\'IA n\'a pas retourné de JSON valide.' }, { status: 422 });
    }

    const cvData = JSON.parse(clean.slice(jsonStart, jsonEnd + 1));

    // Normalisation
    cvData.template  = template || 'modern';
    cvData.atsScore  = Math.min(97, Math.max(85, Number(cvData.atsScore) || 90));

    return NextResponse.json({ success: true, cv: cvData });

  } catch (err) {
    console.error('[CV Generate Error]', err);
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Erreur de parsing JSON.' }, { status: 422 });
    }
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', route: 'POST /api/cv/generate' });
}