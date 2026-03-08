
-- 1. Agent Logs table
CREATE TABLE public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  agent_run_id uuid REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  step_type text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent_logs" ON public.agent_logs FOR SELECT
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own agent_logs" ON public.agent_logs FOR INSERT
  WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

-- 2. Trip Routes table
CREATE TABLE public.trip_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  start_location text NOT NULL,
  end_location text NOT NULL,
  distance_km double precision,
  travel_time_minutes integer,
  route_geometry jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trip_routes" ON public.trip_routes FOR SELECT
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own trip_routes" ON public.trip_routes FOR INSERT
  WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own trip_routes" ON public.trip_routes FOR UPDATE
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own trip_routes" ON public.trip_routes FOR DELETE
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

-- 3. Itinerary Versions table
CREATE TABLE public.itinerary_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  itinerary_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.itinerary_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own itinerary_versions" ON public.itinerary_versions FOR SELECT
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own itinerary_versions" ON public.itinerary_versions FOR INSERT
  WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

-- 4. Add memory_key column to agent_memory
ALTER TABLE public.agent_memory ADD COLUMN IF NOT EXISTS memory_key text;

-- Enable realtime for agent_logs so UI can stream
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_logs;
