-- Create a new table for storing PDF information
CREATE TABLE IF NOT EXISTS pdf_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add an index on user_id for faster queries
CREATE INDEX idx_pdf_documents_user_id ON pdf_documents(user_id);

-- Add a foreign key to the embeddings table to link embeddings with PDF documents
ALTER TABLE embeddings ADD COLUMN pdf_id UUID REFERENCES pdf_documents(id) ON DELETE CASCADE;

-- Create an index on pdf_id in the embeddings table
CREATE INDEX idx_embeddings_pdf_id ON embeddings(pdf_id);