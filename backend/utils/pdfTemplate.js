/**
 * Generate the HTML template for GHMC Challan PDF
 * Two identical copies side by side on A4 landscape
 * @param {Object} challan - Challan document
 * @param {string|null} photoBase64 - Base64 data URI of the photo, or null
 * @returns {string} Complete HTML document for PDF rendering
 */
const fs = require('fs');
const path = require('path');

const assetDirectory = path.join(__dirname, '..', '..', 'frontend', 'src', 'assets');

const embedImage = (filename, mimeType) => {
  try {
    const imagePath = path.join(assetDirectory, filename);
    if (fs.existsSync(imagePath)) {
      return `data:${mimeType};base64,${fs.readFileSync(imagePath).toString('base64')}`;
    }
  } catch (e) {
    // The PDF can still be generated without optional header images.
  }
  return null;
};

const embeddedHeadingData = embedImage('GHMC Heading.jpeg', 'image/jpeg');

const generatePdfHtml = (challan, photoBase64) => {
  const dateStr = new Date(challan.dateTime).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const timeStr = new Date(challan.dateTime).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
  const issuedAt = new Date(challan.createdAt).toLocaleString('en-IN');

  // Determine document type label
  const docType = challan.type || 'Challan';
  const titleText = docType === 'Fine' ? 'FINE NOTICE' : 'CHALLAN NOTICE';

  const violationRows = challan.violationType.map((v, i) => `
    <tr>
      <td style="border:1px solid #333; padding:2px 4px; font-size:9px;">${i + 1}</td>
      <td style="border:1px solid #333; padding:2px 4px; font-size:9px;">${v}</td>
    </tr>
  `).join('');

  const photoSection = photoBase64 ? `
    <div style="height:82px; margin:4px 0; text-align:center;">
      <p style="font-size:8px; font-weight:bold; margin:0 0 2px;">PHOTO EVIDENCE:</p>
      <img src="${photoBase64}" style="display:block; width:100%; height:38vh; margin:0 auto; border:1px solid #333; object-fit:contain;" />
    </div>
  ` : '';

  const singleCopy = `
    <div style="width:48%; height:190mm; overflow:hidden; border:2px solid #000; padding:7px; font-family:'Times New Roman', Times, serif; box-sizing:border-box; font-size:10px; display:flex; flex-direction:column; break-inside:avoid;">
      <!-- Header -->
      <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:4px; margin-bottom:4px;">
        ${embeddedHeadingData
          ? `<img src="${embeddedHeadingData}" alt="Greater Hyderabad Municipal Corporation" style="display:block; width:100%; height:38px; margin:0 auto; object-fit:contain;" />`
          : `<h1 style="margin:0; font-size:14px; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">Greater Hyderabad Municipal Corporation</h1>`}
        <p style="margin:1px 0 0; font-size:7px;">
          (Under Section 402, 421 and with 674, 596, 487 of GHMC Act 1955)
        </p>
      </div>

      <!-- Title -->
      <h2 style="text-align:center; font-size:14px; margin:2px 0 4px; text-decoration:underline; letter-spacing:2px;">
        ${titleText}
      </h2>

      <!-- Date & Notice No -->
      <div style="display:flex; justify-content:space-between; margin-bottom:3px; flex-wrap:wrap; gap:2px;">
        <span style="font-size:10px;"><strong>Notice No:</strong> ${challan.noticeNumber}</span>
        <span style="font-size:10px;"><strong>Date:</strong> ${dateStr}</span>
        <span style="font-size:10px;"><strong>Type:</strong> ${docType}</span>
      </div>

      <!-- Division -->
      <p style="font-size:10px; margin:2px 0;"><strong>Division:</strong> ${challan.division}</p>
      ${challan.divisionCode ? `<p style="font-size:10px; margin:2px 0;"><strong>Circle:</strong> ${challan.divisionCode}</p>` : ''}
      ${challan.wardNumber || challan.wardName ? `<p style="font-size:10px; margin:2px 0;"><strong>Ward:</strong> ${challan.wardNumber ? `Ward ${challan.wardNumber}` : ''}${challan.wardName ? ` - ${challan.wardName}` : ''}</p>` : ''}
      <p style="font-size:10px; margin:2px 0;"><strong>Location:</strong> ${challan.location}</p>
      <div style="border:1px solid #333; padding:4px; margin:4px 0;">
        <p style="font-size:10px; margin:0 0 3px;"><strong>Violator Name:</strong> ${challan.violatorName || ''}</p>
        <p style="font-size:10px; margin:0;"><strong>Violator Phone:</strong> ${challan.violatorPhone || ''}</p>
      </div>

      <!-- Legal Paragraph -->
      <div style="border:1px solid #666; padding:4px; margin:4px 0; background:#fafafa;">
        <p style="font-size:8px; line-height:1.2; margin:0; text-align:justify;">
          ${challan.legalText}
        </p>
      </div>

      <!-- Violation Table -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:3px;">
        <thead>
          <tr>
            <th style="border:1px solid #333; padding:2px 4px; font-size:9px; background:#eee; width:25px; text-align:left;">#</th>
            <th style="border:1px solid #333; padding:2px 4px; font-size:9px; background:#eee; text-align:left;">Type of Violation</th>
          </tr>
        </thead>
        <tbody>
          ${violationRows}
        </tbody>
      </table>

      <!-- Fine Amount -->
      <div style="text-align:center; border:2px solid #000; padding:6px; margin:6px 0; background:#f0f0f0;">
        <strong style="font-size:13px;">Fine Amount: ₹${challan.fineAmount.toLocaleString('en-IN')}</strong>
      </div>

      <!-- Photo Evidence -->
      ${photoSection}

      <!-- Officer Details -->
      <div style="margin-top:auto;">
        <p style="font-size:10px; margin:4px 0;"><strong>Name &amp; Designation of Enforcement Officer:</strong></p>
        <p style="font-size:10px; margin:2px 0;">${challan.officerName} — ${challan.officerDesignation}</p>
        <p style="font-size:8px; color:#666; margin:4px 0;">Issued at: ${issuedAt}</p>

        <div style="display:flex; justify-content:space-between; margin-top:6px;">
          <div>
            <p style="font-size:10px; margin:0;"><strong>To:</strong> ${challan.violatorName}</p>
            <p style="font-size:10px; margin:2px 0 0;"><strong>Phone:</strong> ${challan.violatorPhone || ''}</p>
          </div>
          <div style="text-align:right;">
            <p style="font-size:10px; margin:0;">for Commissioner GHMC</p>
            <div style="margin-top:10px; border-top:1px solid #333; width:105px; margin-left:auto;"></div>
            <p style="font-size:8px; margin:2px 0;">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; }
        html, body { width:277mm; height:190mm; margin:0; padding:0; overflow:hidden; }
        tr { break-inside:avoid; }
      </style>
    </head>
    <body>
      <div style="display:flex; justify-content:space-between; align-items:stretch; width:277mm; height:190mm; gap:6px; overflow:hidden;">
        ${singleCopy}

        <!-- Dotted Cut Line -->
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:3%; font-size:10px; color:#666;">
          <span>✂</span>
          <div style="border-left:2px dashed #999; height:80%; margin:4px 0;"></div>
          <span style="writing-mode:vertical-rl; font-size:7px; letter-spacing:2px; margin:4px 0;">OFFICE COPY</span>
          <div style="border-left:2px dashed #999; height:80%; margin:4px 0;"></div>
          <span>✂</span>
        </div>

        ${singleCopy}
      </div>
    </body>
    </html>
  `;
};

module.exports = { generatePdfHtml };
