import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

const ChallanList = () => {
  const { user } = useAuth();
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  useEffect(() => {
    fetchChallans();
  }, [page, search]);

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const params = { page, limit, search };
      const response = await api.get('/challans', { params });
      if (response.data.success) {
        setChallans(response.data.data.challans);
        setTotal(response.data.data.pagination.total);
      }
    } catch (err) {
      toast.error('Failed to load challans');
    } finally {
      setLoading(false);
    }
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-navy-900">Challans</h1>
        <Link to="/challans/new" className="btn-primary">
          + New Challan
        </Link>
      </div>

      <div className="card p-6 mb-6">
        <input
          type="text"
          placeholder="Search by violator name or notice number..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input w-full"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner spinner-lg text-navy-600" />
        </div>
      ) : challans.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No challans found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Notice #</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Violator</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Location</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Fine</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {challans.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-navy-900">{c.noticeNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.violatorName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.location}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">₹{c.fineAmount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(c.dateTime).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link to={`/challans/${c._id}`} className="text-navy-700 hover:text-navy-900 font-semibold">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
            <span className="text-sm text-gray-600">Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary py-2 px-3 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm flex items-center px-3">Page {page} of {pages}</span>
              <button
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page === pages}
                className="btn-secondary py-2 px-3 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallanList;
