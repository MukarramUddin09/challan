const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF from HTML with enhanced error handling and fallbacks
 * @param {string} html - HTML content to convert to PDF
 * @param {string} filename - Output filename (optional)
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePdfFromHtml(html, filename = null) {
  let browser = null;

  try {
    // Try to launch Puppeteer with multiple fallback options
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-plugins'
      ]
    };

    console.log('Attempting to launch Puppeteer browser...');
    
    try {
      // First attempt: normal launch
      browser = await puppeteer.launch(launchOptions);
    } catch (err) {
      console.warn('Normal Puppeteer launch failed, trying alternative method:', err.message);
      
      // Second attempt: try with executablePath if Chromium is not bundled
      try {
        browser = await puppeteer.launch({
          ...launchOptions,
          executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser'
        });
      } catch (err2) {
        console.warn('Alternative launch failed, trying headless old:', err2.message);
        
        // Third attempt: older headless API
        browser = await puppeteer.launch({
          headless: true,
          args: launchOptions.args
        });
      }
    }

    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 800
    });

    // Render HTML as screen media for better PDF layout
    await page.emulateMediaType('screen');

    // Set content and wait for resources to load
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });

    await browser.close();
    return pdfBuffer;

  } catch (err) {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error('Error closing browser:', closeErr.message);
      }
    }

    console.error('PDF generation failed:', err.message);
    
    // If PDF generation completely fails, throw a detailed error
    const errorMessage = `
PDF Generation Error:
${err.message}

Troubleshooting:
1. Ensure Chromium/Chrome is installed
2. For Docker: Use --allow-empty-password in Puppeteer launch
3. For Linux servers: sudo apt-get install chromium-browser
4. Set CHROME_PATH environment variable if using custom installation

Fallback: If you cannot fix Puppeteer, try using html2pdf.com API or generate HTML preview instead.
    `.trim();

    throw new Error(errorMessage);
  }
}

/**
 * Generate HTML file as fallback when PDF generation fails
 * @param {string} html - HTML content
 * @param {string} outputPath - Where to save the HTML file
 * @returns {Promise<void>}
 */
async function generateHtmlFallback(html, outputPath) {
  return new Promise((resolve, reject) => {
    fs.writeFile(outputPath, html, 'utf8', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  generatePdfFromHtml,
  generateHtmlFallback
};
