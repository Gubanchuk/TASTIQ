-- Owner-only queries. Verification namespaces are intentionally excluded.
-- Counts of feedback do not certify unique people or statistical improvement.

-- Selection verdicts, one latest revision per displayed list.
select domain,
       count(*) filter(where payload ? 'selectionReview') as reviewed_lists,
       count(*) filter(where payload->'selectionReview'->>'verdict'='accept') as found_something,
       count(*) filter(where payload->'selectionReview'->>'verdict'='partial') as close_options,
       count(*) filter(where payload->'selectionReview'->>'verdict'='reject') as no_fit
from public.tastiq_feedback_latest
where namespace='production'
group by domain order by domain;

-- Reasons are statements by the person, not a verified technical root cause.
select domain, payload->'selectionReview'->>'issue' as reported_issue, count(*) as reports
from public.tastiq_feedback_latest
where namespace='production' and payload ? 'selectionReview'
group by domain,reported_issue order by reports desc;

-- Detail for a specific run: replace the parameter with the intended run id.
-- Raw request/notes are private data. Keep exports outside Git.
-- select run_id,domain,received_at,payload->'selectionReview',payload->'cards',payload->'responses'
-- from public.tastiq_feedback_latest where namespace='production' and run_id='RUN_ID';

-- Choice, actual start and outcome remain distinct from suggestion fit.
select latest.domain,
       count(*) filter(where response->>'chosen'='true') as chosen_cards,
       count(*) filter(where response->>'started'='true') as started_cards,
       count(*) filter(where response->>'outcome'='liked') as liked_after_start,
       count(*) filter(where response->>'outcome'='mixed') as mixed_after_start,
       count(*) filter(where response->>'outcome'='disliked') as disliked_after_start,
       count(*) filter(where response->>'outcome'='not_started') as not_started
from public.tastiq_feedback_latest latest
cross join lateral jsonb_array_elements(latest.payload->'responses') response
where latest.namespace='production'
group by latest.domain order by latest.domain;
