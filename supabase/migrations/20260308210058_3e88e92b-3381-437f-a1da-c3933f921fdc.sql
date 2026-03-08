
-- Add transport_mode column (existing rows default to 'car')
ALTER TABLE public.trip_routes ADD COLUMN IF NOT EXISTS transport_mode text NOT NULL DEFAULT 'car';

-- Rename columns for clarity if they exist with old names
-- start_location -> from_location, end_location -> to_location
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_routes' AND column_name = 'start_location') THEN
    ALTER TABLE public.trip_routes RENAME COLUMN start_location TO from_location;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_routes' AND column_name = 'end_location') THEN
    ALTER TABLE public.trip_routes RENAME COLUMN end_location TO to_location;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_routes' AND column_name = 'travel_time_minutes') THEN
    ALTER TABLE public.trip_routes RENAME COLUMN travel_time_minutes TO duration_minutes;
  END IF;
END $$;

-- Add route_polyline column for storing encoded polylines
ALTER TABLE public.trip_routes ADD COLUMN IF NOT EXISTS route_polyline text;
