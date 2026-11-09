import { useCallback, useEffect, useState } from 'react';

import { listSlots, type SlotDay } from './generated/index.ts';

export type Slots =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; days: SlotDay[] };

/**
 * Loads the slots of the meeting type for the 14 days of the booking window. `reload` asks
 * the server again, and the current days stay on the page until the new ones arrive.
 */
export function useSlots(meetingTypeId: string): [Slots, () => void] {
  const [slots, setSlots] = useState<Slots>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    listSlots({ path: { meetingTypeId }, throwOnError: true }).then(
      ({ data }) => {
        if (!ignore) setSlots({ status: 'loaded', days: data });
      },
      () => {
        if (!ignore) setSlots({ status: 'failed' });
      },
    );
    return () => {
      ignore = true;
    };
  }, [meetingTypeId, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  return [slots, reload];
}
