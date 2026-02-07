# Phase 1C: UI Design & Marketing Spec

**Status**: Planning
**Target**: Stream 1C (Frontend & Marketing)
**Priority**: Medium (20%)

## 1. Overview
The UI must transparently communicate value and limits. Users should never feel "blocked" without a clear path forward. The goal is conversion through utility, not frustration.

## 2. Components

### 2.1 Pricing Page (`/pricing`)
**Layout**: 3-column grid (Mobile: Stacked).

| Tier | Free | Pro (Recommended) | Enterprise |
| :--- | :--- | :--- | :--- |
| **Headline** | "The Explorer" | "The Hunter" | "The Architect" |
| **Price** | $0 / mo | $29 / mo | Custom |
| **Search** | 5 searches/mo | Unlimited | Unlimited |
| **Auto-Apply** | Manual only | 1 Auto-Agent | Multiple Agents |
| **Masks** | 3 Personas | 16 Personas | Unlimited |
| **CTA** | "Current Plan" | "Upgrade" (Primary) | "Contact Us" |

**Component Props (`PricingCard.tsx`)**:
```typescript
interface PricingCardProps {
  tier: SubscriptionTier;
  price: string;
  features: string[];
  isCurrent?: boolean;
  onSelect: () => void;
  loading?: boolean;
}
```

### 2.2 Upgrade Prompt (`UpgradeWall.tsx`)
**Context**: Shown when a user hits a Feature Gate (e.g., clicks "Search" but limit is 0).
**Design**:
- **Modal/Overlay**: Interrupts the action but preserves context.
- **Graphic**: "Hunter Agent" paused/waiting.
- **Copy**: "Your Hunter needs more fuel. You've used your 5 free searches this month."
- **CTA**: "Unlock Unlimited Searches ($29/mo)"
- **Secondary**: "Wait until Feb 1st"

### 2.3 Feature Usage Indicator
**Context**: Dashboard Sidebar or Header.
**Design**:
- **Progress Bar**: Thin line under "Hunter Protocol".
- **Tooltip**: "2/5 Searches used".
- **Color**: Green (0-50%), Yellow (51-80%), Red (81-100%).

### 2.4 Landing Page (`/`)
**Information Architecture**:
1.  **Hero**: "Stop Applying. Start Hunting." (Value Prop).
2.  **Problem**: "The job market is broken. Spamming resumes doesn't work."
3.  **Solution**: "Autonomous Agents that analyze fit, tailor resumes, and apply for you."
4.  **How it Works**:
    - Step 1: Define your Masks (Identity).
    - Step 2: Configure Hunter (Search).
    - Step 3: Approve & Send.
5.  **Social Proof / Trust**: "Private by design. Your data never trains our public models."
6.  **CTA**: "Start for Free" (Anchors to Pricing).

## 3. User Flows

### 3.1 Sign Up -> Upgrade
1.  User lands on `/`. Clicks "Start Free".
2.  Onboards (Create Profile, 1 Mask).
3.  Tries Hunter. Successful search.
4.  Loves it. Wants more.
5.  Clicks "Upgrade" in Navbar.
6.  Redirects to Stripe Checkout.
7.  Returns to `/billing/success`.
8.  Confetti! "You are now a Pro."

### 3.2 Limit Hit
1.  User (Free) runs 5th search.
2.  Notification: "That was your last free search for January."
3.  User tries 6th search.
4.  `UpgradeWall` Modal appears.
5.  User clicks "Upgrade". -> Stripe.

## 4. Technical Integration
- **State Management**: React Query / SWR to fetch `/api/licensing/me`.
- **Latency**: Usage data must be fresh. Invalidate cache on every "Action" (Search, Apply).
- **Error Handling**: 402 Payment Required from API -> Trigger `UpgradeWall`.

## 5. Responsive Design
- **Mobile**: Pricing cards stack vertically. Comparison table becomes "Accordion" or simplified list.
- **Dark Mode**: Default. Neo-Brutalist / Cyberpunk aesthetic (Green/Black/Cyan).
