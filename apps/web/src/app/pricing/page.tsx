'use client';

import React, { useState } from 'react';
import { PricingCard } from '@/components/marketing/PricingCard';
import { createCheckoutSession } from '@/lib/api-client';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null); // Track which tier is loading
  const [error, setError] = useState<string | null>(null);

  // Get profileId (from auth context or session)
  // For now, hardcode for testing
  const profileId = '00000000-0000-0000-0000-000000000001'; // TODO: Get from auth context

  const handleUpgrade = async (
    tier: 'PRO' | 'ENTERPRISE',
    interval: 'monthly' | 'yearly' = 'monthly',
  ) => {
    setLoading(`${tier}-${interval}`);
    setError(null);

    try {
      const response = await createCheckoutSession(profileId, {
        tier,
        billingInterval: interval,
        successUrl: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/billing/cancel`,
      });

      if (!response.ok) {
        throw new Error(response.message || 'Failed to create checkout session');
      }

      if (response.data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

      <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h1 className="text-base font-semibold leading-7 text-cyan-400">Monetization Phase</h1>
          <p className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Invest in your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
              Automated Future
            </span>
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Stop manually applying to jobs. Let the Hunter Protocol work for you 24/7. Gate the
            automation, not your data.
          </p>
        </div>

        {error && (
          <div className="mx-auto max-w-md mb-8 bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg flex justify-between items-center">
            <p>Error: {error}</p>
            <button onClick={() => setError(null)} className="text-red-200 hover:text-white">
              ✕
            </button>
          </div>
        )}

        <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          <PricingCard
            tier="FREE"
            name="The Explorer"
            price="$0"
            description="Perfect for casual browsing and organizing your identity."
            features={[
              '5 AI Job Searches / month',
              '3 Identity Masks',
              'Basic Resume Builder',
              'Manual Applications',
              '7-day Data Retention',
            ]}
            isCurrent={true} // TODO: Check actual entitlement
            onSelect={() => console.log('Current plan is Free')}
            loading={loading === 'FREE-monthly'}
          />

          <PricingCard
            tier="PRO"
            name="The Hunter"
            price="$29"
            description="For serious job seekers who value their time."
            features={[
              'Unlimited AI Job Searches',
              '16 Identity Masks',
              '1 Autonomous Auto-Apply Agent',
              'Advanced Resume Tailoring',
              'Priority Processing',
              'Unlimited Data Retention',
            ]}
            isCurrent={false}
            isPopular={true}
            loading={loading === 'PRO-monthly'}
            onSelect={() => handleUpgrade('PRO', 'monthly')}
          />

          <PricingCard
            tier="ENTERPRISE"
            name="The Architect"
            price="Custom"
            description="For agencies and power users managing multiple profiles."
            features={[
              'Multiple Autonomous Agents',
              'Unlimited Masks',
              'API Access',
              'White-label Reports',
              'Dedicated Account Manager',
              'SLA Support',
            ]}
            isCurrent={false}
            loading={loading === 'ENTERPRISE-monthly'}
            onSelect={() => (window.location.href = 'mailto:sales@in-midst.com')}
          />
        </div>
      </div>
    </main>
  );
}
