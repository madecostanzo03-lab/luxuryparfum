-- Add concentration enum and columns
CREATE TYPE concentration_type AS ENUM ('edt', 'edp', 'edc', 'parfum', 'extrait');

ALTER TABLE public.perfumes
  ADD COLUMN concentration concentration_type,
  ADD COLUMN size_ml INTEGER,
  ALTER COLUMN fragrance_type DROP NOT NULL;