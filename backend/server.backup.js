require("dotenv").config();

const express = require("express");
const cors = require("cors");

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
  const lower = text.toLowerCase();

  if (
    /\b(fresher|freshers|entry[- ]level|graduate|graduates|no experience)\b/i.test(lower)
  ) {
    return "fresher";
  }

  const years = [...lower.matchAll(/(\d+)\+?\s*(?:years?|yrs?)/gi)]
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
  const lower = text.toLowerCase();

  return (
    /\b(fresher|freshers|entry[- ]level|graduate|graduates|0[- ]?1\s*years?|no experience)\b/i.test(
      lower
    )
  );
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

    const url = new URL(
      `https://api.adzuna.com/v1/api/jobs/in/search/${Number(page) || 1}`
    );

    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    url.searchParams.set("what", String(query));
    url.searchParams.set("where", String(location));
    url.searchParams.set("results_per_page", "50");
    url.searchParams.set("content-type", "application/json");

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Adzuna request failed"
      });
    }

    const data = await response.json();

    let jobs = (data.results || []).map(normalizeJob);

    jobs = removeDuplicates(jobs);

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

    jobs.sort((a, b) =>
      new Date(b.created).getTime() - new Date(a.created).getTime()
    );

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
