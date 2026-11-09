import { useEffect, useState } from 'react';

import { listSlots, type SlotDay } from './generated/index.ts';

export type Slots =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; days: SlotDay[] };

/** Loads the slots of the meeting type for the 14 days of the booking window. */
export function useSlots(meetingTypeId: string): Slots {
  const [slots, setSlots] = useState<Slots>({ status: 'loading' });

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
  }, [meetingTypeId]);

  return slots;
}
