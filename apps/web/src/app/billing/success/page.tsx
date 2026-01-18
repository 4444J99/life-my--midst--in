'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { getSubscription } from '@/lib/api-client';
import { NeoCard } from '@in-midst-my-life/design-system';

function SuccessContent() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Note: searchParams.get('session_id') would be used for Stripe session verification in production
  const profileId = '00000000-0000-0000-0000-000000000001'; // TODO: Get from auth context

  useEffect(() => {
    async function fetchSubscription() {
      try {
        // Wait a few seconds for webhook to process
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const response = await getSubscription(profileId);
        if (!response.ok) {
          throw new Error(response.message || 'Failed to fetch subscription');
        }

        setSubscription(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (profileId) {
      fetchSubscription();
    }
  }, [profileId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mb-6"></div>
        <h1 className="text-2xl font-bold mb-2">Processing your payment...</h1>
        <p className="text-gray-400">Please wait while we confirm your subscription.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
        <NeoCard variant="obsidian" className="max-w-md w-full p-8 text-center border-red-900">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2 text-red-400">Something went wrong</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/pricing')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Return to Pricing
          </button>
        </NeoCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
      <NeoCard variant="cyber" className="max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="text-4xl text-green-500">✓</div>
        </div>
        <h1 className="text-3xl font-bold mb-2">Welcome to {subscription?.tier}!</h1>
        <p className="text-gray-400 mb-8">Your subscription is now active.</p>

        <div className="bg-black/50 p-6 rounded-lg border border-gray-800 text-left mb-8">
          <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">
            Subscription Details
          </h2>
          <div className="space-y-2 text-sm">
            <p className="flex justify-between">
              <span className="text-gray-500">Plan:</span>
              <span className="text-white font-mono">{subscription?.tier}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-500">Billing:</span>
              <span className="text-white capitalize">{subscription?.billingInterval}</span>
            </p>
            {subscription?.currentPeriodEnd && (
              <p className="flex justify-between">
                <span className="text-gray-500">Renews:</span>
                <span className="text-white">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => router.push('/billing/manage')}
            className="w-full bg-transparent hover:bg-gray-900 text-gray-400 font-bold py-3 px-6 rounded-lg border border-gray-800 transition-all"
          >
            Manage Subscription
          </button>
        </div>
      </NeoCard>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mb-6"></div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
