require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { calculateJobScore, getMatchLabel } = require("./scoring");

const app = express();

app.use(cors());
app.use(express.json());

const SKILLS = [
  "react", "react native", "next.js", "nextjs",
  "javascript", "typescript", "node.js", "nodejs",
  "express.js", "python", "django", "flask",
  "java", "spring", "php", "laravel",
  "html", "css", "tailwind", "angular",
  "vue", "mongodb", "mysql", "postgresql",
  "sql", "aws", "docker", "kubernetes",
  "flutter", "android", "ios"
];

function cleanText(text = "") {
  return String(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectSkills(text) {
  const lower = text.toLowerCase();

  return SKILLS.filter(skill => {
    const pattern = new RegExp(
      `(^|[^a-z0-9])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^a-z0-9])`,
      "i"
    );

    return pattern.test(lower);
  });
}

function detectExperience(text) {
  const lower = String(text || "").toLowerCase();

  // Explicit fresher signals.
  if (
    /\b(fresher|freshers|entry[- ]level|graduate|graduates|no experience)\b/i.test(lower)
  ) {
    return "fresher";
  }

  // 0-1 year / 0 to 1 year should be treated as fresher.
  if (
    /\b0\s*(?:-|–|to)\s*1\s*(?:years?|yrs?)\b/i.test(lower)
  ) {
    return "fresher";
  }

  // Ranges such as 5-8 years.
  const ranges = [
    ...lower.matchAll(
      /\b(\d+)\s*(?:-|–|to)\s*(\d+)\s*(?:years?|yrs?)\b/gi
    )
  ];

  if (ranges.length) {
    const minYears = Number(ranges[0][1]);
    const maxYears = Number(ranges[0][2]);

    if (Number.isFinite(minYears) && Number.isFinite(maxYears)) {
      if (minYears === 0 && maxYears <= 1) {
        return "fresher";
      }

      return `${minYears}-${maxYears} years`;
    }
  }

  // Single values such as 5+ years or 9 years.
  const years = [
    ...lower.matchAll(
      /\b(\d+)\+?\s*(?:years?|yrs?)\b/gi
    )
  ]
    .map(match => Number(match[1]))
    .filter(Number.isFinite);

  if (years.length) {
    return `${Math.min(...years)}+ years`;
  }

  return "not specified";
}

function detectType(text) {
  const lower = text.toLowerCase();

  if (/\b(internship|intern|trainee)\b/i.test(lower)) {
    return "internship";
  }

  return "full-time";
}

function detectWorkMode(text) {
  const lower = text.toLowerCase();

  if (/\b(remote|work from home|wfh)\b/i.test(lower)) {
    return "remote";
  }

  if (/\bhybrid\b/i.test(lower)) {
    return "hybrid";
  }

  return "on-site";
}

function isFresherFriendly(text) {
  const lower = String(text || "").toLowerCase();

  // Explicitly experienced roles should not be treated as fresher jobs.
  const experiencedPattern =
    /\b(?:1\+|2\+|3\+|4\+|5\+|6\+|7\+|8\+|9\+|\d{2,}\+?)\s*(?:years?|yrs?)\b/i;

  // Explicit fresher signals.
  const fresherPattern =
    /\b(?:fresher|freshers|entry[- ]level|graduate|graduates|no experience)\b/i;

  // Explicit 0-1 year signals.
  const zeroToOnePattern =
    /\b0\s*(?:-|–|to)\s*1\s*(?:years?|yrs?)\b/i;

  // If the job explicitly requires 1+ years or more, don't classify it as fresher.
  if (experiencedPattern.test(lower)) {
    return false;
  }

  return fresherPattern.test(lower) || zeroToOnePattern.test(lower);
}

function makeSummary(description) {
  const clean = cleanText(description);

  if (clean.length <= 280) {
    return clean;
  }

  return `${clean.slice(0, 277).trim()}...`;
}

function normalizeJob(job) {
  const description = cleanText(job.description);
  const combined = `${job.title} ${description}`;

  return {
    id: String(job.id),
    title: cleanText(job.title),
    company: cleanText(job.company?.display_name || "Unknown"),
    location: cleanText(job.location?.display_name || "India"),
    description: makeSummary(description),
    url: job.redirect_url,
    created: job.created,
    salaryMin: job.salary_min ?? null,
    salaryMax: job.salary_max ?? null,
    skills: detectSkills(combined),
    experience: detectExperience(combined),
    type: detectType(combined),
    workMode: detectWorkMode(combined),
    fresherFriendly: isFresherFriendly(combined),
    source: "Adzuna"
  };
}

function removeDuplicates(jobs) {
  const seen = new Set();

  return jobs.filter(job => {
    const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}|${job.location.toLowerCase()}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}


function isQueryRelevant(job, query = "") {
  const q = String(query).toLowerCase().trim();

  if (!q) return true;

  const title = String(job.title || "").toLowerCase();
  const skills = (job.skills || []).map(String).map(x => x.toLowerCase());

  const aliases = {
    react: ["react", "react.js", "reactjs", "react native"],
    "react native": ["react native", "react"],
    node: ["node", "node.js", "nodejs", "express", "backend"],
    "node.js": ["node", "node.js", "nodejs", "express", "backend"],
    python: ["python", "django", "flask", "pyspark"],
    javascript: ["javascript", "js", "react", "node", "node.js"],
    typescript: ["typescript", "ts"],
    java: ["java", "spring"],
    frontend: ["frontend", "front-end", "react", "angular", "vue"],
    backend: ["backend", "back-end", "node", "node.js", "python", "java"],
    developer: ["developer", "engineer", "programmer", "software"],
    engineer: ["engineer", "developer", "software"]
  };

  const terms = aliases[q] || [q];

  const titleMatch = terms.some(term => title.includes(term));
  const skillMatch = terms.some(term =>
    skills.some(skill => skill === term || skill.includes(term) || term.includes(skill))
  );

  if (titleMatch || skillMatch) {
    return true;
  }

  // For generic searches, allow a strong technical signal in the title.
  if (q === "developer" || q === "engineer") {
    return /\b(software|developer|engineer|programmer|developer)\b/i.test(title);
  }

  return false;
}

function removeOldJobs(jobs, maxAgeDays = 30) {
  const now = Date.now();
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

  return jobs.filter(job => {
    const createdTime = new Date(job.created).getTime();

    if (!Number.isFinite(createdTime)) {
      return false;
    }

    return now - createdTime <= maxAge;
  });
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "JobRadar API"
  });
});

app.get("/api/jobs", async (req, res) => {
  try {
    const {
      query = "developer",
      location = "india",
      page = "1",
      experience,
      type,
      remote,
      skill
    } = req.query;

    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) {
      return res.status(500).json({
        error: "Adzuna API credentials are not configured"
      });
    }

      const requestedPage = Math.max(Number(page) || 1, 1);
      const pagesToFetch = 3;
      const allResults = [];
      let successfulPages = 0;

      for (
        let currentPage = requestedPage;
        currentPage < requestedPage + pagesToFetch;
        currentPage++
      ) {
        try {
          const url = new URL(
            `https://api.adzuna.com/v1/api/jobs/in/search/${currentPage}`
          );

          url.searchParams.set("app_id", appId);
          url.searchParams.set("app_key", appKey);
          url.searchParams.set("what", String(query));
          url.searchParams.set("where", String(location));
          url.searchParams.set("results_per_page", "50");
          url.searchParams.set("content-type", "application/json");

          const response = await fetch(url, {
            signal: AbortSignal.timeout(8000)
          });

          if (!response.ok) {
            console.warn(
              `Adzuna page ${currentPage} failed with status ${response.status}`
            );
            continue;
          }

          const data = await response.json();
          allResults.push(...(data.results || []));
          successfulPages++;
        } catch (error) {
          console.warn(
            `Adzuna page ${currentPage} failed:`,
            error?.code || error?.message || error
          );
        }
      }

      if (successfulPages === 0) {
        return res.status(502).json({
          error: "Unable to fetch jobs from Adzuna"
        });
      }

      let jobs = allResults.map(normalizeJob);



      // Remove jobs older than 30 days
      jobs = removeOldJobs(jobs, 30);

      jobs = removeDuplicates(jobs);

      // Remove jobs that are not relevant to the user's search query.
      jobs = jobs.filter(job => isQueryRelevant(job, query));

      if (experience === "fresher") {
        jobs = jobs.filter(job => job.fresherFriendly);
      }

      if (type === "internship") {
        jobs = jobs.filter(job => job.type === "internship");
      }

      if (remote === "true") {
        jobs = jobs.filter(job => job.workMode === "remote");
      }

      if (skill) {
        const requestedSkill = String(skill).toLowerCase();

        jobs = jobs.filter(job =>
          job.skills.some(jobSkill =>
            jobSkill.toLowerCase() === requestedSkill
          )
        );
      }

      jobs = jobs.map(job => {
        const matchScore = calculateJobScore(job, query);

        return {
          ...job,
          matchScore,
          matchLabel: getMatchLabel(matchScore)
        };
      });

      jobs.sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }

        return new Date(b.created).getTime() -
          new Date(a.created).getTime();
      });

      // Keep the best 50 jobs for the API response
      jobs = jobs.slice(0, 50);
    res.json({
      count: jobs.length,
      filters: {
        query,
        location,
        experience: experience || null,
        type: type || null,
        remote: remote || null,
        skill: skill || null
      },
      jobs
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch jobs"
    });
  }
});

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
  console.log(`🚀 JobRadar API running on http://localhost:${port}`);
});
