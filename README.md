# CAMPUSLINK

CAMPUSLINK is an AI-powered campus placement management platform built with React, TypeScript, Vite, and Supabase. It helps placement teams manage students, companies, jobs, applications, interviews, offers, notifications, and analytics in a single dashboard.

## Features

- Student management and profile tracking
- Company and recruiter management
- Job posting and application tracking
- AI-based candidate fit scoring and skill gap analysis
- Interview scheduling and offer tracking
- Notification and email workflows
- Admin dashboard with placement analytics
- Role-based isolation using Supabase auth and database policies

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- Lucide React

## Project Structure

```text
project-bolt-sb1-djay1mmw/
├── README.md
├── project/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── index.css
│   ├── supabase/
│   │   ├── config.toml
│   │   ├── functions/
│   │   └── migrations/
│   └── ...
└── .git/
```

## Prerequisites

Before running the app, install:

- Node.js 18+
- npm
- A Supabase project

## Setup

1. Open the app folder:

```bash
cd project
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the `project` folder and add your Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:

```bash
npm run dev
```

5. Open the local URL shown in the terminal (usually `http://localhost:5173`).

## Production Build

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Supabase Setup

This project expects a Supabase instance with authentication enabled and a database schema matching the SQL migrations in:

```text
project/supabase/migrations/
```

The app also includes a Supabase Edge Function for sending emails:

```text
project/supabase/functions/send-email/
```

Make sure to deploy the function in Supabase before using email-based flows.

## Useful Scripts

```bash
npm run dev      # start development server
npm run build    # production build
npm run preview  # preview build locally
npm run lint     # run ESLint
npm run typecheck # run TypeScript check
```

## Notes

- The app uses a single admin user model with row-level isolation.
- Student, company, job, application, interview, and offer data are stored in Supabase.
- AI-based matching logic is implemented in the frontend utilities and the app's dashboard modules.

## License

This project is currently for internal or educational use unless otherwise specified by the repository owner.
