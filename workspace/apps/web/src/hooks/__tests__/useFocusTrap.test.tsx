import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFocusTrap } from '../useFocusTrap';
import { useRef } from 'react';

const FocusTrapTarget = ({ active }: { active: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);
  return (
    <div ref={ref}>
      <button>First</button>
      <button>Last</button>
    </div>
  );
};

describe('useFocusTrap', () => {
  it('focuses first element when activated', () => {
    render(<FocusTrapTarget active={true} />);
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('traps Tab key on last element', async () => {
    const user = userEvent.setup();
    render(<FocusTrapTarget active={true} />);
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    first.focus();
    await user.tab();
    expect(last).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();
  });

  it('does not trap when inactive', async () => {
    const user = userEvent.setup();
    render(<FocusTrapTarget active={false} />);
    const first = screen.getByRole('button', { name: 'First' });
    first.focus();
    await user.tab();
  });
});
