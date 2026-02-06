import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
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
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Get Started', variant: 'primary' },
};

export const Secondary: Story = {
  args: { children: 'Learn More', variant: 'secondary' },
};

export const Ghost: Story = {
  args: { children: 'Cancel', variant: 'ghost' },
};

export const Disabled: Story = {
  args: { children: 'Unavailable', variant: 'primary', disabled: true },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
    </div>
  ),
};
