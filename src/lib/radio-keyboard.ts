import type { KeyboardEvent } from 'react';
/** Arrow/Home/End selection for button-based radio groups. */
export function radioKeyboard(event: KeyboardEvent<HTMLElement>) {
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const current = buttons.indexOf(event.target as HTMLButtonElement);
  if (current < 0) return;
  let index: number;
  if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = buttons.length - 1;
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') index = (current + 1) % buttons.length;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') index = (current - 1 + buttons.length) % buttons.length;
  else return;
  event.preventDefault(); buttons[index]?.focus(); buttons[index]?.click();
}
