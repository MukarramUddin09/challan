import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { resolveApiAssetUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../lib/constants';

const ChallanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [challan, setChallan] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [challanResponse, recipientResponse] = await Promise.all([
          api.get(`/challans/${id}`),
          api.get('/email-recipients')
        ]);
        setChallan(challanResponse.data.data.challan);
        setRecipients(recipientResponse.data.data.recipients.filter(item => item.isActive));
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load challan');
        navigate('/challans');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const getPdf = () => api.post(`/challans/${id}/generate-pdf`, {}, { responseType: 'blob' });

  const downloadPdf = async () => {
    const response = await getPdf();
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GHMC-${challan.type === 'Challan' ? 'Challan' : 'Notice'}-${challan.noticeNumber.replace(/\//g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };

  const handlePrint = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print the PDF.');
      return;
    }

    try {
      setGenerating(true);
      const response = await getPdf();
      const url = window.URL.createObjectURL(response.data);
      printWindow.document.write(`
        <html>
          <head><title>Print ${challan.type === 'Challan' ? 'Challan' : 'Notice'}</title></head>
          <body style="margin:0">
            <iframe
              src="${url}"
              style="width:100%;height:100vh;border:0"
              onload="setTimeout(function(){ window.print(); }, 500)"
            ></iframe>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      printWindow.close();
      toast.error('Failed to prepare print preview');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmailAndDownload = async () => {
    if (selectedEmails.length === 0) {
      toast.error('Select at least one recipient');
      return;
    }

    try {
      setSending(true);
      const response = await api.post(`/challans/${id}/send-email`, {
        recipientEmails: selectedEmails
      });
      setChallan(previous => ({
        ...previous,
        emailSentAt: response.data.data.emailSentAt
      }));
      await downloadPdf();
      setSelectedEmails([]);
      toast.success('Email sent and PDF downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email and download PDF');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete challan ${challan.noticeNumber}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      await api.delete(`/challans/${id}`);
      toast.success('Challan deleted successfully');
      navigate('/challans', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete challan');
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="spinner spinner-lg text-navy-600" /></div>;
  }

  if (!challan) {
    return <div className="p-6 text-center text-gray-600">Challan not found</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <button onClick={() => navigate('/challans')} className="text-navy-700 hover:text-navy-900">
          &larr; Back to Challans
        </button>
        <div className="flex items-center gap-3">
          <Link to={`/challans/${id}/edit`} className="btn-primary btn-sm">Edit Challan</Link>
          {isAdmin && (
            <button type="button" onClick={handleDelete} disabled={deleting} className="btn-danger btn-sm">
              {deleting ? 'Deleting...' : 'Delete Challan'}
            </button>
          )}
        </div>
      </div>

      <div className="card p-5 sm:p-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Detail label="Notice Number" value={challan.noticeNumber} prominent />
          <Detail label="Division" value={challan.division} prominent />
          {challan.divisionCode && <Detail label="Circle" value={challan.divisionCode} />}
          <Detail label="Violator" value={challan.violatorName} />
          <Detail label="Phone" value={challan.violatorPhone} />
          <Detail label="Location" value={challan.location} />
          {challan.wardNumber && (
            <Detail label="Ward" value={`Ward ${challan.wardNumber}${challan.wardName ? ` - ${challan.wardName}` : ''}`} />
          )}
          <Detail label="Date & Time" value={formatDateTime(challan.dateTime)} />
          {challan.type === 'Challan' && (
            <div>
              <p className="text-sm text-gray-600">Fine Amount</p>
              <p className="text-2xl font-bold text-green-600">INR {challan.fineAmount}</p>
            </div>
          )}
        </div>

        <Section title="Violations">
          <div className="flex flex-wrap gap-2">
            {challan.violationType.map((violation, index) => (
              <span key={index} className="px-3 py-1 bg-navy-100 text-navy-900 rounded-full text-sm">
                {violation}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Officer">
          <p className="font-semibold text-navy-900">
            {challan.officerName} - {challan.officerDesignation}
          </p>
        </Section>

        {challan.officerNote && (
          <Section title="Officer Note">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{challan.officerNote}</p>
          </Section>
        )}

        {challan.legalText && (
          <Section title="Legal Notice">
            <p className="text-sm text-gray-700 leading-6 whitespace-pre-wrap">{challan.legalText}</p>
          </Section>
        )}

        {challan.photoUrl && (
          <Section title="Photo Evidence">
            <img
              src={resolveApiAssetUrl(challan.photoUrl)}
              alt="Evidence"
              className="w-full max-w-md max-h-80 object-contain rounded border"
            />
          </Section>
        )}
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-navy-900 mb-2">Send and Download</h3>
        <p className="text-sm text-gray-600 mb-4">
          Send the email and download the PDF in one action.
        </p>
        <div className="space-y-3 mb-4">
          {recipients.length === 0 ? (
            <p className="text-sm text-gray-600">No recipients available</p>
          ) : recipients.map(recipient => (
            <label key={recipient._id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedEmails.includes(recipient.email)}
                onChange={event => setSelectedEmails(previous => (
                  event.target.checked
                    ? [...previous, recipient.email]
                    : previous.filter(email => email !== recipient.email)
                ))}
                className="rounded"
              />
              <span className="text-sm">{recipient.name} ({recipient.email})</span>
            </label>
          ))}
        </div>
        <button
          onClick={handleSendEmailAndDownload}
          disabled={sending || selectedEmails.length === 0}
          className="btn-primary w-full py-2"
        >
          {sending ? 'Sending and downloading...' : 'Send Email & Download'}
        </button>
        {challan.emailSentAt && (
          <button onClick={handlePrint} disabled={generating} className="btn-secondary w-full py-2 mt-3">
            {generating ? 'Preparing print...' : 'Print PDF'}
          </button>
        )}
      </div>

      {challan.emailSentAt && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800">Email sent on {formatDateTime(challan.emailSentAt)}</p>
        </div>
      )}
    </div>
  );
};

const Detail = ({ label, value, prominent = false }) => (
  <div>
    <p className="text-sm text-gray-600">{label}</p>
    <p className={`${prominent ? 'text-xl font-bold' : 'text-lg'} text-navy-900`}>{value || '-'}</p>
  </div>
);

const Section = ({ title, children }) => (
  <div className="border-t mt-6 pt-6">
    <p className="text-sm font-semibold text-gray-700 mb-2">{title}</p>
    {children}
  </div>
);

export default ChallanDetail;
