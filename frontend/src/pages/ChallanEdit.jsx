import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api, { resolveApiAssetUrl } from '../lib/api';
import { indiaDateTimeLocalToIso, toDateTimeLocalInput } from '../lib/constants';

const ChallanEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const submittingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [divisions, setDivisions] = useState([]);
  const [violations, setViolations] = useState([]);
  const [selectedViolations, setSelectedViolations] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [formData, setFormData] = useState({
    division: '',
    location: '',
    violatorName: '',
    violatorPhone: '',
    wardNumber: '',
    wardName: '',
    fineAmount: '',
    officerName: '',
    officerDesignation: '',
    dateTime: '',
    type: 'Challan',
    legalText: '',
    officerNote: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [challanRes, divisionsRes, violationsRes] = await Promise.all([
          api.get(`/challans/${id}`),
          api.get('/divisions'),
          api.get('/violations')
        ]);

        const challan = challanRes.data.data.challan;
        const allDivisions = divisionsRes.data.data.divisions;
        setDivisions(isAdmin
          ? allDivisions
          : allDivisions.filter(d => d.name.toLowerCase() === user?.division?.toLowerCase())
        );
        setViolations(violationsRes.data.data.violations);
        setSelectedViolations(challan.violationType || []);
        setCurrentPhotoUrl(challan.photoUrl || null);
        setFormData({
          division: challan.division || '',
          location: challan.location || '',
          violatorName: challan.violatorName || '',
          violatorPhone: challan.violatorPhone || '',
          wardNumber: challan.wardNumber || '',
          wardName: challan.wardName || '',
          fineAmount: String(challan.fineAmount ?? ''),
          officerName: challan.officerName || '',
          officerDesignation: challan.officerDesignation || '',
          dateTime: toDateTimeLocalInput(challan.dateTime),
          type: challan.type || 'Challan',
          legalText: challan.legalText || '',
          officerNote: challan.officerNote || ''
        });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load challan');
        navigate('/challans', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isAdmin, navigate, user?.division]);

  const selectedDivision = useMemo(
    () => divisions.find(d => d.name === formData.division),
    [divisions, formData.division]
  );

  const photoPreview = useMemo(
    () => photo ? URL.createObjectURL(photo) : null,
    [photo]
  );

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'division') {
      const division = divisions.find(d => d.name === value);
      setFormData(prev => ({
        ...prev,
        division: value,
        wardNumber: division?.wards?.find(w => w.isActive)?.number || '',
        wardName: division?.wards?.find(w => w.isActive)?.name || ''
      }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWardSelect = (event) => {
    const wardNumber = event.target.value;
    const ward = selectedDivision?.wards?.find(item => item.number === wardNumber);
    setFormData(prev => ({ ...prev, wardNumber, wardName: ward?.name || '' }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] || null;
    setPhoto(file);
    if (file) setRemovePhoto(false);
  };

  const clearPhoto = () => {
    setPhoto(null);
    setRemovePhoto(true);
  };

  const toggleViolation = (name) => {
    setSelectedViolations(prev => (
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    ));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (selectedViolations.length === 0) {
      toast.error('Select at least one violation type');
      return;
    }

    submittingRef.current = true;
    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, key === 'dateTime' ? indiaDateTimeLocalToIso(value) : value);
      });
      data.append('violationType', JSON.stringify(selectedViolations));
      data.append('removePhoto', String(removePhoto));
      if (photo) data.append('photo', photo);

      await api.put(`/challans/${id}`, data);
      toast.success('Challan updated successfully');
      navigate(`/challans/${id}`, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update challan');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="spinner spinner-lg text-navy-600" /></div>;
  }

  const activeWards = selectedDivision?.wards?.filter(
    ward => ward.isActive || ward.number === formData.wardNumber
  ) || [];
  const visiblePhoto = photoPreview || (!removePhoto && currentPhotoUrl
    ? resolveApiAssetUrl(currentPhotoUrl)
    : null);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <button type="button" onClick={() => navigate(`/challans/${id}`)} className="text-sm text-navy-700 hover:text-navy-900 mb-2">
            &larr; Back to challan
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">Edit Challan</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 sm:p-8 space-y-6">
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
                {divisions.map(division => <option key={division._id} value={division.name}>{division.name}</option>)}
              </select>
            ) : (
              <input value={formData.division} className="input bg-gray-100" readOnly />
            )}
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="datetime-local" step="1" name="dateTime" value={formData.dateTime} onChange={handleChange} className="input" required />
          </div>
        </div>

        <div>
          <label className="label">Violation Location *</label>
          <input name="location" value={formData.location} onChange={handleChange} className="input" required />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Violator Name *</label>
            <input name="violatorName" value={formData.violatorName} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="label">Violator Phone *</label>
            <input type="tel" name="violatorPhone" value={formData.violatorPhone} onChange={handleChange} className="input" required />
          </div>
        </div>

        <div>
          <label className="label">Ward *</label>
          {activeWards.length > 0 ? (
            <select name="wardNumber" value={formData.wardNumber} onChange={handleWardSelect} className="input" required>
              <option value="">Select Ward</option>
              {activeWards.map(ward => (
                <option key={ward.number} value={ward.number}>Ward {ward.number}: {ward.name}</option>
              ))}
            </select>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="wardNumber" value={formData.wardNumber} onChange={handleChange} className="input" placeholder="Ward number" required />
              <input name="wardName" value={formData.wardName} onChange={handleChange} className="input" placeholder="Ward name" required />
            </div>
          )}
        </div>

        <div>
          <label className="label">Violation Types *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {violations.map(violation => (
              <label key={violation._id} className={`checkbox-card ${selectedViolations.includes(violation.name) ? 'selected' : ''}`}>
                <input type="checkbox" checked={selectedViolations.includes(violation.name)} onChange={() => toggleViolation(violation.name)} />
                <span className="text-sm">{violation.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Fine Amount (INR) *</label>
            <input type="number" name="fineAmount" value={formData.fineAmount} onChange={handleChange} className="input" min="0" step="0.01" required />
          </div>
          <div>
            <label className="label">Officer Name *</label>
            <input name="officerName" value={formData.officerName} onChange={handleChange} className="input" required />
          </div>
        </div>

        <div>
          <label className="label">Officer Designation *</label>
          <input name="officerDesignation" value={formData.officerDesignation} onChange={handleChange} className="input" required />
        </div>

        <div>
          <label className="label">Legal Notice Text</label>
          <textarea name="legalText" value={formData.legalText} onChange={handleChange} className="input min-h-32 resize-y" />
        </div>

        <div>
          <label className="label">Photo Evidence</label>
          {visiblePhoto && (
            <div className="mb-3 flex flex-col sm:flex-row items-start gap-3">
              <img src={visiblePhoto} alt="Evidence preview" className="w-full sm:w-64 h-40 object-cover rounded-lg border border-gray-200" />
              <button type="button" onClick={clearPhoto} className="btn-danger btn-sm">Remove image</button>
            </div>
          )}
          <input type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} className="input" />
          <p className="text-xs text-gray-500 mt-2">Choose a JPEG or PNG to replace the current image. Maximum 5 MB.</p>
        </div>

        <div>
          <label className="label">Officer Note</label>
          <textarea
            name="officerNote"
            value={formData.officerNote}
            onChange={handleChange}
            className="input min-h-24 resize-y"
            maxLength="500"
            placeholder="Add a short note for this challan"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button type="button" onClick={() => navigate(`/challans/${id}`)} className="btn-secondary sm:flex-1 py-3">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary sm:flex-1 py-3">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChallanEdit;
