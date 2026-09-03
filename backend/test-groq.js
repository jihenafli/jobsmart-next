require('dotenv').config();

const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function test() {
  try {
    console.log("🔑 API Key présente :", !!process.env.GROQ_API_KEY);
    console.log("🔑 Début de la clé :", process.env.GROQ_API_KEY?.slice(0, 8));

    console.log("\n📋 Modèles accessibles :");

    const models = await groq.models.list();

    for (const model of models.data) {
      console.log(model.id);
    }

  } catch (error) {
    console.error("\n❌ ERREUR :");
    console.error(error.message);
  }
}

test();
