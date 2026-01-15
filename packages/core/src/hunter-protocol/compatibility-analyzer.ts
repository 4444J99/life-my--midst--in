import type {
  JobListing,
  CompatibilityAnalysis,
  Profile,
  SkillGap,
} from "@in-midst-my-life/schema";
import type { CompatibilityAnalyzer } from "./hunter-agent";

/**
 * Compatibility Analyzer
 * Analyzes:
 * 1. Skill gaps (what's missing)
 * 2. Cultural fit
 * 3. Growth potential
 * 4. Compensation alignment
 * 5. Location suitability
 *
 * Problem it solves: Know BEFORE applying whether you're actually qualified
 * Instead of: Apply to 2000 jobs, hope for 1 callback
 * Now: Know exactly which opportunities are realistic
 */

export class DefaultCompatibilityAnalyzer implements CompatibilityAnalyzer {
  async analyze(input: {
    job_id: string;
    profile_id: string;
    persona_id: string;
    job: JobListing;
    profile: Profile;
  }): Promise<CompatibilityAnalysis> {
    const {
      job_id,
      profile_id,
      persona_id,
      job,
      profile,
    } = input;

    // Analyze each dimension
    const skillMatch = this.analyzeSkillMatch(job, profile);
    const culturalMatch = this.analyzeCulturalFit(job, profile);
    const growthPotential = this.analyzeGrowthPotential(job, profile);
    const compensationFit = this.analyzeCompensationFit(job);
    const locationSuitability = this.analyzeLocationSuitability(job);

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      skillMatch * 0.35 +
        culturalMatch * 0.25 +
        growthPotential * 0.15 +
        compensationFit * 0.15 +
        locationSuitability * 0.1
    );

    // Analyze skill gaps
    const skillGaps = this.identifySkillGaps(job, profile);

    // Identify strengths
    const strengths = this.identifyStrengths(job, profile);

    // Identify concerns
    const concerns = this.identifyConcerns(job, skillGaps);

    // Negotiation points
    const negotiationPoints = this.identifyNegotiationPoints(job);

    return {
      job_id,
      profile_id,
      persona_id,
      skill_match: skillMatch,
      cultural_match: culturalMatch,
      growth_potential: growthPotential,
      compensation_fit: compensationFit,
      location_suitability: locationSuitability,
      overall_score: overallScore,
      recommendation: this.scoreToRecommendation(overallScore),
      skill_gaps: skillGaps,
      strengths,
      concerns,
      negotiation_points: negotiationPoints,
      suggested_mask: this.selectBestMask(job),
      key_points_to_emphasize: strengths,
      areas_to_de_emphasize: skillGaps.map((gap) => gap.skill),
      analysis_date: new Date(),
      effort_estimate_minutes: 20 + skillGaps.filter(g => g.gap_severity === 'critical').length * 10,
    };
  }

  /**
   * Skill Match (0-100)
   * Analyzes requirement match
   */
  private analyzeSkillMatch(job: JobListing, profile: Profile): number {
    if (!job.technologies || job.technologies.length === 0) {
      return 75; // Without explicit tech requirements, assume moderate match
    }

    // Count matching technologies
    const profileText = (
      profile.summaryMarkdown || ""
    ).toLowerCase();

    const matchCount = job.technologies.filter((tech) =>
      profileText.includes(tech.toLowerCase())
    ).length;

    const matchPercentage = (matchCount / job.technologies.length) * 100;

    // Boost if core techs match
    let boost = 0;
    if (
      matchCount >= job.technologies.length * 0.7
    ) {
      boost = 15;
    } else if (
      matchCount >= job.technologies.length * 0.5
    ) {
      boost = 5;
    }

    return Math.min(100, matchPercentage + boost);
  }

  /**
   * Cultural Fit (0-100)
   * Analyzes company culture alignment
   */
  private analyzeCulturalFit(job: JobListing, profile: Profile): number {
    let score = 50; // Neutral baseline

    // Company size preference
    if (job.company_size === "startup" && profile.summaryMarkdown?.includes("startup")) {
      score += 15;
    }
    if (job.company_size === "enterprise" && profile.summaryMarkdown?.includes("enterprise")) {
      score += 10;
    }

    // Remote preference
    if (job.remote === "fully") {
      score += 10; // Usually implies flexible culture
    }

    // Industry alignment (look for keywords)
    if (job.company_industry && profile.summaryMarkdown?.includes(job.company_industry)) {
      score += 15;
    }

    return Math.min(100, score);
  }

  /**
   * Growth Potential (0-100)
   * Analyzes learning opportunities
   */
  private analyzeGrowthPotential(job: JobListing, profile: Profile): number {
    let score = 50;

    // Higher level role = more growth (mentor others)
    if (
      job.title.includes("Lead") ||
      job.title.includes("Senior") ||
      job.title.includes("Staff")
    ) {
      score += 20;
    }

    // Stretch roles (moderately above current skill level)
    const skillMatch = this.analyzeSkillMatch(job, profile);
    if (skillMatch >= 50 && skillMatch < 80) {
      score += 15; // Stretch goal = growth
    }

    // New technologies
    if (
      job.technologies?.some(
        (tech) => !profile.summaryMarkdown?.includes(tech.toLowerCase())
      )
    ) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Compensation Fit (0-100)
   * Analyzes salary alignment
   */
  private analyzeCompensationFit(job: JobListing): number {
    // Without profile salary info, estimate based on role level
    let estimatedSalary = 120000; // Base estimate

    if (
      job.title.includes("Senior") ||
      job.title.includes("Lead")
    ) {
      estimatedSalary = 160000;
    }
    if (job.title.includes("Staff") || job.title.includes("Director")) {
      estimatedSalary = 220000;
    }

    // Compare to job salary range
    if (!job.salary_min || !job.salary_max) {
      return 75; // Can't determine without salary info
    }

    const midpoint = (job.salary_min + job.salary_max) / 2;
    const diff = Math.abs(estimatedSalary - midpoint);
    const percentDiff = (diff / midpoint) * 100;

    // 0% diff = 100 points, -20% diff = 80 points, etc
    return Math.max(0, 100 - percentDiff);
  }

  /**
   * Location Suitability (0-100)
   * Analyzes location fit
   */
  private analyzeLocationSuitability(job: JobListing): number {
    // Without profile location, assume flexibility
    let score = 50;

    // Remote is most flexible
    if (job.remote === "fully") {
      score = 100;
    } else if (job.remote === "hybrid") {
      score = 80;
    }

    return score;
  }

  /**
   * Identify Skill Gaps
   * Returns specific missing skills with severity
   */
  private identifySkillGaps(job: JobListing, profile: Profile): SkillGap[] {
    const profileText = (profile.summaryMarkdown || "").toLowerCase();
    const gaps: SkillGap[] = [];

    // Parse job requirements (simple keyword matching for MVP)
    const requiredKeywords =
      job.requirements
        .split(/[,.]/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 3) || [];

    for (const requirement of requiredKeywords) {
      if (!profileText.includes(requirement)) {
        // Determine severity
        let severity: "critical" | "high" | "medium" | "low" | "none" = "medium";

        if (
          requirement.includes("require") ||
          requirement.includes("must") ||
          requirement.includes("essential")
        ) {
          severity = "critical";
        } else if (
          requirement.includes("strong") ||
          requirement.includes("advanced")
        ) {
          severity = "high";
        } else if (requirement.includes("prefer") || requirement.includes("nice")) {
          severity = "low";
        }

        // Assess learnability
        const learnable = !requirement.includes("years");

        gaps.push({
          skill: requirement,
          required_level: "intermediate",
          gap_severity: severity,
          explanation: `Job requires ${requirement}, which is not apparent in your background`,
          learnable,
        });
      }
    }

    return gaps.slice(0, 5); // Limit to top 5 gaps
  }

  /**
   * Identify Strengths
   * Returns matching strengths vs job requirements
   */
  private identifyStrengths(job: JobListing, profile: Profile): string[] {
    const profileText = profile.summaryMarkdown || "";
    const strengths: string[] = [];

    // Check technology matches
    if (job.technologies) {
      for (const tech of job.technologies) {
        if (profileText.toLowerCase().includes(tech.toLowerCase())) {
          strengths.push(`Experienced with ${tech}`);
        }
      }
    }

    // Check role title alignment
    if (profileText.includes("Engineer") && job.title.includes("Engineer")) {
      strengths.push("Engineering background aligns with role");
    }

    // Check company size experience
    if (
      job.company_size === "startup" &&
      profileText.toLowerCase().includes("startup")
    ) {
      strengths.push("Startup experience");
    }

    return strengths.slice(0, 5);
  }

  /**
   * Identify Concerns
   * Returns potential red flags
   */
  private identifyConcerns(
    job: JobListing,
    gaps: SkillGap[]
  ): string[] {
    const concerns: string[] = [];

    // Critical skill gaps
    const criticalGaps = gaps.filter((g) => g.gap_severity === "critical");
    if (criticalGaps.length > 0) {
      concerns.push(
        `Missing critical skills: ${criticalGaps.map((g) => g.skill).join(", ")}`
      );
    }

    // Experience level mismatch (rough estimate)
    const jobYears = parseInt(
      job.requirements.match(/(\d+)\+?\s*years?/)?.[1] || "3"
    );
    if (jobYears > 10) {
      concerns.push("Senior/expert role - high bar for experience");
    }

    // Location issues
    if (job.remote === "onsite" && job.location.includes("CA")) {
      concerns.push("Requires onsite presence in California");
    }

    return concerns;
  }

  /**
   * Identify Negotiation Points
   * Returns things to negotiate in offer/contract
   */
  private identifyNegotiationPoints(job: JobListing): string[] {
    const points: string[] = [];

    // Salary negotiation if it's in range
    if (job.salary_min && job.salary_max) {
      points.push(
        `Salary range: $${job.salary_min.toLocaleString()}-$${job.salary_max.toLocaleString()}`
      );
    }

    // Remote negotiation
    if (job.remote === "onsite") {
      points.push("Negotiate remote/hybrid work arrangement");
    }

    // Professional development
    points.push("Negotiate learning budget / course access");

    // Equity (if startup)
    if (job.company_size === "startup") {
      points.push("Negotiate equity percentage and vesting");
    }

    return points.slice(0, 5);
  }

  /**
   * Select Best Mask
   * Returns which persona to use for this job
   */
  private selectBestMask(job: JobListing): string {
    // Default mask selection logic
    // In production: would analyze which mask best matches job requirements

    if (job.title.includes("Senior") || job.title.includes("Lead")) {
      return "Architect"; // Senior roles → architect persona
    }

    if (job.company_size === "startup") {
      return "Generalist"; // Startups need broad skills
    }

    if (job.title.includes("Technical")) {
      return "Technician"; // Technical roles → technical persona
    }

    return "Engineer"; // Default
  }

  /**
   * Score to Recommendation
   */
  private scoreToRecommendation(
    score: number
  ): "apply_now" | "strong_candidate" | "moderate_fit" | "stretch_goal" | "skip" {
    if (score >= 80) return "apply_now";
    if (score >= 70) return "strong_candidate";
    if (score >= 60) return "moderate_fit";
    if (score >= 40) return "stretch_goal";
    return "skip";
  }
}
