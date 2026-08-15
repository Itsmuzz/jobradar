const POSITIVE_SIGNALS = [
  ["fresher", 15],
  ["freshers", 15],
  ["entry level", 15],
  ["entry-level", 15],
  ["no experience", 15],
  ["0-1 year", 15],
  ["0–1 year", 15],
  ["0 to 1 year", 15],
  ["graduate", 8],
  ["intern", 15],
  ["internship", 15],
  ["trainee", 12]
];

const SENIOR_SIGNALS = [
  ["senior", -15],
  ["lead", -20],
  ["principal", -25],
  ["director", -35],
  ["manager", -30],
  ["head of", -35],
  ["staff engineer", -25],
  ["architect", -20]
];

const IRRELEVANT_ROLES = [
  "business development",
  "sales development",
  "sales executive",
  "account manager",
  "business development manager",
  "business development executive",
  "administrative assistant",
  "delivery manager"
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWord(text, value) {
  const pattern = new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(value)}(?=$|[^a-z0-9])`,
    "i"
  );

  return pattern.test(text);
}

function calculateJobScore(job, query = "") {
  const title = String(job.title || "").toLowerCase();
  const description = String(job.description || "").toLowerCase();
  const skills = (job.skills || []).map(skill => String(skill).toLowerCase());

  const text = `${title} ${description}`;

  let score = 30;

  /*
   * QUERY RELEVANCE
   * This is intentionally the strongest part of the score.
   */
  const queryTerms = String(query)
    .toLowerCase()
    .split(/[\s,]+/)
    .map(term => term.trim())
    .filter(Boolean);

  if (queryTerms.length) {
    let titleMatches = 0;
    let skillMatches = 0;
    let descriptionMatches = 0;

    for (const term of queryTerms) {
      if (containsWord(title, term)) {
        titleMatches++;
      }

      if (skills.some(skill => containsWord(skill, term))) {
        skillMatches++;
      }

      if (containsWord(description, term)) {
        descriptionMatches++;
      }
    }

    if (titleMatches > 0) {
      score += 30;
    }

    if (skillMatches > 0) {
      score += 15;
    }

    if (descriptionMatches > 0) {
      score += 10;
    }

    /*
     * If the query does not appear meaningfully anywhere,
     * heavily reduce the job.
     */
    if (
      titleMatches === 0 &&
      skillMatches === 0 &&
      descriptionMatches === 0
    ) {
      score -= 30;
    }
  }

  /*
   * FRESHER / ENTRY LEVEL SIGNALS
   */
  for (const [signal, points] of POSITIVE_SIGNALS) {
    if (text.includes(signal)) {
      score += points;
    }
  }

  /*
   * SENIORITY
   */
  for (const [signal, points] of SENIOR_SIGNALS) {
    if (containsWord(text, signal)) {
      score += points;
    }
  }

  /*
   * EXPERIENCE
   */
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
      score += 15;
    } else if (minYears <= 2) {
      score += 10;
    } else if (minYears <= 3) {
      score += 5;
    } else if (minYears <= 5) {
      score -= 5;
    } else if (minYears <= 8) {
      score -= 15;
    } else {
      score -= 25;
    }
  }

  /*
   * TECHNICAL SKILLS
   */
  if (skills.length) {
    score += Math.min(skills.length * 2, 10);
  }

  /*
   * IRRELEVANT ROLES
   */
  for (const role of IRRELEVANT_ROLES) {
    if (text.includes(role)) {
      score -= 30;
      break;
    }
  }

  /*
   * FRESHNESS
   */
  const createdTime = new Date(job.created).getTime();

  if (Number.isFinite(createdTime)) {
    const ageDays = Math.max(
      0,
      (Date.now() - createdTime) / (24 * 60 * 60 * 1000)
    );

    if (ageDays <= 7) {
      score += 5;
    } else if (ageDays <= 14) {
      score += 3;
    } else if (ageDays <= 30) {
      score += 1;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
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
