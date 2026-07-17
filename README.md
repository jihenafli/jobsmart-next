# 🚀 JobSmart AI OS v4 — Architecture Complète

## Stack
- **Frontend**: Next.js 14 + CSS Variables (dark theme)
- **Backend**: Node.js + Express + Socket.io
- **AI**: Groq LLaMA 3.3 (gratuit) + JSearch API
- **DB**: MongoDB Atlas
- **Email**: Nodemailer + Gmail
- **Paiement**: Stripe

## 6 Agents IA
| Agent | Rôle |
|-------|------|
| Resume Agent | Analyse CV, score ATS, compétences |
| Hunter Agent | Cherche offres JSearch, score matching |
| Apply Agent | Génère lettre personnalisée |
| Email Agent | Envoie email + CV joint |
| Coach Agent | Plan carrière, insights candidatures |
| Interview Agent | Mock interviews, évaluation réponses |

## Structure
```
jobsmart_next/
├── backend/
│   ├── agents/          ← 6 agents IA
│   ├── models/          ← User, CV, Application
│   ├── routes/index.js  ← Toutes les routes
│   ├── server.js        ← Express + Socket.io
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── page.tsx         ← Landing page
    │   ├── login/page.tsx
    │   ├── register/page.tsx
    │   ├── dashboard/page.tsx ← Dashboard principal
    │   └── pricing/page.tsx
    ├── lib/
    │   ├── api.ts           ← Axios instance
    │   └── auth.tsx         ← Auth context
    └── .env.example
```

## Installation locale

### Backend
```bash
cd backend
npm install
cp .env.example .env    # Remplis tes clés
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev
```

## Déploiement

### Render (backend)
- Root: `backend`
- Build: `npm install`
- Start: `node server.js`
- Variables: copier .env

### Vercel (frontend)
- Root: `frontend`
- Framework: Next.js
- Variable: `NEXT_PUBLIC_API_URL=https://ton-backend.onrender.com`

## Clés API nécessaires

| Service | Lien | Gratuit ? |
|---------|------|-----------|
| MongoDB Atlas | cloud.mongodb.com | ✅ M0 free |
| Groq | console.groq.com | ✅ Oui |
| JSearch | rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch | ✅ 500/mois |
| Gmail App Password | myaccount.google.com/apppasswords | ✅ Oui |
| Stripe | stripe.com | ✅ Test mode |
