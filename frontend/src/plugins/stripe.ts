import { loadStripe } from '@stripe/stripe-js'

// See backend/MIGRATION_ROADMAP.md's Stripe redesign note: the backend
// creates a server-side PaymentIntent and hands back a `clientSecret`; this
// confirms it client-side via Stripe Elements, so no card data ever touches
// our server. Requires a real Stripe test publishable key in
// VITE_STRIPE_PUBLISHABLE_KEY (see .env.example) - without one, checkout
// is disabled rather than silently pretending to work.
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined

export const stripePromise = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null)
