import { Loader, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import type { Loadable } from './load.ts';

type Props<T> = {
  state: Loadable<T>;
  /** What the page says when the data does not load. */
  failure: string;
  /** What the page shows once the data has loaded. */
  children?: (data: T) => ReactNode;
};

/** A loading indicator until the data arrives, then the data or the load error. */
function Loaded<T>({ state, failure, children }: Props<T>) {
  switch (state.status) {
    case 'loading':
      return <Loader role="status" aria-label="Загрузка" />;
    case 'failed':
      return <Text c="red">{failure}</Text>;
    case 'loaded':
      return children?.(state.data);
  }
}

export default Loaded;
