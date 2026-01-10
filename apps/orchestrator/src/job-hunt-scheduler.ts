import { randomUUID } from "node:crypto";
import type { AgentTask } from "./agents";
import type { TaskQueue } from "./queue";
import type { TaskStore } from "./persistence";
import type { RunRecord, RunStore } from "./runs";
import type { TrackedTask } from "./tasks";

export interface JobHuntConfig {
  profileId: string;
  keywords: string[];
  location?: string;
  frequency?: "daily" | "weekly" | "monthly"; // How often to search
  autoApply?: boolean; // Whether to auto-apply to matching jobs
  minSalary?: number;
  maxSalary?: number;
}

export interface JobHuntSchedulerOptions {
  jobs: JobHuntConfig[];
  apiBaseUrl?: string;
}

/**
 * Job Hunt Scheduler
 * Orchestrates the Hunter agent to automatically search for jobs and apply
 */
export class JobHuntScheduler {
  private queue: TaskQueue;
  private store: TaskStore;
  private runStore: RunStore;
  private jobs: JobHuntConfig[];
  private apiBaseUrl: string;
  private timer?: NodeJS.Timeout;
  private lastRunTimes: Map<string, Date>;

  constructor(queue: TaskQueue, store: TaskStore, runStore: RunStore, options: JobHuntSchedulerOptions) {
    this.queue = queue;
    this.store = store;
    this.runStore = runStore;
    this.jobs = options.jobs;
    this.apiBaseUrl = options.apiBaseUrl ?? "http://localhost:3001";
    this.lastRunTimes = new Map();
  }

  /**
   * Start the job hunt scheduler
   * Runs every 6 hours by default
   */
  start() {
    if (this.timer) return;
    const loop = async () => {
      await this.tick();
      // Check every 6 hours
      this.timer = setTimeout(loop, 6 * 60 * 60 * 1000);
    };
    this.timer = setTimeout(loop, 6 * 60 * 60 * 1000);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  /**
   * Run job hunt immediately
   */
  async tickOnce() {
    await this.tick();
  }

  /**
   * Enqueue job hunt tasks for configured profiles
   */
  private async tick() {
    const runId = `hunt-${randomUUID()}`;
    const now = new Date();
    const scheduledAt = now.toISOString();
    const tasks: AgentTask[] = [];

    for (const jobConfig of this.jobs) {
      // Check if enough time has passed based on frequency
      if (!this.shouldRun(jobConfig, now)) {
        continue;
      }

      // Step 1: Find jobs
      const findJobsTask: AgentTask = {
        id: `${runId}-find-jobs-${jobConfig.profileId}`,
        runId,
        role: "hunter",
        description: `Search for ${jobConfig.keywords.join(", ")} jobs in ${jobConfig.location || "remote"}`,
        payload: {
          profileId: jobConfig.profileId,
          action: "find_jobs",
          keywords: jobConfig.keywords,
          location: jobConfig.location,
          apiBaseUrl: this.apiBaseUrl
        }
      };
      tasks.push(findJobsTask);

      // Step 2: For each found job, analyze gap and optionally apply
      if (jobConfig.autoApply) {
        // We'll handle applications in a follow-up process
        // For now, we enqueue gap analysis as a separate task
        const analyzeGapTask: AgentTask = {
          id: `${runId}-analyze-gap-${jobConfig.profileId}`,
          runId,
          role: "hunter",
          description: `Analyze skill gaps for ${jobConfig.keywords.join(", ")} roles`,
          payload: {
            profileId: jobConfig.profileId,
            action: "analyze_gap",
            apiBaseUrl: this.apiBaseUrl
          }
        };
        tasks.push(analyzeGapTask);
      }

      // Mark this job as having run
      this.lastRunTimes.set(jobConfig.profileId, now);
    }

    if (tasks.length === 0) {
      return; // No jobs to run
    }

    // Create run record
    const run: RunRecord = {
      id: runId,
      type: "schedule",
      status: "queued",
      payload: {
        scheduledAt,
        jobCount: this.jobs.length,
        tasksCreated: tasks.length
      },
      taskIds: tasks.map((task) => task.id),
      metadata: {
        source: "job-hunt-scheduler",
        type: "autonomous-job-search"
      },
      createdAt: scheduledAt,
      updatedAt: scheduledAt
    };

    await this.runStore.add(run);

    // Enqueue all tasks
    for (const task of tasks) {
      await this.queue.enqueue(task);
      const tracked: TrackedTask = {
        ...task,
        status: "queued",
        attempts: 0,
        history: []
      };
      await this.store.add(tracked);
    }
  }

  /**
   * Determine if a job hunt should run based on frequency
   */
  private shouldRun(config: JobHuntConfig, now: Date): boolean {
    const frequency = config.frequency ?? "weekly";
    const lastRun = this.lastRunTimes.get(config.profileId);

    if (!lastRun) {
      return true; // First run
    }

    const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

    switch (frequency) {
      case "daily":
        return hoursSinceLastRun >= 24;
      case "weekly":
        return hoursSinceLastRun >= 7 * 24;
      case "monthly":
        return hoursSinceLastRun >= 30 * 24;
      default:
        return false;
    }
  }

  /**
   * Get the status of job hunt for a profile
   */
  getStatus(profileId: string) {
    const config = this.jobs.find((j) => j.profileId === profileId);
    if (!config) {
      return null;
    }

    const lastRun = this.lastRunTimes.get(profileId);
    const frequency = config.frequency ?? "weekly";

    return {
      profileId,
      keywords: config.keywords,
      location: config.location,
      frequency,
      autoApply: config.autoApply,
      lastRun: lastRun?.toISOString(),
      isActive: !!this.timer
    };
  }

  /**
   * Add a new job hunt configuration
   */
  addJobHunt(config: JobHuntConfig) {
    this.jobs.push(config);
  }

  /**
   * Remove a job hunt configuration
   */
  removeJobHunt(profileId: string) {
    this.jobs = this.jobs.filter((j) => j.profileId !== profileId);
    this.lastRunTimes.delete(profileId);
  }

  /**
   * Get all configured job hunts
   */
  listJobHunts() {
    return this.jobs.map((config) => ({
      ...config,
      lastRun: this.lastRunTimes.get(config.profileId)?.toISOString(),
      isScheduled: true
    }));
  }
}
