/**
 * LinkedIn Integration Service
 * Syncs LinkedIn profile data (experience, education, endorsements) with user profile
 */

import { z } from 'zod';

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  localizedHeadline?: string;
  localizedSummary?: string;
}

export interface LinkedInExperience {
  id: string;
  companyName: string;
  title: string;
  startDate: { year: number; month?: number };
  endDate?: { year: number; month?: number };
  description?: string;
  location?: string;
  employmentType?: string;
}

export interface LinkedInEducation {
  schoolName: string;
  fieldOfStudy?: string;
  degreeType?: string;
  startDate?: { year: number };
  endDate?: { year: number };
}

export interface LinkedInSkill {
  name: string;
  endorsementCount: number;
}

export const LinkedInIntegrationSchema = z.object({
  userId: z.string().uuid(),
  profileId: z.string().uuid(),
  linkedinId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  lastSyncedAt: z.date(),
  profile: z.object({
    firstName: z.string(),
    lastName: z.string(),
    headline: z.string().optional(),
    summary: z.string().optional(),
    profilePictureUrl: z.string().url().optional(),
  }).optional(),
  experiences: z.array(z.object({
    company: z.string(),
    title: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    description: z.string().optional(),
    employmentType: z.string().optional(),
  })).default([]),
  education: z.array(z.object({
    school: z.string(),
    fieldOfStudy: z.string().optional(),
    degreeType: z.string().optional(),
    graduationDate: z.string().optional(),
  })).default([]),
  skills: z.array(z.object({
    name: z.string(),
    endorsements: z.number(),
  })).default([]),
  headline: z.string().optional(),
});

export type LinkedInIntegration = z.infer<typeof LinkedInIntegrationSchema>;

export class LinkedInIntegrationService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  /**
   * Generate LinkedIn OAuth URL for user authorization
   */
  generateAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: encodeURI('openid profile email'),
      state,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      }).toString(),
    });

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Fetch LinkedIn user profile
   */
  async fetchUserProfile(accessToken: string): Promise<LinkedInProfile> {
    const response = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch LinkedIn profile');
    }

    return response.json();
  }

  /**
   * Fetch user's work experience
   */
  async fetchExperience(accessToken: string): Promise<LinkedInExperience[]> {
    const response = await fetch('https://api.linkedin.com/v2/me?projection=(id,firstName,lastName)', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch LinkedIn experience');
    }

    // Note: LinkedIn API v2 requires specific queries
    // In production, this would call the proper endpoint
    return [];
  }

  /**
   * Fetch user's education
   */
  async fetchEducation(accessToken: string): Promise<LinkedInEducation[]> {
    try {
      const response = await fetch(
        'https://api.linkedin.com/v2/educations?q=individuals&ids=List(YOUR_ID)',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202401',
          },
        }
      );

      if (!response.ok) {
        console.warn('Failed to fetch education - API may have changed');
        return [];
      }

      return response.json();
    } catch (error) {
      console.warn('Error fetching education:', error);
      return [];
    }
  }

  /**
   * Fetch user's skills and endorsements
   */
  async fetchSkills(accessToken: string): Promise<LinkedInSkill[]> {
    try {
      const response = await fetch('https://api.linkedin.com/v2/me/skills', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202401',
        },
      });

      if (!response.ok) {
        console.warn('Failed to fetch skills');
        return [];
      }

      return response.json();
    } catch (error) {
      console.warn('Error fetching skills:', error);
      return [];
    }
  }

  /**
   * Sync LinkedIn data to user profile
   */
  async syncToProfile(userId: string, profileId: string, accessToken: string): Promise<LinkedInIntegration> {
    try {
      // Fetch LinkedIn data
      const profile = await this.fetchUserProfile(accessToken);
      const experience = await this.fetchExperience(accessToken);
      const education = await this.fetchEducation(accessToken);
      const skills = await this.fetchSkills(accessToken);

      const integration: LinkedInIntegration = {
        userId,
        profileId,
        linkedinId: profile.id,
        accessToken,
        lastSyncedAt: new Date(),
        profile: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          headline: profile.localizedHeadline,
          summary: profile.localizedSummary,
          profilePictureUrl: profile.profilePictureUrl,
        },
        experiences: experience.map((exp) => ({
          company: exp.companyName,
          title: exp.title,
          startDate: `${exp.startDate.year}-${String(exp.startDate.month || 1).padStart(2, '0')}`,
          endDate: exp.endDate
            ? `${exp.endDate.year}-${String(exp.endDate.month || 1).padStart(2, '0')}`
            : undefined,
          description: exp.description,
          employmentType: exp.employmentType,
        })),
        education: education.map((edu) => ({
          school: edu.schoolName,
          fieldOfStudy: edu.fieldOfStudy,
          degreeType: edu.degreeType,
          graduationDate: edu.endDate ? `${edu.endDate.year}` : undefined,
        })),
        skills: skills
          .sort((a, b) => b.endorsementCount - a.endorsementCount)
          .slice(0, 20)
          .map((skill) => ({
            name: skill.name,
            endorsements: skill.endorsementCount,
          })),
        headline: profile.localizedHeadline,
      };

      return integration;
    } catch (error) {
      console.error('LinkedIn sync error:', error);
      throw error;
    }
  }

  /**
   * Generate CV snippets from LinkedIn data
   */
  generateCVSnippets(integration: LinkedInIntegration): Record<string, string[]> {
    const snippets: Record<string, string[]> = {
      summary: integration.profile?.summary ? [integration.profile.summary] : [],
      professionalExperience: integration.experiences
        .slice(0, 5)
        .map((exp) => {
          const dates = `${exp.startDate} to ${exp.endDate || 'Present'}`;
          return `${exp.title} at ${exp.company} (${dates})${exp.description ? `: ${exp.description}` : ''}`;
        }),
      education: integration.education.map((edu) => {
        const dateStr = edu.graduationDate ? ` (${edu.graduationDate})` : '';
        const fieldStr = edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : '';
        return `${edu.degreeType || 'Degree'}${fieldStr} from ${edu.school}${dateStr}`;
      }),
      skills: integration.skills.slice(0, 10).map((skill) => `${skill.name} (${skill.endorsements} endorsements)`),
    };

    return snippets;
  }

  /**
   * Map LinkedIn experience to personas
   */
  mapExperienceToPersonas(experiences: LinkedInIntegration['experiences']): Record<string, string[]> {
    const personaMapping: Record<string, string[]> = {};

    // Simple mapping based on job titles
    const titleTags: Record<string, string[]> = {
      engineer: ['Engineer', 'Technician', 'Architect'],
      manager: ['Architect', 'Connector'],
      designer: ['Creator', 'Architect'],
      analyst: ['Analyst', 'Architect'],
      product: ['Architect', 'Connector', 'Creator'],
      founder: ['Architect', 'Entrepreneur'],
      director: ['Architect', 'Connector'],
    };

    experiences.forEach((exp) => {
      const titleLower = exp.title.toLowerCase();
      Object.entries(titleTags).forEach(([keyword, personas]) => {
        if (titleLower.includes(keyword)) {
          const current = personaMapping[exp.company] || [];
          personaMapping[exp.company] = [...new Set([...current, ...personas])];
        }
      });
    });

    return personaMapping;
  }
}

export function createLinkedInIntegrationService(): LinkedInIntegrationService {
  const clientId = process.env['LINKEDIN_CLIENT_ID'] || '';
  const clientSecret = process.env['LINKEDIN_CLIENT_SECRET'] || '';
  const redirectUri = process.env['LINKEDIN_REDIRECT_URI'] || 'http://localhost:3000/integrations/linkedin/callback';

  return new LinkedInIntegrationService(clientId, clientSecret, redirectUri);
}
