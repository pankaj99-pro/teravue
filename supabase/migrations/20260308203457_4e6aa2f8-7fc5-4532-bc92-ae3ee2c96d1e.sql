
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'planning',
  status text NOT NULL DEFAULT 'running',
  context_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent_runs" ON public.agent_runs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own agent_runs" ON public.agent_runs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own agent_runs" ON public.agent_runs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own agent_runs" ON public.agent_runs FOR DELETE USING (user_id = auth.uid());

CREATE TABLE public.agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  memory_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent_memory" ON public.agent_memory FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own agent_memory" ON public.agent_memory FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own agent_memory" ON public.agent_memory FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own agent_memory" ON public.agent_memory FOR DELETE USING (user_id = auth.uid());
