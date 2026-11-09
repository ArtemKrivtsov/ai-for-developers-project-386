import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

import { formatDuration } from '../format.ts';
import type { MeetingType } from '../generated/index.ts';
import { useMeetingTypes } from '../load.ts';
import Loaded from '../Loaded.tsx';

function CatalogPage() {
  const [catalog] = useMeetingTypes();

  return (
    <Stack gap="md">
      <Title order={1}>Выберите тип встречи</Title>
      <Text c="dimmed">Нажмите на карточку, чтобы выбрать день и время.</Text>
      <Loaded state={catalog} failure="Не удалось загрузить типы встреч. Обновите страницу.">
        {(meetingTypes) =>
          meetingTypes.length === 0 ? (
            <Text>Владелец ещё не завёл ни одного типа встречи.</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {meetingTypes.map((meetingType) => (
                <MeetingTypeCard key={meetingType.id} meetingType={meetingType} />
              ))}
            </SimpleGrid>
          )
        }
      </Loaded>
    </Stack>
  );
}

function MeetingTypeCard({ meetingType }: { meetingType: MeetingType }) {
  return (
    <Card
      component={Link}
      to={`/book/${meetingType.id}`}
      withBorder
      radius="md"
      padding="lg"
      td="none"
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Title order={2} size="h4">
          {meetingType.name}
        </Title>
        <Badge variant="light">{formatDuration(meetingType.durationMinutes)}</Badge>
      </Group>
      {meetingType.description && (
        <Text c="dimmed" size="sm" mt="xs" lineClamp={3}>
          {meetingType.description}
        </Text>
      )}
    </Card>
  );
}

export default CatalogPage;
