'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export interface IntervalOption {
  key: string;
  label: string;
}

const DEFAULT_INTERVALS: IntervalOption[] = [
  { key: 'DAILY', label: 'Daily' },
  { key: 'WEEKLY', label: 'Weekly' },
  { key: 'MONTHLY', label: 'Monthly' },
];

let cachedIntervals: IntervalOption[] | null = null;

export function useIntervals() {
  const [intervals, setIntervals] = useState<IntervalOption[]>(cachedIntervals || DEFAULT_INTERVALS);

  useEffect(() => {
    if (cachedIntervals) return;
    api.get('/config/public/public')
      .then((res) => {
        const data = res.data.data?.signalIntervals;
        if (data && data.length > 0) {
          cachedIntervals = data;
          setIntervals(data);
        }
      })
      .catch(() => {
        // Try alternate path
        api.get('/public/config/public')
          .then((res) => {
            const data = res.data.data?.signalIntervals;
            if (data && data.length > 0) {
              cachedIntervals = data;
              setIntervals(data);
            }
          })
          .catch(() => {});
      });
  }, []);

  // Build a label map from the intervals array
  const intervalLabels: Record<string, string> = {};
  intervals.forEach((i) => { intervalLabels[i.key] = i.label; });

  return { intervals, intervalLabels };
}
