-- Keep the search index in step with tag renames.
--
-- The triggers in 0001 fire on entry_versions and entry_version_tags only, so
-- renaming a tag updated tags.display_name and left entries_fts holding the old
-- word: an entry stayed findable by a name it no longer had, and was missing
-- under the one it did, until something happened to re-save it.
--
-- Same three steps the evt_* triggers use, applied to every version linked to
-- the renamed tag: drop those rows from the index, rebuild their denormalised
-- tags_text from the current names, re-index them.
CREATE TRIGGER tags_au_fts
AFTER UPDATE OF display_name ON tags
BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, text, tags_text)
  SELECT 'delete', fd.id, fd.text, fd.tags_text
  FROM entry_fts_data fd
  WHERE fd.version_id IN (
    SELECT version_id FROM entry_version_tags WHERE tag_id = NEW.id
  );

  UPDATE entry_fts_data
  SET tags_text = (
    SELECT COALESCE(GROUP_CONCAT(t.display_name, ' '), '')
    FROM entry_version_tags evt
    JOIN tags t ON t.id = evt.tag_id
    WHERE evt.version_id = entry_fts_data.version_id
  )
  WHERE version_id IN (
    SELECT version_id FROM entry_version_tags WHERE tag_id = NEW.id
  );

  INSERT INTO entries_fts(rowid, text, tags_text)
  SELECT fd.id, fd.text, fd.tags_text
  FROM entry_fts_data fd
  WHERE fd.version_id IN (
    SELECT version_id FROM entry_version_tags WHERE tag_id = NEW.id
  );
END;
--> statement-breakpoint
-- One-time repair for renames that already happened. Every row is recomputed
-- rather than only the ones that look stale: it costs one pass over a table
-- with a row per entry version, and it cannot miss a case.
UPDATE entry_fts_data
SET tags_text = (
  SELECT COALESCE(GROUP_CONCAT(t.display_name, ' '), '')
  FROM entry_version_tags evt
  JOIN tags t ON t.id = evt.tag_id
  WHERE evt.version_id = entry_fts_data.version_id
);--> statement-breakpoint
-- Discard and rebuild the whole index from the content table above, so the
-- repaired text is what search actually matches against.
INSERT INTO entries_fts(entries_fts) VALUES('rebuild');
