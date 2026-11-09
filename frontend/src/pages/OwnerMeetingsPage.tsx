import { Badge, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';

import { formatDuration, formatMeetingTime, moscowTimeNote } from '../format.ts';
import type { Meeting } from '../generated/index.ts';
import { type UpcomingMeetings, useUpcomingMeetings } from '../useUpcomingMeetings.ts';

function OwnerMeetingsPage() {
  const meetings = useUpcomingMeetings();

  return (
    <Stack gap="md">
      <div>
        <Title order={1}>Предстоящие встречи</Title>
        <Text size="sm" c="dimmed">
          {moscowTimeNote}
        </Text>
      </div>
      <MeetingList meetings={meetings} />
    </Stack>
  );
}

function MeetingList({ meetings }: { meetings: UpcomingMeetings }) {
  switch (meetings.status) {
    case 'loading':
      return <Loader role="status" aria-label="Загрузка" />;
    case 'failed':
      return <Text c="red">Не удалось загрузить встречи. Обновите страницу.</Text>;
    case 'loaded':
      if (meetings.meetings.length === 0) return <Text>Предстоящих встреч нет</Text>;
      // The server picks the meetings that have not ended and sorts them: the order is kept.
      return meetings.meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />);
  }
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
