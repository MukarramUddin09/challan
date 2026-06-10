const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

/**
 * Send challan email with photo attachment
 * @param {Object} options
 * @param {string[]} options.to - Array of recipient emails
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML body
 * @param {Object} [options.attachment] - Photo attachment info
 * @param {string} options.attachment.filename - Original filename
 * @param {string} options.attachment.path - File path on disk
 * @param {string} options.attachment.contentType - MIME type
 */
const sendChallanEmail = async ({ to, subject, html, attachment }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"GHMC Enforcement" <${process.env.GMAIL_USER}>`,
    to: to.join(', '),
    subject,
    html,
    attachments: []
  };

  if (attachment && attachment.path) {
    mailOptions.attachments.push({
      filename: attachment.filename,
      path: attachment.path,
      contentType: attachment.contentType
    });
  }

  const info = await transporter.sendMail(mailOptions);
  return info;
};

/**
 * Build challan email HTML body
 * @param {Object} challan - Challan document
 * @returns {string} HTML email body
 */
const buildChallanEmailHTML = (challan) => {
  const violationRows = challan.violationType.map((v, i) => `
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #ddd;">${i + 1}</td>
      <td style="padding: 8px 12px; border: 1px solid #ddd;">${v}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 2px solid #1a3a5c; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1a3a5c 0%, #2c5f8a 100%); color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 20px; letter-spacing: 1px;">GREATER HYDERABAD MUNICIPAL CORPORATION</h1>
        <p style="margin: 5px 0 0; font-size: 11px; opacity: 0.9;">(Under Section 402, 421 and with 674, 596, 487 of GHMC Act 1955)</p>
      </div>
      
      <div style="padding: 24px;">
        <h2 style="text-align: center; color: #1a3a5c; margin-bottom: 20px; font-size: 22px; border-bottom: 2px solid #1a3a5c; padding-bottom: 10px;">CHALLAN NOTICE</h2>
        
        <table style="width: 100%; margin-bottom: 16px; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0;"><strong>Notice No:</strong> ${challan.noticeNumber}</td>
            <td style="padding: 4px 0; text-align: right;"><strong>Date:</strong> ${new Date(challan.dateTime).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>Division:</strong> ${challan.division}</td>
            <td style="padding: 4px 0; text-align: right;"><strong>Time:</strong> ${new Date(challan.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
          </tr>
          ${challan.divisionCode ? `<tr>
            <td style="padding: 4px 0;"><strong>Circle:</strong> ${challan.divisionCode}</td>
            <td style="padding: 4px 0;"></td>
          </tr>` : ''}
          ${challan.wardNumber || challan.wardName ? `<tr>
            <td style="padding: 4px 0;"><strong>Ward:</strong> ${challan.wardNumber ? `Ward ${challan.wardNumber}` : ''}${challan.wardName ? ` - ${challan.wardName}` : ''}</td>
            <td style="padding: 4px 0;"></td>
          </tr>` : ''}
        </table>

        <div style="background: #f8f9fa; border-left: 4px solid #1a3a5c; padding: 12px 16px; margin-bottom: 16px; font-size: 13px;">
          <strong>To:</strong> ${challan.violatorName}<br>
          <strong>Phone:</strong> ${challan.violatorPhone || 'N/A'}<br>
          <strong>Location:</strong> ${challan.location}
        </div>

        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; line-height: 1.6;">
          ${challan.legalText}
        </div>

        <h3 style="color: #1a3a5c; margin-bottom: 8px;">Violations:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <thead>
            <tr style="background: #1a3a5c; color: white;">
              <th style="padding: 8px 12px; text-align: left; width: 40px;">#</th>
              <th style="padding: 8px 12px; text-align: left;">Type of Violation</th>
            </tr>
          </thead>
          <tbody>
            ${violationRows}
          </tbody>
        </table>

        <div style="background: #d4edda; border: 1px solid #28a745; border-radius: 4px; padding: 12px 16px; margin-bottom: 16px; font-size: 16px; text-align: center;">
          <strong>Fine Amount: ₹${challan.fineAmount.toLocaleString('en-IN')}</strong>
        </div>

        <div style="margin-top: 24px; font-size: 13px;">
          <p><strong>Enforcement Officer:</strong> ${challan.officerName}</p>
          <p><strong>Designation:</strong> ${challan.officerDesignation}</p>
        </div>

        <div style="margin-top: 24px; text-align: right; font-size: 13px;">
          <p style="margin-bottom: 30px;">for Commissioner GHMC</p>
        </div>
      </div>

      <div style="background: #f1f1f1; padding: 12px; text-align: center; font-size: 11px; color: #666;">
        This is an official communication from GHMC Enforcement Division. 
        Generated on ${new Date().toLocaleString('en-IN')}.
      </div>
    </div>
  `;
};

module.exports = { sendChallanEmail, buildChallanEmailHTML };
