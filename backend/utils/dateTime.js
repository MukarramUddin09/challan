const TIME_ZONE = 'Asia/Kolkata';

const formatDate = (value) => new Intl.DateTimeFormat('en-IN', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}).format(new Date(value));

const formatTime = (value) => new Intl.DateTimeFormat('en-IN', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true
}).format(new Date(value));

const formatDateTime = (value) => `${formatDate(value)}, ${formatTime(value)}`;

const getIndiaDateRange = (startDate, endDate) => ({
  start: new Date(`${startDate}T00:00:00.000+05:30`),
  end: new Date(`${endDate}T23:59:59.999+05:30`)
});

const getIndiaTodayRange = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const get = type => parts.find(part => part.type === type)?.value;
  const today = `${get('year')}-${get('month')}-${get('day')}`;
  return getIndiaDateRange(today, today);
};

module.exports = {
  TIME_ZONE,
  formatDate,
  formatTime,
  formatDateTime,
  getIndiaDateRange,
  getIndiaTodayRange
};
