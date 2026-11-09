import {
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { Link } from 'react-router';

import { formatDuration } from '../format.ts';
import type { MeetingType } from '../generated/index.ts';
import NewMeetingTypeForm from '../NewMeetingTypeForm.tsx';
import { type MeetingTypes, useMeetingTypes } from '../useMeetingTypes.ts';

function OwnerMeetingTypesPage() {
  const [meetingTypes, reload] = useMeetingTypes();
  const [creating, setCreating] = useState(false);

  function handleCreated() {
    setCreating(false);
    reload();
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={1}>Типы встреч</Title>
        <Button onClick={() => setCreating(true)}>Создать</Button>
      </Group>
      <MeetingTypeList meetingTypes={meetingTypes} />
      <Modal
        opened={creating}
        onClose={() => setCreating(false)}
        title="Новый тип встречи"
        closeButtonProps={{ 'aria-label': 'Закрыть' }}
      >
        {/* The form unmounts with the closed window, so it opens empty next time. */}
        <NewMeetingTypeForm onCreated={handleCreated} onCancel={() => setCreating(false)} />
      </Modal>
    </Stack>
  );
}

function MeetingTypeList({ meetingTypes }: { meetingTypes: MeetingTypes }) {
  switch (meetingTypes.status) {
    case 'loading':
      return <Loader role="status" aria-label="Загрузка" />;
    case 'failed':
      return <Text c="red">Не удалось загрузить типы встреч. Обновите страницу.</Text>;
    case 'loaded':
      if (meetingTypes.meetingTypes.length === 0) return <Text>Типов встреч пока нет.</Text>;
      return meetingTypes.meetingTypes.map((meetingType) => (
        <MeetingTypeCard key={meetingType.id} meetingType={meetingType} />
      ));
  }
}

function MeetingTypeCard({ meetingType }: { meetingType: MeetingType }) {
  const guestPath = `/book/${meetingType.id}`;
  return (
    <Card component="article" withBorder radius="md" padding="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Title order={2} size="h4">
          {meetingType.name}
        </Title>
        <Badge variant="light">{formatDuration(meetingType.durationMinutes)}</Badge>
      </Group>
      {meetingType.description && (
        <Text c="dimmed" size="sm" mt="xs">
          {meetingType.description}
        </Text>
      )}
      <Text size="sm" mt="sm">
        Ссылка для гостей:{' '}
        <Anchor component={Link} to={guestPath}>
          {guestPath}
        </Anchor>
      </Text>
    </Card>
  );
}

export default OwnerMeetingTypesPage;
