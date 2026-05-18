import BlankLayout from '@/layouts/blank.layout';
import { createBillingService, type PaymentMethodSetup } from '@/resources/billing';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { useEffect, useMemo, useState } from 'react';
import { Link, LoaderFunctionArgs, MetaFunction, redirect, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Set up payment');
});

/**
 * Server-side wait for the milo-billing controller to mint a Stripe
 * SetupIntent and write its clientSecret onto the PaymentMethodSetup
 * status. Bounded so a stuck reconciler surfaces an error to the user
 * rather than hanging the request.
 */
async function waitForClientSecret(
  service: ReturnType<typeof createBillingService>,
  namespace: string,
  name: string,
  { attempts = 20, intervalMs = 500 } = {}
): Promise<PaymentMethodSetup> {
  for (let i = 0; i < attempts; i++) {
    const setup = await service.getPaymentMethodSetup(namespace, name);
    if (setup.phase === 'Failed') return setup;
    if (setup.clientSecret && setup.publishableKey) return setup;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return service.getPaymentMethodSetup(namespace, name);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await getSession(request);
  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  const service = createBillingService();
  const account = await service.getBillingAccountForUser(session.sub);

  if (!account) {
    // Auto-billing-account controller hasn't created the BA yet; bounce
    // to /verifying which polls until it shows up.
    return redirect(paths.fraud.verifying);
  }

  if (account.paymentMethodAttached) {
    return redirect(paths.fraud.verifying);
  }

  // Always create a fresh PaymentMethodSetup. SetupIntents are short-lived
  // and one-shot; reusing across page loads risks expired client secrets.
  const created = await service.createPaymentMethodSetup(account, {
    returnURL: new URL(paths.fraud.verifying, new URL(request.url).origin).toString(),
  });

  const ready = await waitForClientSecret(service, created.namespace, created.name);

  if (ready.phase === 'Failed' || !ready.clientSecret || !ready.publishableKey) {
    return {
      error:
        ready.failureMessage ??
        'We could not start a payment setup. Please refresh the page or contact support.',
      clientSecret: null as string | null,
      publishableKey: null as string | null,
    };
  }

  return {
    error: null as string | null,
    clientSecret: ready.clientSecret,
    publishableKey: ready.publishableKey,
  };
};

/**
 * Stripe.js instance is created once per publishable key, outside the
 * component tree. Recreating it on every render breaks Stripe Elements.
 */
const stripeJsCache = new Map<string, Promise<Stripe | null>>();
function getStripe(publishableKey: string): Promise<Stripe | null> {
  const cached = stripeJsCache.get(publishableKey);
  if (cached) return cached;
  const fresh = loadStripe(publishableKey);
  stripeJsCache.set(publishableKey, fresh);
  return fresh;
}

export default function BillingSetupPage() {
  const data = useLoaderData<typeof loader>();
  const stripePromise = useMemo(
    () => (data.publishableKey ? getStripe(data.publishableKey) : null),
    [data.publishableKey]
  );

  if (data.error || !data.clientSecret || !data.publishableKey || !stripePromise) {
    return (
      <BlankLayout>
        <Card className="bg-card text-foreground z-10 w-full max-w-full rounded-xl border p-3 sm:max-w-sm sm:p-4 md:p-6 lg:p-8 xl:p-11">
          <CardContent className="p-0">
            <h2 className="mb-3 text-center text-xl font-medium">
              Couldn&apos;t start payment setup
            </h2>
            <p className="text-center text-[14px] leading-5 font-normal">
              {data.error ?? 'Something went wrong. Please try again.'}
            </p>
            <div className="mt-6 text-center">
              <Link
                to={paths.auth.logOut}
                className="dark:text-foreground dark:hover:text-foreground text-[14px] text-gray-600 underline hover:text-gray-900">
                Log out
              </Link>
            </div>
          </CardContent>
        </Card>
      </BlankLayout>
    );
  }

  return (
    <BlankLayout>
      <Card className="bg-card text-foreground z-10 w-full max-w-full rounded-xl border p-3 sm:max-w-md sm:p-4 md:p-6 lg:p-8 xl:p-11">
        <CardContent className="p-0">
          <h2 className="mb-2 text-center text-xl font-medium">Add a payment method</h2>
          <p className="mb-6 text-center text-[14px] leading-5 font-normal">
            We collect a card to verify your account before granting access. You won&apos;t be
            charged until you start consuming a paid service.
          </p>
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: data.clientSecret!, appearance: { theme: 'stripe' } }}>
            <CheckoutForm />
          </Elements>
          <div className="mt-6 text-center">
            <Link
              to={paths.auth.logOut}
              className="dark:text-foreground dark:hover:text-foreground text-[14px] text-gray-600 underline hover:text-gray-900">
              Log out
            </Link>
          </div>
        </CardContent>
      </Card>
    </BlankLayout>
  );
}

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Surface mounted-readiness so the submit button is disabled until the
  // PaymentElement has finished bootstrapping.
  const [elementReady, setElementReady] = useState(false);
  useEffect(() => {
    if (!elements) return;
    const pe = elements.getElement('payment');
    if (!pe) return;
    const onReady = () => setElementReady(true);
    pe.on('ready', onReady);
    return () => {
      pe.off('ready', onReady);
    };
  }, [elements]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const result = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url:
          typeof window !== 'undefined'
            ? new URL(paths.fraud.verifying, window.location.origin).toString()
            : paths.fraud.verifying,
      },
    });

    if (result.error) {
      setError(
        result.error.message ??
          'We could not confirm the card. Please check the details and try again.'
      );
      setSubmitting(false);
      return;
    }

    // The browser is redirected to return_url for 3DS-confirmed flows; for
    // non-redirect flows we navigate explicitly so the verifying page picks
    // up the webhook-driven status change.
    if (typeof window !== 'undefined') {
      window.location.replace(paths.fraud.verifying);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!stripe || !elements || !elementReady || submitting}
        className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60">
        {submitting ? 'Submitting…' : 'Continue'}
      </button>
    </form>
  );
}
