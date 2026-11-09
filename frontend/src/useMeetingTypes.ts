import { useCallback, useEffect, useState } from 'react';

import { listMeetingTypes, type MeetingType } from './generated/index.ts';

export type MeetingTypes =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; meetingTypes: MeetingType[] };

/**
 * Loads the meeting types when the page opens. `reload` asks the server again, and the current
 * list stays on the page until the new one arrives.
 */
export function useMeetingTypes(): [MeetingTypes, () => void] {
  const [meetingTypes, setMeetingTypes] = useState<MeetingTypes>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    listMeetingTypes({ throwOnError: true }).then(
      ({ data }) => {
        if (!ignore) setMeetingTypes({ status: 'loaded', meetingTypes: data });
      },
      () => {
        if (!ignore) setMeetingTypes({ status: 'failed' });
      },
    );
    return () => {
      ignore = true;
    };
  }, [version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  return [meetingTypes, reload];
}
