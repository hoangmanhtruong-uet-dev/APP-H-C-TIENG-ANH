-- Run the same transactional pgTAP contract directly against the linked remote.
-- The included test begins a transaction and always rolls back its fixtures.
\ir ../database/phase_3_learner_onboarding.test.sql
