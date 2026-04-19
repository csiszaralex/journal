-- FTS5 helper table: denormalized text + tags per entry version
CREATE TABLE entry_fts_data (
  id INTEGER PRIMARY KEY,
  version_id TEXT NOT NULL UNIQUE,
  text TEXT NOT NULL DEFAULT '',
  tags_text TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
-- FTS5 virtual table using entry_fts_data as external content source
CREATE VIRTUAL TABLE entries_fts USING fts5(
  text,
  tags_text,
  content='entry_fts_data',
  content_rowid='id',
  tokenize='unicode61'
);
--> statement-breakpoint
-- After a new entry_version is created: seed fts_data and index in FTS5
CREATE TRIGGER ev_ai
AFTER INSERT ON entry_versions
BEGIN
  INSERT INTO entry_fts_data(version_id, text, tags_text)
  VALUES (NEW.id, NEW.text, '');
  INSERT INTO entries_fts(rowid, text, tags_text)
  SELECT id, text, tags_text FROM entry_fts_data WHERE version_id = NEW.id;
END;
--> statement-breakpoint
-- After an entry_version is hard-deleted: remove from fts_data and FTS5 index
CREATE TRIGGER ev_ad
AFTER DELETE ON entry_versions
BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, text, tags_text)
  SELECT 'delete', fd.id, fd.text, fd.tags_text
  FROM entry_fts_data fd
  WHERE fd.version_id = OLD.id;
  DELETE FROM entry_fts_data WHERE version_id = OLD.id;
END;
--> statement-breakpoint
-- After a tag is linked to a version: rebuild FTS entry for that version
CREATE TRIGGER evt_ai
AFTER INSERT ON entry_version_tags
BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, text, tags_text)
  SELECT 'delete', fd.id, fd.text, fd.tags_text
  FROM entry_fts_data fd
  WHERE fd.version_id = NEW.version_id;

  UPDATE entry_fts_data
  SET tags_text = (
    SELECT COALESCE(GROUP_CONCAT(t.display_name, ' '), '')
    FROM entry_version_tags evt
    JOIN tags t ON t.id = evt.tag_id
    WHERE evt.version_id = NEW.version_id
  )
  WHERE version_id = NEW.version_id;

  INSERT INTO entries_fts(rowid, text, tags_text)
  SELECT fd.id, fd.text, fd.tags_text
  FROM entry_fts_data fd
  WHERE fd.version_id = NEW.version_id;
END;
--> statement-breakpoint
-- After a tag is unlinked from a version: rebuild FTS entry for that version
CREATE TRIGGER evt_ad
AFTER DELETE ON entry_version_tags
BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, text, tags_text)
  SELECT 'delete', fd.id, fd.text, fd.tags_text
  FROM entry_fts_data fd
  WHERE fd.version_id = OLD.version_id;

  UPDATE entry_fts_data
  SET tags_text = (
    SELECT COALESCE(GROUP_CONCAT(t.display_name, ' '), '')
    FROM entry_version_tags evt
    JOIN tags t ON t.id = evt.tag_id
    WHERE evt.version_id = OLD.version_id
  )
  WHERE version_id = OLD.version_id;

  INSERT INTO entries_fts(rowid, text, tags_text)
  SELECT fd.id, fd.text, fd.tags_text
  FROM entry_fts_data fd
  WHERE fd.version_id = OLD.version_id;
END;
