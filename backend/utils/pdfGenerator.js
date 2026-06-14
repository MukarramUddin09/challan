const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { formatDate, formatDateTime } = require('./dateTime');

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const PAGE_MARGIN = 28.35;
const headingPath = path.join(
  __dirname, '..', '..', 'frontend', 'src', 'assets', 'GHMC Heading.jpeg'
);

const textValue = (input) => input === null || input === undefined ? '' : String(input);

const dataUriToBuffer = (dataUri) => {
  if (!dataUri) return null;
  const match = String(dataUri).match(/^data:image\/(?:png|jpe?g);base64,(.+)$/i);
  return match ? Buffer.from(match[1], 'base64') : null;
};

const createPdfBuffer = (doc, draw) => new Promise((resolve, reject) => {
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  try {
    draw();
    doc.end();
  } catch (error) {
    reject(error);
  }
});

const drawText = (doc, text, x, y, width, options = {}) => {
  const {
    size = 7,
    bold = false,
    align = 'left',
    color = '#000000',
    lineGap = 0,
    height
  } = options;

  doc
    .font(bold ? 'Times-Bold' : 'Times-Roman')
    .fontSize(size)
    .fillColor(color)
    .text(textValue(text), x, y, {
      width,
      height,
      align,
      lineGap,
      ellipsis: Boolean(height)
    });
};

const drawField = (doc, label, fieldValue, x, y, width, size = 7.2) => {
  const labelWidth = Math.min(78, width * 0.34);
  drawText(doc, label, x, y, labelWidth, { size, bold: true });
  drawText(doc, fieldValue, x + labelWidth, y, width - labelWidth, { size });
};

const drawChallanCopy = (doc, challan, photoBuffer, x, y, width, height) => {
  const padding = 7;
  const innerX = x + padding;
  const innerWidth = width - (padding * 2);
  let cursorY = y + padding;

  doc.lineWidth(1.5).rect(x, y, width, height).stroke('#000000');

  if (fs.existsSync(headingPath)) {
    doc.image(headingPath, innerX, cursorY, {
      fit: [innerWidth, 40],
      align: 'center',
      valign: 'center'
    });
  } else {
    drawText(doc, 'GREATER HYDERABAD MUNICIPAL CORPORATION', innerX, cursorY + 12, innerWidth, {
      size: 10, bold: true, align: 'center'
    });
  }
  cursorY += 41;
  drawText(
    doc,
    '(Under Section 402, 421 and with 674, 596, 487 of GHMC Act 1955)',
    innerX,
    cursorY,
    innerWidth,
    { size: 5.8, align: 'center' }
  );
  cursorY += 9;
  doc.lineWidth(1.2).moveTo(x, cursorY).lineTo(x + width, cursorY).stroke('#000000');
  cursorY += 4;

  drawText(
    doc,
    challan.type === 'Fine' ? 'NOTICE' : 'CHALLAN',
    innerX,
    cursorY,
    innerWidth,
    { size: 11, bold: true, align: 'center' }
  );
  cursorY += 15;

  const dateText = formatDateTime(challan.dateTime);
  drawText(doc, `Notice No: ${textValue(challan.noticeNumber)}`, innerX, cursorY, innerWidth * 0.48, {
    size: 7, bold: true
  });
  drawText(doc, `Date & Time: ${dateText}`, innerX + innerWidth * 0.48, cursorY, innerWidth * 0.52, {
    size: 6.2, bold: true, align: 'right'
  });
  cursorY += 12;

  drawField(doc, 'Division:', challan.division, innerX, cursorY, innerWidth);
  cursorY += 10;
  if (challan.divisionCode) {
    drawField(doc, 'Circle:', challan.divisionCode, innerX, cursorY, innerWidth);
    cursorY += 10;
  }
  if (challan.wardNumber || challan.wardName) {
    const ward = `${challan.wardNumber ? `Ward ${challan.wardNumber}` : ''}${challan.wardName ? ` - ${challan.wardName}` : ''}`;
    drawField(doc, 'Ward:', ward, innerX, cursorY, innerWidth);
    cursorY += 10;
  }
  drawField(doc, 'Location:', challan.location, innerX, cursorY, innerWidth);
  cursorY += 13;

  doc.lineWidth(0.7).rect(innerX, cursorY, innerWidth, 27).stroke('#333333');
  drawField(doc, 'Violator Name:', challan.violatorName, innerX + 5, cursorY + 4, innerWidth - 10);
  drawField(doc, 'Violator Phone:', challan.violatorPhone, innerX + 5, cursorY + 15, innerWidth - 10);
  cursorY += 31;

  const legalHeight = 48;
  doc.fillColor('#fafafa').rect(innerX, cursorY, innerWidth, legalHeight).fill();
  doc.lineWidth(0.6).rect(innerX, cursorY, innerWidth, legalHeight).stroke('#666666');
  drawText(doc, challan.legalText, innerX + 5, cursorY + 4, innerWidth - 10, {
    size: 6.2, align: 'justify', lineGap: 0.4, height: legalHeight - 8
  });
  cursorY += legalHeight + 5;

  const rowHeight = 14;
  doc.fillColor('#eeeeee').rect(innerX, cursorY, innerWidth, rowHeight).fill();
  doc.lineWidth(0.6).rect(innerX, cursorY, innerWidth, rowHeight).stroke('#333333');
  doc.moveTo(innerX + 25, cursorY).lineTo(innerX + 25, cursorY + rowHeight).stroke('#333333');
  drawText(doc, '#', innerX + 4, cursorY + 3, 17, { size: 7, bold: true });
  drawText(doc, 'Type of Violation', innerX + 30, cursorY + 3, innerWidth - 35, { size: 7, bold: true });
  cursorY += rowHeight;

  const violations = Array.isArray(challan.violationType)
    ? challan.violationType
    : [challan.violationType].filter(Boolean);
  violations.slice(0, 4).forEach((violation, index) => {
    doc.rect(innerX, cursorY, innerWidth, rowHeight).stroke('#333333');
    doc.moveTo(innerX + 25, cursorY).lineTo(innerX + 25, cursorY + rowHeight).stroke('#333333');
    drawText(doc, index + 1, innerX + 4, cursorY + 3, 17, { size: 7 });
    drawText(doc, violation, innerX + 30, cursorY + 3, innerWidth - 35, {
      size: 7, height: rowHeight - 4
    });
    cursorY += rowHeight;
  });

  doc.fillColor('#f0f0f0').rect(innerX, cursorY + 4, innerWidth, 23).fill();
  doc.lineWidth(1.2).rect(innerX, cursorY + 4, innerWidth, 23).stroke('#000000');
  drawText(
    doc,
    `Fine Amount: Rs. ${Number(challan.fineAmount || 0).toLocaleString('en-IN')}`,
    innerX,
    cursorY + 10,
    innerWidth,
    { size: 9.5, bold: true, align: 'center' }
  );
  cursorY += 31;

  const footerHeight = challan.officerNote ? 86 : 67;
  const footerY = y + height - padding - footerHeight;
  const photoHeight = Math.max(42, footerY - cursorY - 15);
  if (photoBuffer) {
    drawText(doc, 'PHOTO EVIDENCE:', innerX, cursorY, innerWidth, {
      size: 6.8, bold: true, align: 'center'
    });
    cursorY += 10;
    doc.lineWidth(0.6).rect(innerX, cursorY, innerWidth, photoHeight).stroke('#333333');
    try {
      doc.image(photoBuffer, innerX + 2, cursorY + 2, {
        fit: [innerWidth - 4, photoHeight - 4],
        align: 'center',
        valign: 'center'
      });
    } catch (error) {
      drawText(doc, 'Photo could not be rendered', innerX, cursorY + 15, innerWidth, {
        size: 7, color: '#666666', align: 'center'
      });
    }
  }

  drawText(doc, 'Name & Designation of Enforcement Officer:', innerX, footerY, innerWidth, {
    size: 7, bold: true
  });
  drawText(
    doc,
    `${textValue(challan.officerName)} - ${textValue(challan.officerDesignation)}`,
    innerX,
    footerY + 11,
    innerWidth,
    { size: 7 }
  );
  const issuedAt = formatDateTime(challan.createdAt || challan.dateTime);
  drawText(doc, `Issued at: ${issuedAt}`, innerX, footerY + 22, innerWidth, {
    size: 5.8, color: '#666666'
  });
  let detailsY = footerY + 36;
  if (challan.officerNote) {
    drawText(doc, 'Officer Note:', innerX, detailsY, 62, { size: 6.5, bold: true });
    drawText(doc, challan.officerNote, innerX + 62, detailsY, innerWidth - 62, {
      size: 6.5, height: 16
    });
    detailsY += 19;
  }
  drawText(doc, `To: ${textValue(challan.violatorName)}`, innerX, detailsY, innerWidth * 0.55, {
    size: 7, bold: true
  });
  drawText(doc, `Phone: ${textValue(challan.violatorPhone)}`, innerX, detailsY + 11, innerWidth * 0.55, {
    size: 7, bold: true
  });
  drawText(doc, 'for Commissioner GHMC', innerX + innerWidth * 0.58, detailsY - 2, innerWidth * 0.42, {
    size: 7, align: 'right'
  });
  doc
    .lineWidth(0.6)
    .moveTo(innerX + innerWidth - 105, detailsY + 16)
    .lineTo(innerX + innerWidth, detailsY + 16)
    .stroke('#333333');
  drawText(doc, 'Authorized Signatory', innerX + innerWidth - 105, detailsY + 19, 105, {
    size: 5.8, align: 'right'
  });
};

const drawChallanPage = (doc, challan, photoBase64) => {
  const usableWidth = PAGE_WIDTH - (PAGE_MARGIN * 2);
  const usableHeight = PAGE_HEIGHT - (PAGE_MARGIN * 2);
  const dividerWidth = 25;
  const copyWidth = (usableWidth - dividerWidth) / 2;
  const leftX = PAGE_MARGIN;
  const rightX = leftX + copyWidth + dividerWidth;
  const photoBuffer = dataUriToBuffer(photoBase64);

  drawChallanCopy(doc, challan, photoBuffer, leftX, PAGE_MARGIN, copyWidth, usableHeight);
  drawChallanCopy(doc, challan, photoBuffer, rightX, PAGE_MARGIN, copyWidth, usableHeight);

  const dividerX = leftX + copyWidth + (dividerWidth / 2);
  doc
    .lineWidth(0.8)
    .dash(4, { space: 3 })
    .moveTo(dividerX, PAGE_MARGIN + 12)
    .lineTo(dividerX, PAGE_HEIGHT - PAGE_MARGIN - 12)
    .stroke('#999999')
    .undash();
  drawText(doc, 'OFFICE COPY', dividerX - 28, PAGE_HEIGHT / 2 - 4, 56, {
    size: 5.5, color: '#666666', align: 'center'
  });
};

const generateChallanPdf = (challan, photoBase64 = null) => {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
    compress: true
  });

  return createPdfBuffer(doc, () => {
    drawChallanPage(doc, challan, photoBase64);
  });
};

const generateChallansPdf = (entries) => {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
    compress: true
  });

  return createPdfBuffer(doc, () => {
    entries.forEach((entry, index) => {
      if (index > 0) doc.addPage();
      drawChallanPage(doc, entry.challan, entry.photoBase64);
    });
  });
};

const generateReportPdf = (challans, startDate, endDate) => {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 28, right: 28, bottom: 28, left: 28 },
    bufferPages: true,
    compress: true
  });

  return createPdfBuffer(doc, () => {
    const columns = [
      { label: '#', width: 24 },
      { label: 'Notice No.', width: 95 },
      { label: 'Division', width: 68 },
      { label: 'Ward', width: 42 },
      { label: 'Location', width: 120 },
      { label: 'Violator / Phone / Date-Time', width: 145 },
      { label: 'Violations', width: 150 },
      { label: 'Fine', width: 65 }
    ];
    const tableX = 28;
    const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
    const pageBottom = PAGE_HEIGHT - 28;
    let y;

    const drawHeader = () => {
      if (fs.existsSync(headingPath)) {
        doc.image(headingPath, 230, 25, { fit: [382, 43], align: 'center' });
      }
      drawText(doc, 'VIOLATIONS REPORT', 28, 73, tableWidth, {
        size: 16, bold: true, align: 'center'
      });
      drawText(
        doc,
        `Report period: ${formatDate(startDate)} - ${formatDate(endDate)}`,
        28,
        94,
        tableWidth,
        { size: 8, align: 'center', color: '#666666' }
      );
      y = 115;
      let x = tableX;
      doc.fillColor('#eeeeee').rect(tableX, y, tableWidth, 20).fill();
      columns.forEach((column) => {
        doc.rect(x, y, column.width, 20).stroke('#333333');
        drawText(doc, column.label, x + 3, y + 6, column.width - 6, { size: 7, bold: true });
        x += column.width;
      });
      y += 20;
    };

    drawHeader();
    challans.forEach((challan, index) => {
      const row = [
        index + 1,
        challan.noticeNumber,
        challan.division,
        challan.wardNumber,
        challan.location,
        `${challan.violatorName || ''}\n${challan.violatorPhone || ''}\n${formatDateTime(challan.dateTime)}`,
        Array.isArray(challan.violationType) ? challan.violationType.join(', ') : challan.violationType,
        `Rs. ${Number(challan.fineAmount || 0).toLocaleString('en-IN')}`
      ];
      const rowHeight = 30;
      if (y + rowHeight > pageBottom) {
        doc.addPage();
        drawHeader();
      }

      let x = tableX;
      row.forEach((cell, cellIndex) => {
        const column = columns[cellIndex];
        doc.rect(x, y, column.width, rowHeight).stroke('#cccccc');
        drawText(doc, cell, x + 3, y + 4, column.width - 6, {
          size: 6.5, height: rowHeight - 8
        });
        x += column.width;
      });
      y += rowHeight;
    });

    const range = doc.bufferedPageRange();
    for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      drawText(doc, `Page ${pageIndex + 1} of ${range.count}`, 28, PAGE_HEIGHT - 38, tableWidth, {
        size: 6.5, color: '#666666', align: 'right'
      });
    }
  });
};

module.exports = { generateChallanPdf, generateChallansPdf, generateReportPdf };
