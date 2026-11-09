import { expect, type Page, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// The tests share one server and never reset it: each one makes its own meeting type and guest,
// with names nothing else on the server has.
function unique(name: string) {
  return `${name} ${randomUUID().slice(0, 8)}`;
}

/** The owner creates a meeting type of the default 30 minutes on `/owner/types`. */
async function createMeetingType(page: Page, name: string) {
  await page.goto('/owner/types');
  await page.getByRole('button', { name: 'Создать' }).click();
  const dialog = page.getByRole('dialog', { name: 'Новый тип встречи' });
  await dialog.getByRole('textbox', { name: 'Название' }).fill(name);
  await dialog.getByRole('button', { name: 'Создать' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('article').filter({ hasText: name })).toBeVisible();
}

/**
 * Chooses the first free slot: the page opens the first day that has slots. Returns the day and
 * the slot as the page shows them, like «вторник, 10 ноября» and «09:00–09:30».
 */
async function chooseFirstSlot(page: Page) {
  const day = await page
    .getByRole('region', { name: 'День' })
    .getByRole('button', { pressed: true })
    .getAttribute('aria-label');
  if (day === null) throw new Error('The chosen day has no name');
  const button = page.getByRole('region', { name: 'Время' }).getByRole('button').first();
  const slot = await button.innerText();
  await button.click();
  return { day, slot };
}

/** A guest finds the meeting type in the catalog and chooses its first free slot. */
async function openFirstSlot(page: Page, meetingType: string) {
  await page.goto('/book');
  await page.getByRole('link', { name: meetingType }).click();
  return chooseFirstSlot(page);
}

async function fillGuest(page: Page, name: string, email: string) {
  const form = page.getByRole('region', { name: 'Ваши данные' });
  await form.getByRole('textbox', { name: 'Имя' }).fill(name);
  await form.getByRole('textbox', { name: 'Email' }).fill(email);
}

async function submit(page: Page) {
  await page
    .getByRole('region', { name: 'Ваши данные' })
    .getByRole('button', { name: 'Записаться' })
    .click();
}

test('a guest takes the first free slot of a new meeting type, and the owner sees the meeting', async ({
  page,
}) => {
  const meetingType = unique('Консультация');
  const guest = unique('Гость');
  const email = `${randomUUID()}@example.com`;

  await createMeetingType(page, meetingType);

  await page.goto('/');
  await page.getByRole('main').getByRole('link', { name: 'Записаться' }).click();
  await page.getByRole('link', { name: meetingType }).click();
  const { day, slot } = await chooseFirstSlot(page);
  // Working hours are 09:00–18:00 in Moscow. A page in the browser's time zone would show
  // the same slots as 22:00–07:00 in Los Angeles.
  expect(slot).toMatch(/^(09|1[0-7]):[03]0–(09|1[0-8]):[03]0$/);
  await fillGuest(page, guest, email);
  await submit(page);

  const confirmation = page.getByRole('region', { name: 'Вы записаны' });
  await expect(confirmation).toContainText(meetingType);
  await expect(confirmation).toContainText(`${day}, ${slot}`);
  await expect(confirmation).toContainText(`${guest}, ${email}`);

  await page.reload();
  const times = page.getByRole('region', { name: 'Время' });
  // The day still has free slots, so the page opens it again.
  await expect(times.getByText(day)).toBeVisible();
  await expect(times.getByRole('button', { name: slot })).toHaveCount(0);

  await page.goto('/owner');
  const meeting = page.getByRole('article').filter({ hasText: guest });
  await expect(meeting.getByRole('heading')).toHaveText(`${day}, ${slot}`);
  await expect(meeting).toContainText(meetingType);
  await expect(meeting).toContainText(`${guest}, ${email}`);
});

test('two guests open one slot, and the second to send the form is told it is taken', async ({
  page,
  browser,
}) => {
  const meetingType = unique('Разбор кода');
  await createMeetingType(page, meetingType);

  // Two guests in browsers of their own, each with the slot open before either sends the form.
  // A context made in a test takes `use` of the config too: the base URL and the time zone.
  const contexts = [await browser.newContext(), await browser.newContext()];
  const [first, second] = await Promise.all(contexts.map((context) => context.newPage()));
  const chosen = await openFirstSlot(first, meetingType);
  expect(await openFirstSlot(second, meetingType)).toEqual(chosen);

  await fillGuest(first, 'Первый гость', 'first@example.com');
  await submit(first);
  await expect(first.getByRole('region', { name: 'Вы записаны' })).toBeVisible();

  await fillGuest(second, 'Второй гость', 'second@example.com');
  await submit(second);
  const times = second.getByRole('region', { name: 'Время' });
  await expect(times.getByText('Это время уже заняли. Выберите другое.')).toBeVisible();
  // The fresh slots come without the taken one.
  await expect(times.getByRole('button', { name: chosen.slot })).toHaveCount(0);

  await Promise.all(contexts.map((context) => context.close()));
});
