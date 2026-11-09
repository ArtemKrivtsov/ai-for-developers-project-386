import { Anchor, AppShell, Container, Group } from '@mantine/core';
import { Link, Outlet } from 'react-router';

function Layout() {
  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Container h="100%">
          <Group h="100%" justify="space-between">
            <Anchor component={Link} to="/" c="inherit" fw={700} size="lg" underline="never">
              Календарь звонков
            </Anchor>
            <Anchor component={Link} to="/book">
              Записаться
            </Anchor>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container py="xl">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default Layout;
