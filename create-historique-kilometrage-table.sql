/*
  # Create historique_kilometrage table

  1. New Tables
    - `historique_kilometrage`
      - `id` (uuid, primary key)
      - `vehicule_id` (uuid, foreign key to vehicule)
      - `date_releve` (date) - Date of the mileage reading
      - `kilometrage` (integer) - Mileage value
      - `source` (text) - Source of the reading (manuel, automatique, etc.)
      - `notes` (text) - Optional notes
      - `saisi_par` (uuid) - User who entered the data
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `historique_kilometrage` table
    - Add policy for authenticated users to read all records
    - Add policy for authenticated users to insert records
    - Add policy for authenticated users to update their own records

  3. Indexes
    - Index on vehicule_id for faster lookups
    - Index on date_releve for date-based queries
*/

CREATE TABLE IF NOT EXISTS public.historique_kilometrage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid NOT NULL REFERENCES public.vehicule(id) ON DELETE CASCADE,
  date_releve date NOT NULL,
  kilometrage integer NOT NULL,
  source text DEFAULT 'manuel',
  notes text,
  saisi_par uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_historique_kilometrage_vehicule_id ON public.historique_kilometrage(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_historique_kilometrage_date_releve ON public.historique_kilometrage(date_releve);

-- Enable RLS
ALTER TABLE public.historique_kilometrage ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can read all mileage history"
  ON public.historique_kilometrage
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert mileage records"
  ON public.historique_kilometrage
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own mileage records"
  ON public.historique_kilometrage
  FOR UPDATE
  TO authenticated
  USING (saisi_par = auth.uid())
  WITH CHECK (saisi_par = auth.uid());
