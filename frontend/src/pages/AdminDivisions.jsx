import { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const AdminDivisions = () => {
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newWards, setNewWards] = useState([]);
  const [newWardNumber, setNewWardNumber] = useState('');
  const [newWardName, setNewWardName] = useState('');
  const [wardInputs, setWardInputs] = useState({});
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchDivisions();
  }, []);

  const fetchDivisions = async () => {
    try {
      const response = await api.get('/admin/divisions');
      if (response.data.success) {
        setDivisions(response.data.data.divisions);
      }
    } catch (err) {
      toast.error('Failed to load divisions');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName) {
      toast.error('Division name is required');
      return;
    }

    try {
      setAdding(true);
      const response = await api.post('/admin/divisions', {
        name: newName,
        code: newCode,
        description: newDescription,
        wards: newWards
      });
      if (response.data.success) {
        toast.success('Division added!');
        setNewName('');
        setNewCode('');
        setNewDescription('');
        setNewWards([]);
        setNewWardNumber('');
        setNewWardName('');
        setShowForm(false);
        fetchDivisions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add division');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id, isActive) => {
    try {
      const response = await api.patch(`/admin/divisions/${id}`, {
        isActive: !isActive
      });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchDivisions();
      }
    } catch (err) {
      toast.error('Failed to update division');
    }
  };

  const handleAddWardToNewDivision = () => {
    const number = newWardNumber.trim();
    const name = newWardName.trim();
    if (!number || !name) {
      toast.error('Ward number and name are required');
      return;
    }
    if (newWards.some(w => w.number === number)) {
      toast.error('That ward already exists in this division');
      return;
    }
    setNewWards(prev => [...prev, { number, name, isActive: true }]);
    setNewWardNumber('');
    setNewWardName('');
  };

  const handleDeleteWardFromNewDivision = (number) => {
    setNewWards(prev => prev.filter(w => w.number !== number));
  };

  const handleWardInputChange = (divisionId, field, value) => {
    setWardInputs(prev => ({
      ...prev,
      [divisionId]: {
        ...prev[divisionId],
        [field]: value
      }
    }));
  };

  const handleAddWardToDivision = async (division) => {
    const input = wardInputs[division._id] || {};
    const number = String(input.number || '').trim();
    const name = String(input.name || '').trim();

    if (!number || !name) {
      toast.error('Ward number and name are required');
      return;
    }

    const existingWards = division.wards || [];
    if (existingWards.some(w => w.number === number)) {
      toast.error('That ward already exists for this division');
      return;
    }

    const updatedWards = [...existingWards, { number, name, isActive: true }];
    try {
      const response = await api.patch(`/admin/divisions/${division._id}`, {
        wards: updatedWards
      });
      if (response.data.success) {
        toast.success('Ward added successfully');
        setWardInputs(prev => ({ ...prev, [division._id]: { number: '', name: '' } }));
        fetchDivisions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add ward');
    }
  };

  const handleRemoveWardFromDivision = async (division, wardNumber) => {
    const updatedWards = (division.wards || []).filter(w => w.number !== wardNumber);
    try {
      const response = await api.patch(`/admin/divisions/${division._id}`, {
        wards: updatedWards
      });
      if (response.data.success) {
        toast.success('Ward removed successfully');
        fetchDivisions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove ward');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete "${name}" division?`)) {
      try {
        const response = await api.delete(`/admin/divisions/${id}`);
        if (response.data.success) {
          toast.success('Division deleted!');
          fetchDivisions();
        }
      } catch (err) {
        toast.error('Failed to delete division');
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
        <h1 className="text-3xl font-bold text-navy-900">Area Divisions</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? '✕ Cancel' : '+ Add Division'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6 bg-blue-50 border-l-4 border-blue-600">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Division Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input"
                  placeholder="e.g., Charminar"
                  required
                />
              </div>
              <div>
                <label className="label">Circle No / Code</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="input"
                  placeholder="e.g., 28 or CHM"
                />
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Ward Number</label>
                <input
                  type="text"
                  value={newWardNumber}
                  onChange={(e) => setNewWardNumber(e.target.value)}
                  className="input"
                  placeholder="e.g., 97"
                />
              </div>
              <div>
                <label className="label">Ward Name</label>
                <input
                  type="text"
                  value={newWardName}
                  onChange={(e) => setNewWardName(e.target.value)}
                  className="input"
                  placeholder="e.g., Purani Haveli"
                />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={handleAddWardToNewDivision} className="btn-secondary w-full">
                  + Add Ward
                </button>
              </div>
            </div>
            {newWards.length > 0 && (
              <div className="bg-white border border-gray-200 rounded p-4">
                <h4 className="font-semibold text-navy-900 mb-3">Wards</h4>
                <div className="space-y-2">
                  {newWards.map((ward) => (
                    <div key={ward.number} className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded">
                      <div>
                        <p className="text-sm font-semibold">Ward {ward.number}</p>
                        <p className="text-sm text-gray-600">{ward.name}</p>
                      </div>
                      <button type="button" onClick={() => handleDeleteWardFromNewDivision(ward.number)} className="btn-sm btn-danger">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={adding} className="btn-primary flex-1">
                {adding ? 'Adding...' : 'Add Division'}
              </button>
            </div>
          </form>
        </div>
      )}

      {divisions.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <p>No divisions yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {divisions.map(division => (
            <div key={division._id} className="card p-4 flex items-center justify-between hover:shadow-md transition">
              <div className="flex-1">
                <h3 className="font-semibold text-navy-900">{division.name}</h3>
                <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
                  {division.code && <span>Circle: {division.code}</span>}
                  {division.description && <span>{division.description}</span>}
                </div>
                {division.wards && division.wards.length > 0 && (
                  <div className="mt-3 text-sm text-gray-700">
                    <div className="font-semibold mb-2">Wards</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {division.wards.map((ward) => (
                        <div key={`${division._id}-${ward.number}`} className="rounded-md bg-slate-50 p-2 text-xs">
                          <div className="font-semibold">Ward {ward.number}</div>
                          <div className="text-gray-600">{ward.name}</div>
                          <button
                            type="button"
                            onClick={() => handleRemoveWardFromDivision(division, ward.number)}
                            className="text-xs text-red-600 hover:underline mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="label">Ward Number</label>
                      <input
                        type="text"
                        value={wardInputs[division._id]?.number || ''}
                        onChange={(e) => handleWardInputChange(division._id, 'number', e.target.value)}
                        className="input"
                        placeholder="e.g., 97"
                      />
                    </div>
                    <div>
                      <label className="label">Ward Name</label>
                      <input
                        type="text"
                        value={wardInputs[division._id]?.name || ''}
                        onChange={(e) => handleWardInputChange(division._id, 'name', e.target.value)}
                        className="input"
                        placeholder="e.g., Purani Haveli"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => handleAddWardToDivision(division)}
                        className="btn-secondary w-full"
                      >
                        + Add Ward
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <button
                  onClick={() => handleToggle(division._id, division.isActive)}
                  className={`btn-sm ${division.isActive ? 'btn-success' : 'btn-warning'}`}
                >
                  {division.isActive ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleDelete(division._id, division.name)}
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

export default AdminDivisions;
