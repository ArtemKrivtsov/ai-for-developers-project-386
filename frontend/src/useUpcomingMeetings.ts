import { useEffect, useState } from 'react';

import { listUpcomingMeetings, type Meeting } from './generated/index.ts';

export type UpcomingMeetings =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; meetings: Meeting[] };

/** Loads the upcoming meetings of every meeting type when the page opens, nearest first. */
export function useUpcomingMeetings(): UpcomingMeetings {
  const [meetings, setMeetings] = useState<UpcomingMeetings>({ status: 'loading' });

  useEffect(() => {
    let ignore = false;
    listUpcomingMeetings({ throwOnError: true }).then(
      ({ data }) => {
        if (!ignore) setMeetings({ status: 'loaded', meetings: data });
      },
      () => {
        if (!ignore) setMeetings({ status: 'failed' });
      },
    );
    return () => {
      ignore = true;
    };
  }, []);

  return meetings;
}
