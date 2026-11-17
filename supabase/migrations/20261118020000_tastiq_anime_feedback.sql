begin;

alter table public.tastiq_feedback_events
  drop constraint tastiq_feedback_events_domain_check,
  add constraint tastiq_feedback_events_domain_check
    check (domain in ('game', 'film', 'series', 'cartoon', 'anime'));

commit;
