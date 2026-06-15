const { formatDate, formatDateTime } = require('./dateTime');

function generateReportHtml(challans, startDate, endDate) {
  const title = 'Violations Report';
  const period = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  const fs = require('fs');
  const path = require('path');
  let embeddedLogo = null;
  try {
    const logoPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'assets', 'Screenshot 2026-06-08 001858.png');
    if (fs.existsSync(logoPath)) {
      const b = fs.readFileSync(logoPath);
      embeddedLogo = `data:image/png;base64,${b.toString('base64')}`;
    }
  } catch (e) {}

  const rows = challans.map((c, i) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">${i + 1}</td>
      <td style="padding:8px;border:1px solid #ddd">${c.noticeNumber}</td>
      <td style="padding:8px;border:1px solid #ddd">${c.division}</td>
      <td style="padding:8px;border:1px solid #ddd">${c.wardNumber || ''}</td>
      <td style="padding:8px;border:1px solid #ddd">${c.location || ''}</td>
      <td style="padding:8px;border:1px solid #ddd">${c.violatorName || ''}<br>${c.violatorPhone || ''}<br>${formatDateTime(c.dateTime)}</td>
      <td style="padding:8px;border:1px solid #ddd">${Array.isArray(c.violationType) ? c.violationType.join(', ') : c.violationType}</td>
      <td style="padding:8px;border:1px solid #ddd">${c.type === 'Challan' ? `₹${(c.fineAmount || 0).toLocaleString('en-IN')}` : ''}</td>
    </tr>
  `).join('');

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #222; }
      .header { text-align: center; margin-bottom: 20px; }
      .period { color: #555; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #f3f4f6; padding: 8px; border:1px solid #ddd; text-align:left }
    </style>
  </head>
  <body>
    <div class="header">
      ${embeddedLogo ? `<img src="${embeddedLogo}" style="height:56px; margin-bottom:8px;" />` : ''}
      <h1>${title}</h1>
      <p class="period">Report period: ${period}</p>
      <p class="period">Generated on: ${formatDateTime(new Date())}</p>
    </div>

    <p>This report lists all violations encountered during the selected period. It includes notice numbers, division, ward, location, violator name and phone, violation types, fines and occurrence date/time.</p>

    <table>
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #ddd">#</th>
          <th style="padding:8px;border:1px solid #ddd">Notice No.</th>
          <th style="padding:8px;border:1px solid #ddd">Division</th>
          <th style="padding:8px;border:1px solid #ddd">Ward</th>
          <th style="padding:8px;border:1px solid #ddd">Location</th>
          <th style="padding:8px;border:1px solid #ddd">Violator / Phone / Date-Time</th>
          <th style="padding:8px;border:1px solid #ddd">Violations</th>
          <th style="padding:8px;border:1px solid #ddd">Fine</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

  </body>
  </html>
  `;

  return html;
}

module.exports = { generateReportHtml };
