'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Clock, Send, Pause, RotateCcw, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: 'fully' | 'hybrid' | 'onsite';
  salary_min?: number;
  salary_max?: number;
}

interface CompatibilityResult {
  overall_score: number;
  recommendation: 'apply_now' | 'strong_candidate' | 'moderate_fit' | 'stretch_goal' | 'skip';
  skill_match: number;
  cultural_match: number;
}

interface ApplicationJob extends Job {
  compatibility: CompatibilityResult;
  status: 'pending' | 'submitted' | 'failed' | 'skipped';
  submittedAt?: Date;
  error?: string;
}

interface BatchApplicationsProps {
  profileId: string;
  personaId: string;
  minCompatibilityScore?: number;
}

export default function BatchApplications({
  profileId,
  personaId: _personaId,
  minCompatibilityScore = 70,
}: BatchApplicationsProps) {
  const [jobs, setJobs] = useState<ApplicationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [autoApplyThreshold, setAutoApplyThreshold] = useState(minCompatibilityScore);
  const [submitted, setSubmitted] = useState(0);
  const [failed, setFailed] = useState(0);
  const [currentJob, setCurrentJob] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Load jobs and compatibility data
  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);

        // Mock data for demonstration
        const mockJobs: ApplicationJob[] = [
          {
            id: 'job-1',
            title: 'Senior Software Engineer',
            company: 'TechCorp',
            location: 'San Francisco, CA',
            remote: 'hybrid',
            salary_min: 180000,
            salary_max: 240000,
            compatibility: {
              overall_score: 85,
              recommendation: 'apply_now',
              skill_match: 88,
              cultural_match: 82,
            },
            status: 'pending',
          },
          {
            id: 'job-2',
            title: 'Staff Engineer',
            company: 'CloudScale',
            location: 'New York, NY',
            remote: 'fully',
            salary_min: 200000,
            salary_max: 260000,
            compatibility: {
              overall_score: 82,
              recommendation: 'apply_now',
              skill_match: 80,
              cultural_match: 78,
            },
            status: 'pending',
          },
          {
            id: 'job-3',
            title: 'Engineering Manager',
            company: 'StartupXYZ',
            location: 'Remote',
            remote: 'fully',
            salary_min: 170000,
            salary_max: 220000,
            compatibility: {
              overall_score: 75,
              recommendation: 'strong_candidate',
              skill_match: 72,
              cultural_match: 80,
            },
            status: 'pending',
          },
          {
            id: 'job-4',
            title: 'Full Stack Engineer',
            company: 'WebDev Inc',
            location: 'Austin, TX',
            remote: 'hybrid',
            salary_min: 140000,
            salary_max: 180000,
            compatibility: {
              overall_score: 68,
              recommendation: 'moderate_fit',
              skill_match: 70,
              cultural_match: 65,
            },
            status: 'pending',
          },
          {
            id: 'job-5',
            title: 'Principal Architect',
            company: 'EnterpriseGlobal',
            location: 'San Francisco, CA',
            remote: 'onsite',
            salary_min: 220000,
            salary_max: 300000,
            compatibility: {
              overall_score: 78,
              recommendation: 'strong_candidate',
              skill_match: 76,
              cultural_match: 75,
            },
            status: 'pending',
          },
        ];

        setJobs(mockJobs);
      } catch (error) {
        console.error('Failed to load jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [profileId]);

  const handleSelectJob = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobs.map((j) => j.id)));
    }
  };

  const handleAutoApplyAll = async () => {
    const jobsToApply = jobs.filter(
      (j) => j.compatibility.overall_score >= autoApplyThreshold && j.status === 'pending',
    );

    setSubmitting(true);
    setSubmitted(0);
    setFailed(0);

    for (const job of jobsToApply) {
      if (paused) break;

      setCurrentJob(job.id);

      try {
        // Simulate API call to submit application
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Update job status
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: 'submitted' as const, submittedAt: new Date() } : j,
          ),
        );

        setSubmitted((s) => s + 1);
      } catch (error) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: 'failed' as const,
                  error: error instanceof Error ? error.message : 'Unknown error',
                }
              : j,
          ),
        );

        setFailed((f) => f + 1);
      }
    }

    setSubmitting(false);
    setCurrentJob(null);
  };

  const handleSubmitSelected = async () => {
    setSubmitting(true);
    setSubmitted(0);
    setFailed(0);

    const selectedJobsList = jobs.filter((j) => selectedJobs.has(j.id));

    for (const job of selectedJobsList) {
      if (paused) break;

      setCurrentJob(job.id);

      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: 'submitted' as const, submittedAt: new Date() } : j,
          ),
        );

        setSubmitted((s) => s + 1);
      } catch (error) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: 'failed' as const,
                  error: error instanceof Error ? error.message : 'Unknown error',
                }
              : j,
          ),
        );

        setFailed((f) => f + 1);
      }
    }

    setSubmitting(false);
    setCurrentJob(null);
    setSelectedJobs(new Set());
  };

  const handleRemoveJob = (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setSelectedJobs((prev) => {
      const newSelected = new Set(prev);
      newSelected.delete(jobId);
      return newSelected;
    });
  };

  const handleReset = () => {
    setJobs((prev) =>
      prev.map((j) => ({
        ...j,
        status: 'pending' as const,
        submittedAt: undefined,
        error: undefined,
      })),
    );
    setSubmitted(0);
    setFailed(0);
    setSelectedJobs(new Set());
    setCurrentJob(null);
    setSubmitting(false);
    setPaused(false);
  };

  const statsData = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    submitted: jobs.filter((j) => j.status === 'submitted').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
    eligible: jobs.filter((j) => j.compatibility.overall_score >= autoApplyThreshold).length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-96 bg-slate-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-slate-600">Total Jobs</p>
          <p className="text-3xl font-bold text-slate-900">{statsData.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-slate-600">Eligible (≥{autoApplyThreshold}%)</p>
          <p className="text-3xl font-bold text-slate-900">{statsData.eligible}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-slate-600">Submitted</p>
          <p className="text-3xl font-bold text-slate-900">{statsData.submitted}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-sm text-slate-600">Pending</p>
          <p className="text-3xl font-bold text-slate-900">{statsData.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-sm text-slate-600">Failed</p>
          <p className="text-3xl font-bold text-slate-900">{statsData.failed}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Auto-Apply Threshold
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={autoApplyThreshold}
                onChange={(e) => setAutoApplyThreshold(Number(e.target.value))}
                disabled={submitting}
                className="flex-1"
              />
              <span className="font-bold text-slate-900 w-12 text-right">
                {autoApplyThreshold}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {statsData.eligible} of {statsData.total} jobs are eligible at this score
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAutoApplyAll}
              disabled={submitting || statsData.eligible === 0}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Send size={16} />
              Auto-Apply All Eligible
            </button>

            {submitting && (
              <button
                onClick={() => setPaused(!paused)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium flex items-center gap-2"
              >
                <Pause size={16} />
                {paused ? 'Resume' : 'Pause'}
              </button>
            )}

            {(submitted > 0 || failed > 0) && !submitting && (
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium flex items-center gap-2"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            )}
          </div>
        </div>

        {submitting && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-blue-600 animate-spin" size={18} />
              <p className="font-medium text-blue-900">
                Submitting applications... ({submitted + failed}/{statsData.total})
              </p>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((submitted + failed) / statsData.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Manual Selection */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Manual Selection</h3>
            <button
              onClick={handleSelectAll}
              disabled={submitting}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {selectedJobs.size === jobs.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <button
            onClick={handleSubmitSelected}
            disabled={submitting || selectedJobs.size === 0}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Send size={16} />
            Apply to Selected ({selectedJobs.size})
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertCircle className="mx-auto text-slate-400 mb-3" size={32} />
            <p className="text-slate-600 font-medium">No jobs found</p>
            <p className="text-slate-500 text-sm">
              Try adjusting your search filters to find more opportunities
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className={`bg-white rounded-lg shadow p-4 border-l-4 transition-all ${
                job.status === 'submitted'
                  ? 'border-green-500 bg-green-50'
                  : job.status === 'failed'
                    ? 'border-red-500 bg-red-50'
                    : job.status === 'skipped'
                      ? 'border-slate-300 bg-slate-50'
                      : currentJob === job.id
                        ? 'border-blue-500 bg-blue-50'
                        : selectedJobs.has(job.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedJobs.has(job.id)}
                    onChange={() => handleSelectJob(job.id)}
                    disabled={submitting || job.status !== 'pending'}
                    className="mt-1 w-5 h-5 cursor-pointer disabled:opacity-50"
                  />

                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{job.title}</h3>
                    <p className="text-sm text-slate-600">{job.company}</p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      <span>{job.location}</span>
                      <span>•</span>
                      <span className="capitalize">{job.remote}</span>
                      {job.salary_min && job.salary_max && (
                        <>
                          <span>•</span>
                          <span>
                            ${(job.salary_min / 1000).toFixed(0)}K-$
                            {(job.salary_max / 1000).toFixed(0)}K
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Compatibility Score */}
                <div className="text-right flex-shrink-0">
                  <div
                    className={`text-2xl font-bold text-center w-16 py-2 rounded-lg ${
                      job.compatibility.overall_score >= 80
                        ? 'bg-green-100 text-green-700'
                        : job.compatibility.overall_score >= 70
                          ? 'bg-yellow-100 text-yellow-700'
                          : job.compatibility.overall_score >= 50
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {job.compatibility.overall_score}%
                  </div>
                  <p className="text-xs text-slate-600 mt-1 capitalize">
                    {job.compatibility.recommendation.replace(/_/g, ' ')}
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="flex-shrink-0 w-24 text-right">
                  {job.status === 'submitted' ? (
                    <div className="inline-flex items-center gap-1 text-green-700 font-medium text-sm">
                      <CheckCircle size={16} />
                      Submitted
                    </div>
                  ) : job.status === 'failed' ? (
                    <div className="inline-flex items-center gap-1 text-red-700 font-medium text-sm">
                      <AlertCircle size={16} />
                      Failed
                    </div>
                  ) : currentJob === job.id ? (
                    <div className="inline-flex items-center gap-1 text-blue-700 font-medium text-sm">
                      <Clock className="animate-spin" size={16} />
                      Applying...
                    </div>
                  ) : (
                    <span className="text-slate-500 text-sm">Pending</span>
                  )}
                </div>
              </div>

              {job.error && (
                <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                  {job.error}
                </div>
              )}

              {showDetails === job.id && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-600">Skill Match</p>
                      <p className="font-semibold text-slate-900">
                        {job.compatibility.skill_match}%
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600">Cultural Fit</p>
                      <p className="font-semibold text-slate-900">
                        {job.compatibility.cultural_match}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-2 justify-end">
                <button
                  onClick={() => setShowDetails(showDetails === job.id ? null : job.id)}
                  className="px-3 py-1 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition-colors flex items-center gap-1"
                >
                  <Eye size={14} />
                  {showDetails === job.id ? 'Hide' : 'View'}
                </button>

                <Link
                  href={`/profiles/${profileId}/hunter/${job.id}`}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                >
                  Customize
                </Link>

                <button
                  onClick={() => handleRemoveJob(job.id)}
                  disabled={submitting}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <AlertCircle size={16} />
          How Batch Operations Work
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Auto-Apply submits applications for jobs meeting your compatibility threshold</li>
          <li>Each application includes your persona-tailored resume and generated cover letter</li>
          <li>You can customize individual applications before submission (click "Customize")</li>
          <li>
            Applications are submitted sequentially with rate limiting to avoid spam detection
          </li>
          <li>Failed submissions can be retried after troubleshooting</li>
        </ul>
      </div>
    </div>
  );
}
