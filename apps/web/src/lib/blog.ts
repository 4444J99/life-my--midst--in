import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
}

interface RawFrontmatter {
  title?: string;
  date?: string;
  author?: string;
  excerpt?: string;
  tags?: string | string[];
}

const CONTENT_DIR = join(process.cwd(), 'src', 'content', 'blog');

/**
 * Parse simple YAML-style frontmatter from MDX content.
 * We avoid importing a heavy library — frontmatter here is intentionally minimal.
 */
function parseFrontmatter(raw: string): { meta: RawFrontmatter; content: string } {
  if (!raw.startsWith('---')) {
    return { meta: {}, content: raw };
  }
  const end = raw.indexOf('---', 3);
  if (end === -1) {
    return { meta: {}, content: raw };
  }

  const fmBlock = raw.slice(3, end).trim();
  const content = raw.slice(end + 3).trim();
  const meta: Record<string, string | string[]> = {};

  for (const line of fmBlock.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Array syntax: [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
    } else {
      meta[key] = value;
    }
  }

  return { meta: meta as unknown as RawFrontmatter, content };
}

function normalizeTags(tags: string | string[] | undefined): string[] {
  if (!tags) return [];
  if (typeof tags === 'string') return tags.split(',').map((t) => t.trim());
  return tags;
}

export function getPostSlugs(): string[] {
  try {
    return readdirSync(CONTENT_DIR)
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => f.replace(/\.mdx$/, ''));
  } catch {
    return [];
  }
}

export function getPostBySlug(slug: string): { meta: BlogPostMeta; content: string } | null {
  try {
    const filePath = join(CONTENT_DIR, `${slug}.mdx`);
    const raw = readFileSync(filePath, 'utf-8');
    const { meta, content } = parseFrontmatter(raw);

    return {
      meta: {
        slug,
        title: meta.title ?? slug,
        date: meta.date ?? new Date().toISOString().slice(0, 10),
        author: meta.author ?? 'Team',
        excerpt: meta.excerpt ?? '',
        tags: normalizeTags(meta.tags),
      },
      content,
    };
  } catch {
    return null;
  }
}

export function getAllPosts(): BlogPostMeta[] {
  return getPostSlugs()
    .map((slug) => {
      const post = getPostBySlug(slug);
      return post?.meta ?? null;
    })
    .filter((meta): meta is BlogPostMeta => meta !== null)
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}
