-- Private application records. Access is through authenticated server routes only.
CREATE TABLE IF NOT EXISTS app_documents (
  id text PRIMARY KEY,
  document jsonb NOT NULL,
  CONSTRAINT app_documents_id_matches CHECK (document->>'_id' = id),
  CONSTRAINT app_documents_type_required CHECK (jsonb_typeof(document->'_type') = 'string')
);
CREATE INDEX IF NOT EXISTS app_documents_type_idx ON app_documents ((document->>'_type'));
CREATE INDEX IF NOT EXISTS app_documents_activity_time_idx ON app_documents ((document->>'timestamp'), id)
  WHERE document->>'_type' = 'auditEvent';
CREATE INDEX IF NOT EXISTS app_documents_updated_idx ON app_documents ((document->>'_updatedAt'));

-- Resolve dotted paths, array indices, and keyed array members against the locked record.
CREATE OR REPLACE FUNCTION cel3_document_path(doc jsonb, parts jsonb) RETURNS text[]
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE part jsonb; current_value jsonb := doc; result text[] := '{}'; key text; idx integer;
BEGIN
  FOR part IN SELECT value FROM jsonb_array_elements(parts) LOOP
    IF jsonb_typeof(part) = 'object' THEN
      IF jsonb_typeof(current_value) <> 'array' THEN RETURN NULL; END IF;
      SELECT (ordinality - 1)::integer INTO idx
        FROM jsonb_array_elements(current_value) WITH ORDINALITY
        WHERE value->>'_key' = part->>'key' LIMIT 1;
      IF idx IS NULL THEN RETURN NULL; END IF;
      key := idx::text;
    ELSIF jsonb_typeof(part) = 'number' THEN
      idx := (part #>> '{}')::integer;
      IF idx < 0 THEN
        IF jsonb_typeof(current_value) <> 'array' THEN RETURN NULL; END IF;
        idx := jsonb_array_length(current_value) + idx;
      END IF;
      IF idx < 0 THEN RETURN NULL; END IF;
      key := idx::text;
    ELSE key := part #>> '{}';
    END IF;
    result := array_append(result, key);
    current_value := CASE WHEN jsonb_typeof(current_value) = 'array'
      THEN current_value->key::integer ELSE current_value->key END;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION cel3_document_set(doc jsonb, path text[], value jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE child jsonb;
BEGIN
  IF cardinality(path) = 0 THEN RETURN value; END IF;
  IF doc IS NULL OR doc = 'null'::jsonb THEN doc := '{}'::jsonb; END IF;
  IF cardinality(path) = 1 THEN RETURN jsonb_set(doc, path, value, true); END IF;
  child := CASE WHEN jsonb_typeof(doc) = 'array' THEN doc->path[1]::integer ELSE doc->path[1] END;
  RETURN jsonb_set(doc, path[1:1], cel3_document_set(child, path[2:], value), true);
END;
$$;

-- One call is one transaction. Locks cover absent IDs too, so create-if-missing,
-- first-writer-wins fields, increments and multi-document reservations are atomic.
CREATE OR REPLACE FUNCTION cel3_document_mutate(mutations jsonb) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE mutation jsonb; op jsonb; doc jsonb; old_doc jsonb; result jsonb := '[]';
  doc_id text; kind text; field_path text[]; existing jsonb; array_value jsonb;
  idx integer; stamp text; revision text;
BEGIN
  FOR doc_id IN SELECT DISTINCT value->>'id' FROM jsonb_array_elements(mutations) ORDER BY 1 LOOP
    IF doc_id IS NULL OR doc_id = '' THEN RAISE EXCEPTION 'Document ID required'; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('cel3.document.' || doc_id, 0));
  END LOOP;
  FOR mutation IN SELECT value FROM jsonb_array_elements(mutations) LOOP
    doc_id := mutation->>'id'; kind := mutation->>'kind';
    SELECT document INTO old_doc FROM app_documents WHERE id = doc_id FOR UPDATE;
    IF mutation->>'revision' IS NOT NULL AND old_doc->>'_rev' IS DISTINCT FROM mutation->>'revision' THEN
      RAISE EXCEPTION 'Document revision conflict' USING ERRCODE = '40001';
    END IF;
    IF kind = 'delete' THEN
      DELETE FROM app_documents WHERE id = doc_id;
      result := result || jsonb_build_array(jsonb_build_object('_id', doc_id)); CONTINUE;
    ELSIF kind = 'createIfNotExists' AND old_doc IS NOT NULL THEN
      result := result || jsonb_build_array(old_doc); CONTINUE;
    ELSIF kind = 'create' AND old_doc IS NOT NULL THEN
      RAISE EXCEPTION 'Document already exists' USING ERRCODE = '23505';
    ELSIF kind IN ('create', 'createIfNotExists', 'createOrReplace') THEN
      doc := mutation->'document';
    ELSIF kind = 'patch' THEN
      IF old_doc IS NULL THEN RAISE EXCEPTION 'Document not found' USING ERRCODE = 'P0002'; END IF;
      doc := old_doc;
      FOR op IN SELECT value FROM jsonb_array_elements(mutation->'operations') LOOP
        field_path := cel3_document_path(doc, op->'path');
        IF field_path IS NULL THEN
          IF op->>'kind' = 'unset' THEN CONTINUE; END IF;
          RAISE EXCEPTION 'Patch array member not found';
        END IF;
        existing := doc #> field_path;
        IF op->>'kind' = 'set' THEN
          doc := cel3_document_set(doc, field_path, op->'value');
        ELSIF op->>'kind' = 'setIfMissing' THEN
          IF existing IS NULL OR existing = 'null'::jsonb THEN doc := cel3_document_set(doc, field_path, op->'value'); END IF;
        ELSIF op->>'kind' = 'unset' THEN doc := doc #- field_path;
        ELSIF op->>'kind' = 'inc' THEN
          IF existing IS NOT NULL AND jsonb_typeof(existing) <> 'number' THEN RAISE EXCEPTION 'Increment requires a number'; END IF;
          doc := cel3_document_set(doc, field_path, to_jsonb(COALESCE((existing #>> '{}')::numeric, 0) + (op->>'value')::numeric));
        ELSIF op->>'kind' IN ('append', 'prepend') THEN
          array_value := COALESCE(NULLIF(existing, 'null'::jsonb), '[]'::jsonb);
          IF jsonb_typeof(array_value) <> 'array' THEN RAISE EXCEPTION 'Append requires an array'; END IF;
          doc := cel3_document_set(doc, field_path, CASE WHEN op->>'kind' = 'append'
            THEN array_value || (op->'value') ELSE (op->'value') || array_value END);
        ELSIF op->>'kind' = 'insert' THEN
          array_value := doc #> field_path[1:cardinality(field_path)-1];
          IF jsonb_typeof(array_value) <> 'array' THEN RAISE EXCEPTION 'Insert requires an array'; END IF;
          idx := field_path[cardinality(field_path)]::integer;
          IF op->>'position' = 'after' THEN idx := idx + 1; END IF;
          SELECT COALESCE(jsonb_agg(value ORDER BY ord), '[]'::jsonb) INTO array_value FROM (
            SELECT value, ordinality::numeric AS ord FROM jsonb_array_elements(array_value) WITH ORDINALITY WHERE ordinality <= idx
            UNION ALL SELECT value, idx + ordinality::numeric / (jsonb_array_length(op->'value') + 1) FROM jsonb_array_elements(op->'value') WITH ORDINALITY
            UNION ALL SELECT value, ordinality::numeric FROM jsonb_array_elements(array_value) WITH ORDINALITY WHERE ordinality > idx
          ) AS combined;
          doc := cel3_document_set(doc, field_path[1:cardinality(field_path)-1], array_value);
        ELSE RAISE EXCEPTION 'Unsupported patch operation'; END IF;
      END LOOP;
    ELSE RAISE EXCEPTION 'Unsupported document mutation'; END IF;
    IF doc->>'_type' IS NULL OR doc->>'_type' = '' THEN RAISE EXCEPTION 'Document type required'; END IF;
    IF old_doc IS NOT NULL AND old_doc->>'_type' IS DISTINCT FROM doc->>'_type' THEN RAISE EXCEPTION 'Document type cannot change'; END IF;
    stamp := to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    revision := md5(random()::text || clock_timestamp()::text || doc_id);
    doc := doc || jsonb_build_object('_id', doc_id, '_rev', revision, '_createdAt', COALESCE(old_doc->>'_createdAt', doc->>'_createdAt', stamp), '_updatedAt', stamp);
    INSERT INTO app_documents (id, document) VALUES (doc_id, doc)
      ON CONFLICT (id) DO UPDATE SET document = EXCLUDED.document;
    result := result || jsonb_build_array(doc);
  END LOOP;
  RETURN result;
END;
$$;
