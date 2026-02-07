/**
 * GraphQL Schema definitions for the API gateway.
 * Provides unified access to Profile, Mask, Timeline, and Narrative data.
 */

export const graphqlSchema = `
  # Scalars
  scalar DateTime
  scalar JSON

  # ============ Identity & Profile Types ============
  
  """
  Represents a user profile with complete CV/résumé information.
  """
  type Profile {
    """The unique identifier of the profile"""
    id: ID!
    
    """Display name of the user"""
    displayName: String!
    
    """Professional title or role"""
    title: String
    
    """Summary of professional background in Markdown"""
    summaryMarkdown: String
    
    """Email address"""
    email: String
    
    """Phone number"""
    phone: String
    
    """Geographic location"""
    location: String
    
    """Website or portfolio URL"""
    website: String
    
    """Avatar image URL"""
    avatarUrl: String
    
    """URL slug for the profile"""
    slug: String
    
    """Professional experiences"""
    experiences: [Experience!]!
    
    """Educational background"""
    educations: [Education!]!
    
    """Skills and competencies"""
    skills: [Skill!]!
    
    """Creation timestamp"""
    createdAt: DateTime!
    
    """Last update timestamp"""
    updatedAt: DateTime!
  }

  """
  Professional work experience entry.
  """
  type Experience {
    """Unique identifier"""
    id: ID!
    
    """Job title or role"""
    roleTitle: String!
    
    """Organization name"""
    organization: String!
    
    """Organization website"""
    organizationUrl: String
    
    """Start date (ISO 8601)"""
    startDate: DateTime!
    
    """End date (ISO 8601) - null if current"""
    endDate: DateTime
    
    """Whether this is the current role"""
    isCurrent: Boolean!
    
    """Description in Markdown"""
    descriptionMarkdown: String
    
    """Tags for categorization"""
    tags: [String!]!
    
    """Geographic location of the role"""
    location: String
  }

  """
  Educational institution and credentials.
  """
  type Education {
    """Unique identifier"""
    id: ID!
    
    """Institution name"""
    institution: String!
    
    """Field of study"""
    fieldOfStudy: String!
    
    """Degree type (Bachelor, Master, PhD, etc.)"""
    degreeType: String
    
    """Start date (ISO 8601)"""
    startDate: DateTime!
    
    """Graduation date (ISO 8601)"""
    graduationDate: DateTime
    
    """Institution website"""
    institutionUrl: String
    
    """Description of program"""
    descriptionMarkdown: String
  }

  """
  A professional skill or competency.
  """
  type Skill {
    """Unique identifier"""
    id: ID!
    
    """Skill name"""
    name: String!
    
    """Skill category (Programming, Leadership, etc.)"""
    category: String!
    
    """Proficiency level"""
    proficiencyLevel: ProficiencyLevel!
    
    """Years of experience"""
    yearsOfExperience: Int
  }

  enum ProficiencyLevel {
    Beginner
    Intermediate
    Advanced
    Expert
  }

  # ============ Mask & Presentation Types ============
  
  """
  Identity mask for context-specific profile presentation.
  """
  type Mask {
    """Unique identifier"""
    id: ID!
    
    """Display name"""
    name: String!
    
    """Ontology category"""
    ontology: MaskOntology!
    
    """Functional scope description"""
    functionalScope: String!
    
    """Stylistic parameters"""
    stylisticParameters: StylisticParameters!
    
    """Activation rules"""
    activationRules: ActivationRules!
    
    """Content filters"""
    filters: MaskFilters!
  }

  enum MaskOntology {
    """Cognitive/analytical masks"""
    cognitive
    """Expressive/narrative masks"""
    expressive
    """Operational/execution masks"""
    operational
  }

  type StylisticParameters {
    """Tone of voice (neutral, warm, assertive, etc.)"""
    tone: String!
    
    """Rhetorical mode (deductive, narrative, etc.)"""
    rhetoricalMode: String!
    
    """Compression ratio (0-1, where 0=verbose, 1=minimal)"""
    compressionRatio: Float!
  }

  type ActivationRules {
    """Contexts that trigger this mask"""
    contexts: [String!]!
    
    """Trigger keywords"""
    triggers: [String!]!
  }

  type MaskFilters {
    """Tags to include in filtered view"""
    includeTags: [String!]!
    
    """Tags to exclude from filtered view"""
    excludeTags: [String!]!
    
    """Priority weights for tags"""
    priorityWeights: JSON!
  }

  # ============ Timeline & Narrative Types ============
  
  """
  Timeline entry representing a career milestone or achievement.
  """
  type TimelineEntry {
    """Unique identifier"""
    id: ID!
    
    """Entry title"""
    title: String!
    
    """Description or summary"""
    summary: String
    
    """Start date (ISO 8601)"""
    start: DateTime!
    
    """End date (ISO 8601)"""
    end: DateTime
    
    """Categorization tags"""
    tags: [String!]!
    
    """Associated stage ID"""
    stageId: String
    
    """Associated epoch ID"""
    epochId: String
    
    """Setting/context ID"""
    settingId: String
  }

  """
  Narrative block - atomic unit of generated content.
  """
  type NarrativeBlock {
    """Block title/heading"""
    title: String!
    
    """Markdown body content"""
    body: String!
    
    """Metadata tags"""
    tags: [String!]!
    
    """Template identifier"""
    templateId: String
    
    """Relative weight (0-10)"""
    weight: Int
  }

  """
  Snapshot of generated narrative with approval tracking.
  """
  type NarrativeSnapshot {
    """Unique identifier"""
    id: ID!
    
    """Associated profile ID"""
    profileId: ID!
    
    """Associated mask ID (if mask-specific)"""
    maskId: String
    
    """Approval status"""
    status: NarrativeStatus!
    
    """Generated blocks"""
    blocks: [NarrativeBlock!]!
    
    """Generation metadata"""
    meta: JSON
    
    """Creation timestamp"""
    createdAt: DateTime!
    
    """Last update timestamp"""
    updatedAt: DateTime!
    
    """Approval timestamp"""
    approvedAt: DateTime
    
    """User who approved"""
    approvedBy: String
  }

  enum NarrativeStatus {
    draft
    approved
    rejected
  }

  # ============ Interview Types ============

  """
  A single answer recorded during an interview session.
  """
  type InterviewAnswer {
    """Question identifier"""
    questionId: String!
    """The interviewer's response text"""
    answer: String!
    """Time taken in seconds"""
    duration: Int!
    """ISO 8601 timestamp of when the answer was recorded"""
    timestamp: DateTime!
    """Detected tone of the answer"""
    tone: InterviewTone
  }

  enum InterviewTone {
    defensive
    neutral
    transparent
    enthusiastic
  }

  """
  Incremental compatibility scores emitted after each answer.
  """
  type InterviewScoreEvent {
    """Interview session ID"""
    sessionId: ID!
    """Profile being interviewed about"""
    profileId: ID!
    """Number of answers recorded so far"""
    answersCount: Int!
    """Current overall compatibility score (0-100)"""
    overallScore: Int!
    """Per-category breakdown"""
    categoryScores: InterviewCategoryScores!
    """Timestamp of the score update"""
    updatedAt: DateTime!
  }

  type InterviewCategoryScores {
    skillMatch: Int!
    valuesAlign: Int!
    growthFit: Int!
    sustainability: Int!
    compensationFit: Int!
  }

  """
  Complete interview session with answers and analysis.
  """
  type InterviewSession {
    """Session identifier"""
    id: ID!
    """Candidate profile ID"""
    profileId: ID!
    """Interviewer name"""
    interviewerName: String!
    """Organization name"""
    organizationName: String!
    """Target job title"""
    jobTitle: String!
    """Session status"""
    status: InterviewStatus!
    """Recorded answers"""
    answers: [InterviewAnswer!]!
    """Final compatibility score (set on completion)"""
    compatibilityScore: Int
    """Creation timestamp"""
    createdAt: DateTime!
    """Last update timestamp"""
    updatedAt: DateTime!
  }

  enum InterviewStatus {
    in_progress
    completed
    archived
  }

  # ============ Epoch & Stage Types ============
  
  """
  Temporal epoch - functional period in professional development.
  """
  type Epoch {
    """Unique identifier"""
    id: ID!
    
    """Epoch name"""
    name: String!
    
    """Epoch description"""
    summary: String
    
    """Relative ordering"""
    order: Int!
    
    """Contained stages"""
    stages: [Stage!]
  }

  """
  Career stage or milestone within an epoch.
  """
  type Stage {
    """Unique identifier"""
    id: ID!
    
    """Stage title"""
    title: String!
    
    """Stage description"""
    summary: String
    
    """Categorization tags"""
    tags: [String!]
    
    """Parent epoch ID"""
    epochId: String
    
    """Relative ordering within epoch"""
    order: Int
  }

  # ============ Query Types ============
  
  type Query {
    # Profile queries
    """Retrieve a profile by ID"""
    profile(id: ID!): Profile
    
    """List profiles with pagination"""
    profiles(offset: Int = 0, limit: Int = 20): [Profile!]!
    
    # Mask queries
    """Retrieve a mask by ID"""
    mask(id: ID!): Mask
    
    """List all available masks"""
    masks(ontology: String, offset: Int = 0, limit: Int = 100): [Mask!]!
    
    """Select masks for given context"""
    selectMasks(contexts: [String!]!, tags: [String!]!): [Mask!]!
    
    # Timeline queries
    """Get timeline for a profile"""
    timeline(profileId: ID!, limit: Int = 50): [TimelineEntry!]!
    
    """Get timeline filtered by mask"""
    timelineForMask(profileId: ID!, maskId: ID!, limit: Int = 30): [TimelineEntry!]!
    
    # Narrative queries
    """Generate narrative blocks for a profile"""
    generateNarrative(
      profileId: ID!,
      maskId: String,
      contexts: [String!],
      tags: [String!]
    ): NarrativeSnapshot!
    
    """Retrieve narrative snapshot by ID"""
    narrativeSnapshot(id: ID!): NarrativeSnapshot
    
    """List narrative snapshots for a profile"""
    narrativeSnapshots(profileId: ID!, limit: Int = 10): [NarrativeSnapshot!]!
    
    # Epoch queries
    """Retrieve an epoch by ID"""
    epoch(id: ID!): Epoch
    
    """List all epochs"""
    epochs(sortBy: String = "order"): [Epoch!]!
    
    # Stage queries
    """Retrieve a stage by ID"""
    stage(id: ID!): Stage

    """List stages in an epoch"""
    stagesInEpoch(epochId: ID!): [Stage!]!

    # Interview queries
    """Retrieve an interview session by ID"""
    interviewSession(sessionId: ID!): InterviewSession

    """List interview sessions for a candidate"""
    interviewHistory(profileId: ID!, limit: Int = 20): [InterviewSession!]!
  }

  # ============ Mutation Types ============
  
  type Mutation {
    # Profile mutations
    """Create a new profile"""
    createProfile(
      displayName: String!,
      title: String,
      summaryMarkdown: String
    ): Profile!
    
    """Update an existing profile"""
    updateProfile(
      id: ID!,
      displayName: String,
      title: String,
      summaryMarkdown: String
    ): Profile!
    
    # Mask mutations
    """Create a new mask"""
    createMask(
      name: String!,
      ontology: String!,
      functionalScope: String!
    ): Mask!
    
    """Update an existing mask"""
    updateMask(
      id: ID!,
      name: String,
      functionalScope: String
    ): Mask!
    
    # Timeline mutations
    """Add a timeline entry"""
    addTimelineEntry(
      profileId: ID!,
      title: String!,
      start: DateTime!,
      summary: String,
      tags: [String!]
    ): TimelineEntry!
    
    # Narrative mutations
    """Approve a narrative snapshot"""
    approveNarrative(id: ID!, approvedBy: String!): NarrativeSnapshot!
    
    """Reject a narrative snapshot"""
    rejectNarrative(id: ID!, revisionNote: String): NarrativeSnapshot!
  }

  # ============ Subscription Types ============
  
  type Subscription {
    """Subscribe to profile updates"""
    profileUpdated(profileId: ID!): Profile!
    
    """Subscribe to narrative generation completion"""
    narrativeGenerated(profileId: ID!): NarrativeSnapshot!

    """Subscribe to live interview score updates (fired per answer)"""
    interviewScoreUpdated(sessionId: ID!): InterviewScoreEvent!

    """Subscribe to interview session completion"""
    interviewCompleted(sessionId: ID!): InterviewSession!
  }
`;
