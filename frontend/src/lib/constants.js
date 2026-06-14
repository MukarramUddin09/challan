export const DIVISIONS = [
  'Charminar',
  'Secunderabad',
  'Khairatabad',
  'LB Nagar',
  'Serilingampally',
  'Kukatpally',
  'Malakpet',
  'Musheerabad',
  'Amberpet',
  'Nampally',
  'Rajendranagar'
];

export const VIOLATIONS = [
  { name: 'Residents Littering on Roads and Open Spaces', fine: 100 },
  { name: 'Throwing Litter into Drains', fine: 1000 },
  { name: 'Shop Owners Litter in front of shop', fine: 1000 },
  { name: 'Bulk Garbage Dumping on Roads', fine: 2000 },
  { name: 'Throwing litter around the bin', fine: 100 },
  { name: 'Open Urination', fine: 100 },
  { name: 'Wall writing', fine: 1000 },
  { name: 'Wall poster', fine: 2000 },
  { name: 'Un-authorized erection of Banners & Cut-outs', fine: 5000 },
  { name: 'Un-authorized / Dangerous Dumping construction & Demolition waste', fine: 25000 },
  { name: 'Lease / Misuse of Parking / Common Areas', fine: 50000 }
];

export const LEGAL_TEXT = 'Whereas it is found that without the written permission of Competent authority you have placed / deposited on the roads / footpaths / public places / open spaces material/goods/articles or have committed the violation as mentioned in the notice below and thereby violated the provisions of GHMC Act / Public Health Act and whereas you are liable to pay the fine amount as mentioned, you are hereby requested to pay the said fine immediately.';

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

export const toDateTimeLocalInput = (value = new Date()) => {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
};

export const indiaDateTimeLocalToIso = value => (
  value ? new Date(`${value}+05:30`).toISOString() : ''
);
