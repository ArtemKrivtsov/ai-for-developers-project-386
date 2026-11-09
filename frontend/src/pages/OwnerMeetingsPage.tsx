import { Badge, Card, Group, Stack, Text, Title } from '@mantine/core';

import { formatDuration, formatMeetingTime, moscowTimeNote } from '../format.ts';
import type { Meeting } from '../generated/index.ts';
import { useUpcomingMeetings } from '../load.ts';
import Loaded from '../Loaded.tsx';

function OwnerMeetingsPage() {
  const upcoming = useUpcomingMeetings();

  return (
    <Stack gap="md">
      <div>
        <Title order={1}>Предстоящие встречи</Title>
        <Text size="sm" c="dimmed">
          {moscowTimeNote}
        </Text>
      </div>
      <Loaded state={upcoming} failure="Не удалось загрузить встречи. Обновите страницу.">
        {(meetings) =>
          meetings.length === 0 ? (
            <Text>Предстоящих встреч нет</Text>
          ) : (
            // The server picks the meetings that have not ended and sorts them: the order is kept.
            meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)
          )
        }
      </Loaded>
    </Stack>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  return (
    <Card component="article" withBorder radius="md" padding="lg">
      <Title order={2} size="h5">
        {formatMeetingTime(meeting)}
      </Title>
      <Group gap="xs" mt="xs">
        <Text>{meeting.meetingType.name}</Text>
        <Badge variant="light">{formatDuration(meeting.meetingType.durationMinutes)}</Badge>
      </Group>
      <Text c="dimmed" size="sm" mt="xs">
        {`${meeting.guestName}, ${meeting.guestEmail}`}
      </Text>
    </Card>
  );
}

export default OwnerMeetingsPage;
