import { Anchor, Badge, Card, Group, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

import { formatDuration } from './format.ts';
import type { MeetingType } from './generated/index.ts';

type Props = { meetingType: MeetingType; forOwner?: boolean };

/**
 * A meeting type as a card: its name, duration and description. In the catalog the whole card
 * links to the meeting type page and the description is cut at three lines. The owner's card
 * has the whole description and the link for guests.
 */
function MeetingTypeCard({ meetingType, forOwner = false }: Props) {
  const path = `/book/${meetingType.id}`;
  const about = (
    <>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Title order={2} size="h4">
          {meetingType.name}
        </Title>
        <Badge variant="light">{formatDuration(meetingType.durationMinutes)}</Badge>
      </Group>
      {meetingType.description && (
        <Text c="dimmed" size="sm" mt="xs" lineClamp={forOwner ? undefined : 3}>
          {meetingType.description}
        </Text>
      )}
    </>
  );

  if (!forOwner) {
    return (
      <Card component={Link} to={path} withBorder radius="md" padding="lg" td="none">
        {about}
      </Card>
    );
  }
  return (
    <Card component="article" withBorder radius="md" padding="lg">
      {about}
      <Text size="sm" mt="sm">
        Ссылка для гостей:{' '}
        <Anchor component={Link} to={path}>
          {path}
        </Anchor>
      </Text>
    </Card>
  );
}

export default MeetingTypeCard;
