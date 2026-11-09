import { Stack, Text, Title } from '@mantine/core';

function CatalogPage() {
  return (
    <Stack gap="md">
      <Title order={1}>Выберите тип встречи</Title>
      <Text c="dimmed">Скоро здесь можно будет записаться.</Text>
    </Stack>
  );
}

export default CatalogPage;
