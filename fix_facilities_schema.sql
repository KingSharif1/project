-- Add contact_email column to facilities table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'contact_email') THEN 
        ALTER TABLE facilities ADD COLUMN contact_email TEXT; 
    END IF; 
END $$;

-- Verify column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'facilities' AND column_name = 'contact_email';
