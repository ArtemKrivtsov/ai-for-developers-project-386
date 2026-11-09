import { Anchor, Badge, Button, Grid, Loader, ScrollArea, Stack, Text, Title } from '@mantine/core';
import { type ReactNode, useId, useState } from 'react';
import { Link, useParams } from 'react-router';

import DayGrid from '../DayGrid.tsx';
import { formatDay, formatDuration, formatSlot, formatWindow } from '../format.ts';
import type { MeetingType, Slot, SlotDay } from '../generated/index.ts';
import { useMeetingType } from '../useMeetingType.ts';
import { type Slots, useSlots } from '../useSlots.ts';

const moscowTimeNote = 'время московское (UTC+3)';

function MeetingTypePage() {
  const { meetingTypeId = '' } = useParams();
  // Another meeting type starts the page over: nothing loaded or chosen carries over.
  return <MeetingTypeView key={meetingTypeId} meetingTypeId={meetingTypeId} />;
}

function MeetingTypeView({ meetingTypeId }: { meetingTypeId: string }) {
  const meetingType = useMeetingType(meetingTypeId);
  const slots = useSlots(meetingTypeId);

  switch (meetingType.status) {
    case 'loading':
      return <Loader role="status" aria-label="Загрузка" />;
    case 'failed':
      return <Text c="red">Не удалось загрузить тип встречи. Обновите страницу.</Text>;
    case 'notFound':
      return <MeetingTypeNotFound />;
    case 'loaded':
      return <Booking meetingType={meetingType.meetingType} slots={slots} />;
  }
}

function MeetingTypeNotFound() {
  return (
    <Stack align="flex-start" gap="md">
      <Title order={1}>Тип встречи не найден</Title>
      <Anchor component={Link} to="/book">
        К списку типов встреч
      </Anchor>
    </Stack>
  );
}

/** Three columns: the meeting and the choice, the days of the window and the slots of a day. */
function Booking({ meetingType, slots }: { meetingType: MeetingType; slots: Slots }) {
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [chosenStart, setChosenStart] = useState<string | null>(null);

  const days = slots.status === 'loaded' ? slots.days : [];
  // The chosen day while it has slots, otherwise the first day that has some.
  const day =
    days.find(({ date, slots }) => date === chosenDate && slots.length > 0) ??
    days.find(({ slots }) => slots.length > 0);
  const slot = day?.slots.find(({ start }) => start === chosenStart);

  return (
    <Stack gap="lg">
      <Title order={1}>{meetingType.name}</Title>
      <Grid gap="xl">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Summary meetingType={meetingType} day={day} slot={slot} />
        </Grid.Col>
        {slots.status === 'loading' && (
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Loader role="status" aria-label="Загрузка" />
          </Grid.Col>
        )}
        {slots.status === 'failed' && (
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Text c="red">Не удалось загрузить свободное время. Обновите страницу.</Text>
          </Grid.Col>
        )}
        {slots.status === 'loaded' && (
          <>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <DayColumn
                days={days}
                chosen={day?.date}
                onChoose={(date) => {
                  setChosenDate(date);
                  setChosenStart(null);
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              {day && (
                <TimeColumn
                  day={day}
                  chosen={slot}
                  onChoose={({ start }) => {
                    setChosenDate(day.date);
                    setChosenStart(start);
                  }}
                />
              )}
            </Grid.Col>
          </>
        )}
      </Grid>
    </Stack>
  );
}

type SummaryProps = { meetingType: MeetingType; day?: SlotDay; slot?: Slot };

/** The left column: what the meeting is and what the guest has chosen so far. */
function Summary({ meetingType, day, slot }: SummaryProps) {
  return (
    <Stack component="section" aria-label="Встреча" gap="md" align="flex-start">
      <Badge variant="light">{formatDuration(meetingType.durationMinutes)}</Badge>
      {meetingType.description && <Text>{meetingType.description}</Text>}
      <div>
        <Text size="sm" c="dimmed">
          Дата
        </Text>
        <Text fw={500}>{day ? formatDay(day.date) : 'Не выбрана'}</Text>
      </div>
      <div>
        <Text size="sm" c="dimmed">
          Время
        </Text>
        <Text fw={500}>{slot ? formatSlot(slot) : 'Не выбрано'}</Text>
        <Text size="xs" c="dimmed">
          {moscowTimeNote}
        </Text>
      </div>
    </Stack>
  );
}

type DayColumnProps = { days: SlotDay[]; chosen?: string; onChoose: (date: string) => void };

/** The middle column: the days of the booking window. */
function DayColumn({ days, chosen, onChoose }: DayColumnProps) {
  return (
    <Column title="День">
      {days.length > 0 && (
        <Text size="sm" c="dimmed">
          {formatWindow(days[0].date, days[days.length - 1].date)}
        </Text>
      )}
      {days.some(({ slots }) => slots.length > 0) ? (
        <>
          <DayGrid days={days} chosen={chosen} onChoose={onChoose} />
          <Text size="xs" c="dimmed">
            Серые дни недоступны: выходные или всё занято.
          </Text>
        </>
      ) : (
        <Text>В ближайшие 14 дней свободного времени нет.</Text>
      )}
    </Column>
  );
}

type TimeColumnProps = { day: SlotDay; chosen?: Slot; onChoose: (slot: Slot) => void };

/** The right column: the slots of the chosen day. */
function TimeColumn({ day, chosen, onChoose }: TimeColumnProps) {
  return (
    <Column title="Время">
      <div>
        <Text fw={500}>{formatDay(day.date)}</Text>
        <Text size="xs" c="dimmed">
          {moscowTimeNote}
        </Text>
      </div>
      <ScrollArea.Autosize mah={360} type="auto" offsetScrollbars>
        <Stack gap="xs">
          {day.slots.map((slot) => {
            const isChosen = slot.start === chosen?.start;
            return (
              <Button
                key={slot.start}
                variant={isChosen ? 'filled' : 'default'}
                aria-pressed={isChosen}
                onClick={() => onChoose(slot)}
              >
                {formatSlot(slot)}
              </Button>
            );
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Column>
  );
}

/** A column with a heading that also names it for assistive technology. */
function Column({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <Stack component="section" aria-labelledby={headingId} gap="md">
      <Title order={2} size="h4" id={headingId}>
        {title}
      </Title>
      {children}
    </Stack>
  );
}

export default MeetingTypePage;
