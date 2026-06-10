const fs = require('fs');
const { generateChallanPdf } = require('./utils/pdfGenerator');

(async () => {
  const sample = {
    noticeNumber: 'GHMC/TEST/00001',
    dateTime: new Date(),
    createdAt: new Date(),
    type: 'Challan',
    division: 'Test',
    divisionCode: 'Circle 1',
    wardNumber: '1',
    wardName: 'Test Ward',
    location: 'Test Location',
    legalText: 'This is a legal paragraph for testing.',
    violationType: ['Test Violation'],
    fineAmount: 1000,
    officerName: 'Test Officer',
    officerDesignation: 'Inspector',
    violatorName: 'John Doe',
    violatorPhone: '9876543210'
  };

  try {
    const buffer = await generateChallanPdf(sample);
    console.log('Generated buffer length:', buffer.length);
    fs.writeFileSync('pdf-test-output.pdf', buffer);
    console.log('Wrote pdf-test-output.pdf');
  } catch (error) {
    console.error('ERROR', error);
    process.exit(1);
  }
})();
