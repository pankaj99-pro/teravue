ALTER TABLE public.activities 
  ADD COLUMN IF NOT EXISTS train_number text,
  ADD COLUMN IF NOT EXISTS train_name text,
  ADD COLUMN IF NOT EXISTS intermediate_stops jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS departure_time text,
  ADD COLUMN IF NOT EXISTS arrival_time text,
  ADD COLUMN IF NOT EXISTS platform text;