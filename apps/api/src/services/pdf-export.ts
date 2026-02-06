import PDFDocument from 'pdfkit';
import type {
  Profile,
  Mask,
  Experience,
  Education,
  Skill,
  NarrativeBlock,
} from '@in-midst-my-life/schema';

/**
 * Service for generating PDF résumés from profile data.
 * Creates formatted, downloadable PDF résumés with optional mask filtering.
 */

export type PdfTemplate = 'standard' | 'minimal' | 'creative';

export interface PdfExportRequest {
  profile: Profile;
  mask?: Mask;
  experiences?: Experience[];
  educations?: Education[];
  skills?: Skill[];
  narrativeBlocks?: NarrativeBlock[];
  includeOnlineProfile?: boolean;
  colorScheme?: 'classic' | 'modern' | 'minimal';
  template?: PdfTemplate;
}

export interface PdfGenerationResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

/**
 * Color schemes for PDF résumés.
 */
const COLOR_SCHEMES = {
  classic: {
    header: '#1a1a1a',
    section: '#333333',
    accent: '#0066cc',
    text: '#000000',
    lightText: '#666666',
  },
  modern: {
    header: '#6366f1',
    section: '#4f46e5',
    accent: '#a855f7',
    text: '#1f2937',
    lightText: '#6b7280',
  },
  minimal: {
    header: '#000000',
    section: '#1f2937',
    accent: '#111827',
    text: '#111827',
    lightText: '#6b7280',
  },
  creative: {
    header: '#d36b3c',
    section: '#2f5e64',
    accent: '#d36b3c',
    text: '#1d1a16',
    lightText: '#8f8376',
  },
};

/**
 * Generates a comprehensive PDF résumé from profile and experience data.
 *
 * Features:
 * - Professional formatting with customizable color schemes
 * - Semantic sections (summary, experience, education, skills)
 * - Mask-based content filtering and reordering
 * - Narrative block integration
 * - Automated pagination for multi-page résumés
 * - Print-optimized layout
 */
export async function generatePdfResume(request: PdfExportRequest): Promise<PdfGenerationResult> {
  const {
    profile,
    mask,
    experiences = [],
    educations = [],
    skills = [],
    narrativeBlocks = [],
    colorScheme = 'modern',
  } = request;

  const colors = COLOR_SCHEMES[colorScheme];
  const doc = new PDFDocument({
    margin: 40,
    size: 'Letter',
    autoFirstPage: true,
  });

  // Collect PDF content in a buffer
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve());
    doc.on('error', reject);

    // Header: Name and Title
    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor(colors.header)
      .text(profile.displayName, { align: 'center' });

    // Subtitle: Title and Location
    const subtitle = [profile.title, profile.locationText].filter(Boolean).join(' • ');
    doc.fontSize(12).fillColor(colors.lightText).text(subtitle, { align: 'center' }).moveDown(0.5);

    // Contact Info
    // const contactInfo = [profile.email, profile.website, profile.phone].filter(Boolean);
    // if (contactInfo.length > 0) {
    //   doc.fontSize(9).fillColor(colors.text).text(contactInfo.join(" • "), { align: "center" }).moveDown(1);
    // } else {
    doc.moveDown(0.5);
    // }

    // Horizontal line
    doc
      .strokeColor(colors.accent)
      .lineWidth(2)
      .moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .stroke()
      .moveDown(1);

    // Professional Summary
    if (profile.summaryMarkdown) {
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(colors.section)
        .text('PROFESSIONAL SUMMARY', { underline: true })
        .moveDown(0.3);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(colors.text)
        .text((profile.summaryMarkdown || '').split('\n')[0] || '', { align: 'left' })
        .moveDown(1);
    }

    // Narrative Blocks (if provided)
    if (narrativeBlocks.length > 0) {
      for (const block of narrativeBlocks.slice(0, 3)) {
        if (doc.y > 700) doc.addPage(); // Auto page break

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(colors.section)
          .text(block.title.toUpperCase(), { underline: true })
          .moveDown(0.2);

        doc
          .fontSize(9.5)
          .font('Helvetica')
          .fillColor(colors.text)
          .text(block.body, { align: 'left', width: 475 })
          .moveDown(0.8);
      }
    }

    // Professional Experience
    if (experiences.length > 0) {
      if (doc.y > 680) doc.addPage();

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(colors.section)
        .text('PROFESSIONAL EXPERIENCE', { underline: true })
        .moveDown(0.3);

      for (const exp of experiences.slice(0, 5)) {
        if (doc.y > 680) doc.addPage();

        // Role and Company
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(colors.text)
          .text(`${exp.roleTitle} at ${exp.organization}`);

        // Dates and Location
        const dates = [
          exp.startDate?.split('T')[0],
          exp.isCurrent ? 'Present' : exp.endDate?.split('T')[0],
        ]
          .filter(Boolean)
          .join(' - ');
        const location = exp.locationText ? ` | ${exp.locationText}` : '';
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(colors.lightText)
          .text(dates + location)
          .moveDown(0.2);

        // Description
        if (exp.descriptionMarkdown) {
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(colors.text)
            .text((exp.descriptionMarkdown || '').split('\n')[0] || '', { width: 475 })
            .moveDown(0.3);
        }

        // Tags
        if (exp.tags && exp.tags.length > 0) {
          doc
            .fontSize(8)
            .font('Helvetica-Oblique')
            .fillColor(colors.accent)
            .text(`Tags: ${exp.tags.join(', ')}`, { width: 475 })
            .moveDown(0.5);
        }
      }
    }

    // Education
    if (educations.length > 0) {
      if (doc.y > 680) doc.addPage();

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(colors.section)
        .text('EDUCATION', { underline: true })
        .moveDown(0.3);

      for (const edu of educations.slice(0, 3)) {
        if (doc.y > 700) doc.addPage();

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(colors.text)
          .text(edu.fieldOfStudy || 'Degree');

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(colors.lightText)
          .text(`${edu.institution}${edu.endDate ? ` • ${edu.endDate.split('T')[0]}` : ''}`);

        if (edu.descriptionMarkdown) {
          doc
            .fontSize(8)
            .fillColor(colors.text)
            .text((edu.descriptionMarkdown || '').split('\n')[0] || '', { width: 475 })
            .moveDown(0.3);
        }
        doc.moveDown(0.5);
      }
    }

    // Skills
    if (skills.length > 0) {
      if (doc.y > 680) doc.addPage();

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(colors.section)
        .text('SKILLS', { underline: true })
        .moveDown(0.3);

      // Group skills by category
      const skillsByCategory = new Map<string, typeof skills>();
      skills.forEach((s) => {
        const cat = s.category || 'General';
        if (!skillsByCategory.has(cat)) skillsByCategory.set(cat, []);
        skillsByCategory.get(cat)!.push(s);
      });

      for (const [category, categorySkills] of skillsByCategory) {
        if (doc.y > 700) doc.addPage();

        doc.fontSize(9).font('Helvetica-Bold').fillColor(colors.accent).text(`${category}:`);

        const skillNames = categorySkills.slice(0, 8).map((s) => s.name);
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(colors.text)
          .text(skillNames.join(', '), { width: 475 })
          .moveDown(0.5);
      }
    }

    // Footer with mask context (if applicable)
    if (mask) {
      doc
        .fontSize(8)
        .fillColor(colors.lightText)
        .text(`Generated via ${mask.name} mask`, { align: 'center' });
    }

    doc.end();
  });

  const buffer = Buffer.concat(chunks);

  return {
    buffer,
    contentType: 'application/pdf',
    filename: `${profile.slug || profile.displayName.toLowerCase().replace(/\s+/g, '-')}-resume.pdf`,
  };
}

/**
 * Generates a minimal one-page PDF résumé focused on key highlights.
 */
export async function generateMinimalPdfResume(
  request: PdfExportRequest,
): Promise<PdfGenerationResult> {
  const { profile, experiences = [], skills = [] } = request;

  const colors = COLOR_SCHEMES.minimal;
  const doc = new PDFDocument({
    margin: 30,
    size: 'Letter',
  });

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve());
    doc.on('error', reject);

    // Compact header
    doc.fontSize(20).font('Helvetica-Bold').fillColor(colors.header).text(profile.displayName);

    doc
      .fontSize(9)
      .fillColor(colors.lightText)
      .text(profile.title || 'Professional')
      .moveDown(0.3);

    // Summary
    if (profile.summaryMarkdown) {
      doc
        .fontSize(9)
        .font('Helvetica')
        .text((profile.summaryMarkdown || '').split('\n')[0] || '', { width: 515 })
        .moveDown(0.5);
    }

    // Experience (compact)
    if (experiences.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').text('EXPERIENCE').moveDown(0.2);

      for (const exp of experiences.slice(0, 3)) {
        doc.fontSize(9).text(`${exp.roleTitle} at ${exp.organization}`);
        doc
          .fontSize(8)
          .fillColor(colors.lightText)
          .text(exp.startDate?.split('T')[0] || '')
          .moveDown(0.2);
      }
      doc.moveDown(0.3);
    }

    // Skills (compact)
    if (skills.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(colors.text).text('SKILLS').moveDown(0.2);
      const topSkills = skills.slice(0, 10).map((s) => s.name);
      doc.fontSize(8).text(topSkills.join(', ')).moveDown(0.3);
    }

    doc.end();
  });

  const buffer = Buffer.concat(chunks);

  return {
    buffer,
    contentType: 'application/pdf',
    filename: `${profile.slug || 'resume'}-minimal.pdf`,
  };
}

/**
 * Generates a creative two-column PDF résumé with an accent sidebar.
 * Left column: skills, education, contact-style info.
 * Right column: name, summary, experience, narrative blocks.
 */
export async function generateCreativePdfResume(
  request: PdfExportRequest,
): Promise<PdfGenerationResult> {
  const {
    profile,
    mask,
    experiences = [],
    educations = [],
    skills = [],
    narrativeBlocks = [],
  } = request;

  const colors = COLOR_SCHEMES.creative;
  const doc = new PDFDocument({ margin: 0, size: 'Letter' });
  const pageWidth = 612;
  const pageHeight = 792;
  const sidebarWidth = 180;
  const contentLeft = sidebarWidth + 30;
  const contentWidth = pageWidth - contentLeft - 30;

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve());
    doc.on('error', reject);

    // --- Sidebar background ---
    doc.rect(0, 0, sidebarWidth, pageHeight).fill('#2f5e64');

    // Sidebar: Name (vertical branding)
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(profile.displayName.toUpperCase(), 20, 40, { width: sidebarWidth - 40 });

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('rgba(255,255,255,0.8)')
      .text(profile.title || '', 20, doc.y + 4, { width: sidebarWidth - 40 })
      .moveDown(1.5);

    // Sidebar: Skills
    if (skills.length > 0) {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('SKILLS', 20, doc.y, { width: sidebarWidth - 40 })
        .moveDown(0.3);

      // Accent line under section title
      const lineY = doc.y;
      doc.strokeColor(colors.accent).lineWidth(2).moveTo(20, lineY).lineTo(80, lineY).stroke();
      doc.y = lineY + 8;

      const skillsByCategory = new Map<string, typeof skills>();
      skills.forEach((s) => {
        const cat = s.category || 'General';
        if (!skillsByCategory.has(cat)) skillsByCategory.set(cat, []);
        skillsByCategory.get(cat)!.push(s);
      });

      for (const [category, categorySkills] of skillsByCategory) {
        if (doc.y > 680) break;
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(colors.accent)
          .text(category.toUpperCase(), 20, doc.y, { width: sidebarWidth - 40 })
          .moveDown(0.15);

        for (const skill of categorySkills.slice(0, 5)) {
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('rgba(255,255,255,0.85)')
            .text(`• ${skill.name}`, 24, doc.y, { width: sidebarWidth - 44 });
        }
        doc.moveDown(0.4);
      }
    }

    // Sidebar: Education
    if (educations.length > 0 && doc.y < 620) {
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('EDUCATION', 20, doc.y, { width: sidebarWidth - 40 })
        .moveDown(0.3);

      const lineY = doc.y;
      doc.strokeColor(colors.accent).lineWidth(2).moveTo(20, lineY).lineTo(80, lineY).stroke();
      doc.y = lineY + 8;

      for (const edu of educations.slice(0, 2)) {
        if (doc.y > 720) break;
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text(edu.fieldOfStudy || 'Degree', 20, doc.y, { width: sidebarWidth - 40 });
        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor('rgba(255,255,255,0.7)')
          .text(edu.institution, 20, doc.y, { width: sidebarWidth - 40 });
        if (edu.endDate) {
          doc.text(edu.endDate.split('T')[0] || '', 20, doc.y, { width: sidebarWidth - 40 });
        }
        doc.moveDown(0.4);
      }
    }

    // Sidebar: Mask context
    if (mask) {
      doc.y = pageHeight - 60;
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('rgba(255,255,255,0.5)')
        .text(`${mask.name} perspective`, 20, doc.y, { width: sidebarWidth - 40, align: 'center' });
    }

    // --- Main content area ---
    let yPos = 40;

    // Large name
    doc
      .fontSize(26)
      .font('Helvetica-Bold')
      .fillColor(colors.header)
      .text(profile.displayName, contentLeft, yPos, { width: contentWidth });
    yPos = doc.y + 2;

    // Title with accent underline
    if (profile.title) {
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(colors.lightText)
        .text(profile.title, contentLeft, yPos, { width: contentWidth });
      yPos = doc.y + 6;
    }

    // Accent line
    doc
      .strokeColor(colors.accent)
      .lineWidth(3)
      .moveTo(contentLeft, yPos)
      .lineTo(contentLeft + 60, yPos)
      .stroke();
    yPos += 16;

    // Summary
    if (profile.summaryMarkdown) {
      doc
        .fontSize(9.5)
        .font('Helvetica')
        .fillColor(colors.text)
        .text((profile.summaryMarkdown || '').split('\n')[0] || '', contentLeft, yPos, {
          width: contentWidth,
        });
      yPos = doc.y + 14;
    }

    // Narrative blocks
    if (narrativeBlocks.length > 0) {
      for (const block of narrativeBlocks.slice(0, 2)) {
        if (yPos > 700) break;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(colors.section)
          .text(block.title, contentLeft, yPos, { width: contentWidth });
        yPos = doc.y + 3;

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(colors.text)
          .text(block.body, contentLeft, yPos, { width: contentWidth });
        yPos = doc.y + 10;
      }
    }

    // Experience section
    if (experiences.length > 0) {
      if (yPos > 680) {
        doc.addPage();
        yPos = 40;
      }

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(colors.section)
        .text('EXPERIENCE', contentLeft, yPos, { width: contentWidth });
      yPos = doc.y + 4;

      // Accent line under section
      doc
        .strokeColor(colors.accent)
        .lineWidth(2)
        .moveTo(contentLeft, yPos)
        .lineTo(contentLeft + 80, yPos)
        .stroke();
      yPos += 10;

      for (const exp of experiences.slice(0, 5)) {
        if (yPos > 700) {
          doc.addPage();
          yPos = 40;
        }

        // Accent dot
        doc.circle(contentLeft + 4, yPos + 5, 3).fill(colors.accent);

        // Role title
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(colors.text)
          .text(exp.roleTitle, contentLeft + 14, yPos, { width: contentWidth - 14 });
        yPos = doc.y;

        // Organization
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(colors.section)
          .text(exp.organization, contentLeft + 14, yPos, { width: contentWidth - 14 });
        yPos = doc.y;

        // Dates
        const dates = [
          exp.startDate?.split('T')[0],
          exp.isCurrent ? 'Present' : exp.endDate?.split('T')[0],
        ]
          .filter(Boolean)
          .join(' – ');
        doc
          .fontSize(8)
          .fillColor(colors.lightText)
          .text(dates, contentLeft + 14, yPos, { width: contentWidth - 14 });
        yPos = doc.y + 2;

        // Description
        if (exp.descriptionMarkdown) {
          doc
            .fontSize(8.5)
            .fillColor(colors.text)
            .text((exp.descriptionMarkdown || '').split('\n')[0] || '', contentLeft + 14, yPos, {
              width: contentWidth - 14,
            });
          yPos = doc.y;
        }

        yPos += 8;
      }
    }

    doc.end();
  });

  const buffer = Buffer.concat(chunks);

  return {
    buffer,
    contentType: 'application/pdf',
    filename: `${profile.slug || profile.displayName.toLowerCase().replace(/\s+/g, '-')}-creative.pdf`,
  };
}

/**
 * Template registry mapping template names to their generator functions.
 * Add new templates here to make them available via the API.
 */
export const PDF_TEMPLATES: Record<
  PdfTemplate,
  (request: PdfExportRequest) => Promise<PdfGenerationResult>
> = {
  standard: generatePdfResume,
  minimal: generateMinimalPdfResume,
  creative: generateCreativePdfResume,
};

/**
 * Generate a PDF using a named template.
 * Falls back to the standard template if the requested template is not found.
 */
export async function generatePdfFromTemplate(
  request: PdfExportRequest,
): Promise<PdfGenerationResult> {
  const template = request.template || 'standard';
  const generator = PDF_TEMPLATES[template] || PDF_TEMPLATES.standard;
  return generator(request);
}
