import { Button, List, Paper, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

function HomePage() {
  return (
    <Stack gap="xl">
      <Stack align="flex-start" gap="md">
        <Title order={1}>Календарь звонков</Title>
        <Text size="lg" c="dimmed">
          Выберите тип встречи и удобное время, регистрация не нужна.
        </Text>
        <Button component={Link} to="/book" size="md">
          Записаться
        </Button>
      </Stack>
      <Paper withBorder p="lg" radius="md">
        <Title order={2} size="h3" mb="sm">
          Как это работает
        </Title>
        <List type="ordered" spacing="xs">
          <List.Item>Выберите тип встречи.</List.Item>
          <List.Item>Выберите свободный слот в ближайшие 14 дней.</List.Item>
          <List.Item>Оставьте имя и email.</List.Item>
        </List>
      </Paper>
    </Stack>
  );
}

export default HomePage;
