# Switching on the contributor system

Everything in this file is something a person has to do in the Supabase
dashboard. The code is already deployed and already handles both states: until
step 1 runs, the public site is completely unaffected, the existing admin panel
works exactly as it does today, and the Contribute button explains that
contributions are not open yet.

**Verified state of the project before any of this runs** (read with the anon
key, 2026-08-17):

| | |
|---|---|
| Tables in `public` | `listings`, and nothing else |
| Rows in `public.listings` | 147 |
| Columns | 16 (migrations 0004/0005/0007 not applied) |
| Anon can read unpublished rows | no — `status=neq.active` returns `[]` |
| Anon can INSERT | no — `42501 new row violates row-level security policy` |
| Anon can UPDATE | no — 0 rows matched, row unchanged |
| Email signup | enabled, `mailer_autoconfirm: false` |
| Google / other OAuth | not enabled |
| Storage bucket in use | `elakai-images`, public, working |

None of the steps below touch the 147 listings.

---

## STEP 1 — Run migration 0008 (WRITE — schema)

**File:** `supabase/migrations/0008_contributors.sql` — paste it whole into the
SQL editor.

- **Creates:** four tables (`profiles`, `submissions`, `points_transactions`,
  `audit_log`), five functions, one storage bucket, and the policies for all of
  them.
- **Changes to existing data:** none. It reads `public.listings` twice — once to
  discover the type of its primary key, once inside the duplicate-check trigger
  — and writes to it only from inside `approve_submission()`, one row at a time,
  on an explicit admin action.
- **Rows affected in `listings`:** 0.
- **Why safe:** every statement is `create ... if not exists`,
  `create or replace`, `drop policy if exists` followed by a create, or an
  `insert ... on conflict do update` against `storage.buckets`. There is no
  `DROP TABLE`, no `TRUNCATE`, no `DELETE`, no `ALTER ... TYPE` and no rename.
  Safe to run twice.
- **Reversible:** yes. `drop table public.submissions, public.points_transactions,
  public.audit_log, public.profiles cascade;` removes everything it added, and
  `listings` is untouched by that. See "Rolling back" at the bottom for the two
  things that need putting back by hand.

### One thing it does change

Section 7 of the migration **replaces every policy on `public.listings`**. Those
policies exist today, were created by hand, work, and are not recorded anywhere
in this repository — so nothing currently in version control can state what the
public is and is not allowed to do with that table. After this runs, two
policies exist and both are in the file:

```sql
listings_public_read   for select using (status = 'active' or public.is_admin())
listings_admin_write   for all    using (public.is_admin()) with check (public.is_admin())
```

The account that can edit does not change on the day this runs. Section 1
promotes `d97b7d76-720c-4c6f-94f4-647b33f39ef4` — the id `src/lib/config.ts` has
been comparing against in the browser — to `role = 'admin'`, so `is_admin()`
returns true for exactly the account the old policies named.

---

## STEP 2 — Verify (READ ONLY)

```sql
select * from public.verify_contributor_schema();
```

Every row should read `ok`. What each one is checking:

| Check | Why it matters |
|---|---|
| tables exist | all four were created |
| rls enabled | including on `listings` — a table with policies and RLS off is wide open |
| duplicate-reward index | this index **is** the "+0 on second approval" guarantee |
| moderation functions | `approve_submission` and `reject_submission` both present |
| at least one admin | with none, nothing can ever be approved |
| profiles.role not writable by users | the role-escalation check. Must be `ok` |
| submissions bucket | contributor uploads have somewhere to go |
| listings policies | exactly two, both named above |

Then confirm nothing moved:

```sql
-- Expect 147.
select count(*) from public.listings;
-- Expect 16 unless you have also applied 0004/0005/0007.
select count(*) from information_schema.columns
 where table_schema = 'public' and table_name = 'listings';
```

---

## STEP 3 — Add the redirect URL (Authentication settings)

**Dashboard → Authentication → URL Configuration → Redirect URLs.** Add:

```
https://te9bot.github.io/elakai/account/callback
```

and, for local work:

```
http://localhost:5173/elakai/account/callback
```

**This is not optional, and skipping it fails quietly.** The confirmation email
carries `emailRedirectTo`; when that URL is not on the allow-list Supabase
silently substitutes the Site URL instead. The account is still created and
still confirmed — but the person lands on the homepage rather than on the form
they were filling in, and the "you were about to add a pharmacy" behaviour
(§5) is lost with no error anywhere to explain it.

While you are on that screen, check **Site URL** is `https://te9bot.github.io/elakai/`.

### On email confirmation

`mailer_autoconfirm` is off, so signing up does **not** produce a session — the
person must click the link in their email first. The signup screen says so and
shows a "check your inbox" state rather than pretending they are signed in.

If you would rather people were signed in immediately, turn on
**Authentication → Providers → Email → Confirm email = off**. The code needs no
change: `signUp` reports whether a session came back, and the UI follows.

Note that Supabase's built-in mailer is rate-limited to a handful of messages an
hour on the free tier. That is fine for testing and not fine for a launch —
configure a real SMTP provider under **Project Settings → Auth → SMTP** before
inviting anyone.

---

## STEP 4 — Promote any further administrators

There is deliberately no screen for this. An app that can promote an account is
an app whose compromise is a full compromise, so it is a statement you make
here, with the person's user id from **Authentication → Users**:

```sql
update public.profiles set role = 'admin', updated_at = now()
 where id = '<their-auth-user-id>';
```

To demote, set it back to `'user'`. Both directions are refused to the
application itself: `authenticated` holds an UPDATE grant on
`profiles.full_name` and on no other column.

---

## STEP 5 — Walk the flow once, in production

The seven things worth checking by hand, in order. Each one has a specific
failure it is looking for.

1. **Guest.** Open `https://te9bot.github.io/elakai/` in a private window.
   Browse healthcare, emergency, rentals, search, open a listing.
   *Looking for:* no login wall, nothing that redirects you to sign in.

2. **Contribute as a guest.** Press Contribute. Choose Create account.
   *Looking for:* the dialog offers Continue browsing, and closing it leaves you
   exactly where you were.

3. **Sign up.** Use a real address you can read.
   *Looking for:* "check your email", not a dashboard.

4. **Confirm.** Click the link in the email.
   *Looking for:* you land on the submission form, not the homepage. If you land
   on the homepage, step 3 above was skipped.

5. **Submit with a photo.**
   *Looking for:* the success screen says "pending review" and does not say
   published. Then open the public site in another window and confirm the
   listing is **not** there.

6. **Approve.** Sign in to `/admin`, open Submissions, open the row, press
   Approve.
   *Looking for:* the confirmation names the contributor and says 50 points;
   afterwards the listing is live on the public site **with the photograph**,
   and the contributor's Points page shows `+50` with the submission's name.

7. **Approve it again.** Go back to the same submission.
   *Looking for:* "already been reviewed", and the contributor's balance still
   reads 50, not 100.

Then one rejection, and check the contributor can read the reason on their own
submission detail screen.

---

## Rolling back

```sql
-- Removes everything migration 0008 added.
drop table if exists public.points_transactions cascade;
drop table if exists public.audit_log cascade;
drop table if exists public.submissions cascade;
drop table if exists public.profiles cascade;
drop function if exists public.approve_submission(uuid, jsonb);
drop function if exists public.reject_submission(uuid, text, text);
drop function if exists public.my_contribution_stats();
drop function if exists public.verify_contributor_schema();
drop function if exists public.is_admin();
drop function if exists public.handle_new_user();
drop trigger if exists on_auth_user_created on auth.users;
```

Two things that do **not** come back on their own, and must be put back by hand
in the same sitting:

1. **The `listings` policies.** They reference `public.is_admin()`, which the
   drop above removes, so every policy on `listings` starts failing and the
   admin panel loses write access. Recreate them against the id directly:

   ```sql
   drop policy if exists listings_public_read on public.listings;
   drop policy if exists listings_admin_write on public.listings;

   create policy listings_public_read on public.listings
     for select using (status = 'active'
                       or auth.uid() = 'd97b7d76-720c-4c6f-94f4-647b33f39ef4');
   create policy listings_admin_write on public.listings
     for all using (auth.uid() = 'd97b7d76-720c-4c6f-94f4-647b33f39ef4')
         with check (auth.uid() = 'd97b7d76-720c-4c6f-94f4-647b33f39ef4');
   ```

2. **The `elakai-submissions` bucket.** Dropping the tables does not delete it or
   its objects. Empty and remove it from **Storage** if you want it gone.

The deployed code survives a rollback without a redeploy: `contributorSchemaReady()`
starts answering false again and the contributor system disappears from the UI.

---

## What is deliberately not automated

- **Applying this file.** There is no service-role key in this project, no
  Supabase CLI in the repo, and no CI step that touches the database. That is
  the correct posture for a static site whose entire authorization model is RLS:
  a credential that can rewrite the schema should not exist anywhere a build can
  reach it.
- **Promoting an admin.** See step 4.
- **Deleting a contributor's account.** Do it from **Authentication → Users**.
  The cascade removes their profile, submissions and points ledger; their
  already-approved *listings* stay public, which is intended — the information
  belongs to the directory once it has been verified, not to the person who
  typed it in.
