const POSITIVE_SIGNALS = [
  ["fresher", 45],
  ["freshers", 45],
  ["entry level", 40],
  ["entry-level", 40],
  ["no experience", 45],
  ["0-1 year", 40],
  ["0–1 year", 40],
  ["0 to 1 year", 40],
  ["graduate", 20],
  ["intern", 50],
  ["internship", 50],
  ["trainee", 35]
];

const SENIOR_SIGNALS = [
  ["senior", -30],
  ["lead", -35],
  ["principal", -45],
  ["director", -55],
  ["manager", -45],
  ["head of", -55],
  ["staff engineer", -40]
];

const IRRELEVANT_ROLES = [
  "business development",
  "sales development",
  "sales executive",
  "account manager",
  "business development manager",
  "business development executive"
];

function calculateJobScore(job) {
  const text = `${job.title} ${job.description}`.toLowerCase();

  let score = 50;

  // Positive fresher/intern signals
  for (const [signal, points] of POSITIVE_SIGNALS) {
    if (text.includes(signal)) {
      score += points;
    }
  }

  // Seniority penalties
  for (const [signal, points] of SENIOR_SIGNALS) {
    if (text.includes(signal)) {
      score += points;
    }
  }

  // Explicit years of experience
  const years = [];

  for (const match of text.matchAll(/(\d+)\s*(?:\+|to|-)?\s*(?:\d+)?\s*(?:years?|yrs?)/gi)) {
    const value = Number(match[1]);

    if (Number.isFinite(value)) {
      years.push(value);
    }
  }

  if (years.length) {
    const minYears = Math.min(...years);

    if (minYears <= 1) {
      score += 25;
    } else if (minYears <= 2) {
      score += 10;
    } else if (minYears <= 3) {
      score -= 10;
    } else if (minYears <= 5) {
      score -= 25;
    } else {
      score -= 40;
    }
  }

  // Relevant technical skills
  if (job.skills?.length) {
    score += Math.min(job.skills.length * 4, 20);
  }

  // Irrelevant job categories
  for (const role of IRRELEVANT_ROLES) {
    if (text.includes(role)) {
      score -= 50;
      break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function getMatchLabel(score) {
  if (score >= 80) return "excellent-match";
  if (score >= 65) return "strong-match";
  if (score >= 50) return "possible-match";
  return "experienced";
}

module.exports = {
  calculateJobScore,
  getMatchLabel
};
