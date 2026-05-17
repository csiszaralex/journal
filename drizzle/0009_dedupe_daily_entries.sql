-- Soft-delete duplicate entries per day, keeping only the latest-edited one.
-- Going forward, the app enforces one active entry per entry_date.
UPDATE entries
SET deleted_at = (unixepoch() * 1000)
WHERE deleted_at IS NULL
  AND id IN (
    SELECT e.id
    FROM entries e
    INNER JOIN entry_versions ev ON ev.id = e.current_version_id
    WHERE e.deleted_at IS NULL
      AND ev.entry_date IN (
        SELECT ev2.entry_date
        FROM entries e2
        INNER JOIN entry_versions ev2 ON ev2.id = e2.current_version_id
        WHERE e2.deleted_at IS NULL
        GROUP BY ev2.entry_date
        HAVING COUNT(*) > 1
      )
      AND ev.edited_at < (
        SELECT MAX(ev3.edited_at)
        FROM entries e3
        INNER JOIN entry_versions ev3 ON ev3.id = e3.current_version_id
        WHERE e3.deleted_at IS NULL
          AND ev3.entry_date = ev.entry_date
      )
  );
