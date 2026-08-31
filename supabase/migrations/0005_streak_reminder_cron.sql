-- Run this in the Supabase SQL editor AFTER the streak-reminder edge function
-- has been deployed (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
--
-- Schedules streak-reminder to run every 15 minutes via pg_cron + pg_net.
-- The project URL and publishable (anon) key are stored in Vault rather than
-- inlined — neither is secret, but this keeps the job definition free of
-- literal credentials. The edge function itself separately uses its own
-- auto-provided service-role key once invoked; this key only gets the HTTP
-- call past the platform's request-level auth check.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'project_url') then
    perform vault.create_secret('https://bozzojpwswuvbmqazvle.supabase.co', 'project_url');
  end if;

  if not exists (select 1 from vault.secrets where name = 'publishable_key') then
    perform vault.create_secret('sb_publishable_UOUCiTe8HYUvZyJ2TKs1MQ_ZWWW5jWy', 'publishable_key');
  end if;
end $$;

select cron.schedule(
  'streak-reminder-check',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/streak-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
