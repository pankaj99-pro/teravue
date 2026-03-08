
-- Extend profiles table with travel-specific columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_country text,
  ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'USD';

-- Create trips table
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  destination_city text,
  destination_country text,
  start_date date,
  end_date date,
  travelers_count integer DEFAULT 1,
  estimated_budget numeric,
  ai_generated boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips" ON public.trips FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own trips" ON public.trips FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own trips" ON public.trips FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own trips" ON public.trips FOR DELETE USING (user_id = auth.uid());

-- Create trip_days table
CREATE TABLE public.trip_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  day_number integer NOT NULL,
  date date,
  summary text
);

ALTER TABLE public.trip_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trip_days" ON public.trip_days FOR ALL USING (
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid())
);

-- Create activities table
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_day_id uuid REFERENCES public.trip_days(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  location_name text,
  latitude double precision,
  longitude double precision,
  activity_type text CHECK (activity_type IN ('flight','hotel','restaurant','attraction','transport')),
  start_time timestamptz,
  end_time timestamptz,
  price_estimate numeric,
  booking_url text,
  image_url text
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own activities" ON public.activities FOR ALL USING (
  trip_day_id IN (
    SELECT td.id FROM public.trip_days td
    JOIN public.trips t ON td.trip_id = t.id
    WHERE t.user_id = auth.uid()
  )
);

-- Create routes table
CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_day_id uuid REFERENCES public.trip_days(id) ON DELETE CASCADE NOT NULL,
  start_activity_id uuid REFERENCES public.activities(id) ON DELETE CASCADE,
  end_activity_id uuid REFERENCES public.activities(id) ON DELETE CASCADE,
  transport_mode text CHECK (transport_mode IN ('car','walking','bike','train','plane')),
  estimated_duration_minutes integer,
  distance_km double precision,
  route_geometry jsonb
);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own routes" ON public.routes FOR ALL USING (
  trip_day_id IN (
    SELECT td.id FROM public.trip_days td
    JOIN public.trips t ON td.trip_id = t.id
    WHERE t.user_id = auth.uid()
  )
);

-- Create bookings table
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  booking_type text CHECK (booking_type IN ('flight','hotel','restaurant','taxi')),
  provider text,
  booking_reference text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  price_paid numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own bookings" ON public.bookings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own bookings" ON public.bookings FOR DELETE USING (user_id = auth.uid());

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text CHECK (type IN ('weather_update','flight_delay','schedule_change','booking_confirmation','general')),
  created_at timestamptz NOT NULL DEFAULT now(),
  read boolean DEFAULT false
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
