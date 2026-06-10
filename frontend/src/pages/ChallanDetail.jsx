import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { resolveApiAssetUrl } from '../lib/api';
import toast from 'react-hot-toast';

const ChallanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challan, setChallan] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchChallan();
    fetchRecipients();
  }, [id]);

  const fetchChallan = async () => {
    try {
      const response = await api.get(`/challans/${id}`);
      if (response.data.success) {
        setChallan(response.data.data.challan);
      }
    } catch (err) {
      toast.error('Failed to load challan');
      navigate('/challans');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    try {
      const response = await api.get('/email-recipients');
      if (response.data.success) {
        setRecipients(response.data.data.recipients.filter(r => r.isActive));
      }
    } catch (err) {
      console.error('Failed to load recipients');
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setGenerating(true);
      const response = await api.post(`/challans/${id}/generate-pdf`, {}, {
        responseType: 'blob'
      });

      const contentType = response.headers['content-type'];
      const blob = response.data;

      if (!contentType || !contentType.includes('application/pdf')) {
        const text = await blob.text();
        let message = 'Failed to generate PDF. Please try again later.';

        try {
          const json = JSON.parse(text);
          if (json?.message) {
            message = json.message;
          }
        } catch (_) {
          if (text) {
            message = text;
          }
        }

        toast.error(message);
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GHMC-Challan-${challan.noticeNumber.replace(/\//g, '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('PDF downloaded!');
    } catch (err) {
      let message = 'Failed to generate PDF';

      const response = err.response;
      if (response?.data) {
        try {
          if (response.data instanceof Blob) {
            const text = await response.data.text();
            const json = JSON.parse(text);
            message = json?.message || text || message;
          } else if (typeof response.data === 'string') {
            message = response.data;
          } else if (response.data?.message) {
            message = response.data.message;
          }
        } catch (_) {
          // ignore parse errors
        }
      }

      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = async () => {
    try {
      setGenerating(true);
      const response = await api.post(`/challans/${id}/generate-pdf`, {}, { responseType: 'blob' });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Unable to open print window. Please allow pop-ups.');
        return;
      }

      // Write a minimal HTML that embeds the PDF and triggers print
      printWindow.document.write(`
        <html>
          <head><title>Print Challan</title></head>
          <body style="margin:0;">
            <iframe src="${url}" style="width:100%;height:100vh;border:none;" onload="setTimeout(function(){ window.print(); }, 500);"></iframe>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      toast.error('Failed to prepare print preview');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (selectedEmails.length === 0) {
      toast.error('Select at least one recipient');
      return;
    }

    try {
      setSending(true);
      const response = await api.post(`/challans/${id}/send-email`, {
        recipientEmails: selectedEmails
      });
      if (response.data.success) {
        toast.success('Email sent successfully!');
        setSelectedEmails([]);
        fetchChallan();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner spinner-lg text-navy-600" />
      </div>
    );
  }

  if (!challan) {
    return <div className="p-6 text-center text-gray-600">Challan not found</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/challans')} className="mb-6 text-navy-700 hover:text-navy-900">
        ← Back to Challans
      </button>

      <div className="card p-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm text-gray-600">Notice Number</p>
            <p className="text-xl font-bold text-navy-900">{challan.noticeNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Division</p>
            <p className="text-xl font-bold text-navy-900">{challan.division}</p>
          </div>
          {challan.divisionCode && (
            <div>
              <p className="text-sm text-gray-600">Circle</p>
              <p className="text-lg text-navy-900">{challan.divisionCode}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600">Violator</p>
            <p className="text-lg text-navy-900">{challan.violatorName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Location</p>
            <p className="text-lg text-navy-900">{challan.location}</p>
          </div>
          {challan.wardNumber && (
            <div>
              <p className="text-sm text-gray-600">Ward</p>
              <p className="text-lg text-navy-900">Ward {challan.wardNumber}{challan.wardName ? ` - ${challan.wardName}` : ''}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600">Date & Time</p>
            <p className="text-lg text-navy-900">{new Date(challan.dateTime).toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Fine Amount</p>
            <p className="text-2xl font-bold text-green-600">₹{challan.fineAmount}</p>
          </div>
          {challan.violatorPhone && (
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="text-lg font-semibold text-navy-900">{challan.violatorPhone}</p>
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <p className="text-sm font-semibold text-gray-700 mb-2">Violations</p>
          <div className="flex flex-wrap gap-2">
            {challan.violationType.map((v, i) => (
              <span key={i} className="px-3 py-1 bg-navy-100 text-navy-900 rounded-full text-sm">
                {v}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t mt-6 pt-6">
          <p className="text-sm text-gray-600">Officer</p>
          <p className="font-semibold text-navy-900">{challan.officerName} - {challan.officerDesignation}</p>
        </div>

        {challan.photoUrl && (
          <div className="border-t mt-6 pt-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">Photo Evidence</p>
            <img
              src={resolveApiAssetUrl(challan.photoUrl)}
              alt="Evidence"
              className="max-w-md max-h-64 rounded border"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold text-navy-900 mb-4">Generate PDF</h3>
          <p className="text-sm text-gray-600 mb-4">Download the challan as a PDF document</p>
          <div className="flex gap-3">
            <button
              onClick={handleGeneratePDF}
              disabled={generating}
              className="btn-primary flex-1 py-2"
            >
              {generating ? 'Generating...' : '📄 Download PDF'}
            </button>
            <button
              onClick={handlePrint}
              disabled={generating}
              className="btn-secondary flex-1 py-2"
            >
              🖨️ Print
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-navy-900 mb-4">Send via Email</h3>
          <div className="space-y-3 mb-4">
            {recipients.length === 0 ? (
              <p className="text-sm text-gray-600">No recipients available</p>
            ) : (
              recipients.map((r) => (
                <label key={r._id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmails.includes(r.email)}
                    onChange={(e) =>
                      setSelectedEmails(e.target.checked
                        ? [...selectedEmails, r.email]
                        : selectedEmails.filter(e => e !== r.email)
                      )
                    }
                    className="rounded"
                  />
                  <span className="text-sm">{r.name}</span>
                </label>
              ))
            )}
          </div>
          <button
            onClick={handleSendEmail}
            disabled={sending || selectedEmails.length === 0}
            className="btn-primary w-full py-2"
          >
            {sending ? 'Sending...' : '✉️ Send Email'}
          </button>
        </div>
      </div>

      {challan.emailSentAt && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800">
            ✓ Email sent on {new Date(challan.emailSentAt).toLocaleString('en-IN')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ChallanDetail;
