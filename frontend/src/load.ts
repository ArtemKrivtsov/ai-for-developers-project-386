import { useCallback, useEffect, useState } from 'react';

import {
  getMeetingType,
  listMeetingTypes,
  listSlots,
  listUpcomingMeetings,
} from './generated/index.ts';

/** What a page asks the server for when it opens. */
export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; data: T };

/**
 * Calls `load` when the page opens and again on `reload`. The data loaded before stays on the page
 * until the new data arrives. A new `load` function loads again, so it must keep its identity
 * between renders.
 */
function useLoad<T>(load: () => Promise<T>): [Loadable<T>, () => void] {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    load().then(
      (data) => {
        if (!ignore) setState({ status: 'loaded', data });
      },
      () => {
        if (!ignore) setState({ status: 'failed' });
      },
    );
    return () => {
      ignore = true;
    };
  }, [load, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  return [state, reload];
}

const loadMeetingTypes = () => listMeetingTypes({ throwOnError: true }).then(({ data }) => data);

/** The meeting types in creation order. */
export function useMeetingTypes() {
  return useLoad(loadMeetingTypes);
}

const loadUpcomingMeetings = () =>
  listUpcomingMeetings({ throwOnError: true }).then(({ data }) => data);

/** The upcoming meetings of every meeting type, nearest first. */
export function useUpcomingMeetings() {
  return useLoad(loadUpcomingMeetings)[0];
}

/** The meeting type, or `null` when the server has none with this id. */
export function useMeetingType(meetingTypeId: string) {
  const load = useCallback(async () => {
    const { data, response } = await getMeetingType({ path: { meetingTypeId } });
    if (data) return data;
    // An id that is not a UUID gets 400: no meeting type has it either.
    if (response?.status === 404 || response?.status === 400) return null;
    throw new Error('The meeting type did not load');
  }, [meetingTypeId]);
  return useLoad(load)[0];
}

/** The slots of the meeting type for each of the 14 days of the booking window. */
export function useSlotDays(meetingTypeId: string) {
  const load = useCallback(
    () => listSlots({ path: { meetingTypeId }, throwOnError: true }).then(({ data }) => data),
    [meetingTypeId],
  );
  return useLoad(load);
}
