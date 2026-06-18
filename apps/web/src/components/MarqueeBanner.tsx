'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

const MARKET_INDICES = [
  { name: 'NIFTY 50', price: '24,856.30', change: '+1.12%', up: true },
  { name: 'SENSEX', price: '81,523.16', change: '+0.98%', up: true },
  { name: 'BANKNIFTY', price: '53,412.85', change: '+1.34%', up: true },
  { name: 'NIFTYMIDCAP', price: '62,123.35', change: '+0.52%', up: true },
  { name: 'FINNIFTY', price: '26,404.95', change: '-0.14%', up: false },
  { name: 'NIFTYAUTO', price: '28,190.40', change: '+0.78%', up: true },
  { name: 'NIFTYIT', price: '43,215.60', change: '-0.32%', up: false },
  { name: 'NIFTYPHARMA', price: '21,890.15', change: '+0.45%', up: true },
];

export default function MarqueeBanner() {
  const [warningText, setWarningText] = useState('');

  useEffect(() => {
    api.get('/public/config/public').then((res) => {
      setWarningText(res.data.data?.marqueeWarningText || '');
    }).catch(() => {});
  }, []);

  return (
    <>
      {/* Market index ticker — Groww style */}
      <div className="bg-white border-b border-gray-100 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap py-2.5">
          {[...MARKET_INDICES, ...MARKET_INDICES].map((idx, i) => (
            <span key={i} className="inline-flex items-center mx-6 text-sm">
              <span className="text-gray-400 font-medium">{idx.name}</span>
              <span className="text-text-heading font-semibold ml-2">{idx.price}</span>
              <span className={`ml-1.5 font-medium ${idx.up ? 'text-signal-green' : 'text-signal-red'}`}>
                {idx.up ? '↑' : '↓'} {idx.change}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Warning text — static short strip */}
      {warningText && (
        <div className="bg-signal-red text-white py-1.5 text-center">
          <p className="text-xs font-medium">{warningText}</p>
        </div>
      )}
    </>
  );
}
