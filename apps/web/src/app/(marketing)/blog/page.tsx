import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog — in midst my life',
  description:
    'Insights on composable identity, DID/VC, mask systems, and the future of professional profiles.',
};

export default function BlogListPage() {
  const posts = getAllPosts();

  return (
    <section
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '3rem clamp(1rem, 3vw, 2.5rem) 5rem',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display), Georgia, serif',
          fontSize: 'clamp(2rem, 3vw, 2.6rem)',
          marginBottom: '0.5rem',
        }}
      >
        Blog
      </h1>
      <p style={{ color: 'var(--stone)', marginBottom: '2.5rem' }}>
        Thinking about identity, masks, and the systems that power them.
      </p>

      {posts.length === 0 ? (
        <p style={{ color: 'var(--stone)' }}>No posts yet. Check back soon.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="section"
              style={{
                display: 'block',
                textDecoration: 'none',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <time
                dateTime={post.date}
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--stone)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              <h2
                style={{
                  fontFamily: 'var(--font-display), Georgia, serif',
                  fontSize: '1.3rem',
                  margin: '0.3rem 0 0.5rem',
                }}
              >
                {post.title}
              </h2>
              {post.excerpt && (
                <p
                  style={{
                    color: 'var(--stone)',
                    fontSize: '0.92rem',
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  {post.excerpt}
                </p>
              )}
              {post.tags.length > 0 && (
                <div
                  style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}
                >
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="chip"
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
