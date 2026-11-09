import { Anchor, AppShell, Button, Container, Group } from '@mantine/core';
import { Link, Outlet } from 'react-router';

/** The header and the page. `onOwnerPages` highlights «Владельцу» in the header. */
function Layout({ onOwnerPages = false }: { onOwnerPages?: boolean }) {
  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Container h="100%">
          <Group h="100%" justify="space-between">
            <Anchor component={Link} to="/" c="inherit" fw={700} size="lg" underline="never">
              Календарь звонков
            </Anchor>
            <Group gap="xs">
              <Button component={Link} to="/book" variant="subtle">
                Записаться
              </Button>
              <Button
                component={Link}
                to="/owner"
                variant={onOwnerPages ? 'light' : 'subtle'}
                aria-current={onOwnerPages ? 'page' : undefined}
              >
                Владельцу
              </Button>
            </Group>
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
