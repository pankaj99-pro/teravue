
CREATE TABLE public.agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  agent_run_id uuid REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  agent_type text NOT NULL,
  task_description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  result_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent_tasks" ON public.agent_tasks FOR SELECT
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own agent_tasks" ON public.agent_tasks FOR INSERT
  WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own agent_tasks" ON public.agent_tasks FOR UPDATE
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own agent_tasks" ON public.agent_tasks FOR DELETE
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tasks;
