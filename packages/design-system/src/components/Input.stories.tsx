import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '2rem', background: '#f4efe6', maxWidth: 400 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'Enter your name...' },
};

export const WithLabel: Story = {
  args: { label: 'Display Name', placeholder: 'e.g. Jordan Doe' },
};

export const Disabled: Story = {
  args: { label: 'Read Only', value: 'Locked value', disabled: true },
};

export const FormExample: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Input label="Full Name" placeholder="Jordan Doe" />
      <Input label="Email" type="email" placeholder="jordan@example.com" />
      <Input label="Role Title" placeholder="Senior Engineer" />
    </div>
  ),
};
