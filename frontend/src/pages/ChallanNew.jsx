import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

const ChallanNew = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState([]);
  const [violations, setViolations] = useState([]);
  const [selectedViolations, setSelectedViolations] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const submittingRef = useRef(false);
  
  const [formData, setFormData] = useState({
    division: user?.division || '',
    location: '',
    violatorName: '',
    violatorPhone: '',
    wardNumber: '',
    wardName: '',
    fineAmount: '',
    officerName: user?.name || '',
    officerDesignation: '',
    dateTime: new Date().toISOString().split('T')[0],
    type: 'Challan'
  });

  // Fetch divisions and violations on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [divisionsRes, violationsRes] = await Promise.all([
          api.get('/divisions'),
          api.get('/violations')
        ]);

        if (divisionsRes.data.success) {
          const backendDivisions = divisionsRes.data.data.divisions;
          const enrolledDivision = backendDivisions.find(
            d => d.name.toLowerCase() === user?.division?.toLowerCase()
          );
          const availableDivisions = isAdmin
            ? backendDivisions
            : [enrolledDivision || { _id: user?.division, name: user?.division, wards: [] }];

          setDivisions(availableDivisions);

          const selectedDivision = isAdmin
            ? backendDivisions.find(d => d.name === (formData.division || backendDivisions[0]?.name))
            : availableDivisions[0];

          if (selectedDivision) {
            setFormData(prev => ({
              ...prev,
              division: isAdmin ? (prev.division || selectedDivision.name) : user.division,
              wardNumber: selectedDivision.wards?.[0]?.number || '',
              wardName: selectedDivision.wards?.[0]?.name || ''
            }));
          }
        }

        if (violationsRes.data.success) {
          setViolations(violationsRes.data.data.violations);
          if (violationsRes.data.data.violations.length > 0) {
            setSelectedViolations([violationsRes.data.data.violations[0].name]);
          }
        }
      } catch (err) {
        console.error('Failed to load divisions/violations:', err);
        toast.error('Failed to load form data');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'division') {
      const selected = divisions.find(d => d.name === value);
      return setFormData(prev => ({
        ...prev,
        division: value,
        wardNumber: selected?.wards?.[0]?.number || '',
        wardName: selected?.wards?.[0]?.name || ''
      }));
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWardSelect = (e) => {
    const wardNumber = e.target.value;
    const selectedDivision = divisions.find(d => d.name === formData.division);
    const selectedWard = selectedDivision?.wards?.find(w => w.number === wardNumber);

    setFormData(prev => ({
      ...prev,
      wardNumber,
      wardName: selectedWard?.name || ''
    }));
  };

  const selectedDivision = divisions.find(d => d.name === formData.division);

  const handlePhotoChange = (e) => {
    setPhoto(e.target.files?.[0] || null);
  };

  const toggleViolation = (violationName) => {
    setSelectedViolations(prev =>
      prev.includes(violationName)
        ? prev.filter(x => x !== violationName)
        : [...prev, violationName]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    if (selectedViolations.length === 0) {
      toast.error('Select at least one violation type');
      return;
    }

    const fineAmount = Number(formData.fineAmount);
    if (!Number.isFinite(fineAmount) || fineAmount < 0) {
      toast.error('Enter a valid fine amount');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const data = new FormData();
      data.append('division', formData.division);
      data.append('location', formData.location);
      data.append('violatorName', formData.violatorName);
      data.append('violationType', JSON.stringify(selectedViolations));
      data.append('fineAmount', formData.fineAmount);
      data.append('officerName', formData.officerName);
      data.append('officerDesignation', formData.officerDesignation);
      data.append('dateTime', new Date(formData.dateTime).toISOString());
      data.append('type', formData.type);
      data.append('violatorPhone', formData.violatorPhone);
      data.append('wardNumber', formData.wardNumber);
      data.append('wardName', formData.wardName);
      if (photo) data.append('photo', photo);

      // Let the browser set Content-Type (including boundary) for FormData
      const response = await api.post('/challans', data);

      if (response.data.success) {
        toast.success(`${formData.type} created successfully!`);
        navigate(`/challans/${response.data.data.challan._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to create ${formData.type}`);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner spinner-lg text-navy-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-navy-900 mb-6">Create New {formData.type}</h1>

      <form onSubmit={handleSubmit} className="card p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="label">Type *</label>
            <select name="type" value={formData.type} onChange={handleChange} className="input">
              <option value="Challan">Challan</option>
              <option value="Fine">Fine</option>
            </select>
          </div>
          <div>
            <label className="label">Division *</label>
            {isAdmin ? (
              <select name="division" value={formData.division} onChange={handleChange} className="input" required>
                <option value="">Select Division</option>
                {divisions.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
              </select>
            ) : (
              <input
                type="text"
                value={user?.division || ''}
                className="input bg-gray-100"
                readOnly
              />
            )}
          </div>
          <div>
            <label className="label">Date & Time *</label>
            <input type="date" name="dateTime" value={formData.dateTime} onChange={handleChange} className="input" required />
          </div>
        </div>

        <div>
          <label className="label">Violation Location *</label>
          <input type="text" name="location" value={formData.location} onChange={handleChange} className="input" placeholder="Address/Area" required />
        </div>

        <div>
          <label className="label">Violator Name *</label>
          <input type="text" name="violatorName" value={formData.violatorName} onChange={handleChange} className="input" placeholder="Full name" required />
        </div>

        <div>
          <label className="label">Violator Phone *</label>
          <input type="tel" name="violatorPhone" value={formData.violatorPhone} onChange={handleChange} className="input" placeholder="Mobile number" required />
        </div>

        <div>
          <label className="label">Ward *</label>
          {selectedDivision?.wards?.filter(w => w.isActive).length > 0 ? (
            <select name="wardNumber" value={formData.wardNumber} onChange={handleWardSelect} className="input" required>
              <option value="">Select Ward</option>
              {selectedDivision.wards.filter(w => w.isActive).map((ward) => (
                <option key={ward.number} value={ward.number}>
                  {`Ward ${ward.number}: ${ward.name}`}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="wardNumber" value={formData.wardNumber} onChange={handleChange} className="input" placeholder="Ward number" required />
              <input type="text" name="wardName" value={formData.wardName} onChange={handleChange} className="input" placeholder="Ward name" required />
            </div>
          )}
        </div>

        <div>
          <label className="label">Violation Types (select at least one) *</label>
          {violations.length === 0 ? (
            <p className="text-gray-500 text-sm">No violation types available. Please contact admin.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {violations.map(v => (
                <label key={v._id} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedViolations.includes(v.name)} 
                    onChange={() => toggleViolation(v.name)} 
                    className="rounded" 
                  />
                  <span className="text-sm">{v.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Fine Amount (₹) *</label>
            <input
              type="number"
              name="fineAmount"
              value={formData.fineAmount}
              onChange={handleChange}
              onWheel={(e) => e.currentTarget.blur()}
              className="input"
              min="0"
              step="0.01"
              inputMode="decimal"
              required
            />
          </div>
          <div>
            <label className="label">Officer Name *</label>
            <input type="text" name="officerName" value={formData.officerName} onChange={handleChange} className="input" required />
          </div>
        </div>

        <div>
          <label className="label">Officer Designation *</label>
          <input type="text" name="officerDesignation" value={formData.officerDesignation} onChange={handleChange} className="input" placeholder="e.g., Traffic Inspector" required />
        </div>

        <div>
          <label className="label">Photo Evidence</label>
          <input type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} className="input" />
          {photo && <p className="text-sm text-green-600 mt-2">✓ {photo.name}</p>}
        </div>

        <div className="flex gap-3 pt-6">
          <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
            {loading ? 'Creating...' : `Create ${formData.type}`}
          </button>
          <button type="button" onClick={() => navigate('/challans')} className="btn-secondary flex-1 py-3">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChallanNew;
