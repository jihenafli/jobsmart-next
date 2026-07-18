const axios = require('axios');
const Groq  = require('groq-sdk');
const groq  = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

function clean(t) { return t.replace(/```json/g,'').replace(/```/g,'').trim(); }

const COUNTRY_QUERY = {
  TN: 'Tunisia', FR: 'France', MA: 'Morocco',
  DE: 'Germany', CA: 'Canada', OTHER: 'Remote',
};

class HunterAgent {
  // Chercher les vraies offres via JSearch API
  async search(jobTitles, countryCode) {
    console.log(`🤖 Hunter Agent: recherche ${jobTitles.join(', ')} en ${countryCode}`);
    if (!process.env.JSEARCH_API_KEY) {
      console.error('❌ JSEARCH_API_KEY manquante');
      return [];
    }

    const location = COUNTRY_QUERY[countryCode] || 'Remote';
    const allJobs  = [];

    for (const title of jobTitles.slice(0, 2)) {
      const shortTitle = title.length > 40 ? title.split(' ').slice(0, 4).join(' ') : title;
      try {
        const res = await axios.get('https://jsearch.p.rapidapi.com/search', {
          params: { query: `${shortTitle} in ${location}`, page: '1', num_pages: '1', date_posted: 'month' },
          headers: { 'x-rapidapi-host': 'jsearch.p.rapidapi.com', 'x-rapidapi-key': process.env.JSEARCH_API_KEY },
          timeout: 15000,
        });

        const jobs = (res.data?.data || []).map(j => ({
          title:        j.job_title || '',
          company:      j.employer_name || '',
          location:     j.job_city ? `${j.job_city}, ${j.job_country}` : location,
          salary:       this._formatSalary(j, countryCode),
          url:          j.job_apply_link || j.job_google_link || '',
          description:  (j.job_description || '').slice(0, 500),
          platform:     j.job_publisher || 'Indeed',
          companyEmail: null,
          jobId:        j.job_id || '',
          postedAt:     j.job_posted_at_datetime_utc || '',
          isRemote:     j.job_is_remote || false,
          applyLink:    j.job_apply_link || '',
        }));

        allJobs.push(...jobs);
        console.log(`✅ Hunter Agent: ${jobs.length} offres pour "${shortTitle}"`);
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`❌ Hunter Agent erreur "${shortTitle}": ${err.message}`);
      }
    }

    // Dédoublonner
    const seen = new Set();
    return allJobs.filter(j => {
      const k = j.jobId || `${j.title}-${j.company}`.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  }

  // Calculer score de compatibilité
  async scoreMatch(cvAnalysis, job) {
    try {
      const res = await groq.chat.completions.create({
        model: MODEL, temperature: 0.1, max_tokens: 300,
        messages: [{ role: 'user', content: `Score de compatibilité CV/offre. JSON uniquement.

Profil: ${cvAnalysis.skills?.slice(0,8).join(',')} | ${cvAnalysis.experience} | ${cvAnalysis.education}
Offre: ${job.title} - ${job.description?.slice(0,300)}

JSON: {"score":85,"reasons":["raison"],"missing":["manque"]}` }],
      });
      return JSON.parse(clean(res.choices[0].message.content));
    } catch {
      return { score: 65, reasons: ['Profil compatible'], missing: [] };
    }
  }

  // Trouver email entreprise
  async findEmail(companyName) {
    try {
      const res = await groq.chat.completions.create({
        model: MODEL, temperature: 0.1, max_tokens: 100,
        messages: [{ role: 'user', content: `Email RH pour: ${companyName}. JSON: {"email":"rh@company.com"}` }],
      });
      return JSON.parse(clean(res.choices[0].message.content)).email;
    } catch {
      const d = companyName.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,15);
      return `recrutement@${d}.com`;
    }
  }

  _formatSalary(job, code) {
    const cur = { TN:'DT', FR:'€', MA:'MAD', DE:'€', CA:'CAD', OTHER:'€' }[code] || '€';
    const per = { TN:'/mois', MA:'/mois' }[code] || '/an';
    if (job.job_min_salary && job.job_max_salary) {
      return `${Math.round(job.job_min_salary).toLocaleString()} - ${Math.round(job.job_max_salary).toLocaleString()} ${cur}${per}`;
    }
    return 'Selon profil';
  }
}

module.exports = new HunterAgent();
