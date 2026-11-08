import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import '@/lib/i18n';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';

const OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

function SelectHarness() {
  const [value, setValue] = useState('medium');
  return <Select id="priority" value={value} onChange={setValue} options={OPTIONS} />;
}

function DateHarness({ initial = '2026-11-07' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <DatePicker id="deadline" value={value} onChange={setValue} />;
}

describe('priority select', () => {
  it('opens, lists every option and applies a pointer selection', async () => {
    const user = userEvent.setup();
    render(<SelectHarness />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('Medium');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options.map((option) => option.textContent)).toEqual(['Low', 'Medium', 'High']);

    await user.click(options[2]);
    expect(trigger).toHaveTextContent('High');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('changes the value from the keyboard alone', async () => {
    const user = userEvent.setup();
    render(<SelectHarness />);
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(trigger).toHaveTextContent('High');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes on Escape without changing the value', async () => {
    const user = userEvent.setup();
    render(<SelectHarness />);
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger).toHaveTextContent('Medium');
  });
});

describe('deadline date picker', () => {
  it('selects a day without shifting it across time zones', async () => {
    const user = userEvent.setup();
    render(<DateHarness />);
    const trigger = screen.getByRole('button', { name: /7 Nov 2026/ });

    await user.click(trigger);
    const panel = screen.getByTestId('calendar-panel');
    await user.click(panel.querySelector('[data-day="2026-11-09"]') as HTMLElement);

    expect(trigger).toHaveTextContent('9 Nov 2026');
    expect(screen.queryByTestId('calendar-panel')).toBeNull();
  });

  it('navigates between months', async () => {
    const user = userEvent.setup();
    render(<DateHarness />);
    await user.click(screen.getByRole('button', { name: /7 Nov 2026/ }));
    const panel = screen.getByTestId('calendar-panel');

    expect(within(panel).getByText('November 2026')).toBeInTheDocument();
    await user.click(within(panel).getByTestId('calendar-next'));
    expect(within(panel).getByText('December 2026')).toBeInTheDocument();
    await user.click(within(panel).getByTestId('calendar-prev'));
    await user.click(within(panel).getByTestId('calendar-prev'));
    expect(within(panel).getByText('October 2026')).toBeInTheDocument();
  });

  it('supports arrow keys and Enter', async () => {
    const user = userEvent.setup();
    render(<DateHarness />);
    const trigger = screen.getByRole('button', { name: /7 Nov 2026/ });

    await user.click(trigger);
    await user.keyboard('{ArrowRight}{Enter}');

    expect(trigger).toHaveTextContent('8 Nov 2026');
    expect(screen.queryByTestId('calendar-panel')).toBeNull();
  });
});
