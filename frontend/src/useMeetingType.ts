import { useEffect, useState } from 'react';

import { getMeetingType, type MeetingType } from './generated/index.ts';

export type MeetingTypeState =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'failed' }
  | { status: 'loaded'; meetingType: MeetingType };

/** Loads the meeting type when the page opens. */
export function useMeetingType(meetingTypeId: string): MeetingTypeState {
  const [state, setState] = useState<MeetingTypeState>({ status: 'loading' });

  useEffect(() => {
    let ignore = false;
    void getMeetingType({ path: { meetingTypeId } }).then(({ data, response }) => {
      if (ignore) return;
      if (data) setState({ status: 'loaded', meetingType: data });
      // An id that is not a UUID gets 400: no meeting type has it either.
      else if (response?.status === 404 || response?.status === 400) {
        setState({ status: 'notFound' });
      } else setState({ status: 'failed' });
    });
    return () => {
      ignore = true;
    };
  }, [meetingTypeId]);

  return state;
}
