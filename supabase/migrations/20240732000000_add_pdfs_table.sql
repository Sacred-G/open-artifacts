-- Create the pdfs table
CREATE TABLE pdfs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS) on the pdfs table
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow users to see only their own PDFs
CREATE POLICY "Users can view their own PDFs" ON pdfs
  FOR SELECT USING (auth.uid() = user_id);

-- Create a policy to allow users to insert their own PDFs
CREATE POLICY "Users can insert their own PDFs" ON pdfs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create a policy to allow users to update their own PDFs
CREATE POLICY "Users can update their own PDFs" ON pdfs
  FOR UPDATE USING (auth.uid() = user_id);

-- Create a policy to allow users to delete their own PDFs
CREATE POLICY "Users can delete their own PDFs" ON pdfs
  FOR DELETE USING (auth.uid() = user_id);