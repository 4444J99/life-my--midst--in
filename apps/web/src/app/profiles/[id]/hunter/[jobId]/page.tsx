'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Download, Send, AlertCircle, CheckCircle, Info } from 'lucide-react';
import {
  JobPosting as Job,
  CompatibilityAnalysis as CompatibilityResult,
} from '@in-midst-my-life/schema';

interface TailoredResume {
  resume: string;
  emphasize: string[];
  deEmphasize: string[];
  personaName: string;
  effort_estimate_minutes?: number;
  key_points?: string[];
  areas_to_improve?: string[];
}

interface PageProps {
  params: {
    id: string;
    jobId: string;
  };
}

export default function TailorResumeViewer({ params }: PageProps) {
  const { id: profileId, jobId } = params;
  const [job, setJob] = useState<Job | null>(null);
  const [compatibility, setCompatibility] = useState<CompatibilityResult | null>(null);
  const [tailoredResume, setTailoredResume] = useState<TailoredResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'formatted' | 'raw'>('formatted');
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load job details, compatibility analysis, and tailored resume
  useEffect(() => {
    const loadData = () => {
      try {
        setLoading(true);
        setError(null);

        // In a real implementation, these would be separate API calls
        // For now, we'll simulate the data structure
        const mockJob: Job = {
          id: jobId,
          profileId: profileId,
          title: 'Senior Software Engineer',
          company: 'TechCorp',
          location: 'San Francisco, CA',
          remote: 'hybrid',
          descriptionMarkdown:
            'Join our growing engineering team building next-generation infrastructure...',
          url: 'https://example.com/jobs/senior-engineer',
          salaryRange: '$180,000 - $240,000',
          status: 'active',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const mockCompatibility: CompatibilityResult = {
          job_id: jobId,
          profile_id: profileId,
          persona_id: 'architect-mask',
          skill_match: 85,
          cultural_match: 78,
          growth_potential: 82,
          compensation_fit: 90,
          location_suitability: 75,
          overall_score: 82,
          recommendation: 'apply_now',
          skill_gaps: [
            {
              skill: 'Kubernetes',
              required_level: 'intermediate',
              candidate_level: 'junior',
              gap_severity: 'medium',
              explanation:
                'Job emphasizes container orchestration; you have basic exposure but need production experience',
              learnable: true,
            },
          ],
          strengths: [
            'Strong TypeScript and React expertise matches role requirements',
            'Proven system design capabilities',
            'PostgreSQL experience aligns with tech stack',
          ],
          concerns: [
            'Limited Kubernetes experience (job emphasizes container orchestration)',
            'No Docker Compose production experience mentioned',
          ],
          negotiation_points: [
            'Competitive salary range - could negotiate for equity component',
            'Hybrid work already matches your preference',
            'Professional development budget negotiable for Kubernetes training',
          ],
          suggested_mask: 'Architect',
          key_points_to_emphasize: ['system design', 'scalability', 'mentorship'],
          areas_to_de_emphasize: ['junior projects', 'legacy systems'],
          analysis_date: new Date(),
          effort_estimate_minutes: 45,
        };

        const mockResume: TailoredResume = {
          resume: `# Jane Doe
jane@example.com | (555) 123-4567 | linkedin.com/in/janedoe

## Professional Summary
Architect and systems engineer with 8+ years building scalable, production-grade infrastructure. 
Proven ability to design and execute large-scale systems supporting millions of users. 
Strong technical leadership with focus on code quality, testing, and team mentorship.

## Core Expertise
**Architecture & Systems**: Distributed systems design, microservices architecture, database optimization, 
infrastructure as code, system reliability engineering

**Frontend**: React 18, TypeScript, state management (Redux/Context), component design patterns, 
performance optimization

**Backend**: Node.js, TypeScript, API design, PostgreSQL optimization, Redis caching, 
message queues (RabbitMQ, Bull)

**DevOps & Infrastructure**: Docker containerization, AWS (EC2, RDS, S3, Lambda), monitoring 
and observability (DataDog, Prometheus), automated testing

## Professional Experience

### Senior Engineer - CloudScale Inc.
**May 2022 - Present**
- Architected microservices infrastructure supporting 2M+ daily active users
- Reduced database query latency by 60% through strategic indexing and query optimization
- Led technical RFC process for system design decisions; mentored 4 junior engineers
- Implemented comprehensive observability stack (monitoring, logging, tracing)
- Drove adoption of TypeScript across backend codebase

### Lead Engineer - DataFlow Systems
**Jan 2021 - Apr 2022**
- Designed and implemented event-driven architecture processing 100K+ events/second
- Took ownership of PostgreSQL performance bottlenecks; optimized critical queries by 70%
- Established patterns for testing, deployment, and infrastructure management
- Built automated deployment pipeline reducing deployment time from 45min to 8min

### Software Engineer - StartupXYZ
**Jul 2018 - Dec 2020**
- Full-stack development on core platform using React and Node.js
- Implemented caching strategy reducing API response times by 40%
- Participated in system design discussions and technical decision-making

## Education
**Bachelor of Science in Computer Science** - State University, 2018

## Certifications & Achievements
- AWS Solutions Architect Associate
- Multiple technical talks on system design and scalability
- Open source contributions (100+ stars)`,
          emphasize: [
            'System design experience',
            'Architectural leadership',
            'Scalability achievements',
            'Team mentorship',
            'Database optimization',
          ],
          deEmphasize: [
            'Early career junior projects',
            'Kubernetes limitations (note training opportunity)',
            'Unrelated side projects',
          ],
          personaName: 'Architect',
          effort_estimate_minutes: 30,
          key_points: [
            'You have 8+ years experience vs. 5+ requirement - strong fit',
            'Your system design background directly matches their architecture needs',
            'PostgreSQL optimization expertise is directly applicable',
            'Mentorship experience valuable for growing team',
          ],
          areas_to_improve: [
            'Highlight Kubernetes learning initiative or training plan',
            'Include Docker production examples if available',
            'Emphasize experience with similar company sizes/scales',
          ],
        };

        setJob(mockJob);
        setCompatibility(mockCompatibility);
        setTailoredResume(mockResume);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profileId, jobId]);

  const handleCopyResume = () => {
    if (tailoredResume) {
      void navigator.clipboard.writeText(tailoredResume.resume);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadResume = () => {
    if (tailoredResume) {
      const element = document.createElement('a');
      const file = new Blob([tailoredResume.resume], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${job?.company}-resume.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const handleGenerateCoverLetter = () => {
    try {
      // In real implementation, call API endpoint
      const mockLetter = `Dear Hiring Manager,

I am writing to express my strong interest in the Senior Software Engineer position at ${job?.company}.

With ${tailoredResume?.personaName} expertise spanning 8+ years of building scalable systems, I am confident 
I can make immediate contributions to your engineering team. Your emphasis on system architecture and 
distributed systems design particularly resonates with my experience architecting microservices 
infrastructure for high-traffic platforms.

Your tech stack of TypeScript, React, and PostgreSQL aligns perfectly with my core competencies. 
Most notably, my recent work optimizing PostgreSQL queries by 70% and implementing event-driven 
architectures handling 100K+ events/second directly addresses the technical challenges your team faces.

I am particularly excited about the growth opportunity this role presents. The emphasis on mentorship 
and code quality in your job description suggests a team that values not just shipping features, but 
building sustainable, maintainable systems - something I've championed throughout my career.

While I have limited Kubernetes experience, I am actively pursuing this knowledge and view it as 
an excellent professional development opportunity within this role.

I would welcome the opportunity to discuss how my experience building scalable, reliable systems 
can contribute to ${job?.company}'s engineering goals.

Best regards,
Jane Doe`;

      setCoverLetter(mockLetter);
      setShowCoverLetter(true);
    } catch (err) {
      setError('Failed to generate cover letter');
    }
  };

  const handleApply = async () => {
    try {
      setSubmitting(true);
      // In real implementation, submit application to API
      console.log('Submitting application:', { jobId, profileId, resume: tailoredResume?.resume });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Show success and redirect
      alert('Application submitted successfully!');
      // Redirect to applications list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-slate-200 rounded w-1/3" />
            <div className="h-64 bg-slate-200 rounded" />
            <div className="h-96 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/profiles/${profileId}/hunter`}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={18} />
            Back to Job Search
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">{job?.title}</h1>
              <p className="text-xl text-slate-600">{job?.company}</p>
              <div className="flex gap-4 mt-2 text-sm text-slate-500">
                <span>{job?.location}</span>
                {job?.remote && <span>•</span>}
                <span className="capitalize">{job?.remote}</span>
                {job?.salaryRange && <span>•</span>}
                {job?.salaryRange && <span>{job.salaryRange}</span>}
              </div>
            </div>

            {compatibility && (
              <div className="text-right">
                <div
                  className={`text-4xl font-bold ${
                    compatibility.overall_score >= 80
                      ? 'text-green-600'
                      : compatibility.overall_score >= 70
                        ? 'text-yellow-600'
                        : compatibility.overall_score >= 50
                          ? 'text-orange-600'
                          : 'text-red-600'
                  }`}
                >
                  {compatibility.overall_score}%
                </div>
                <p className="text-slate-600 text-sm capitalize">
                  {compatibility.recommendation.replace(/_/g, ' ')}
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 items-start">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Compatibility Analysis */}
          {compatibility && (
            <div className="col-span-1 bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Info size={18} className="text-blue-600" />
                Compatibility
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-700">Skills Match</span>
                    <span className="text-sm font-bold text-slate-900">
                      {compatibility.skill_match}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${compatibility.skill_match}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-700">Cultural Fit</span>
                    <span className="text-sm font-bold text-slate-900">
                      {compatibility.cultural_match}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${compatibility.cultural_match}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-700">Growth Potential</span>
                    <span className="text-sm font-bold text-slate-900">
                      {compatibility.growth_potential}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${compatibility.growth_potential}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-700">Compensation Fit</span>
                    <span className="text-sm font-bold text-slate-900">
                      {compatibility.compensation_fit}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${compatibility.compensation_fit}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-700">Location Fit</span>
                    <span className="text-sm font-bold text-slate-900">
                      {compatibility.location_suitability}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-cyan-500 h-2 rounded-full"
                      style={{ width: `${compatibility.location_suitability}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Strengths */}
          {compatibility && (
            <div className="col-span-1 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" />
                Strengths
              </h3>
              <ul className="space-y-2">
                {compatibility.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm text-slate-700 leading-relaxed">
                    • {strength}
                  </li>
                ))}
              </ul>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3 flex items-center gap-2">
                <AlertCircle size={18} className="text-orange-600" />
                Concerns
              </h3>
              <ul className="space-y-2">
                {compatibility.concerns.map((concern, idx) => (
                  <li key={idx} className="text-sm text-slate-700 leading-relaxed">
                    • {concern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items */}
          <div className="col-span-1 bg-white rounded-lg shadow p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Suggested Persona</h3>
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="font-semibold text-blue-900">{tailoredResume?.personaName}</p>
              <p className="text-sm text-blue-700 mt-1">
                This persona emphasizes your architectural thinking and leadership
              </p>
            </div>

            <div className="space-y-2 mb-6">
              {tailoredResume?.key_points && tailoredResume.key_points.length > 0 && (
                <>
                  <h4 className="font-medium text-slate-700 text-sm">Key Points to Emphasize:</h4>
                  <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                    {tailoredResume.key_points.slice(0, 2).map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="mt-auto space-y-3">
              <button
                onClick={handleGenerateCoverLetter}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Generate Cover Letter
              </button>
              <button
                onClick={handleApply}
                disabled={submitting}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={16} />
                {submitting ? 'Submitting...' : 'Apply Now'}
              </button>
            </div>
          </div>
        </div>

        {/* Resume Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-slate-200 p-6 flex items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Tailored Resume</h2>
              <p className="text-sm text-slate-600 mt-1">
                Optimized for {job?.company} • Persona: {tailoredResume?.personaName}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setView(view === 'formatted' ? 'raw' : 'formatted')}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {view === 'formatted' ? 'Raw View' : 'Formatted'}
              </button>
              <button
                onClick={handleCopyResume}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Copy size={16} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownloadResume}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Download
              </button>
            </div>
          </div>

          <div className="p-8">
            {view === 'formatted' ? (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-lg border border-slate-200">
                  {tailoredResume?.resume}
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-lg border border-slate-200 max-h-96 overflow-y-auto">
                {tailoredResume?.resume}
              </div>
            )}
          </div>
        </div>

        {/* Cover Letter Modal */}
        {showCoverLetter && coverLetter && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="border-b border-slate-200 p-6 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="text-xl font-bold text-slate-900">Generated Cover Letter</h3>
                <button
                  onClick={() => setShowCoverLetter(false)}
                  className="text-slate-500 hover:text-slate-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="p-6 whitespace-pre-wrap text-slate-700 font-mono text-sm leading-relaxed">
                {coverLetter}
              </div>

              <div className="border-t border-slate-200 p-6 flex gap-3">
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(coverLetter);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  Copy Letter
                </button>
                <button
                  onClick={() => setShowCoverLetter(false)}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
