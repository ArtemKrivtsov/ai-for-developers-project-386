import { Button, Table } from '@mantine/core';

import { formatDay, formatDayOfMonth, weekdayColumn } from './format.ts';
import type { SlotDay } from './generated/index.ts';

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

type Props = { days: SlotDay[]; chosen?: string; onChoose: (date: string) => void };

/**
 * The days of the booking window in weeks from Monday to Sunday. Cells before the first day and
 * after the last one stay empty. A day without slots is gray and cannot be chosen.
 */
function DayGrid({ days, chosen, onChoose }: Props) {
  return (
    <Table layout="fixed" withRowBorders={false} verticalSpacing={2} horizontalSpacing={2}>
      <Table.Thead>
        <Table.Tr>
          {weekdays.map((weekday) => (
            <Table.Th key={weekday} ta="center" c="dimmed" fw={500} fz="sm">
              {weekday}
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {weeksOf(days).map((week, index) => (
          // Weeks have no identity of their own, and the grid never reorders them.
          <Table.Tr key={index}>
            {week.map((day, column) => (
              <Table.Td key={day?.date ?? `empty-${column}`}>
                {day && (
                  <Button
                    fullWidth
                    px={0}
                    variant={day.date === chosen ? 'filled' : 'default'}
                    disabled={day.slots.length === 0}
                    aria-pressed={day.date === chosen}
                    aria-label={formatDay(day.date)}
                    onClick={() => onChoose(day.date)}
                  >
                    {formatDayOfMonth(day.date)}
                  </Button>
                )}
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

/** Splits the days into rows of seven from Monday, with empty cells around them. */
function weeksOf(days: SlotDay[]): (SlotDay | undefined)[][] {
  const cells: (SlotDay | undefined)[] = [
    ...Array.from({ length: days.length > 0 ? weekdayColumn(days[0].date) : 0 }, () => undefined),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(undefined);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

export default DayGrid;
