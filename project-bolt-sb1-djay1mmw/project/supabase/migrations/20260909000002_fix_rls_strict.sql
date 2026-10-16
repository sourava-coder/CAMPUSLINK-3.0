-- ===== FIX: Preserve existing data and enforce owner-scoped RLS =====

-- ===== UPDATE RLS POLICIES TO BE MORE STRICT =====

-- Drop all old policies
DROP POLICY IF EXISTS "Users can view their own students" ON students;
DROP POLICY IF EXISTS "Users can insert their own students" ON students;
DROP POLICY IF EXISTS "Users can update their own students" ON students;
DROP POLICY IF EXISTS "Users can delete their own students" ON students;
DROP POLICY IF EXISTS "view_own_students" ON students;
DROP POLICY IF EXISTS "insert_own_students" ON students;
DROP POLICY IF EXISTS "update_own_students" ON students;
DROP POLICY IF EXISTS "delete_own_students" ON students;
DROP POLICY IF EXISTS "auth_select_students" ON students;
DROP POLICY IF EXISTS "auth_insert_students" ON students;
DROP POLICY IF EXISTS "auth_update_students" ON students;
DROP POLICY IF EXISTS "auth_delete_students" ON students;

DROP POLICY IF EXISTS "Users can view their own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON companies;
DROP POLICY IF EXISTS "view_own_companies" ON companies;
DROP POLICY IF EXISTS "insert_own_companies" ON companies;
DROP POLICY IF EXISTS "update_own_companies" ON companies;
DROP POLICY IF EXISTS "delete_own_companies" ON companies;
DROP POLICY IF EXISTS "auth_select_companies" ON companies;
DROP POLICY IF EXISTS "auth_insert_companies" ON companies;
DROP POLICY IF EXISTS "auth_update_companies" ON companies;
DROP POLICY IF EXISTS "auth_delete_companies" ON companies;

DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;
DROP POLICY IF EXISTS "view_own_jobs" ON jobs;
DROP POLICY IF EXISTS "insert_own_jobs" ON jobs;
DROP POLICY IF EXISTS "update_own_jobs" ON jobs;
DROP POLICY IF EXISTS "delete_own_jobs" ON jobs;
DROP POLICY IF EXISTS "auth_select_jobs" ON jobs;
DROP POLICY IF EXISTS "auth_insert_jobs" ON jobs;
DROP POLICY IF EXISTS "auth_update_jobs" ON jobs;
DROP POLICY IF EXISTS "auth_delete_jobs" ON jobs;

-- ===== CREATE STRICTER POLICIES =====

-- STUDENTS - ONLY VIEW OWN DATA
CREATE POLICY "view_own_students"
ON students FOR SELECT
TO authenticated
USING (admin_user_id = auth.uid());

CREATE POLICY "insert_own_students"
ON students FOR INSERT
TO authenticated
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "update_own_students"
ON students FOR UPDATE
TO authenticated
USING (admin_user_id = auth.uid())
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "delete_own_students"
ON students FOR DELETE
TO authenticated
USING (admin_user_id = auth.uid());

-- COMPANIES - ONLY VIEW OWN DATA
CREATE POLICY "view_own_companies"
ON companies FOR SELECT
TO authenticated
USING (admin_user_id = auth.uid());

CREATE POLICY "insert_own_companies"
ON companies FOR INSERT
TO authenticated
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "update_own_companies"
ON companies FOR UPDATE
TO authenticated
USING (admin_user_id = auth.uid())
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "delete_own_companies"
ON companies FOR DELETE
TO authenticated
USING (admin_user_id = auth.uid());

-- JOBS - ONLY VIEW OWN DATA
CREATE POLICY "view_own_jobs"
ON jobs FOR SELECT
TO authenticated
USING (admin_user_id = auth.uid());

CREATE POLICY "insert_own_jobs"
ON jobs FOR INSERT
TO authenticated
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "update_own_jobs"
ON jobs FOR UPDATE
TO authenticated
USING (admin_user_id = auth.uid())
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "delete_own_jobs"
ON jobs FOR DELETE
TO authenticated
USING (admin_user_id = auth.uid());
