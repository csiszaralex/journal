-- The setting counts prior entries, not days: the questions route fetches N
-- entries and slices to N, whatever span they cover. Only the label ever said
-- "nap", so this renames the stored key to match the meaning and keeps the
-- value the user picked. Ignored when the key was never written.
UPDATE app_settings SET key = 'ai_history_entries' WHERE key = 'ai_history_days';
