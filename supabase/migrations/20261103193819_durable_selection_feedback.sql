-- Server-only append-only feedback revisions. Public clients have no table/RPC access.
create table public.tastiq_feedback_events (
  namespace text not null default 'production'
    check (namespace = 'production' or namespace ~ '^qa:[a-zA-Z0-9_-]{1,64}$'),
  run_id text not null check (run_id ~ '^[a-zA-Z0-9:_-]{1,100}$'),
  revision integer not null check (revision between 0 and 1000000),
  domain text not null check (domain in ('game','film','series','cartoon')),
  dialogue_id text not null check (dialogue_id ~ '^[a-zA-Z0-9:_-]{1,100}$'),
  received_at timestamptz not null default now(),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 262144),
  primary key (namespace, run_id, revision),
  check (payload->>'id' = run_id and (payload->>'revision')::integer = revision
    and payload->>'domain' = domain and payload->>'dialogueId' = dialogue_id)
);
alter table public.tastiq_feedback_events enable row level security;
revoke all on public.tastiq_feedback_events from public, anon, authenticated;
grant select, insert on public.tastiq_feedback_events to service_role;
create index tastiq_feedback_received on public.tastiq_feedback_events(namespace, domain, received_at desc);

create function public.tastiq_record_feedback(p_payload jsonb, p_namespace text default 'production')
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare saved jsonb;
begin
  insert into public.tastiq_feedback_events(namespace,run_id,revision,domain,dialogue_id,payload)
    values(p_namespace,p_payload->>'id',(p_payload->>'revision')::integer,p_payload->>'domain',p_payload->>'dialogueId',p_payload)
    on conflict(namespace,run_id,revision) do nothing returning payload into saved;
  if not found then
    select payload into saved from public.tastiq_feedback_events
      where namespace=p_namespace and run_id=p_payload->>'id' and revision=(p_payload->>'revision')::integer;
    if saved is distinct from p_payload then
      raise exception 'Feedback revision already has different content' using errcode='23505';
    end if;
  end if;
  return jsonb_build_object('ok',true,'id',p_payload->>'id','revision',(p_payload->>'revision')::integer);
end;
$$;
revoke all on function public.tastiq_record_feedback(jsonb,text) from public, anon, authenticated;
grant execute on function public.tastiq_record_feedback(jsonb,text) to service_role;

create view public.tastiq_feedback_latest with(security_invoker=true) as
  select distinct on(namespace,run_id) namespace,run_id,revision,domain,dialogue_id,received_at,payload
  from public.tastiq_feedback_events
  order by namespace,run_id,revision desc;
revoke all on public.tastiq_feedback_latest from public, anon, authenticated;
grant select on public.tastiq_feedback_latest to service_role;
