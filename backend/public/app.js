const form = document.getElementById("searchForm");
const jobsEl = document.getElementById("jobs");
const statusEl = document.getElementById("status");
const resultCount = document.getElementById("resultCount");
const savedJobs = JSON.parse(localStorage.getItem("jobradar_saved") || "{}");
const resultsTitle = document.getElementById("resultsTitle");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const loadMoreBtn = document.getElementById("loadMore");
let currentPage = 1;

function esc(value=""){
  return String(value).replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function params(){
  const p = new URLSearchParams({
    query: document.getElementById("query").value.trim(),
    location: document.getElementById("location").value.trim(),
    page: currentPage
  });

  const experience = document.getElementById("experience").value;
  const type = document.getElementById("type").value;
  const skill = document.getElementById("skill").value;

  if(experience) p.set("experience",experience);
  if(type) p.set("type",type);
  if(skill) p.set("skill",skill);
  if(document.getElementById("remote").checked) p.set("remote","true");

  return p;
}

async function searchJobs(e){
  if(e) e.preventDefault();

  currentPage = 1;
  window.jobradarJobs = [];
  jobsEl.innerHTML = "";
  loadMoreBtn.classList.add("hidden");
  statusEl.textContent = "Searching fresh jobs...";
  resultCount.textContent = "";

  await fetchJobs(false);
}

async function fetchJobs(append=false){
  if(append){
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Loading...";
    statusEl.textContent = "Loading more jobs...";
  }

  try{
    const response = await fetch(`/api/jobs?${params()}`);
    const data = await response.json();

    if(!response.ok){
      throw new Error(data.error || "Unable to fetch jobs");
    }

    statusEl.textContent = "";
    resultsTitle.textContent = `Jobs for ${data.filters.query}`;

    const existingCount = jobsEl.querySelectorAll("[data-job-id]").length;

    if(!append){
      resultCount.textContent = `${data.count} jobs found`;
    }else{
      const previous = Number(
        (resultCount.textContent || "").match(/\d+/)?.[0] || 0
      );
      resultCount.textContent = `${previous + data.count} jobs loaded`;
    }

    if(!data.jobs.length){
      if(!append){
        jobsEl.innerHTML = `
          <div class="job">
            <h3>No matching jobs found</h3>
            <p class="description">
              Try another keyword, location, or remove a filter.
            </p>
          </div>`;
      }

      loadMoreBtn.classList.add("hidden");
      return;
    }

    const cards = data.jobs
      .map((job,i) => card(job, existingCount + i))
      .join("");

    if(append){
      jobsEl.insertAdjacentHTML("beforeend", cards);
    }else{
      jobsEl.innerHTML = cards;
    }

    loadMoreBtn.classList.toggle("hidden", !data.hasMore);
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = "Load more jobs";

    bindJobActions();

  }catch(error){
    statusEl.textContent = error.message;
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = "Load more jobs";
  }
}

function bindJobActions(){
  document.querySelectorAll("[data-details]").forEach(btn => {
    if(btn.dataset.bound) return;

    btn.dataset.bound = "true";

    btn.addEventListener("click", () => {
      const jobId = btn.dataset.jobId;
      const job = window.jobradarJobs?.find(
        x => String(x.id) === String(jobId)
      );

      if(job) openDetails(job);
    });
  });

  document.querySelectorAll("[data-save]").forEach(btn => {
    if(btn.dataset.bound) return;

    btn.dataset.bound = "true";

    btn.addEventListener("click", () => {
      const jobId = btn.dataset.jobId;
      const job = window.jobradarJobs?.find(
        x => String(x.id) === String(jobId)
      );

      if(!job) return;

      toggleSave(job);

      btn.textContent = savedJobs[job.id]
        ? "♥ Saved"
        : "♡ Save";
    });
  });
}

function card(job,i){
  window.jobradarJobs = window.jobradarJobs || [];

  const existingIndex = window.jobradarJobs.findIndex(
    x => String(x.id) === String(job.id)
  );

  if(existingIndex === -1){
    window.jobradarJobs.push(job);
  }else{
    window.jobradarJobs[existingIndex] = job;
  }

  const tags = [
    job.experience,
    job.type,
    job.workMode,
    ...(job.skills || []).slice(0,4)
  ].filter(Boolean);

  return `
    <article class="job" data-job-id="${esc(job.id)}">
      <div class="job-top">
        <div>
          <h3>${esc(job.title)}</h3>
          <div class="company">
            ${esc(job.company)} · ${esc(job.location)}
          </div>
        </div>

        <div class="score">${esc(job.matchScore)}%</div>
      </div>

      <div class="meta">
        ${tags.map(x => `<span class="tag">${esc(x)}</span>`).join("")}
      </div>

      <p class="description">${esc(job.description)}</p>

      <div class="job-actions">
        <button
          class="details"
          data-details
          data-job-id="${esc(job.id)}">
          View details
        </button>

        <button
          class="details save-btn"
          data-save
          data-job-id="${esc(job.id)}">
          ${savedJobs[job.id] ? "♥ Saved" : "♡ Save"}
        </button>

        <a
          class="apply"
          href="${esc(job.url)}"
          target="_blank"
          rel="noopener noreferrer">
          Apply →
        </a>
      </div>
    </article>`;
}

function openDetails(job){
  modalBody.innerHTML=`
    <h2 id="modalTitle">${esc(job.title)}</h2>
    <p class="company">${esc(job.company)} · ${esc(job.location)}</p>

    <div class="meta">
      <span class="tag">${esc(job.matchScore)}% match</span>
      <span class="tag">${esc(job.experience)}</span>
      <span class="tag">${esc(job.type)}</span>
      <span class="tag">${esc(job.workMode)}</span>
    </div>

    <p class="description">${esc(job.description)}</p>

    <h3>Skills</h3>
    <div class="meta">
      ${(job.skills||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join("") || "<span class=\"company\">Not specified</span>"}
    </div>

    <a class="apply" style="display:block;margin-top:20px;text-decoration:none;text-align:center"
       href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">Apply for this job →</a>
  `;

  modal.classList.remove("hidden");
}

document.getElementById("closeModal").onclick=()=>modal.classList.add("hidden");
document.querySelector(".modal-bg").onclick=()=>modal.classList.add("hidden");
form.addEventListener("submit",searchJobs);

searchJobs();


function toggleSave(job){
  if(savedJobs[job.id]){
    delete savedJobs[job.id];
  }else{
    savedJobs[job.id] = job;
  }

  localStorage.setItem("jobradar_saved", JSON.stringify(savedJobs));
  updateSavedCount();
}

function updateSavedCount(){
  const el=document.getElementById("savedCount");
  if(el){
    el.textContent=Object.keys(savedJobs).length;
  }
}

updateSavedCount();


loadMoreBtn.addEventListener("click", async ()=>{
  currentPage++;
  await fetchJobs(true);
  window.scrollBy({top: 400, behavior: "smooth"});
});
