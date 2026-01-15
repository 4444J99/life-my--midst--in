import type { Agent, AgentExecutor, AgentResult, AgentTask } from "../agents";
import {
  MockJobSearchProvider,
  type JobSearchQuery,
  type JobSearchProvider
} from "@in-midst-my-life/core";
import type { JobPosting } from "@in-midst-my-life/schema";

interface HunterPayload {
  profileId: string;
  action: "find_jobs" | "analyze_gap" | "tailor_resume" | "write_cover_letter";
  keywords?: string[];
  location?: string;
  jobDescription?: string;
  jobPostingId?: string;
  apiBaseUrl?: string;
}

interface SkillGap {
  required: string[];
  present: string[];
  missing: string[];
  importance: "critical" | "high" | "medium" | "low";
}

/**
 * Hunter Agent - Autonomous job search and application orchestration
 * Implements the four core tools: find_jobs, analyze_gap, tailor_resume, write_cover_letter
 */
export class HunterAgent implements Agent {
  role: "hunter" = "hunter";
  private executor?: AgentExecutor;
  private searchProvider: JobSearchProvider;
  private apiBaseUrl: string;

  constructor(options?: { executor?: AgentExecutor; searchProvider?: JobSearchProvider; apiBaseUrl?: string }) {
    this.executor = options?.executor;
    this.searchProvider = options?.searchProvider ?? new MockJobSearchProvider();
    this.apiBaseUrl = options?.apiBaseUrl ?? "http://localhost:3001";
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const payload = task.payload as unknown as HunterPayload;
    const { action } = payload;

    try {
      switch (action) {
        case "find_jobs":
          return await this.findJobs(task, payload);
        case "analyze_gap":
          return await this.analyzeGap(task, payload);
        case "tailor_resume":
          return await this.tailorResume(task, payload);
        case "write_cover_letter":
          return await this.writeCoverLetter(task, payload);
        default:
          return {
            taskId: task.id,
            status: "failed",
            notes: `Unknown hunter action: ${action}`
          };
      }
    } catch (error) {
      return {
        taskId: task.id,
        status: "failed",
        notes: `Hunter agent error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Tool 1: find_jobs(keywords, location)
   * Search for job postings matching the given criteria
   */
  private async findJobs(task: AgentTask, payload: HunterPayload): Promise<AgentResult> {
    const { profileId, keywords = [], location } = payload;

    if (!keywords.length) {
      return {
        taskId: task.id,
        status: "failed",
        notes: "No keywords provided for job search"
      };
    }

    try {
      const query: JobSearchQuery = {
        keywords,
        location,
        limit: 20
      };

      const postings = await this.searchProvider.search(query);

      // Store postings for the profile
      const saved: JobPosting[] = [];
      for (const posting of postings) {
        const postingWithProfile = { ...posting, profileId };
        try {
          const response = await fetch(`${this.apiBaseUrl}/jobs/postings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(postingWithProfile)
          });
          if (response.ok) {
            saved.push(postingWithProfile);
          }
        } catch {
          // Continue with next posting
        }
      }

      return {
        taskId: task.id,
        status: "completed",
        notes: `Found and saved ${saved.length} job postings for keywords: ${keywords.join(", ")}`,
        output: {
          count: saved.length,
          postings: saved.map((p) => ({
            id: p.id,
            title: p.title,
            company: p.company,
            location: p.location,
            salaryRange: p.salaryRange
          }))
        }
      };
    } catch (error) {
      return {
        taskId: task.id,
        status: "failed",
        notes: `Job search failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Tool 2: analyze_gap(job_description, profile_id)
   * Analyze the skill gap between job requirements and user profile
   */
  private async analyzeGap(task: AgentTask, payload: HunterPayload): Promise<AgentResult> {
    const { profileId, jobDescription } = payload;

    if (!jobDescription) {
      return {
        taskId: task.id,
        status: "failed",
        notes: "No job description provided for gap analysis"
      };
    }

    try {
      // Fetch user's profile to get their skills
      const profileResponse = await fetch(`${this.apiBaseUrl}/profiles/${profileId}`);
      if (!profileResponse.ok) {
        return {
          taskId: task.id,
          status: "failed",
          notes: "Could not fetch profile for gap analysis"
        };
      }

      const profile = await profileResponse.json() as any;
      const userSkills = new Set(
        (profile.skills || []).map((s: any) => (typeof s === "string" ? s : s.name).toLowerCase())
      );

      // Extract required skills from job description using LLM if available
      let requiredSkills: string[] = [];
      if (this.executor) {
        const result = await this.executor.invoke({
          id: `gap-analysis-${task.id}`,
          role: "implementer",
          description: "Extract required skills from job description",
          payload: {
            context: {
              summary: "List all required skills mentioned in the job description.",
              notes: [
                "Return a JSON array of skill names.",
                "Be specific (e.g., 'TypeScript' not 'JavaScript').",
                "Include both technical and soft skills."
              ],
              constraints: ["Return JSON array only, no other text."]
            },
            jobDescription
          }
        });

        if (result.status === "completed") {
          try {
            const match = (result.notes || "").match(/\[[\s\S]*\]/);
            requiredSkills = match ? JSON.parse(match[0]) : this.extractSkillsRegex(jobDescription);
          } catch {
            requiredSkills = this.extractSkillsRegex(jobDescription);
          }
        }
      } else {
        requiredSkills = this.extractSkillsRegex(jobDescription);
      }

      const required = requiredSkills.map((s) => s.toLowerCase());
      const present = required.filter((s) => userSkills.has(s));
      const missing = required.filter((s) => !userSkills.has(s));

      // Determine importance level based on context
      const importance =
        missing.length > 5
          ? "critical"
          : missing.length > 2
            ? "high"
            : missing.length > 0
              ? "medium"
              : "low";

      const gap: SkillGap = { required, present, missing, importance };

      return {
        taskId: task.id,
        status: "completed",
        notes: `Skill gap analysis: ${missing.length} of ${required.length} skills missing (${importance})`,
        output: gap as unknown as Record<string, unknown>
      };
    } catch (error) {
      return {
        taskId: task.id,
        status: "failed",
        notes: `Gap analysis failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Tool 3: tailor_resume(job_id, profile_id)
   * Select the best mask and experience blocks to tailor resume for the job
   */
  private async tailorResume(task: AgentTask, payload: HunterPayload): Promise<AgentResult> {
    const { profileId, jobPostingId } = payload;

    if (!jobPostingId) {
      return {
        taskId: task.id,
        status: "failed",
        notes: "No job posting ID provided for resume tailoring"
      };
    }

    try {
      // Fetch the job posting
      const jobResponse = await fetch(`${this.apiBaseUrl}/jobs/postings/${jobPostingId}`);
      if (!jobResponse.ok) {
        return {
          taskId: task.id,
          status: "failed",
          notes: "Job posting not found"
        };
      }
      const job = (await jobResponse.json()) as JobPosting;

      // Fetch profile and masks
      const profileResponse = await fetch(`${this.apiBaseUrl}/profiles/${profileId}`);
      if (!profileResponse.ok) {
        return {
          taskId: task.id,
          status: "failed",
          notes: "Profile not found"
        };
      }
      const profile = await profileResponse.json() as any;

      // Get available masks
      const masksResponse = await fetch(`${this.apiBaseUrl}/taxonomy/masks`);
      const masksData = (await masksResponse.json()) as any;
      const masks = masksData.data || masksData.masks || [];

      // Use LLM to select best mask and experiences for this job
      let selectedMask = masks[0];
      let selectedExperienceIds: string[] = [];

      if (this.executor) {
        const result = await this.executor.invoke({
          id: `tailor-${task.id}`,
          role: "implementer",
          description: "Select best resume mask and experiences for job",
          payload: {
            context: {
              summary: "Recommend the best mask and experience blocks to highlight for this job.",
              notes: [
                `Job Title: ${job.title}`,
                `Job Company: ${job.company}`,
                `Available Masks: ${masks.map((m: any) => m.name).join(", ")}`,
                "Return JSON with selectedMask and selectedExperienceIds array."
              ],
              constraints: ["Return JSON only."]
            },
            jobDescription: job.descriptionMarkdown,
            availableMasks: masks,
            availableExperiences: profile.experiences || []
          }
        });

        if (result.status === "completed" && result.output) {
          const selection = result.output as any;
          if (selection.selectedMask) {
            selectedMask = selection.selectedMask;
          }
          if (selection.selectedExperienceIds) {
            selectedExperienceIds = selection.selectedExperienceIds;
          }
        }
      }

      return {
        taskId: task.id,
        status: "completed",
        notes: `Tailored resume using mask "${selectedMask.name}" with ${selectedExperienceIds.length} highlighted experiences`,
        output: {
          maskId: selectedMask.id,
          maskName: selectedMask.name,
          highlightedExperiences: selectedExperienceIds,
          tailoringSummary: `This resume emphasizes your ${selectedMask.name} aspects, highlighting ${selectedExperienceIds.length} relevant experiences.`
        }
      };
    } catch (error) {
      return {
        taskId: task.id,
        status: "failed",
        notes: `Resume tailoring failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Tool 4: write_cover_letter(job_id, profile_id)
   * Generate a personalized cover letter for the job
   */
  private async writeCoverLetter(task: AgentTask, payload: HunterPayload): Promise<AgentResult> {
    const { profileId, jobPostingId } = payload;

    if (!jobPostingId) {
      return {
        taskId: task.id,
        status: "failed",
        notes: "No job posting ID provided for cover letter generation"
      };
    }

    try {
      // Fetch the job and profile
      const [jobResponse, profileResponse] = await Promise.all([
        fetch(`${this.apiBaseUrl}/jobs/postings/${jobPostingId}`),
        fetch(`${this.apiBaseUrl}/profiles/${profileId}`)
      ]);

      if (!jobResponse.ok || !profileResponse.ok) {
        return {
          taskId: task.id,
          status: "failed",
          notes: "Could not fetch job or profile for cover letter generation"
        };
      }

      const job = (await jobResponse.json()) as JobPosting;
      const profile = (await profileResponse.json()) as any;

      // Generate cover letter using LLM
      let coverLetterMarkdown = "";

      if (this.executor) {
        const result = await this.executor.invoke({
          id: `cover-letter-${task.id}`,
          role: "narrator",
          description: "Write a compelling cover letter",
          payload: {
            context: {
              summary: "Write a professional, personalized cover letter.",
              notes: [
                "Use markdown formatting.",
                "Be concise (3-4 paragraphs).",
                "Show genuine interest in the company.",
                "Highlight how your experience matches the job requirements.",
                "End with a clear call to action."
              ],
              constraints: [
                "Return markdown only.",
                "No placeholder text like [Your Name].",
                `Use actual name: ${profile.personalThesis?.name || profile.name || "Candidate"}`
              ]
            },
            jobTitle: job.title,
            jobCompany: job.company,
            jobDescription: job.descriptionMarkdown,
            candidateProfile: {
              name: profile.personalThesis?.name || profile.name,
              summary: profile.personalThesis?.summary,
              experiences: (profile.experiences || []).slice(0, 3),
              skills: (profile.skills || []).slice(0, 10)
            }
          }
        });

        if (result.status === "completed") {
          coverLetterMarkdown = result.notes || "";
        }
      }

      // Fallback template if LLM unavailable
      if (!coverLetterMarkdown) {
        coverLetterMarkdown = this.generateCoverLetterTemplate(job, profile);
      }

      // Create job application record
      const applicationResponse = await fetch(`${this.apiBaseUrl}/jobs/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          jobPostingId,
          status: "draft",
          coverLetterMarkdown
        })
      });

      if (!applicationResponse.ok) {
        return {
          taskId: task.id,
          status: "failed",
          notes: "Failed to save cover letter"
        };
      }

      const application = (await applicationResponse.json()) as any;

      return {
        taskId: task.id,
        status: "completed",
        notes: "Generated personalized cover letter",
        output: {
          applicationId: application.id,
          coverLetterLength: coverLetterMarkdown.length,
          preview: coverLetterMarkdown.slice(0, 200) + "..."
        }
      };
    } catch (error) {
      return {
        taskId: task.id,
        status: "failed",
        notes: `Cover letter generation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Helper: Extract skills from job description using regex
   */
  private extractSkillsRegex(description: string): string[] {
    const skillKeywords = [
      "javascript",
      "typescript",
      "python",
      "java",
      "golang",
      "go",
      "rust",
      "c\\+\\+",
      "c#",
      "react",
      "vue",
      "angular",
      "node",
      "express",
      "fastify",
      "postgres",
      "mysql",
      "mongodb",
      "redis",
      "graphql",
      "rest",
      "docker",
      "kubernetes",
      "aws",
      "gcp",
      "azure",
      "terraform",
      "ci/cd",
      "git",
      "agile",
      "scrum",
      "leadership",
      "communication",
      "problem solving"
    ];

    const found = new Set<string>();
    const lowerDesc = description.toLowerCase();

    for (const skill of skillKeywords) {
      const regex = new RegExp(`\\b${skill}\\b`, "i");
      if (regex.test(lowerDesc)) {
        found.add(skill.replace(/\\\\/g, ""));
      }
    }

    return Array.from(found);
  }

  /**
   * Helper: Generate cover letter template
   */
  private generateCoverLetterTemplate(job: JobPosting, profile: any): string {
    const candidateName = profile.personalThesis?.name || profile.name || "Candidate";
    const candidateSummary = profile.personalThesis?.summary || "";
    const topSkill = (profile.skills || []).length > 0 ? (profile.skills[0].name || profile.skills[0]) : "";

    return `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. ${candidateSummary ? `With my background ${candidateSummary},` : ""} I am confident that my skills and experience make me an excellent fit for this role.

In my previous roles, I have developed strong expertise in ${topSkill ? `${topSkill} and` : ""} building scalable solutions that deliver business value. I am particularly drawn to ${job.company}'s commitment to innovation and would be excited to contribute to your team.

I would welcome the opportunity to discuss how my experience aligns with your needs. Thank you for considering my application.

Sincerely,
${candidateName}`;
  }
}
