'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function MarqueeBanner() {
  const [text, setText] = useState('');

  useEffect(() => {
    api.get('/public/config/public').then((res) => {
      setText(res.data.data?.marqueeWarningText || '');
    }).catch(() => {});
  }, []);

  if (!text) return null;

  return (
    <div className="bg-signal-red text-white py-2 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap text-sm font-medium">
        {text}
      </div>
    </div>
  );
}
