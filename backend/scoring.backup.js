const POSITIVE_SIGNALS = [
  ["fresher", 40],
  ["freshers", 40],
  ["entry level", 35],
  ["entry-level", 35],
  ["graduate", 25],
  ["graduates", 25],
  ["no experience", 40],
  ["0-1 year", 35],
  ["0–1 year", 35],
  ["intern", 45],
  ["internship", 45],
  ["trainee", 30]
];

const NEGATIVE_SIGNALS = [
  ["senior", -35],
  ["lead", -30],
  ["principal", -40],
  ["director", -50],
  ["manager", -40],
  ["head of", -50],
  ["5+ years", -35],
  ["6+ years", -40],
  ["7+ years", -45],
  ["10+ years", -50]
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

  for (const [signal, points] of POSITIVE_SIGNALS) {
    if (text.includes(signal)) {
      score += points;
    }
  }

  for (const [signal, points] of NEGATIVE_SIGNALS) {
    if (text.includes(signal)) {
      score += points;
    }
  }

  if (job.skills?.length) {
    score += Math.min(job.skills.length * 5, 25);
  }

  for (const role of IRRELEVANT_ROLES) {
    if (text.includes(role)) {
      score -= 45;
      break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function getMatchLabel(score) {
  if (score >= 75) return "strong-match";
  if (score >= 55) return "possible-match";
  return "experienced";
}

module.exports = {
  calculateJobScore,
  getMatchLabel
};
