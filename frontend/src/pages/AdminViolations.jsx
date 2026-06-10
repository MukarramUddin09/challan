import { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const AdminViolations = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    try {
      const response = await api.get('/admin/violations');
      if (response.data.success) {
        setViolations(response.data.data.violations);
      }
    } catch (err) {
      toast.error('Failed to load violations');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName) {
      toast.error('Violation name is required');
      return;
    }

    try {
      setAdding(true);
      const response = await api.post('/admin/violations', {
        name: newName,
        description: newDescription
      });
      if (response.data.success) {
        toast.success('Violation type added!');
        setNewName('');
        setNewDescription('');
        setShowForm(false);
        fetchViolations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add violation');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id, isActive) => {
    try {
      const response = await api.patch(`/admin/violations/${id}`, {
        isActive: !isActive
      });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchViolations();
      }
    } catch (err) {
      toast.error('Failed to update violation');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete "${name}"?`)) {
      try {
        const response = await api.delete(`/admin/violations/${id}`);
        if (response.data.success) {
          toast.success('Violation deleted!');
          fetchViolations();
        }
      } catch (err) {
        toast.error('Failed to delete violation');
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
        <h1 className="text-3xl font-bold text-navy-900">Violation Types</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? '✕ Cancel' : '+ Add Violation'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6 bg-blue-50 border-l-4 border-blue-600">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="label">Violation Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input"
                placeholder="e.g., Parking Violation"
                required
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="input"
                placeholder="Optional description"
                rows="2"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={adding} className="btn-primary flex-1">
                {adding ? 'Adding...' : 'Add Violation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {violations.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <p>No violation types yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {violations.map(violation => (
            <div key={violation._id} className="card p-4 flex items-center justify-between hover:shadow-md transition">
              <div className="flex-1">
                <h3 className="font-semibold text-navy-900">{violation.name}</h3>
                {violation.description && (
                  <p className="text-sm text-gray-600 mt-1">{violation.description}</p>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => handleToggle(violation._id, violation.isActive)}
                  className={`btn-sm ${violation.isActive ? 'btn-success' : 'btn-warning'}`}
                >
                  {violation.isActive ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleDelete(violation._id, violation.name)}
                  className="btn-sm btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminViolations;
