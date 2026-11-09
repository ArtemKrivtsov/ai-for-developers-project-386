import { Badge, Container, Group, Title } from '@mantine/core';
import { useEffect, useState } from 'react';

import { getHealth } from './generated';

type ApiStatus = 'loading' | 'ok' | 'error';

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('loading');

  useEffect(() => {
    getHealth()
      .then(({ data }) => setApiStatus(data?.status === 'ok' ? 'ok' : 'error'))
      .catch(() => setApiStatus('error'));
  }, []);

  return (
    <Container py="xl">
      <Group justify="space-between">
        <Title order={1}>Calendar</Title>
        <Badge color={apiStatus === 'ok' ? 'green' : apiStatus === 'error' ? 'red' : 'gray'}>
          API: {apiStatus}
        </Badge>
      </Group>
    </Container>
  );
}

export default App;
