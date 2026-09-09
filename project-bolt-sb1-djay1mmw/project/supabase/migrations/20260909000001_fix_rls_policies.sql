-- ===== Add user_id column to tables =====

ALTER TABLE students ADD COLUMN IF NOT EXISTS admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_students_admin_user_id ON students(admin_user_id);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_companies_admin_user_id ON companies(admin_user_id);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_jobs_admin_user_id ON jobs(admin_user_id);

-- ===== Enable RLS =====

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- ===== DROP ALL EXISTING POLICIES =====

-- Students
DROP POLICY IF EXISTS "Users can view their own students" ON students;
DROP POLICY IF EXISTS "Users can insert their own students" ON students;
DROP POLICY IF EXISTS "Users can update their own students" ON students;
DROP POLICY IF EXISTS "Users can delete their own students" ON students;
DROP POLICY IF EXISTS "Admins can view all students" ON students;
DROP POLICY IF EXISTS "Admins can insert students" ON students;
DROP POLICY IF EXISTS "Admins can update students" ON students;
DROP POLICY IF EXISTS "Admins can delete students" ON students;

-- Companies
DROP POLICY IF EXISTS "Users can view their own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Admins can update companies" ON companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON companies;

-- Jobs
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can view all jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can update jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON jobs;

-- Admin Settings
DROP POLICY IF EXISTS "Authenticated users can view admin settings" ON admin_settings;
DROP POLICY IF EXISTS "Authenticated users can update admin settings" ON admin_settings;

-- ===== CREATE NEW POLICIES =====

-- STUDENTS - USER ISOLATION

CREATE POLICY "Users can view their own students"
ON students FOR SELECT
USING (admin_user_id = auth.uid());

CREATE POLICY "Users can insert their own students"
ON students FOR INSERT
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Users can update their own students"
ON students FOR UPDATE
USING (admin_user_id = auth.uid())
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Users can delete their own students"
ON students FOR DELETE
USING (admin_user_id = auth.uid());

-- COMPANIES - USER ISOLATION

CREATE POLICY "Users can view their own companies"
ON companies FOR SELECT
USING (admin_user_id = auth.uid());

CREATE POLICY "Users can insert their own companies"
ON companies FOR INSERT
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Users can update their own companies"
ON companies FOR UPDATE
USING (admin_user_id = auth.uid())
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Users can delete their own companies"
ON companies FOR DELETE
USING (admin_user_id = auth.uid());

-- JOBS - USER ISOLATION

CREATE POLICY "Users can view their own jobs"
ON jobs FOR SELECT
USING (admin_user_id = auth.uid());

CREATE POLICY "Users can insert their own jobs"
ON jobs FOR INSERT
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Users can update their own jobs"
ON jobs FOR UPDATE
USING (admin_user_id = auth.uid())
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Users can delete their own jobs"
ON jobs FOR DELETE
USING (admin_user_id = auth.uid());

-- ADMIN SETTINGS - SHARED ACROSS ALL AUTHENTICATED USERS

CREATE POLICY "Authenticated users can view admin settings"
ON admin_settings FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update admin settings"
ON admin_settings FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
