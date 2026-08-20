# Authentication — what the dashboard has to say

The code in `src/lib/auth.tsx`, `src/lib/otp.ts` and the two account screens is
complete, but two of the things it depends on are **project settings, not code**.
Neither can be set from this repository, and if either is wrong the symptom is a
correct-looking flow that fails at the last step.

---

## 1. The confirmation email must contain the code

**Where:** Supabase dashboard → Authentication → Emails → *Confirm signup*

Supabase's stock template offers only a link:

```html
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
```

The signup screen asks for a six-digit code, and the code is a different
variable. The template needs **both** — the link, because
`/account/callback` still handles it and somebody opening the mail on another
device will use it, and the token, because that is what the screen asks for:

```html
<p>Your ELAKAI confirmation code is <strong>{{ .Token }}</strong></p>
<p>Or open this link: <a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

The same applies to **Magic Link**, which is the template `signInWithOtp()` uses
for the "Email me a sign-in code" path on `/account/login`:

```html
<p>Your ELAKAI sign-in code is <strong>{{ .Token }}</strong></p>
```

**If you skip this:** the email arrives with a link and no number, the person has
nothing to type, and the six boxes sit there looking broken. Nothing in the
application can detect this or work around it — the token exists server-side
either way; the template simply never printed it.

---

## 2. Code length must match `OTP_LENGTH`

**Where:** Authentication → Providers → Email → *Email OTP Length*

`src/lib/otp.ts` exports `OTP_LENGTH = 6`, which is Supabase's default. If the
project is set to 8, the field asks for six digits, submits six, and the server
refuses every one of them — which the interface will honestly report as "That
code was not right", because that is exactly what the server said.

Change one, change the other. They are the same number in two places and there
is no way to read the setting from the client.

---

## Related settings worth knowing

| Setting | Where | Why it matters here |
| --- | --- | --- |
| **Confirm email** | Providers → Email | Must stay **on**. `signUp` returns a session instead of `needsConfirmation` when it is off, so the code screen is skipped entirely. Migration 0013 still refuses unverified accounts at the database level, so turning it off does not create a hole — it creates accounts that can sign in and cannot do anything. |
| **Email OTP Expiration** | Providers → Email | Any value. Nothing in the client knows or assumes it: the `expired` state comes from Supabase's `otp_expired` response, never from a timer. See the note at the top of `src/lib/otp.ts`. |
| **Rate limits → Emails** | Auth → Rate Limits | `RESEND_COOLDOWN_MS` in `src/lib/otp.ts` is 60s to match the default of one email per address per minute. If you raise the server limit, lower the constant, or the resend button stays disabled longer than it needs to. |

---

## What is enforced in the database, not here

Migration `0013_security_hardening.sql` adds `public.is_email_verified()`, which
reads `auth.users.email_confirmed_at` — a column only the auth server writes,
and only when a confirmation link is opened or `verifyOtp()` succeeds.

Both policies that create content ask it:

* `submissions_own_insert` — an unverified account cannot file a submission
* `submission_images_owner_insert` — and cannot upload an image either

So "skip the OTP screen" is not a thing a modified client can do. It can reach
whatever screen it likes; the requests it makes from there are refused by
Postgres. Run `select * from public.verify_security();` to check that this is
actually installed rather than assumed.
