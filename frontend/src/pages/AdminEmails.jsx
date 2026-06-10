import { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const AdminEmails = () => {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDivision, setNewDivision] = useState('');
  const [divisions, setDivisions] = useState([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchRecipients();
    fetchDivisions();
  }, []);

  const fetchDivisions = async () => {
    try {
      const res = await api.get('/divisions');
      if (res.data.success) setDivisions(res.data.data.divisions || []);
    } catch (err) {
      // ignore
    }
  };

  const fetchRecipients = async () => {
    try {
      const response = await api.get('/admin/emails');
      if (response.data.success) {
        setRecipients(response.data.data.recipients);
      }
    } catch (err) {
      toast.error('Failed to load recipients');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName || !newEmail) {
      toast.error('Fill in all fields');
      return;
    }

    try {
      setAdding(true);
      const response = await api.post('/admin/emails', {
        name: newName,
        email: newEmail,
        division: newDivision || null
      });
      if (response.data.success) {
        toast.success('Recipient added!');
        setNewName('');
        setNewEmail('');
        setShowForm(false);
        fetchRecipients();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add recipient');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id, isActive) => {
    try {
      const response = await api.patch(`/admin/emails/${id}`);
      if (response.data.success) {
        toast.success(response.data.message);
        fetchRecipients();
      }
    } catch (err) {
      toast.error('Failed to update recipient');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete ${name}?`)) {
      try {
        const response = await api.delete(`/admin/emails/${id}`);
        if (response.data.success) {
          toast.success('Recipient deleted!');
          fetchRecipients();
        }
      } catch (err) {
        toast.error('Failed to delete recipient');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner spinner-lg text-navy-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-navy-900">Email Recipients</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? '✕ Cancel' : '+ Add Recipient'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input"
                placeholder="Recipient name"
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="input"
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="label">Division (optional)</label>
              <select value={newDivision} onChange={(e) => setNewDivision(e.target.value)} className="input">
                <option value="">Global (all divisions)</option>
                {divisions.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <button type="submit" disabled={adding} className="btn-primary py-2">
              {adding ? 'Adding...' : 'Add Recipient'}
            </button>
          </form>
        </div>
      )}

      {recipients.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No recipients configured yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recipients.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-navy-900">{r.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      r.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-3">
                    <button
                      onClick={() => handleToggle(r._id, r.isActive)}
                      className={`font-semibold ${r.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'}`}
                    >
                      {r.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(r._id, r.name)}
                      className="text-red-600 hover:text-red-800 font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminEmails;
