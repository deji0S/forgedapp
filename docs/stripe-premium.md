# Stripe premium subscription — setup & deployment

£4.99/month "Forged Premium" subscription. Stripe Checkout for sign-up, a
webhook that syncs subscription state into `public.subscriptions`, and
`public.is_premium(uid)` as the single source of truth the app gates on.

Gated features: **AI coach** (`/coach`), **advanced analytics** (the Advanced
section of `/progress`), and **streak recovery** (the at-risk card on Home →
`public.recover_streak()`).

## Moving parts

| Piece | Where | Notes |
| --- | --- | --- |
| `subscriptions` table + `is_premium()` | migration `0006_premium_subscriptions.sql` | RLS: owner can read; only the webhook (service role) writes. |
| `streak_recoveries` + `recover_streak()` + patched `recompute_streak()` | migration `0007_streak_recovery.sql` | Bridged days live only here, not in `workout_logs`. |
| `stripe-checkout` edge function | `supabase/functions/stripe-checkout/` | JWT verification **on**. Creates the customer + £4.99/mo price on the fly. |
| `stripe-webhook` edge function | `supabase/functions/stripe-webhook/` | JWT verification **OFF** — auth is the Stripe signature. |
| `stripe-portal` edge function | `supabase/functions/stripe-portal/` | JWT verification **on**. Opens the Stripe Billing Portal. |
| Client | `src/lib/premium*.ts(x)`, `src/components/PremiumGate.tsx`, `src/pages/Premium.tsx` | `usePremium()` → `{ isPremium, subscription, refresh }`. |

## One-time setup

### 1. Run the migrations

Paste `0006_premium_subscriptions.sql` then `0007_streak_recovery.sql` into the
Supabase SQL editor (project `bozzojpwswuvbmqazvle`) and run each. Both are
idempotent and safe to re-run.

### 2. Edge Function secrets

Set these on the project (Edge Functions → Secrets). `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are auto-provided.

| Secret | Used by | Value |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | all three functions | `sk_test_…` / `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | `whsec_…` from step 4 |

### 3. Deploy the three functions

Dashboard → Edge Functions → "Deploy a new function" → "Via Editor". Paste each
`index.ts`, name it exactly `stripe-checkout` / `stripe-webhook` /
`stripe-portal`, deploy.

**After deploying `stripe-webhook`:** open it → Details → turn **"Verify JWT with
legacy secret" OFF**. Stripe does not send a Supabase JWT; the function verifies
the `Stripe-Signature` header instead. Leave it ON for the other two.

### 4. Create the Stripe webhook endpoint

Stripe Dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://bozzojpwswuvbmqazvle.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`

Copy the signing secret (`whsec_…`) into the `STRIPE_WEBHOOK_SECRET` secret and
re-deploy `stripe-webhook`.

### 5. Billing Portal

Stripe Dashboard → Settings → Billing → Customer portal → activate it (test and
live separately) so `stripe-portal` works.

The product ("Forged Premium") and the £4.99/mo GBP recurring price
(`lookup_key: forged_premium_monthly`) are created automatically by
`stripe-checkout` on the first checkout — no manual product setup needed.

## Test flow

1. `npm run dev`, sign in, go to `/premium`, click **Upgrade to Premium**.
2. Pay with card `4242 4242 4242 4242`, any future expiry/CVC.
3. Redirect back to `/premium?checkout=success`; the page polls `refresh()` for
   ~10s while the webhook lands, then shows "You're on Premium".
4. `/coach`, `/progress` Advanced section, and the Home streak-recovery button
   are now unlocked.
5. **Manage billing** → cancel → webhook sets `status = canceled` (or
   `cancel_at_period_end`), and access drops on the next `refresh()` (tab focus).

`stripe listen --forward-to https://bozzojpwswuvbmqazvle.supabase.co/functions/v1/stripe-webhook`
is handy for watching events locally.

## Notes / tradeoffs

- **Premium = `status in ('active','trialing')`** (see `src/lib/premium.ts` and
  `is_premium()`). `past_due` is *not* premium here — tighten/loosen in both
  places if you want a dunning grace period.
- **Streak recovery is generous**: the bridged days in `streak_recoveries`
  persist even if the user later downgrades, so that one gap stays filled in
  future recomputes. Rate-limited to one per rolling 30 days, 1–2 day lapses
  only. Enforced in `recover_streak()`, mirrored client-side in
  `src/lib/streak.ts` only for showing/hiding the UI.
- The **AI coach is rule-based** (`src/lib/coach.ts`) — a richer version of the
  free post-workout check-in, no external API. Swap `buildCoachReport` for an
  edge function calling an LLM if you want a real model later.
- `stripe-checkout` **seeds a `subscriptions` row** with just the customer id at
  checkout start, so the webhook can always map a Stripe customer → user even if
  events arrive out of order.
