import { Box, Flex, NavLink, Text } from '@mantine/core';
import { Link, Outlet, useMatch } from 'react-router';

/** The frame of the owner pages: a side panel of links, a row of links on a narrow screen. */
function OwnerLayout() {
  return (
    <Flex direction={{ base: 'column', sm: 'row' }} gap="xl">
      <Box component="nav" aria-label="Владелец" w={{ sm: 220 }} style={{ flexShrink: 0 }}>
        <Text size="sm" fw={700} c="dimmed" mb="xs" visibleFrom="sm">
          Владелец
        </Text>
        <Flex direction={{ base: 'row', sm: 'column' }} gap={4}>
          <OwnerLink to="/owner/types" label="Типы встреч" />
        </Flex>
      </Box>
      <Box flex={1} miw={0}>
        <Outlet />
      </Box>
    </Flex>
  );
}

function OwnerLink({ to, label }: { to: string; label: string }) {
  const active = useMatch(to) !== null;
  return (
    <NavLink
      component={Link}
      to={to}
      label={label}
      active={active}
      aria-current={active ? 'page' : undefined}
      w={{ base: 'auto', sm: '100%' }}
    />
  );
}

export default OwnerLayout;
