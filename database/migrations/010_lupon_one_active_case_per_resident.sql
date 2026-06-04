DO $$
BEGIN
  IF EXISTS (
    SELECT resident_id
    FROM lupon_cases
    WHERE status IN ('open', 'under_mediation')
    GROUP BY resident_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one active Lupon case per resident while duplicate active cases exist.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lupon_cases_one_active_per_resident
  ON lupon_cases(resident_id)
  WHERE status IN ('open', 'under_mediation');
