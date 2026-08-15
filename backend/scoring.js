const POSITIVE_SIGNALS = [
  ["fresher", 20],
  ["freshers", 20],
  ["entry level", 20],
  ["entry-level", 20],
  ["no experience", 20],
  ["0-1 year", 20],
  ["0–1 year", 20],
  ["0 to 1 year", 20],
  ["graduate", 10],
  ["intern", 20],
  ["internship", 20],
  ["trainee", 15]
];

const SENIOR_SIGNALS = [
  ["senior", -18],
  ["lead", -22],
  ["principal", -30],
  ["director", -35],
  ["manager", -30],
  ["head of", -35],
  ["staff engineer", -25]
];

const IRRELEVANT_ROLES = [
  "business development",
  "sales development",
  "sales executive",
  "account manager",
  "business development manager",
  "business development executive"
];

function normalizeQuery(query) {
  return String(query || "")
    .toLowerCase()
    .trim()
    .replace(/\.js\b/g, "js")
    .replace(/\s+/g, " ");
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/react\.js/g, "reactjs")
    .replace(/react js/g, "reactjs")
    .replace(/node\.js/g, "nodejs")
    .replace(/node js/g, "nodejs")
    .replace(/next\.js/g, "nextjs")
    .replace(/\s+/g, " ");
}

function calculateQueryRelevance(job, query) {
  const q = normalizeQuery(query);

  if (!q) return 0;

  const title = normalizeText(job.title);
  const description = normalizeText(job.description);
  const skills = (job.skills || []).map(normalizeText);

  const queryNormalized = normalizeText(q);

  let relevance = 0;

  // Exact skill match
  if (skills.some(skill => skill === queryNormalized)) {
    relevance += 35;
  }

  // Query in title
  if (title.includes(queryNormalized)) {
    relevance += 35;
  }

  // Query in description
  if (description.includes(queryNormalized)) {
    relevance += 15;
  }

  // Handle React / ReactJS / React Native
  if (queryNormalized === "react") {
    if (title.includes("react")) relevance += 20;

    if (skills.some(skill => skill === "react")) {
      relevance += 15;
    }

    if (description.includes("react")) {
      relevance += 10;
    }
  }

  // Handle Node / Node.js
  if (queryNormalized === "node" || queryNormalized === "nodejs") {
    if (title.includes("node")) relevance += 20;

    if (skills.some(skill => skill === "nodejs" || skill === "node")) {
      relevance += 15;
    }

    if (description.includes("node")) {
      relevance += 10;
    }
  }

  // Prevent relevance from becoming excessive
  return Math.min(relevance, 70);
}

function calculateJobScore(job, query) {
  const text = normalizeText(
    `${job.title} ${job.description}`
  );

  let score = 30;

  // Query relevance is the most important factor
  score += calculateQueryRelevance(job, query);

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

  for (const match of text.matchAll(
    /(\d+)\s*(?:\+|to|-)?\s*(?:\d+)?\s*(?:years?|yrs?)/gi
  )) {
    const value = Number(match[1]);

    if (Number.isFinite(value)) {
      years.push(value);
    }
  }

  if (years.length) {
    const minYears = Math.min(...years);

    if (minYears <= 1) {
      score += 20;
    } else if (minYears <= 2) {
      score += 8;
    } else if (minYears <= 3) {
      score -= 8;
    } else if (minYears <= 5) {
      score -= 18;
    } else {
      score -= 25;
    }
  }

  // Relevant technical skills
  if (job.skills?.length) {
    score += Math.min(job.skills.length * 3, 15);
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
  if (score >= 30) return "weak-match";
  return "low-match";
}

module.exports = {
  calculateJobScore,
  getMatchLabel
};
