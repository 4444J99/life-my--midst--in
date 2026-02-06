'use client';

import { useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lightbulb,
  Users,
  Zap,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

interface OnboardingWizardProps {
  profileId: string;
  onComplete: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => Promise<void>;
  };
}

export default function OnboardingWizard({ profileId, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to in–midst–my–life',
      description: 'The theatrical CV system that honors your complete humanity',
      icon: <Lightbulb className="w-8 h-8" />,
      content: (
        <div className="space-y-6">
          <p className="text-lg text-gray-700">
            You're about to transform how the world sees you. Instead of reducing yourself to a
            single resume, you'll present yourself authentically across multiple contexts—theatrical
            masks that are all genuinely <em>you</em>.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">🎭 Theatrical Identity</h4>
              <p className="text-sm text-blue-800">
                Present different authentic facets of yourself to different audiences.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">🔍 Smart Matching</h4>
              <p className="text-sm text-green-800">
                Let organizations prove themselves worthy of your expertise.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">📊 Complete Profile</h4>
              <p className="text-sm text-purple-800">
                One master CV captures all your skills—mother, artist, coder, teacher.
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-2">⚡ Batch Operations</h4>
              <p className="text-sm text-orange-800">
                Let autonomous agents handle job searching and compatibility analysis.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'profile',
      title: 'Build Your Master Profile',
      description: 'Create the single source of truth for all your capabilities',
      icon: <Users className="w-8 h-8" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-700">
            Your master profile (Curriculum Vitae Multiplex) includes{' '}
            <strong>everything you've accomplished</strong>—every role, skill, achievement,
            learning, and growth. Think of it as your complete life story, not just your job
            history.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 mb-3">What to include:</h4>
            <ul className="space-y-2 text-sm text-amber-800">
              <li>✓ Traditional work experience (jobs, roles, projects)</li>
              <li>✓ Volunteer work and community involvement</li>
              <li>✓ Personal projects and creative work</li>
              <li>✓ Teaching, mentoring, and leadership experiences</li>
              <li>✓ Recovery journeys and resilience lessons</li>
              <li>✓ Skills from raising children or managing households</li>
              <li>✓ Artistic, writing, or creative pursuits</li>
              <li>✓ Formal education and self-directed learning</li>
              <li>✓ Problem-solving across any domain</li>
            </ul>
          </div>
          <p className="text-sm text-gray-600">
            <em>
              The system will help you tag each entry with which personas benefit from seeing it.
            </em>
          </p>
        </div>
      ),
      action: {
        label: 'Start Building Profile',
        href: `/dashboard/${profileId}/profile/edit`,
      },
    },
    {
      id: 'personas',
      title: 'Create Your Personas',
      description: 'Define the authentic masks you wear in different contexts',
      icon: <Users className="w-8 h-8" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-700">
            Personas aren't deceptions—they're <strong>authentic filtered views of yourself</strong>
            . Each persona emphasizes different capabilities for different contexts. Here are common
            examples:
          </p>
          <div className="space-y-3">
            {[
              {
                name: 'The Architect',
                description:
                  'Systems designer, strategist, long-term planner. Emphasizes large-scale thinking, organizational leadership, and strategic vision.',
              },
              {
                name: 'The Engineer',
                description:
                  'Problem-solver, builder, hands-on implementer. Emphasizes technical depth, execution, debugging, and shipping.',
              },
              {
                name: 'The Technician',
                description:
                  'Craftsperson, detail-oriented executor, quality advocate. Emphasizes precision, testing, documentation, and polish.',
              },
              {
                name: 'The Creator',
                description:
                  'Artist, writer, innovator, original thinker. Emphasizes creative output, aesthetic sensibility, and novel approaches.',
              },
            ].map((persona) => (
              <div key={persona.name} className="p-3 bg-gray-50 border border-gray-200 rounded">
                <h4 className="font-semibold text-gray-900">{persona.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{persona.description}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            <em>
              You don't need to fit into predefined categories. Create personas that authentically
              represent how you show up.
            </em>
          </p>
        </div>
      ),
      action: {
        label: 'Create Personas',
        href: `/dashboard/${profileId}/personas`,
      },
    },
    {
      id: 'hunter',
      title: 'Start Your Job Search',
      description: 'Let autonomous agents handle intelligent job discovery',
      icon: <Zap className="w-8 h-8" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-700">
            The <strong>Hunter Protocol</strong> replaces spray-and-pray application strategies with
            intelligent autonomous agents:
          </p>
          <div className="space-y-3">
            {[
              {
                step: '1. Search',
                description:
                  'Autonomous agent finds relevant jobs matching your criteria and values',
              },
              {
                step: '2. Analyze',
                description:
                  'Honest gap analysis: where you match, where you need growth, realistic compatibility',
              },
              {
                step: '3. Tailor',
                description:
                  'Your resume is auto-tailored to show the relevant persona for this specific role',
              },
              {
                step: '4. Apply',
                description: 'Personalized cover letter generated, then you review and submit',
              },
            ].map((item) => (
              <div key={item.step} className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-semibold text-blue-900">{item.step}</h4>
                <p className="text-sm text-blue-700 mt-1">{item.description}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            <em>
              Instead of 2000 applications, you'll focus on 10-20 intelligent matches. Quality over
              quantity.
            </em>
          </p>
        </div>
      ),
      action: {
        label: 'Start Hunter Protocol',
        href: `/dashboard/${profileId}/hunter`,
      },
    },
    {
      id: 'interview',
      title: 'Conduct Inverted Interviews',
      description: 'Evaluate organizations instead of hoping to impress them',
      icon: <MessageSquare className="w-8 h-8" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-700">
            Rather than letting organizations secretly judge you, <strong>you evaluate them</strong>
            . When an employer visits your profile, they're interviewed about their culture, values,
            and match with you.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-3">Five Evaluation Categories:</h4>
            <ul className="space-y-2 text-sm text-green-800">
              <li>
                <strong>Cultural Fit:</strong> Values, work style, team dynamics
              </li>
              <li>
                <strong>Growth Potential:</strong> Learning opportunities, mentorship, career
                trajectory
              </li>
              <li>
                <strong>Compensation & Benefits:</strong> Fair pay, benefits, flexibility, work-life
                balance
              </li>
              <li>
                <strong>Sustainability:</strong> Business health, job security, long-term viability
              </li>
              <li>
                <strong>Impact & Purpose:</strong> Meaningful work, contribution to your values
              </li>
            </ul>
          </div>
          <p className="text-sm text-gray-600">
            <em>
              Both parties get transparency. No more surprise misalignments after months of
              onboarding.
            </em>
          </p>
        </div>
      ),
      action: {
        label: 'Learn More',
        href: `/dashboard/${profileId}/interviews`,
      },
    },
    {
      id: 'feedback',
      title: 'Share Your Feedback',
      description: 'Help us improve the system for everyone',
      icon: <Lightbulb className="w-8 h-8" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-700">
            You're part of our beta launch. Your feedback directly shapes the product. What's
            working? What's confusing? What features would transform your job search?
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 mb-3">We're listening for:</h4>
            <ul className="space-y-2 text-sm text-purple-800">
              <li>• Onboarding clarity and ease</li>
              <li>• Feature requests and missing functionality</li>
              <li>• Integration ideas (ATS, job boards, LinkedIn)</li>
              <li>• UI/UX improvements</li>
              <li>• Performance issues</li>
              <li>• Ideas for monetization that don't compromise values</li>
            </ul>
          </div>
        </div>
      ),
      action: {
        label: 'Send Feedback',
        href: `/dashboard/${profileId}/feedback`,
      },
    },
    {
      id: 'complete',
      title: "You're All Set! 🎉",
      description: 'Ready to transform your job search',
      icon: <CheckCircle2 className="w-8 h-8" />,
      content: (
        <div className="space-y-6 text-center">
          <p className="text-lg text-gray-700">
            You now have the foundation to present yourself authentically while letting intelligent
            systems and mutual evaluation handle the rest.
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-purple-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3">Next Steps:</h4>
            <ol className="text-left space-y-2 text-sm text-gray-700 max-w-md mx-auto">
              <li>1. Complete your master profile with all experiences</li>
              <li>2. Refine your personas to authentically represent you</li>
              <li>3. Set up Hunter Protocol job search criteria</li>
              <li>4. Share your profile link with trusted advisors</li>
              <li>5. Prepare your Inverted Interview evaluation criteria</li>
            </ol>
          </div>
          <p className="text-sm text-gray-600">
            <em>Remember: you're not trying to fit the system. The system fits you.</em>
          </p>
        </div>
      ),
    },
  ];

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps((prev) => new Set([...prev, steps[currentStep]!.id]));
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  }, [currentStep, steps, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleAction = useCallback(async () => {
    const action = steps[currentStep]?.action;
    if (action?.onClick) {
      setIsLoading(true);
      try {
        await action.onClick();
      } finally {
        setIsLoading(false);
      }
    } else if (action?.href) {
      window.location.href = action.href;
    }
  }, [currentStep, steps]);

  const step = steps[currentStep]!;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip Tour
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Completed Steps Indicator */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {steps.map((s, idx) => (
            <div
              key={s.id}
              className={`w-2 h-2 rounded-full transition-all ${
                completedSteps.has(s.id)
                  ? 'bg-green-500 scale-125'
                  : idx === currentStep
                    ? 'bg-blue-500 scale-125'
                    : 'bg-gray-300'
              }`}
              title={s.title}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-blue-600">{step.icon}</div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{step.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{step.description}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mb-8">{step.content}</div>

          {/* Action Button */}
          {step.action && step.id !== 'welcome' && step.id !== 'complete' && (
            <div className="mb-8">
              {step.action.href ? (
                <Link
                  href={step.action.href}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {step.action.label} →
                </Link>
              ) : (
                <button
                  onClick={handleAction}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Loading...' : step.action.label}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleNext}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              currentStep === steps.length - 1
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {currentStep === steps.length - 1 ? (
              <>
                Complete
                <CheckCircle2 className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
