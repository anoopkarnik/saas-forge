-- Update previously saved default custom speech endpoints to the real bsamaritan routes.
UPDATE "ai_schema"."AiSpeechConfig"
SET
    "url" = '{your tts endpoint}',
    "sampleBody" = '{"text":"{{text}}","speaker":"p335","language":"en"}'::jsonb
WHERE
    "capability" = 'tts'
    AND "provider" = 'custom'
    AND "url" IN ('{your tts endpoint}', '{your tts endpoint}/');

UPDATE "ai_schema"."AiSpeechConfig"
SET
    "url" = '{your stt endpoint}',
    "sampleBody" = '{"audio":"{{file}}"}'::jsonb
WHERE
    "capability" = 'stt'
    AND "provider" = 'custom'
    AND "url" IN ('https://stt.bsamaritan.net', 'https://stt.bsamaritan.net/');
