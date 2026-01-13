"use client";

import React, { useState, useEffect } from "react";
import type { HunterSearchFilter, JobListing } from "@in-midst-my-life/schema";
import { NeoCard } from "@in-midst-my-life/design-system";

type Job = JobListing;

interface CompatibilityResult {
  overall_score: number;
  skill_match: number;
  cultural_match: number;
  recommendation: "apply_now" | "strong_candidate" | "moderate_fit" | "stretch_goal" | "skip";
  skill_gaps: Array<{
    skill: string;
    gap_severity: "critical" | "high" | "medium" | "low" | "none";
    learnable: boolean;
  }>;
  strengths: string[];
  concerns: string[];
}

interface JobHuntConfig {
  profileId: string;
  keywords: string[];
  location?: string;
  frequency: "daily" | "weekly" | "monthly";
  autoApply: boolean;
  lastRun?: string;
}

export interface HunterDashboardProps {
  profileId: string;
  personaId: string;
  onApplyJob?: (job: Job, compatibility: CompatibilityResult) => void;
}

export default function HunterDashboard({
  profileId,
  personaId,
  onApplyJob,
}: HunterDashboardProps) {
  const [activeTab, setActiveTab] = useState<"search" | "schedule">("search");
  
  // Search State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [compatibilities, setCompatibilities] = useState<Record<string, CompatibilityResult>>({});
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Filter State
  const [keywords, setKeywords] = useState<string>("");
  const [locations, setLocations] = useState<string>("");
  const [minSalary, setMinSalary] = useState<number | undefined>();
  const [maxSalary, setMaxSalary] = useState<number | undefined>();
  const [remoteType, setRemoteType] = useState<string>("any");
  const [technologies, setTechnologies] = useState<string>("");
  const [sortBy, setSortBy] = useState<"score" | "recency" | "salary">("score");

  // Scheduler State
  const [scheduledHunts, setScheduledHunts] = useState<JobHuntConfig[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "schedule") {
      fetchScheduledHunts();
    }
  }, [activeTab]);

  const fetchScheduledHunts = async () => {
    try {
      setScheduleLoading(true);
      const res = await fetch("/api/scheduler/job-hunts");
      const data = await res.json();
      if (data.ok) {
        setScheduledHunts(data.data.filter((h: JobHuntConfig) => h.profileId === profileId));
      }
    } catch (err) {
      console.error("Failed to fetch scheduled hunts", err);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      await fetch("/api/scheduler/job-hunts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
          location: locations,
          frequency: "daily",
          autoApply: false
        })
      });
      fetchScheduledHunts();
      alert("Job hunt scheduled!");
    } catch (err) {
      alert("Failed to schedule hunt");
    }
  };

  const handleDeleteSchedule = async () => {
    try {
      await fetch(`/api/scheduler/job-hunts/${profileId}`, { method: "DELETE" });
      fetchScheduledHunts();
    } catch (err) {
      alert("Failed to delete schedule");
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const filter: HunterSearchFilter = {
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        locations: locations.split(",").map((l) => l.trim()).filter(Boolean),
        min_salary: minSalary,
        max_salary: maxSalary,
        remote_requirement: remoteType as any,
        required_technologies: technologies.split(",").map((t) => t.trim()).filter(Boolean),
      };

      const response = await fetch(`/api/profiles/${profileId}/hunter/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filter),
      });

      const data = await response.json();
      setJobs(data.jobs || []);
      setCompatibilities({});
      setSelectedJob(null);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleAnalyzeJob = async (job: Job) => {
    if (compatibilities[job.id]) {
      setSelectedJob(job);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/profiles/${profileId}/hunter/analyze/${job.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job, personaId }),
      });

      const data = await response.json();
      setCompatibilities((prev) => ({
        ...prev,
        [job.id]: data.compatibility,
      }));
      setSelectedJob(job);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sort logic
  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortBy === "recency") return new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime();
    if (sortBy === "salary" && a.salary_max && b.salary_max) return b.salary_max - a.salary_max;
    const scoreA = compatibilities[a.id]?.overall_score || 0;
    const scoreB = compatibilities[b.id]?.overall_score || 0;
    return scoreB - scoreA;
  });

  const selectedCompat = selectedJob ? compatibilities[selectedJob.id] : null;

  return (
    <div className="max-w-7xl mx-auto p-6 text-white min-h-screen">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
            Hunter Protocol
          </h1>
          <p className="text-gray-400">Autonomous Job Search Engine</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("search")}
            className={`px-4 py-2 rounded-lg transition-colors ${activeTab === "search" ? "bg-cyan-600 text-white" : "bg-gray-800 text-gray-400"}`}
          >
            Manual Search
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-4 py-2 rounded-lg transition-colors ${activeTab === "schedule" ? "bg-cyan-600 text-white" : "bg-gray-800 text-gray-400"}`}
          >
            Auto-Pilot
          </button>
        </div>
      </header>

      {activeTab === "schedule" ? (
        <section>
          <NeoCard variant="cyber" className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Scheduled Hunts</h2>
            {scheduledHunts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No active job hunts scheduled.</p>
                <p className="text-sm text-gray-500">Configure search parameters in the "Manual Search" tab and save them here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledHunts.map((hunt, idx) => (
                  <div key={idx} className="bg-gray-900 p-4 rounded border border-gray-700 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-cyan-400">{hunt.keywords.join(", ")}</h3>
                      <p className="text-sm text-gray-400">{hunt.location || "Remote"} • {hunt.frequency} • {hunt.autoApply ? "Auto-Apply" : "Notify Only"}</p>
                      <p className="text-xs text-gray-500 mt-1">Last run: {hunt.lastRun ? new Date(hunt.lastRun).toLocaleString() : "Never"}</p>
                    </div>
                    <button
                      onClick={handleDeleteSchedule}
                      className="px-3 py-1 bg-red-900/50 text-red-400 border border-red-900 hover:bg-red-900 rounded"
                    >
                      Stop
                    </button>
                  </div>
                ))}
              </div>
            )}
          </NeoCard>
          
          <NeoCard variant="obsidian">
            <h3 className="text-lg font-semibold mb-4">Create New Schedule</h3>
            <p className="text-gray-400 text-sm mb-4">
              Use the filters below to define your hunt criteria, then click "Schedule Hunt" to have the agent run daily.
            </p>
            {/* Reusing search form inputs for scheduling would be ideal, simpler UI for now */}
            <div className="bg-gray-800 p-4 rounded text-sm text-gray-300">
              <p>Current configuration in Search tab:</p>
              <ul className="list-disc ml-5 mt-2">
                <li>Keywords: {keywords || "(none)"}</li>
                <li>Location: {locations || "(none)"}</li>
              </ul>
              <button 
                onClick={handleCreateSchedule}
                disabled={!keywords}
                className="mt-4 w-full bg-cyan-700 hover:bg-cyan-600 text-white py-2 rounded font-semibold disabled:opacity-50"
              >
                Activate Daily Hunt
              </button>
            </div>
          </NeoCard>
        </section>
      ) : (
        <>
          <NeoCard variant="obsidian" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input
                className="bg-gray-800 border-gray-700 rounded p-2 text-white"
                placeholder="Keywords (e.g. TypeScript, Rust)"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
              <input
                className="bg-gray-800 border-gray-700 rounded p-2 text-white"
                placeholder="Location (e.g. Remote, NYC)"
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
              />
              <select
                className="bg-gray-800 border-gray-700 rounded p-2 text-white"
                value={remoteType}
                onChange={(e) => setRemoteType(e.target.value)}
              >
                <option value="any">Remote: Any</option>
                <option value="fully">Fully Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="col-span-full md:col-span-1 bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {searching ? "Hunting..." : "Search"}
              </button>
            </div>
          </NeoCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Job List */}
            <div className="lg:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              <h2 className="text-xl font-semibold mb-2">Results ({jobs.length})</h2>
              {jobs.map((job) => {
                const compat = compatibilities[job.id];
                const score = compat?.overall_score || 0;
                return (
                  <div
                    key={job.id}
                    onClick={() => handleAnalyzeJob(job)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedJob?.id === job.id
                        ? "bg-cyan-900/30 border-cyan-500"
                        : "bg-gray-900 border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-200">{job.title}</h3>
                      {compat && (
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          score >= 80 ? "bg-green-900 text-green-300" : 
                          score >= 50 ? "bg-yellow-900 text-yellow-300" : "bg-red-900 text-red-300"
                        }`}>
                          {score}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{job.company}</p>
                    <p className="text-xs text-gray-500 mt-1">{job.location}</p>
                  </div>
                );
              })}
            </div>

            {/* Detail View */}
            <div className="lg:col-span-2">
              {selectedJob ? (
                <NeoCard variant="cyber" className="h-full">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedJob.title}</h2>
                      <p className="text-cyan-400 text-lg">{selectedJob.company}</p>
                      <div className="flex gap-2 mt-2 text-sm text-gray-400">
                        <span>{selectedJob.location}</span>
                        <span>•</span>
                        <span>{selectedJob.salary_min ? `$${selectedJob.salary_min / 1000}k` : "Salary N/A"}</span>
                      </div>
                    </div>
                    {selectedCompat && (
                      <div className="text-center bg-black/50 p-4 rounded border border-cyan-900">
                        <div className="text-3xl font-bold text-cyan-400">{selectedCompat.overall_score}%</div>
                        <div className="text-xs text-cyan-600 uppercase tracking-wider">Match</div>
                      </div>
                    )}
                  </div>

                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
                    </div>
                  ) : selectedCompat ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-900/50 p-4 rounded">
                          <h4 className="text-green-400 font-bold mb-2">Strengths</h4>
                          <ul className="text-sm space-y-1 text-gray-300">
                            {selectedCompat.strengths.map((s, i) => <li key={i}>✓ {s}</li>)}
                          </ul>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded">
                          <h4 className="text-yellow-400 font-bold mb-2">Gaps</h4>
                          <ul className="text-sm space-y-1 text-gray-300">
                            {selectedCompat.skill_gaps.map((g, i) => (
                              <li key={i} className="flex justify-between">
                                <span>{g.skill}</span>
                                {g.learnable && <span className="text-xs bg-gray-800 px-1 rounded text-gray-500">Learnable</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-white mb-2">Recommendation</h4>
                        <p className="text-gray-300">{selectedCompat.recommendation.replace("_", " ").toUpperCase()}</p>
                      </div>

                      <div className="pt-6 border-t border-gray-800 flex gap-4">
                        <button 
                          className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded transition-colors"
                          onClick={() => onApplyJob?.(selectedJob, selectedCompat)}
                        >
                          Generate Application
                        </button>
                        <a 
                          href={selectedJob.job_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-6 py-3 border border-gray-600 hover:border-gray-400 text-gray-300 rounded transition-colors"
                        >
                          View Original
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Select "Analyze" to see compatibility report
                    </div>
                  )}
                </NeoCard>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-lg">
                  Select a job to view details
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}