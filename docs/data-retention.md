# Data retention review

The following database tables currently have schema definitions but no active application reads or writes:

- `style_references`
- `account_deletion_requests`
- `ai_moderation_queue`

They are intentionally retained for launch. Dropping them could destroy historical or compliance-related data, and no retention decision has authorized that deletion.

Before removing any of these tables:

1. Inspect production row counts and representative non-sensitive metadata.
2. Confirm the product owner’s retention and export requirements.
3. Apply the approved schema change through Replit’s managed Publish flow.

The `notifications` table is active and has an index on `user_id`; it is not part of this orphan-table review.