import { Anchor, Badge, Button, Grid, ScrollArea, Stack, Text, Title } from '@mantine/core';
import { type ReactNode, useId, useState } from 'react';
import { Link, useParams } from 'react-router';

import DayGrid from '../DayGrid.tsx';
import {
  formatDay,
  formatDuration,
  formatMeetingTime,
  formatSlot,
  formatWindow,
  moscowTimeNote,
} from '../format.ts';
import type { Meeting, MeetingType, Slot, SlotDay } from '../generated/index.ts';
import GuestForm, { type Guest } from '../GuestForm.tsx';
import { type Loadable, useMeetingType, useSlotDays } from '../load.ts';
import Loaded from '../Loaded.tsx';

function MeetingTypePage() {
  const { meetingTypeId = '' } = useParams();
  // Another meeting type starts the page over: nothing loaded or chosen carries over.
  return <MeetingTypeView key={meetingTypeId} meetingTypeId={meetingTypeId} />;
}

function MeetingTypeView({ meetingTypeId }: { meetingTypeId: string }) {
  const meetingType = useMeetingType(meetingTypeId);
  const [slotDays, reloadSlots] = useSlotDays(meetingTypeId);
  // The server may stop knowing the meeting type after the page has loaded it.
  const [gone, setGone] = useState(false);

  if (gone) return <MeetingTypeNotFound />;
  return (
    <Loaded state={meetingType} failure="Не удалось загрузить тип встречи. Обновите страницу.">
      {(found) =>
        found ? (
          <MeetingTypeColumns
            meetingType={found}
            slotDays={slotDays}
            reloadSlots={reloadSlots}
            onNotFound={() => setGone(true)}
          />
        ) : (
          <MeetingTypeNotFound />
        )
      }
    </Loaded>
  );
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

type MeetingTypeColumnsProps = {
  meetingType: MeetingType;
  slotDays: Loadable<SlotDay[]>;
  reloadSlots: () => void;
  onNotFound: () => void;
};

/**
 * Three columns: the meeting and the choice, the days of the window and the slots of a day.
 * A chosen slot puts the guest form in place of the slots, and a created meeting puts
 * the confirmation in place of the days and the slots. A slot the server refuses as no longer
 * free brings back fresh slots with a notice above them.
 */
function MeetingTypeColumns({
  meetingType,
  slotDays,
  reloadSlots,
  onNotFound,
}: MeetingTypeColumnsProps) {
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [chosenStart, setChosenStart] = useState<string | null>(null);
  const [guest, setGuest] = useState<Guest>({ name: '', email: '' });
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  /** Why the guest is choosing the time again, until they choose something. */
  const [notice, setNotice] = useState<string | null>(null);

  const days = slotDays.status === 'loaded' ? slotDays.data : [];
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
        {meeting && (
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Confirmation meeting={meeting} />
          </Grid.Col>
        )}
        {!meeting && slotDays.status !== 'loaded' && (
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Loaded
              state={slotDays}
              failure="Не удалось загрузить свободное время. Обновите страницу."
            />
          </Grid.Col>
        )}
        {!meeting && slotDays.status === 'loaded' && (
          <>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <DayColumn
                days={days}
                chosen={day?.date}
                onChoose={(date) => {
                  setChosenDate(date);
                  setChosenStart(null);
                  setNotice(null);
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              {slot ? (
                <Column title="Ваши данные">
                  <GuestForm
                    meetingTypeId={meetingType.id}
                    start={slot.start}
                    guest={guest}
                    onGuestChange={setGuest}
                    onCreated={setMeeting}
                    onNotFound={onNotFound}
                    onSlotGone={(text) => {
                      setChosenStart(null);
                      setNotice(text);
                      reloadSlots();
                    }}
                    onOtherTime={() => setChosenStart(null)}
                  />
                </Column>
              ) : (
                day && (
                  <TimeColumn
                    day={day}
                    notice={notice}
                    onChoose={({ start }) => {
                      setChosenDate(day.date);
                      setChosenStart(start);
                      setNotice(null);
                    }}
                  />
                )
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

type TimeColumnProps = { day: SlotDay; notice: string | null; onChoose: (slot: Slot) => void };

/** The right column until a slot is chosen: the slots of the chosen day. */
function TimeColumn({ day, notice, onChoose }: TimeColumnProps) {
  return (
    <Column title="Время">
      <div>
        <Text fw={500}>{formatDay(day.date)}</Text>
        <Text size="xs" c="dimmed">
          {moscowTimeNote}
        </Text>
      </div>
      {notice && (
        <Text c="red" size="sm">
          {notice}
        </Text>
      )}
      <ScrollArea.Autosize mah={360} type="auto" offsetScrollbars>
        <Stack gap="xs">
          {day.slots.map((slot) => (
            <Button key={slot.start} variant="default" onClick={() => onChoose(slot)}>
              {formatSlot(slot)}
            </Button>
          ))}
        </Stack>
      </ScrollArea.Autosize>
    </Column>
  );
}

/** Takes the place of the days and the slots once the meeting is created. */
function Confirmation({ meeting }: { meeting: Meeting }) {
  return (
    <Column title="Вы записаны">
      <Text fw={500}>{meeting.meetingType.name}</Text>
      <div>
        <Text>{formatMeetingTime(meeting)}</Text>
        <Text size="xs" c="dimmed">
          {moscowTimeNote}
        </Text>
      </div>
      <Text>{`${meeting.guestName}, ${meeting.guestEmail}`}</Text>
      <Anchor component={Link} to="/book">
        Записаться ещё
      </Anchor>
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
