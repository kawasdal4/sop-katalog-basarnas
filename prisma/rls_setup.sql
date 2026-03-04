-- Enable RLS on SopFile table
ALTER TABLE "SopFile" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on AuditLog table
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Policy for ADMIN (Full access)
CREATE POLICY "Admin full access on SopFile" ON "SopFile"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "User"
    WHERE "User".id = auth.uid()::text
    AND "User".role = 'ADMIN'
  )
);

-- Policy for STAF (View all, but restricted modifications handled via API)
CREATE POLICY "Staf read access on SopFile" ON "SopFile"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "User"
    WHERE "User".id = auth.uid()::text
    AND "User".role = 'STAF'
  )
);

-- Policy for Public Submissions (Insert only)
CREATE POLICY "Public insert access on SopFile" ON "SopFile"
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy for AuditLog (Admin only)
CREATE POLICY "Admin read access on AuditLog" ON "AuditLog"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "User"
    WHERE "User".id = auth.uid()::text
    AND "User".role = 'ADMIN'
  )
);
