const axios = require('axios');
const { PLATFORMS_BY_COUNTRY } = require('../config/platforms');

// ============================================
// JSEARCH API — VRAIES OFFRES D'EMPLOI
// Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
// Gratuit: 500 requêtes/mois
// ============================================

async function searchWithJSearch(query, countryCode) {
  const config = PLATFORMS_BY_COUNTRY[countryCode] || PLATFORMS_BY_COUNTRY.OTHER;
  const location = config.jsearchQuery;

  console.log(`🔍 JSearch: "${query}" dans "${location}"`);

  const response = await axios.get('https://jsearch.p.rapidapi.com/search', {
    params: {
      query: `${query} in ${location}`,
      page: '1',
      num_pages: '1',
      date_posted: 'month',
    },
    headers: {
      'x-rapidapi-host': 'jsearch.p.rapidapi.com',
      'x-rapidapi-key': process.env.JSEARCH_API_KEY,
    },
    timeout: 15000,
  });

  const jobs = response.data?.data || [];
  console.log(`✅ JSearch: ${jobs.length} offres trouvées pour "${query}"`);

  return jobs.map(job => ({
    title:        job.job_title || '',
    company:      job.employer_name || '',
    location:     job.job_city ? `${job.job_city}, ${job.job_country}` : (job.job_country || location),
    salary:       formatSalary(job, countryCode),
    url:          job.job_apply_link || job.job_google_link || '',
    description:  job.job_description?.slice(0, 400) || '',
    platform:     job.job_publisher || 'Indeed',
    companyEmail: null,   // sera trouvé par l'IA
    jobId:        job.job_id || '',
    postedAt:     job.job_posted_at_datetime_utc || '',
    isRemote:     job.job_is_remote || false,
    applyLink:    job.job_apply_link || '',
  }));
}

function formatSalary(job, countryCode) {
  const config = PLATFORMS_BY_COUNTRY[countryCode] || PLATFORMS_BY_COUNTRY.OTHER;
  if (job.job_min_salary && job.job_max_salary) {
    const min = Math.round(job.job_min_salary).toLocaleString();
    const max = Math.round(job.job_max_salary).toLocaleString();
    const period = job.job_salary_period === 'MONTH' ? '/mois' : config.salaryNote;
    return `${min} - ${max} ${config.currency}${period}`;
  }
  if (job.job_min_salary) {
    return `Dès ${Math.round(job.job_min_salary).toLocaleString()} ${config.currency}`;
  }
  return 'Selon profil';
}

// ============================================
// RECHERCHE PRINCIPALE
// ============================================
async function searchJobs(jobTitles, countryCode) {
  if (!process.env.JSEARCH_API_KEY) {
    console.error('❌ JSEARCH_API_KEY manquante dans .env');
    return [];
  }

  const allJobs = [];
  // On prend les 2 premiers titres pour limiter les requêtes API
  const queries = jobTitles.slice(0, 2);

  for (const query of queries) {
    // Simplifier la query si trop longue
    const shortQuery = query.length > 40
      ? query.split(' ').slice(0, 4).join(' ')
      : query;

    try {
      const jobs = await searchWithJSearch(shortQuery, countryCode);
      allJobs.push(...jobs);
      // Pause entre requêtes
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`❌ Erreur JSearch pour "${shortQuery}":`, err.response?.data?.message || err.message);
    }
  }

  // Dédoublonner par jobId ou titre+entreprise
  const seen = new Set();
  return allJobs.filter(job => {
    const key = job.jobId || `${job.title}-${job.company}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = { searchJobs };
