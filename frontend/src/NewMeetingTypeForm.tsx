import { Button, Group, Select, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { type FormEvent, useState } from 'react';

import { formatDuration } from './format.ts';
import { createMeetingType, type MeetingType, type NewMeetingType } from './generated/index.ts';
import { type Field, rejectedField } from './rejectedField.ts';

type Duration = MeetingType['durationMinutes'];

// Keyed by every duration of the contract: a new one fails the typecheck until the form offers it.
const offered: Record<Duration, true> = {
  15: true,
  30: true,
  45: true,
  60: true,
  90: true,
  120: true,
};
// Integer keys come in ascending order.
const durations = Object.keys(offered).map(Number) as Duration[];
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

/** What to show under the fields the server rejects. */
const serverErrors: Partial<Record<Field, Errors>> = {
  name: { name: 'Проверьте название' },
  description: { description: 'Проверьте описание' },
  durationMinutes: { durationMinutes: 'Выберите длительность' },
};

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

    const field = rejectedField(error, response);
    const fieldError = field && serverErrors[field];
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
