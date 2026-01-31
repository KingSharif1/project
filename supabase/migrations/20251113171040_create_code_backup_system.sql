/*
  # Code Backup System

  1. New Tables
    - `code_backups`
      - `id` (uuid, primary key)
      - `file_path` (text) - Path to the file
      - `file_name` (text) - Name of the file
      - `file_content` (text) - The actual code content
      - `file_type` (text) - js, jsx, json, css, etc.
      - `category` (text) - mobile-apps, web-app, database, etc.
      - `version` (integer) - Version number for tracking changes
      - `description` (text) - Description of the file/changes
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Allow authenticated users to read
    - Only service role can write (for system backups)
*/

-- Create code_backups table
CREATE TABLE IF NOT EXISTS code_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_content text NOT NULL,
  file_type text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  version integer NOT NULL DEFAULT 1,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_code_backups_file_path ON code_backups(file_path);
CREATE INDEX IF NOT EXISTS idx_code_backups_category ON code_backups(category);
CREATE INDEX IF NOT EXISTS idx_code_backups_file_name ON code_backups(file_name);
CREATE INDEX IF NOT EXISTS idx_code_backups_created_at ON code_backups(created_at DESC);

-- Enable RLS
ALTER TABLE code_backups ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all backups
CREATE POLICY "Authenticated users can read code backups"
  ON code_backups
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to manage backups
CREATE POLICY "Service role can manage code backups"
  ON code_backups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a function to get latest version of a file
CREATE OR REPLACE FUNCTION get_latest_code_version(p_file_path text)
RETURNS TABLE (
  id uuid,
  file_path text,
  file_name text,
  file_content text,
  file_type text,
  category text,
  version integer,
  description text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cb.id,
    cb.file_path,
    cb.file_name,
    cb.file_content,
    cb.file_type,
    cb.category,
    cb.version,
    cb.description,
    cb.created_at
  FROM code_backups cb
  WHERE cb.file_path = p_file_path
  ORDER BY cb.version DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all files in a category
CREATE OR REPLACE FUNCTION get_code_files_by_category(p_category text)
RETURNS TABLE (
  id uuid,
  file_path text,
  file_name text,
  file_type text,
  version integer,
  description text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (cb.file_path)
    cb.id,
    cb.file_path,
    cb.file_name,
    cb.file_type,
    cb.version,
    cb.description,
    cb.created_at
  FROM code_backups cb
  WHERE cb.category = p_category
  ORDER BY cb.file_path, cb.version DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
