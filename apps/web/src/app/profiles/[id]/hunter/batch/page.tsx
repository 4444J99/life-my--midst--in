'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Download, BarChart3 } from 'lucide-react';
import BatchApplications from '@/components/BatchApplications';
import { usePersonae } from '@/hooks/usePersonae';

interface PageProps {
  params: {
    id: string;
  };
}

export default function BatchApplicationsPage({ params }: PageProps) {
  const { id: profileId } = params;
  const { personas, selectedPersonaId, selectPersona } = usePersonae(profileId);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [minScore, setMinScore] = useState(70);
  const [showSettings, setShowSettings] = useState(false);
  const [maxApplicationsPerDay, setMaxApplicationsPerDay] = useState(10);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Initialize persona selection
  useEffect(() => {
    if (selectedPersonaId && !personaId) {
      setPersonaId(selectedPersonaId);
    } else if (personas.length > 0 && !personaId && !selectedPersonaId) {
      const firstPersona = personas[0];
      if (firstPersona) {
        setPersonaId(firstPersona.id);
        selectPersona(firstPersona.id);
      }
    }
  }, [personas, selectedPersonaId, personaId, selectPersona]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link
                href={`/profiles/${profileId}/hunter`}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Batch Applications</h1>
                <p className="text-sm text-slate-600">Submit multiple applications intelligently</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Settings size={18} />
                Settings
              </button>
              <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
                <BarChart3 size={18} />
                Analytics
              </button>
              <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
                <Download size={18} />
                Export
              </button>
            </div>
          </div>

          {/* Persona & Threshold Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Primary Persona
              </label>
              <select
                value={personaId || 'default'}
                onChange={(e) => {
                  const newId = e.target.value;
                  setPersonaId(newId);
                  selectPersona(newId);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="default">Default</option>
                {personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {(persona as any).everyday_name ||
                      (persona as any).nomen ||
                      `Persona ${persona.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Minimum Compatibility Score
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="font-semibold text-slate-900 w-12 text-right">{minScore}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Application Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Max Applications Per Day
                    </label>
                    <input
                      type="number"
                      value={maxApplicationsPerDay}
                      onChange={(e) => setMaxApplicationsPerDay(Number(e.target.value))}
                      min="1"
                      max="50"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Prevents rate limiting and maintains professional appearance
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="notifications"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="notifications" className="text-sm text-slate-700">
                      Email notifications on application status
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Compatibility Weights</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-700">Skill Match</span>
                    <span className="font-semibold text-slate-900">35%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Cultural Fit</span>
                    <span className="font-semibold text-slate-900">25%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Growth Potential</span>
                    <span className="font-semibold text-slate-900">15%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Compensation Fit</span>
                    <span className="font-semibold text-slate-900">15%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Location Suitability</span>
                    <span className="font-semibold text-slate-900">10%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <BatchApplications
          profileId={profileId}
          personaId={personaId ?? ''}
          minCompatibilityScore={minScore}
        />

        {/* Best Practices */}
        <div className="mt-12 bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Best Practices for Batch Applications
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Before You Apply</h3>
              <ul className="text-sm text-slate-700 space-y-2 list-disc list-inside">
                <li>Review job descriptions for company culture fit</li>
                <li>Verify technical requirements match your expertise</li>
                <li>Check salary ranges align with your expectations</li>
                <li>Ensure location/remote preferences match</li>
                <li>Test with 5-10 applications first to refine settings</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">After Applications</h3>
              <ul className="text-sm text-slate-700 space-y-2 list-disc list-inside">
                <li>Track response rates and interview rates</li>
                <li>Monitor which job types/companies respond</li>
                <li>Adjust compatibility thresholds based on outcomes</li>
                <li>Personalize applications with higher response potential</li>
                <li>Follow up after 1-2 weeks if no response</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Theater Disclaimer */}
        <div className="mt-8 p-6 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">🎭 On Theatrical Performance</h3>
          <p className="text-sm text-purple-800">
            Each application presents you through a specific persona—the Architect, the Engineer,
            the Generalist. This is not deception. It is strategic curation of your genuine
            capabilities. Each persona is authentically you, simply emphasizing different facets of
            your complete humanity. The resume tailoring highlights strengths most relevant to each
            role, while the generated cover letters speak to genuine interests and growth
            opportunities. You are not becoming someone else; you are showing which version of your
            authentic self best aligns with each opportunity.
          </p>
        </div>
      </div>
    </div>
  );
}
