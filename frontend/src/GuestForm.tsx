import { Button, Stack, Text, TextInput } from '@mantine/core';
import { type FormEvent, useState } from 'react';

import { type ApiError, createMeeting, type Meeting } from './generated/index.ts';

/** What the guest typed. It outlives the form, so going back to the slots keeps it. */
export type Guest = { name: string; email: string };

type Errors = { name?: string; email?: string };

// Only a rough check: the server has the last word on the email.
const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Checks the trimmed values the way the contract does, so most mistakes never reach the server. */
function validate({ name, email }: Guest): Errors {
  const errors: Errors = {};
  if (!name) errors.name = 'Введите имя';
  else if (name.length > 100) errors.name = 'Имя длиннее 100 символов';
  if (!email) errors.email = 'Введите email';
  else if (email.length > 254) errors.email = 'Email длиннее 254 символов';
  else if (!emailShape.test(email)) errors.email = 'Неверный email';
  return errors;
}

/**
 * The error to show under the field the server rejected. The texts are ours: the server's
 * `message` is not for users. A rejection without a known field gets none.
 */
function serverFieldError({ code, field }: ApiError): Errors | undefined {
  if (code !== 'validation_error') return undefined;
  switch (field) {
    case 'guestName':
      return { name: 'Проверьте имя' };
    case 'guestEmail':
      return { email: 'Неверный email' };
  }
}

type Props = {
  meetingTypeId: string;
  /** The start of the chosen slot. */
  start: string;
  guest: Guest;
  onGuestChange: (guest: Guest) => void;
  onBooked: (meeting: Meeting) => void;
  /** The server no longer knows the meeting type. */
  onNotFound: () => void;
  /**
   * The server refused the slot: someone has taken it or it has left the booking window.
   * `notice` tells the guest so above the slots.
   */
  onSlotGone: (notice: string) => void;
  /** Goes back to the slots of the day. */
  onOtherTime: () => void;
};

/** The guest's name and email for the chosen slot, in place of the slots. */
function GuestForm({
  meetingTypeId,
  start,
  guest,
  onGuestChange,
  onBooked,
  onNotFound,
  onSlotGone,
  onOtherTime,
}: Props) {
  const [errors, setErrors] = useState<Errors>({});
  const [failed, setFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit({ name, email }: Guest) {
    setSubmitting(true);
    const { data, error, response } = await createMeeting({
      path: { meetingTypeId },
      body: { start, guestName: name, guestEmail: email },
    });
    setSubmitting(false);
    if (data) return onBooked(data);
    if (response?.status === 404) return onNotFound();
    if (response?.status === 409) return onSlotGone('Это время уже заняли. Выберите другое.');

    // Without a response the request never reached the server, and `error` is not an ApiError.
    if (response?.status === 400 && error.code === 'validation_error' && error.field === 'start') {
      return onSlotGone('Это время больше недоступно. Выберите другое.');
    }
    const fieldError = response?.status === 400 ? serverFieldError(error) : undefined;
    if (fieldError) setErrors(fieldError);
    else setFailed(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = { name: guest.name.trim(), email: guest.email.trim() };
    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    setFailed(false);
    if (Object.keys(fieldErrors).length > 0) return;
    void submit(values);
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <Stack gap="md">
        {failed && (
          <Text c="red" size="sm">
            Не удалось записаться. Попробуйте ещё раз.
          </Text>
        )}
        <TextInput
          label="Имя"
          required
          autoComplete="name"
          value={guest.name}
          onChange={(event) => onGuestChange({ ...guest, name: event.currentTarget.value })}
          error={errors.name}
        />
        <TextInput
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={guest.email}
          onChange={(event) => onGuestChange({ ...guest, email: event.currentTarget.value })}
          error={errors.email}
        />
        <Button type="submit" fullWidth loading={submitting}>
          Записаться
        </Button>
        <Button variant="subtle" fullWidth onClick={onOtherTime}>
          Другое время
        </Button>
      </Stack>
    </form>
  );
}

export default GuestForm;
