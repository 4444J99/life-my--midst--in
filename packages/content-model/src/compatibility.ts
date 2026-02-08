import type { Profile, Skill } from '@in-midst-my-life/schema';
import { MASK_TAXONOMY } from './taxonomy';
import { selectWeightedMasks } from './mask-selection';
import { matchRoleFamily } from './role-families';

export interface JobRequirement {
  skill: string;
  level: 'novice' | 'intermediate' | 'advanced' | 'expert';
  required: boolean;
}

export interface InterviewerProfile {
  organizationName: string;
  hiringManagerName: string;
  answers: Record<string, string>;
  jobTitle: string;
  jobRequirements: JobRequirement[];
  salaryRange?: { min: number; max: number };
  growth?: string;
  culture?: string;
  kpis?: string[];
  /** Pre-computed market-rate compensation score (0-100) from MarketRateAnalyzer */
  marketCompensationScore?: number;
}

export interface CompatibilityScores {
  overall: number; // 0-100
  skillMatch: number;
  valuesAlign: number;
  growthFit: number;
  sustainability: number;
  compensationFit: number;
}

export interface CompatibilityAnalysis {
  scores: CompatibilityScores;
  greenFlags: string[];
  redFlags: string[];
  recommendations: string[];
  maskResonance: Array<{
    maskName: string;
    fitScore: number;
    reasoning: string;
  }>;
}

/**
 * Optional scoring weights for each compatibility category.
 * Default is 1.0 for each — higher values amplify that category's
 * contribution to the overall score.
 */
export interface ScoringWeights {
  skillMatch?: number;
  valuesAlign?: number;
  growthFit?: number;
  sustainability?: number;
  compensationFit?: number;
}

/**
 * Compatibility Analysis Engine
 * Analyzes job requirements + interviewer answers against candidate profile
 */
export class CompatibilityAnalyzer {
  /**
   * Analyze overall compatibility.
   * An optional `weights` parameter multiplies each category score
   * before computing the weighted average. Default weights are all 1.0.
   */
  analyzeCompatibility(
    candidateProfile: Profile,
    interviewer: InterviewerProfile,
    weights?: ScoringWeights,
  ): CompatibilityAnalysis {
    const skillMatch = this.analyzeSkillMatch(candidateProfile, interviewer);
    const valuesAlign = this.analyzeValuesAlignment(candidateProfile, interviewer);
    const growthFit = this.analyzeGrowthAlignment(candidateProfile, interviewer);
    const sustainability = this.analyzeSustainability(candidateProfile, interviewer);
    const compensationFit = this.analyzeCompensation(candidateProfile, interviewer);

    const greenFlags = this.identifyGreenFlags(candidateProfile, interviewer);
    const redFlags = this.identifyRedFlags(candidateProfile, interviewer);
    const maskResonance = this.analyzeMaskResonance(candidateProfile, interviewer);

    // Apply weights (default 1.0 for each)
    const w = {
      skillMatch: weights?.skillMatch ?? 1,
      valuesAlign: weights?.valuesAlign ?? 1,
      growthFit: weights?.growthFit ?? 1,
      sustainability: weights?.sustainability ?? 1,
      compensationFit: weights?.compensationFit ?? 1,
    };
    const totalWeight =
      w.skillMatch + w.valuesAlign + w.growthFit + w.sustainability + w.compensationFit;
    const overall =
      totalWeight > 0
        ? Math.round(
            (skillMatch * w.skillMatch +
              valuesAlign * w.valuesAlign +
              growthFit * w.growthFit +
              sustainability * w.sustainability +
              compensationFit * w.compensationFit) /
              totalWeight,
          )
        : 0;

    const recommendations = this.generateRecommendations(
      skillMatch,
      valuesAlign,
      growthFit,
      sustainability,
      compensationFit,
      redFlags,
    );

    return {
      scores: {
        overall,
        skillMatch,
        valuesAlign,
        growthFit,
        sustainability,
        compensationFit,
      },
      greenFlags,
      redFlags,
      recommendations,
      maskResonance,
    };
  }

  /**
   * Analyze skill match between candidate and role
   */
  private analyzeSkillMatch(candidate: Profile, interviewer: InterviewerProfile): number {
    if (!interviewer.jobRequirements.length) return 50; // No data

    const candidateSkillMap = new Map<string, Skill>();
    candidate.skills?.forEach((skill) => {
      const key = skill.name.toLowerCase();
      candidateSkillMap.set(key, skill);
    });

    let matchCount = 0;
    let requiredCount = 0;

    for (const req of interviewer.jobRequirements) {
      const key = req.skill.toLowerCase();
      const skill = candidateSkillMap.get(key);

      if (req.required) {
        requiredCount++;
        if (skill) {
          // Score based on level match
          const levelScore = this.scoreLevelMatch(skill.level, req.level);
          matchCount += levelScore;
        }
      } else if (skill) {
        // Nice-to-have skills
        matchCount += 0.5;
      }
    }

    return requiredCount > 0 ? Math.round((matchCount / requiredCount) * 100) : 50;
  }

  /**
   * Score how well candidate's skill level matches requirement
   */
  private scoreLevelMatch(candidateLevel: string | undefined, requiredLevel: string): number {
    const levelValues: Record<string, number> = {
      novice: 1,
      intermediate: 2,
      advanced: 3,
      expert: 4,
    };

    const candidateScore = levelValues[candidateLevel?.toLowerCase() ?? 'novice'] ?? 0;
    const requiredScore = levelValues[requiredLevel.toLowerCase()] ?? 2;

    if (candidateScore >= requiredScore) return 1; // Exceeds requirement
    if (candidateScore >= requiredScore - 1) return 0.75; // Close match
    return 0.5; // Below requirement but working towards it
  }

  /**
   * Analyze values alignment based on interviewer answers
   */
  private analyzeValuesAlignment(candidate: Profile, interviewer: InterviewerProfile): number {
    const answers = interviewer.answers;
    const answerText = Object.values(answers).join(' ').toLowerCase();

    const candidateValues = this.extractCandidateValues(candidate);

    let alignmentScore = 0;
    let checkedValues = 0;

    // Values-to-keywords mapping
    const valueKeywords: Record<string, string[]> = {
      autonomy: ['trust', 'autonomy', 'independence', 'self-directed', 'ownership'],
      impact: ['mission', 'purpose', 'impact', 'meaningful', 'change'],
      learning: ['learning', 'growth', 'development', 'skill', 'challenge'],
      structure: ['process', 'clear', 'defined', 'organization', 'system'],
      collaboration: ['team', 'together', 'communication', 'group', 'collective'],
      innovation: ['new', 'experiment', 'novel', 'creative', 'breakthrough'],
    };

    for (const [value, keywords] of Object.entries(valueKeywords)) {
      if (candidateValues.includes(value)) {
        checkedValues++;
        const matches = keywords.filter((kw) => answerText.includes(kw)).length;
        if (matches > 0) {
          alignmentScore += Math.min(matches / keywords.length, 1);
        }
      }
    }

    return checkedValues > 0 ? Math.round((alignmentScore / checkedValues) * 100) : 50;
  }

  /**
   * Extract candidate values from profile
   */
  private extractCandidateValues(candidate: Profile): string[] {
    const values: string[] = [];

    if (candidate.personalThesis?.thesis) {
      const thesis = candidate.personalThesis.thesis.toLowerCase();
      if (thesis.includes('autonomous') || thesis.includes('independent')) values.push('autonomy');
      if (thesis.includes('impact') || thesis.includes('mission')) values.push('impact');
      if (thesis.includes('learning') || thesis.includes('growth')) values.push('learning');
      if (thesis.includes('structured') || thesis.includes('organized')) values.push('structure');
      if (thesis.includes('team') || thesis.includes('collaborate')) values.push('collaboration');
      if (thesis.includes('innovate') || thesis.includes('novel')) values.push('innovation');
    }

    return values.length > 0 ? values : ['learning', 'growth'];
  }

  /**
   * Analyze growth trajectory alignment
   */
  private analyzeGrowthAlignment(candidate: Profile, interviewer: InterviewerProfile): number {
    const candidateTrajectory = this.extractGrowthTrajectory(candidate);
    const rolesGrowth = interviewer.growth?.toLowerCase() ?? '';

    let score = 50; // Neutral baseline

    // Growth trajectory keywords
    const trajectoryMap: Record<string, string[]> = {
      technical: ['architect', 'system design', 'technical depth', 'deep expertise'],
      leadership: ['manager', 'lead', 'team', 'people', 'organization'],
      breadth: ['full stack', 'generalist', 'diverse', 'many', 'varied'],
      depth: ['specialist', 'expert', 'focus', 'mastery', 'deep'],
    };

    for (const [category, keywords] of Object.entries(trajectoryMap)) {
      if (candidateTrajectory.includes(category)) {
        const matches = keywords.filter((kw) => rolesGrowth.includes(kw)).length;
        if (matches > 0) {
          score = Math.min(100, score + 20);
        }
      }
    }

    // Detect misalignment
    if (
      (candidateTrajectory.includes('technical') && rolesGrowth.includes('manager')) ||
      (candidateTrajectory.includes('leadership') && !rolesGrowth.includes('lead'))
    ) {
      score = Math.max(0, score - 15);
    }

    return score;
  }

  /**
   * Extract candidate's growth trajectory
   */
  private extractGrowthTrajectory(candidate: Profile): string[] {
    const trajectory: string[] = [];

    // Analyze experience progression
    const experiences = candidate.experiences ?? [];
    const recent = experiences[0];
    if (recent) {
      if (
        recent.roleTitle.toLowerCase().includes('lead') ||
        recent.roleTitle.toLowerCase().includes('manager')
      ) {
        trajectory.push('leadership');
      } else if (
        recent.roleTitle.toLowerCase().includes('architect') ||
        recent.roleTitle.toLowerCase().includes('senior')
      ) {
        trajectory.push('technical');
      }
    }

    return trajectory.length > 0 ? trajectory : ['technical'];
  }

  /**
   * Analyze sustainability (can they sustain the role's demands?)
   */
  private analyzeSustainability(candidate: Profile, interviewer: InterviewerProfile): number {
    // Note: interviewer.kpis could be used for more sophisticated analysis in future enhancements
    let score = 75; // Assume sustainable unless evidence otherwise

    const answerText = Object.values(interviewer.answers).join(' ').toLowerCase();

    // Red flags in interviewer's language
    if (answerText.includes('burnout') || answerText.includes('churn')) {
      score -= 20;
    }
    if (answerText.includes('chaos') || answerText.includes('hectic')) {
      score -= 10;
    }

    // Green flags
    if (answerText.includes('sustainable') || answerText.includes('balance')) {
      score += 15;
    }
    if (answerText.includes('reasonable') || answerText.includes('manageable')) {
      score += 10;
    }

    // Check if candidate has history of sustained performance
    const avgTenure =
      candidate.experiences
        ?.map((e) => {
          const start = new Date(e.startDate).getTime();
          const end = e.endDate ? new Date(e.endDate).getTime() : Date.now();
          return (end - start) / (1000 * 60 * 60 * 24 * 365); // Years
        })
        .reduce((a, b) => a + b, 0) ?? 0;

    if (avgTenure > 2.5) {
      score += 10; // Shows ability to stay committed
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Analyze compensation alignment.
   * Uses pre-computed market-rate score when available (from MarketRateAnalyzer),
   * falls back to heuristic experience-based estimation otherwise.
   */
  private analyzeCompensation(candidate: Profile, interviewer: InterviewerProfile): number {
    // Use real market data when pre-computed by MarketRateAnalyzer
    if (typeof interviewer.marketCompensationScore === 'number') {
      return interviewer.marketCompensationScore;
    }

    if (!interviewer.salaryRange) return 50; // No salary data

    // Fallback: estimate candidate's market value based on experience
    const yearsOfExperience = candidate.experiences?.length ?? 0;
    const estimatedMarket = 80000 + yearsOfExperience * 15000;

    const offered = interviewer.salaryRange.min;
    const market = estimatedMarket;

    if (offered >= market * 0.95) return 95; // At or above market
    if (offered >= market * 0.85) return 75; // 85-95% of market
    if (offered >= market * 0.75) return 55; // 75-85% of market
    return 35; // Below 75% of market
  }

  /**
   * Identify green flags
   */
  private identifyGreenFlags(candidate: Profile, interviewer: InterviewerProfile): string[] {
    const flags: string[] = [];
    const answers = Object.values(interviewer.answers).join(' ').toLowerCase();

    if (answers.includes('hire for fit'))
      flags.push("'Hire for fit' philosophy matches candidate-centered approach");
    if (answers.includes('trust') && answers.includes('autonomy'))
      flags.push('High-trust culture aligns with autonomous candidates');
    if (answers.includes('learning') || answers.includes('growth'))
      flags.push('Learning-focused org matches growth-oriented mindset');
    if (answers.includes('mistake') || answers.includes('failure'))
      flags.push('Transparent about failures - sign of psychological safety');

    // Skills analysis
    const skillMatches = interviewer.jobRequirements
      .filter((req) =>
        candidate.skills?.some((s) => s.name.toLowerCase() === req.skill.toLowerCase()),
      )
      .map((r) => r.skill);

    if (skillMatches.length > 0) {
      flags.push(`Strong skill alignment in: ${skillMatches.slice(0, 3).join(', ')}`);
    }

    return flags;
  }

  /**
   * Identify red flags
   */
  private identifyRedFlags(candidate: Profile, interviewer: InterviewerProfile): string[] {
    const flags: string[] = [];
    const answers = Object.values(interviewer.answers).join(' ').toLowerCase();

    if (answers.includes('credentials') || answers.includes('degree'))
      flags.push('Over-emphasis on credentials - may not value diverse backgrounds');
    if (answers.includes('burnout') || answers.includes('high churn'))
      flags.push('History of team burnout - sustainability concern');
    if (answers.includes('perfect') || answers.includes('ideal candidate'))
      flags.push('Unrealistic expectations - may lead to disappointment');

    // Skill gaps
    const criticalMissing = interviewer.jobRequirements
      .filter(
        (req) =>
          req.required &&
          !candidate.skills?.some((s) => s.name.toLowerCase() === req.skill.toLowerCase()),
      )
      .map((r) => r.skill);

    if (criticalMissing.length > 3) {
      flags.push(`Multiple critical skills missing: ${criticalMissing.slice(0, 3).join(', ')}`);
    }

    return flags;
  }

  /**
   * Analyze which masks resonate with this opportunity.
   *
   * Uses the full 16-mask taxonomy scored against the job's context
   * (title keywords, required skills, answer content). Returns the top 5
   * masks sorted by fit score, with reasoning derived from the mask's
   * functional_scope and the job's requirements.
   */
  private analyzeMaskResonance(
    _candidate: Profile,
    interviewer: InterviewerProfile,
  ): Array<{
    maskName: string;
    fitScore: number;
    reasoning: string;
  }> {
    // Try role-family curated path first
    const roleFamily = matchRoleFamily(interviewer.jobTitle);

    if (roleFamily) {
      return roleFamily.maskBlend.map((blend) => {
        const mask = MASK_TAXONOMY.find((m) => m.id === blend.maskId);
        return {
          maskName: mask?.name ?? blend.maskId,
          fitScore: Math.round(blend.weight * 100),
          reasoning: `${mask?.name ?? blend.maskId} curated for ${roleFamily.name} role family`,
        };
      });
    }

    // Fallback: keyword-based scoring against the full taxonomy
    const contexts = [
      interviewer.jobTitle.toLowerCase(),
      ...interviewer.jobRequirements.map((r) => r.skill.toLowerCase()),
    ];
    const tags = [
      ...interviewer.jobRequirements.filter((r) => r.required).map((r) => r.skill.toLowerCase()),
      ...Object.values(interviewer.answers)
        .join(' ')
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4)
        .slice(0, 20),
    ];

    // Score all 16 masks against the interview context
    const weighted = selectWeightedMasks({
      contexts,
      tags,
      availableMasks: MASK_TAXONOMY,
      profile: {} as Profile,
    });

    // Normalize scores to 0-100 scale
    const maxScore = weighted[0]?.score ?? 1;

    return weighted.slice(0, 5).map((w) => {
      const fitScore = Math.round((w.score / Math.max(maxScore, 1)) * 100);
      const matchedSkills = interviewer.jobRequirements
        .filter((r) => r.required)
        .map((r) => r.skill)
        .slice(0, 2);
      const skillContext =
        matchedSkills.length > 0 ? matchedSkills.join(', ') : interviewer.jobTitle;

      return {
        maskName: w.mask.name,
        fitScore: Math.max(fitScore, 10), // floor at 10 so every returned mask has some relevance
        reasoning: `${w.mask.name} (${w.mask.functional_scope}) resonates with ${skillContext} requirements`,
      };
    });
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    skillMatch: number,
    valuesAlign: number,
    growthFit: number,
    sustainability: number,
    compensationFit: number,
    redFlags: string[],
  ): string[] {
    const recs: string[] = [];

    if (skillMatch < 70) {
      recs.push('Skill gap exists - discuss learning plan with them');
    }
    if (valuesAlign < 60) {
      recs.push('Values misalignment - clarify expectations before proceeding');
    }
    if (growthFit < 50) {
      recs.push('Growth trajectory divergent - may lead to frustration');
    }
    if (sustainability < 60) {
      recs.push('Sustainability concern - ask detailed questions about pace and workload');
    }
    if (compensationFit < 50) {
      recs.push('Compensation below market - negotiate or reconsider');
    }

    if (redFlags.length === 0 && skillMatch > 80) {
      recs.push('Strong fit overall - proceed to deeper conversation');
    }

    return recs.slice(0, 4); // Top 4 recommendations
  }
}
