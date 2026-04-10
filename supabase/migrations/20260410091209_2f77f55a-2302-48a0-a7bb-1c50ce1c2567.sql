ALTER TABLE public.activities DROP CONSTRAINT activities_activity_type_check;

ALTER TABLE public.activities ADD CONSTRAINT activities_activity_type_check 
CHECK (activity_type = ANY (ARRAY['flight'::text, 'hotel'::text, 'restaurant'::text, 'attraction'::text, 'transport'::text, 'airport'::text, 'landmark'::text, 'activity'::text, 'train'::text]));