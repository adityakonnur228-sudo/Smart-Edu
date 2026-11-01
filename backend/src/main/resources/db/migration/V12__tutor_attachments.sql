ALTER TABLE tutor_messages ADD COLUMN attachments_json TEXT NULL;
ALTER TABLE tutor_conversations ADD COLUMN active_material_ids VARCHAR(255) NULL;

