import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'Components/Chip',
  component: Chip,
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
type Story = StoryObj<typeof Chip>;

export const Default: Story = {
  args: { children: 'TypeScript' },
};

export const Active: Story = {
  args: { children: 'Selected', active: true },
};

export const ChipRow: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      <Chip active>React</Chip>
      <Chip active>TypeScript</Chip>
      <Chip>Node.js</Chip>
      <Chip>PostgreSQL</Chip>
      <Chip active>Kubernetes</Chip>
      <Chip>GraphQL</Chip>
    </div>
  ),
};
