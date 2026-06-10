const { generatePdfFromHtml } = require('./utils/pdfGenerator');
const { generatePdfHtml } = require('./utils/pdfTemplate');
const fs = require('fs');
(async () => {
  const sample = {
    noticeNumber: 'GHMC/TEST/00001',
    dateTime: new Date(),
    createdAt: new Date(),
    type: 'Challan',
    division: 'Test',
    location: 'Test Location',
    legalText: 'This is a legal paragraph for testing.',
    violationType: ['Test Violation'],
    fineAmount: 1000,
    officerName: 'Test Officer',
    officerDesignation: 'Inspector',
    violatorName: 'John Doe'
  };
  const html = generatePdfHtml(sample, null);
  try {
    const buf = await generatePdfFromHtml(html, 'test.pdf');
    console.log('Generated buffer length:', buf.length);
    fs.writeFileSync('pdf-test-output.pdf', buf);
    console.log('Wrote pdf-test-output.pdf');
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
