import { SimpleGrid, Stack, Text, Title } from '@mantine/core';

import { useMeetingTypes } from '../load.ts';
import Loaded from '../Loaded.tsx';
import MeetingTypeCard from '../MeetingTypeCard.tsx';

function CatalogPage() {
  const [catalog] = useMeetingTypes();

  return (
    <Stack gap="md">
      <Title order={1}>Выберите тип встречи</Title>
      <Text c="dimmed">Нажмите на карточку, чтобы выбрать день и время.</Text>
      <Loaded state={catalog} failure="Не удалось загрузить типы встреч. Обновите страницу.">
        {(meetingTypes) =>
          meetingTypes.length === 0 ? (
            <Text>Владелец ещё не завёл ни одного типа встречи.</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {meetingTypes.map((meetingType) => (
                <MeetingTypeCard key={meetingType.id} meetingType={meetingType} />
              ))}
            </SimpleGrid>
          )
        }
      </Loaded>
    </Stack>
  );
}

export default CatalogPage;
