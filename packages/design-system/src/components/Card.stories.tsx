import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '2rem', background: '#f4efe6' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: 'A simple card with default styling.',
  },
};

export const StatCard: Story = {
  args: {
    variant: 'stat',
    children: (
      <>
        <div
          style={{
            fontSize: '0.8rem',
            color: '#8f8376',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Experiences
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '0.3rem' }}>24</div>
      </>
    ),
  },
};

export const SectionCard: Story = {
  args: {
    variant: 'section',
    children: (
      <>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', margin: '0 0 1rem' }}>
          Career Timeline
        </h3>
        <p style={{ color: '#8f8376', margin: 0 }}>
          A chronological view of professional experiences and milestones.
        </p>
      </>
    ),
  },
};

export const StatGrid: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem',
      }}
    >
      {[
        { label: 'Experiences', value: '24' },
        { label: 'Skills', value: '18' },
        { label: 'Projects', value: '7' },
        { label: 'Masks', value: '5' },
      ].map((stat) => (
        <Card key={stat.label} variant="stat">
          <div
            style={{
              fontSize: '0.8rem',
              color: '#8f8376',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {stat.label}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '0.3rem' }}>
            {stat.value}
          </div>
        </Card>
      ))}
    </div>
  ),
};
