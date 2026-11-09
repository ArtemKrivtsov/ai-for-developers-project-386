import { Button, Group, Select, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { type FormEvent, useState } from 'react';

import { formatDuration } from './format.ts';
import {
  type ApiError,
  createMeetingType,
  type MeetingType,
  type NewMeetingType,
} from './generated/index.ts';

type Duration = MeetingType['durationMinutes'];

const durations: Duration[] = [15, 30, 45, 60, 90, 120];
const durationOptions = durations.map((minutes) => ({
  value: String(minutes),
  label: formatDuration(minutes),
}));

type Values = { name: string; description: string; durationMinutes: Duration | null };
type Errors = { name?: string; description?: string; durationMinutes?: string };

/** Checks the trimmed values the way the contract does, so most mistakes never reach the server. */
function validate({ name, description, durationMinutes }: Values): Errors {
  const errors: Errors = {};
  if (!name) errors.name = 'Введите название';
  else if (name.length > 100) errors.name = 'Название длиннее 100 символов';
  if (description.length > 500) errors.description = 'Описание длиннее 500 символов';
  if (durationMinutes === null) errors.durationMinutes = 'Выберите длительность';
  return errors;
}

/**
 * The error to show under the field the server rejected. The texts are ours: the server's
 * `message` is not for users. A rejection without a known field gets none.
 */
function serverFieldError({ code, field }: ApiError): Errors | undefined {
  if (code !== 'validation_error') return undefined;
  switch (field) {
    case 'name':
      return { name: 'Проверьте название' };
    case 'description':
      return { description: 'Проверьте описание' };
    case 'durationMinutes':
      return { durationMinutes: 'Выберите длительность' };
  }
}

type Props = { onCreated: () => void; onCancel: () => void };

/** The form of the «Новый тип встречи» window. It starts empty every time the window opens. */
function NewMeetingTypeForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<Duration | null>(30);
  const [errors, setErrors] = useState<Errors>({});
  const [failed, setFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(meetingType: NewMeetingType) {
    setSubmitting(true);
    const { data, error, response } = await createMeetingType({ body: meetingType });
    setSubmitting(false);
    if (data) return onCreated();

    // Without a response the request never reached the server, and `error` is not an ApiError.
    const fieldError = response?.status === 400 ? serverFieldError(error) : undefined;
    if (fieldError) setErrors(fieldError);
    else setFailed(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = { name: name.trim(), description: description.trim(), durationMinutes };
    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    setFailed(false);
    if (values.durationMinutes === null || Object.keys(fieldErrors).length > 0) return;
    void submit({ ...values, durationMinutes: values.durationMinutes });
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput
          label="Название"
          required
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          error={errors.name}
        />
        <Textarea
          label="Описание"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          error={errors.description}
        />
        <Select
          label="Длительность"
          data={durationOptions}
          value={durationMinutes === null ? null : String(durationMinutes)}
          onChange={(value) =>
            setDurationMinutes(durations.find((minutes) => String(minutes) === value) ?? null)
          }
          error={errors.durationMinutes}
        />
        {failed && (
          <Text c="red" size="sm">
            Не удалось создать тип встречи. Попробуйте ещё раз.
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="submit" loading={submitting}>
            Создать
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export default NewMeetingTypeForm;
