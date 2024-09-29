

-- Enable RLS on the pdfs table
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;

-- Policy for inserting new records
CREATE POLICY "Users can insert their own pdfs"
ON pdfs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for selecting records
CREATE POLICY "Users can view their own pdfs"
ON pdfs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy for updating records
CREATE POLICY "Users can update their own pdfs"
ON pdfs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy for deleting records
CREATE POLICY "Users can delete their own pdfs"
ON pdfs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
