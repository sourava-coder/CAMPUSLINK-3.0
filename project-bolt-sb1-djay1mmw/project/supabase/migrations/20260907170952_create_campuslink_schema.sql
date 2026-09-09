/*
# CampusLink — AI-Powered Campus Placement Platform

## Overview
Creates the complete database schema for CampusLink, a placement management platform
with AI matching, skill gap analysis, offer tracking, and predictive analytics.

## New Tables
1. `students` — Student profiles with skills, CGPA, projects, assessments
2. `companies` — Recruiter company profiles
3. `jobs` — Job postings with required/preferred skills and eligibility
4. `applications` — Student job applications with AI fit scores
5. `interviews` — Scheduled tests and interviews
6. `offers` — Offer letters with email tracking
7. `notifications` — Placement alerts and reminders
8. `emails` — Log of all emails sent through the platform

## Security
- RLS enabled on all tables
- All tables accessible to authenticated admins (placement officers)
- No user_id ownership — data is shared among all authenticated admins
*/

-- Students
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  roll_number text,
  branch text,
  cgpa numeric DEFAULT 0,
  skills text[] DEFAULT '{}',
  skill_levels jsonb DEFAULT '{}',
  projects integer DEFAULT 0,
  internships integer DEFAULT 0,
  backlogs integer DEFAULT 0,
  certifications text[] DEFAULT '{}',
  aptitude_score numeric DEFAULT 0,
  communication_score numeric DEFAULT 0,
  resume_quality numeric DEFAULT 0,
  interview_readiness numeric DEFAULT 0,
  status text DEFAULT 'unplaced',
  risk_level text DEFAULT 'low',
  placed_company text,
  placed_package numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS graduation_year integer;
ALTER TABLE students ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS github_url text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS resume_url text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS resume_text text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS email_verification_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS admin_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  college_name text DEFAULT 'CampusLink College',
  placement_cell_email text,
  sender_name text DEFAULT 'CampusLink Placement Cell',
  default_email_footer text DEFAULT 'This email was sent by the CampusLink Placement Cell.',
  updated_at timestamptz DEFAULT now()
);

INSERT INTO admin_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  website text,
  contact_email text,
  contact_phone text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  required_skills text[] DEFAULT '{}',
  preferred_skills text[] DEFAULT '{}',
  min_cgpa numeric DEFAULT 0,
  package_lpa numeric DEFAULT 0,
  location text,
  job_type text DEFAULT 'full-time',
  deadline date,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  status text DEFAULT 'applied',
  fit_score numeric DEFAULT 0,
  fit_breakdown jsonb DEFAULT '{}',
  skill_gaps text[] DEFAULT '{}',
  applied_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Interviews / Tests
CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  type text DEFAULT 'interview',
  scheduled_at timestamptz,
  duration_minutes integer DEFAULT 60,
  venue text,
  round integer DEFAULT 1,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);

-- Offers
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  company_name text,
  job_title text,
  package_lpa numeric DEFAULT 0,
  offer_letter_text text,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'alert',
  sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Email log
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  type text DEFAULT 'notification',
  status text DEFAULT 'logged',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Helper: drop all policies for a table (idempotent re-run)
-- Students policies
DROP POLICY IF EXISTS "auth_select_students" ON students;
CREATE POLICY "auth_select_students" ON students FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_students" ON students;
CREATE POLICY "auth_insert_students" ON students FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_students" ON students;
CREATE POLICY "auth_update_students" ON students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_students" ON students;
CREATE POLICY "auth_delete_students" ON students FOR DELETE TO authenticated USING (true);

-- Companies policies
DROP POLICY IF EXISTS "auth_select_companies" ON companies;
CREATE POLICY "auth_select_companies" ON companies FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_companies" ON companies;
CREATE POLICY "auth_insert_companies" ON companies FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_companies" ON companies;
CREATE POLICY "auth_update_companies" ON companies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_companies" ON companies;
CREATE POLICY "auth_delete_companies" ON companies FOR DELETE TO authenticated USING (true);

-- Jobs policies
DROP POLICY IF EXISTS "auth_select_jobs" ON jobs;
CREATE POLICY "auth_select_jobs" ON jobs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_jobs" ON jobs;
CREATE POLICY "auth_insert_jobs" ON jobs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_jobs" ON jobs;
CREATE POLICY "auth_update_jobs" ON jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_jobs" ON jobs;
CREATE POLICY "auth_delete_jobs" ON jobs FOR DELETE TO authenticated USING (true);

-- Applications policies
DROP POLICY IF EXISTS "auth_select_applications" ON applications;
CREATE POLICY "auth_select_applications" ON applications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_applications" ON applications;
CREATE POLICY "auth_insert_applications" ON applications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_applications" ON applications;
CREATE POLICY "auth_update_applications" ON applications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_applications" ON applications;
CREATE POLICY "auth_delete_applications" ON applications FOR DELETE TO authenticated USING (true);

-- Interviews policies
DROP POLICY IF EXISTS "auth_select_interviews" ON interviews;
CREATE POLICY "auth_select_interviews" ON interviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_interviews" ON interviews;
CREATE POLICY "auth_insert_interviews" ON interviews FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_interviews" ON interviews;
CREATE POLICY "auth_update_interviews" ON interviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_interviews" ON interviews;
CREATE POLICY "auth_delete_interviews" ON interviews FOR DELETE TO authenticated USING (true);

-- Offers policies
DROP POLICY IF EXISTS "auth_select_offers" ON offers;
CREATE POLICY "auth_select_offers" ON offers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_offers" ON offers;
CREATE POLICY "auth_insert_offers" ON offers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_offers" ON offers;
CREATE POLICY "auth_update_offers" ON offers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_offers" ON offers;
CREATE POLICY "auth_delete_offers" ON offers FOR DELETE TO authenticated USING (true);

-- Notifications policies
DROP POLICY IF EXISTS "auth_select_notifications" ON notifications;
CREATE POLICY "auth_select_notifications" ON notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_notifications" ON notifications;
CREATE POLICY "auth_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_notifications" ON notifications;
CREATE POLICY "auth_update_notifications" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_notifications" ON notifications;
CREATE POLICY "auth_delete_notifications" ON notifications FOR DELETE TO authenticated USING (true);

-- Emails policies
DROP POLICY IF EXISTS "auth_select_emails" ON emails;
CREATE POLICY "auth_select_emails" ON emails FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_emails" ON emails;
CREATE POLICY "auth_insert_emails" ON emails FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_emails" ON emails;
CREATE POLICY "auth_delete_emails" ON emails FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_select_admin_settings" ON admin_settings;
CREATE POLICY "auth_select_admin_settings" ON admin_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_admin_settings" ON admin_settings;
CREATE POLICY "auth_insert_admin_settings" ON admin_settings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_admin_settings" ON admin_settings;
CREATE POLICY "auth_update_admin_settings" ON admin_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_interviews_student ON interviews(student_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_offers_student ON offers(student_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(student_id);
