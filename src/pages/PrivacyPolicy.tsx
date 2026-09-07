import { useNavigate } from 'react-router-dom'

const sectionClass = 'space-y-2'
const headingClass = 'text-lg font-semibold text-neutral-900 dark:text-white'
const bodyClass = 'text-sm leading-relaxed text-neutral-700 dark:text-neutral-300'
const listClass = 'list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300'

function PrivacyPolicy() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-md space-y-6 p-4 pb-16">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm font-medium text-neutral-600 dark:text-neutral-400"
      >
        ← Back
      </button>

      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Privacy Policy</h1>
        <p className="mt-1 text-xs text-neutral-500">Last updated 7 September 2026</p>
      </div>

      <p className={bodyClass}>
        Forged ("Forged", "we", "us", "our") provides a fitness tracking app. This policy explains
        what personal data we collect, why we collect it, who we share it with, and the rights you
        have over it. Forged is based in the United Kingdom, and we handle personal data in
        accordance with the UK General Data Protection Regulation (UK GDPR) and the Data
        Protection Act 2018.
      </p>

      <section className={sectionClass}>
        <h2 className={headingClass}>Data we collect</h2>
        <p className={bodyClass}>We collect the following categories of personal data:</p>
        <ul className={listClass}>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Account details</span>
            {' — '}your email address, username, and display name, used to create and secure your
            account and let other users find you.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Fitness profile data</span>
            {' — '}your training goals, workout plans, logged workout history, and streak data,
            used to power the app's tracking, progress, and coaching features.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Payment data</span>
            {' — '}if you subscribe to Forged Premium or make a one-off purchase (such as streak
            restoral), payment is processed by Stripe. We never see or store your card details —
            Stripe handles this directly, and we only receive confirmation of your subscription or
            purchase status.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">
              Messages, photos, and videos
            </span>
            {' — '}if you message other users, we store the message content and any photos or
            videos you choose to attach, using Supabase Storage.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">
              Push notification data
            </span>
            {' — '}if you enable reminders, we use OneSignal to deliver daily reminder and
            streak-at-risk notifications. This involves sharing a device/subscription identifier
            and your reminder preferences with OneSignal so it can deliver the notification.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">AI coach data</span>
            {' — '}the "Your coach" feature analyses your logged workout history to generate
            guidance. This analysis runs on our own infrastructure — your workout data is not sent
            to any third-party AI provider for this feature.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Usage and device data</span>
            {' — '}basic technical data (such as sign-in timestamps) needed to operate and secure
            the app, and a theme preference stored locally on your device.
          </li>
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Why we use your data</h2>
        <p className={bodyClass}>We rely on the following legal bases under UK GDPR:</p>
        <ul className={listClass}>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Contract</span>
            {' — '}processing account, fitness, and payment data is necessary to provide the
            service you sign up for.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Consent</span>
            {' — '}sending push notifications, which you can turn off at any time in Settings.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Legitimate interests</span>
            {' — '}keeping the app secure, preventing abuse, and improving our features.
          </li>
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Who we share data with</h2>
        <p className={bodyClass}>
          We don't sell your personal data. We share it only with the service providers that help
          us run Forged, each acting under their own data processing terms:
        </p>
        <ul className={listClass}>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Supabase</span>
            {' — '}our database, authentication, file storage, and backend hosting provider. Most
            of your data (account, fitness, messages, and media) is stored with Supabase.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Stripe</span>
            {' — '}our payment processor for subscriptions and purchases.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">OneSignal</span>
            {' — '}our push notification provider, used only if you enable reminders.
          </li>
        </ul>
        <p className={bodyClass}>
          These providers may process data on servers outside the UK. Where that happens, we rely
          on their standard contractual clauses or equivalent safeguards recognised under UK GDPR.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>How long we keep your data</h2>
        <p className={bodyClass}>
          We keep your data for as long as your account is active. If you delete your account,
          your profile, workouts, streaks, messages, media, and subscription records are
          permanently and immediately deleted, with the narrow exception of records we're legally
          required to retain (such as payment records for tax purposes, kept by Stripe).
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Your rights</h2>
        <p className={bodyClass}>Under UK GDPR, you have the right to:</p>
        <ul className={listClass}>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Access</span>
            {' — '}request a copy of the personal data we hold about you.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Correction</span>
            {' — '}fix inaccurate data. You can update your username, display name, and email
            directly in Settings; contact us for anything you can't change yourself.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Deletion</span>
            {' — '}erase your account and data. You can do this yourself at any time from{' '}
            <span className="font-medium text-neutral-900 dark:text-white">
              Settings → Delete account
            </span>
            , which permanently deletes your account and all associated data. You can also request
            this by contacting us.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Restriction and objection</span>
            {' — '}ask us to limit how we use your data, or object to certain processing.
          </li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-white">Portability</span>
            {' — '}receive your data in a structured, commonly used format.
          </li>
        </ul>
        <p className={bodyClass}>
          To exercise any of these rights, contact us using the details below. You also have the
          right to lodge a complaint with the UK's data protection regulator, the{' '}
          <a
            href="https://ico.org.uk/make-a-complaint/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-neutral-900 underline dark:text-white"
          >
            Information Commissioner's Office (ICO)
          </a>
          .
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Children</h2>
        <p className={bodyClass}>
          Forged is not directed at children, and we don't knowingly collect personal data from
          anyone under 16. If you believe a child has provided us with personal data, please
          contact us and we'll delete it.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Changes to this policy</h2>
        <p className={bodyClass}>
          We may update this policy as Forged changes. If we make material changes, we'll let you
          know in the app before they take effect.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Contact us</h2>
        <p className={bodyClass}>
          For any privacy questions, or to exercise your rights, email us at{' '}
          <a href="mailto:forgedapplication@gmail.com" className="font-medium text-neutral-900 underline dark:text-white">
            forgedapplication@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  )
}

export default PrivacyPolicy
