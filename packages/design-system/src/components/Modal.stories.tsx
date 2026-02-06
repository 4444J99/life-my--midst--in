import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { Button } from './Button';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Modal>;

const ModalDemo = ({ maxWidth }: { maxWidth?: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: '2rem', background: '#f4efe6', minHeight: 200 }}>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      <Modal open={open} onClose={() => setOpen(false)} maxWidth={maxWidth}>
        <h2 style={{ margin: '0 0 1rem', fontFamily: 'Georgia, serif' }}>Export Profile</h2>
        <p style={{ color: '#8f8376', margin: '0 0 1.5rem' }}>
          Choose an export format for your professional profile.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="primary" onClick={() => setOpen(false)}>
            Export as PDF
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Export as JSON-LD
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export const Default: Story = {
  render: () => <ModalDemo />,
};

export const NarrowModal: Story = {
  render: () => <ModalDemo maxWidth="500px" />,
};
