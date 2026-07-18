// Sites d'emploi par pays - pour affichage frontend uniquement
// La vraie recherche utilise JSearch API

const PLATFORMS_BY_COUNTRY = {
  TN: {
    label: 'Tunisie',
    jsearchQuery: 'Tunisia',  // paramètre pour JSearch
    sites: [
      { name: 'Indeed Tunisie',  flag: '🔍', supported: true  },
      { name: 'Keejob',          flag: '🇹🇳', supported: true  },
      { name: 'LinkedIn',        flag: '💼', supported: true  },
      { name: 'ATCT',            flag: '🇹🇳', supported: true  },
      { name: 'Tunisie Travail', flag: '🇹🇳', supported: true  },
      { name: 'Emploi.com.tn',   flag: '🇹🇳', supported: true  },
    ],
    currency: 'DT', salaryNote: '/mois',
  },
  FR: {
    label: 'France',
    jsearchQuery: 'France',
    sites: [
      { name: 'Indeed France',          flag: '🔍', supported: true  },
      { name: 'LinkedIn',               flag: '💼', supported: true  },
      { name: 'Welcome to the Jungle',  flag: '🌿', supported: true  },
      { name: 'Pôle Emploi',            flag: '🇫🇷', supported: true  },
      { name: 'APEC',                   flag: '🇫🇷', supported: true  },
      { name: 'Glassdoor',              flag: '🔎', supported: true  },
    ],
    currency: '€', salaryNote: '/an',
  },
  MA: {
    label: 'Maroc',
    jsearchQuery: 'Morocco',
    sites: [
      { name: 'Rekrute',      flag: '🇲🇦', supported: true },
      { name: 'Indeed Maroc', flag: '🔍', supported: true },
      { name: 'LinkedIn',     flag: '💼', supported: true },
      { name: 'Emploi.ma',   flag: '🇲🇦', supported: true },
    ],
    currency: 'MAD', salaryNote: '/mois',
  },
  DE: {
    label: 'Allemagne',
    jsearchQuery: 'Germany',
    sites: [
      { name: 'Indeed Allemagne', flag: '🔍', supported: true },
      { name: 'LinkedIn',         flag: '💼', supported: true },
      { name: 'StepStone',        flag: '🇩🇪', supported: true },
      { name: 'XING',             flag: '🇩🇪', supported: true },
    ],
    currency: '€', salaryNote: '/an',
  },
  CA: {
    label: 'Canada',
    jsearchQuery: 'Canada',
    sites: [
      { name: 'Indeed Canada', flag: '🔍', supported: true },
      { name: 'LinkedIn',      flag: '💼', supported: true },
      { name: 'Job Bank',      flag: '🇨🇦', supported: true },
    ],
    currency: 'CAD', salaryNote: '/an',
  },
  OTHER: {
    label: 'International',
    jsearchQuery: 'Remote',
    sites: [
      { name: 'LinkedIn',   flag: '💼', supported: true },
      { name: 'Indeed',     flag: '🔍', supported: true },
      { name: 'Remote.co',  flag: '🌍', supported: true },
    ],
    currency: '€', salaryNote: '/an',
  },
};

const COUNTRIES = [
  { code: 'TN', label: '🇹🇳 Tunisie' },
  { code: 'FR', label: '🇫🇷 France' },
  { code: 'MA', label: '🇲🇦 Maroc' },
  { code: 'DE', label: '🇩🇪 Allemagne' },
  { code: 'CA', label: '🇨🇦 Canada' },
  { code: 'OTHER', label: '🌍 International' },
];

module.exports = { PLATFORMS_BY_COUNTRY, COUNTRIES };
