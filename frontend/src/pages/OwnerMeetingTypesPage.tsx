import { Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';

import { useMeetingTypes } from '../load.ts';
import Loaded from '../Loaded.tsx';
import MeetingTypeCard from '../MeetingTypeCard.tsx';
import NewMeetingTypeForm from '../NewMeetingTypeForm.tsx';

function OwnerMeetingTypesPage() {
  const [list, reload] = useMeetingTypes();
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
      <Loaded state={list} failure="Не удалось загрузить типы встреч. Обновите страницу.">
        {(meetingTypes) =>
          meetingTypes.length === 0 ? (
            <Text>Типов встреч пока нет.</Text>
          ) : (
            meetingTypes.map((meetingType) => (
              <MeetingTypeCard key={meetingType.id} meetingType={meetingType} forOwner />
            ))
          )
        }
      </Loaded>
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

export default OwnerMeetingTypesPage;
