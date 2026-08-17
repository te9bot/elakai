import { HAS_BACKEND, supabase } from './supabase'

/* ==========================================================================
 * Which social sign-in providers this project actually has.
 *
 * WHY THIS IS ASKED RATHER THAN ASSUMED
 *
 * Enabling Google or Facebook is four steps in three places: create the OAuth
 * app with the provider, paste the client id and secret into the Supabase
 * dashboard, add the Supabase callback to the provider's allowed redirect list,
 * and add this site to Supabase's. None of that is a deploy, and the secrets
 * involved must never be in this repository — so the code cannot know from its
 * own build whether any of it has been done.
 *
 * Hard-coding the buttons would therefore ship a "Continue with Google" that
 * takes somebody to a Supabase error page reading `provider is not enabled`.
 * That is a worse first impression than no button, and it is the sort of thing
 * that stays broken for months because nobody on the team clicks it.
 *
 * So the app asks. `/auth/v1/settings` is a public, unauthenticated endpoint
 * that reports exactly which providers are configured, and the buttons render
 * from its answer. Turn Google on in the dashboard and it appears on the next
 * page load, with no redeploy and no code change. Turn it off and it goes away
 * rather than breaking.
 *
 * This is the same technique as `contributorSchemaReady` and `hasListingExtras`,
 * for the same reason: configuration is applied by a person, deploys are applied
 * by a push, and the two are on different clocks.
 *
 * VERIFIED STATE at the time of writing (2026-08-17): email true, google false,
 * facebook false. So the two social buttons are currently hidden and email is
 * the only way in. See supabase/CONTRIBUTORS.md for how to change that.
 * ========================================================================== */

export type SocialProvider = 'google' | 'facebook'

export type AuthProviders = {
  email: boolean
  google: boolean
  facebook: boolean
  /** True once the answer has come back, so the UI can avoid a button flash. */
  resolved: boolean
}

const NONE: AuthProviders = {
  // Email defaults to true, not false. If the probe fails we would rather show
  // a sign-in form that might not work than hide the only door in the building.
  email: true,
  google: false,
  facebook: false,
  resolved: false,
}

let cached: Promise<AuthProviders> | null = null

/**
 * Asked once per session, cached as the promise so the login and signup screens
 * share one request rather than issuing one each.
 *
 * Deliberately uses `fetch` rather than the Supabase client: there is no method
 * on the JS client for this endpoint, and it needs no session — it is the same
 * document the client itself reads to decide what it supports.
 */
export function authProviders(): Promise<AuthProviders> {
  if (!HAS_BACKEND || !supabase) return Promise.resolve({ ...NONE, resolved: true })

  cached ??= (async (): Promise<AuthProviders> => {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) return { ...NONE, resolved: true }

    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
    })
    if (!response.ok) throw new Error(`auth settings responded ${response.status}`)

    const settings = (await response.json()) as {
      external?: Record<string, boolean>
      disable_signup?: boolean
    }
    const external = settings.external ?? {}

    return {
      email: external.email !== false,
      google: external.google === true,
      facebook: external.facebook === true,
      resolved: true,
    }
  })().catch((error) => {
    // Not fatal, and not silent. The email form still renders; only the social
    // buttons are lost, and the reason is in the console for whoever wonders
    // why they went missing.
    console.warn(
      '[elakai] could not read which sign-in providers are enabled; ' +
        'showing email only. ' +
        (error instanceof Error ? error.message : String(error)),
    )
    return { ...NONE, resolved: true }
  })

  return cached
}

/** Testing seam: forget the cached answer so the next call asks again. */
export function resetAuthProviders(): void {
  cached = null
}

export const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
}
