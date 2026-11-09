import { Anchor, Stack, Title } from '@mantine/core';
import { Link } from 'react-router';

function NotFoundPage() {
  return (
    <Stack align="flex-start" gap="md">
      <Title order={1}>Страница не найдена</Title>
      <Anchor component={Link} to="/">
        На главную
      </Anchor>
    </Stack>
  );
}

export default NotFoundPage;
