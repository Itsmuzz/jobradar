# JobRadar

Smart job discovery web app that searches fresh jobs, ranks them by relevance, supports filters, pagination, job details and saved jobs.

## Features
- Fresh job search via Adzuna API
- Relevance-based job matching
- Experience, internship, remote and skill filters
- Pagination / Load More
- Job details modal
- Save jobs locally in the browser
- Responsive dark UI

## Tech Stack
- Node.js
- Express 5
- Vanilla JavaScript
- HTML / CSS
- Adzuna Jobs API

## Run locally
```bash
cd backend
npm install
npm start
```

Then open http://localhost:4000

## Environment
Create `backend/.env` with your Adzuna API credentials:
```env
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
```

## Project Structure
```text
jobradar/
├── backend/
│   ├── public/
│   │   ├── index.html
│   │   ├── app.js
│   │   └── styles.css
│   ├── server.js
│   └── package.json
└── README.md
```
