# eCycle maintenance

Read `docs/UPGRADE_PLAN.md` before making substantive changes. The original
requirements are in `docs/SRS_Template.docx`.

For each improvement, update the implementation log in `docs/UPGRADE_PLAN.md`
with what changed, why, alternatives considered, validation actually performed,
and remaining limitations. Keep implemented work separate from planned work.
Before implementation answer the user's four learning questions: why the old
approach is insufficient, new benefits, new limitations, and alternatives with
reasons for not selecting them. Work through priorities one at a time.
Do not invent performance results or claim a live Supabase connection without
verifying it. Database credentials belong in `backend/.env`, never React env.

Prefer incremental changes that preserve the documented user, shop, and admin
flows. Track security blockers before public deployment. Do not apply old
database dumps to a live database as a routine setup step.
