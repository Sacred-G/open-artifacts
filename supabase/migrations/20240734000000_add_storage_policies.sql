-- File: supabase/migrations/20240734000000_add_storage_policies.sql

DO $$ 
BEGIN 
  -- Insert policy for storage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload PDFs'
  ) THEN
    CREATE POLICY "Users can upload PDFs" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'pdfs' AND
        auth.uid() = (SELECT user_id FROM public.pdfs WHERE storage_path = name)
      );
  END IF;

  -- Select policy for storage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can view their own PDFs'
  ) THEN
    CREATE POLICY "Users can view their own PDFs" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'pdfs' AND
        auth.uid() = (SELECT user_id FROM public.pdfs WHERE storage_path = name)
      );
  END IF;

  -- Update policy for storage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own PDFs'
  ) THEN
    CREATE POLICY "Users can update their own PDFs" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'pdfs' AND
        auth.uid() = (SELECT user_id FROM public.pdfs WHERE storage_path = name)
      );
  END IF;

  -- Delete policy for storage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own PDFs'
  ) THEN
    CREATE POLICY "Users can delete their own PDFs" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'pdfs' AND
        auth.uid() = (SELECT user_id FROM public.pdfs WHERE storage_path = name)
      );
  END IF;
END $$;