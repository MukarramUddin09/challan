import { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    try {
      const params = filter === 'all' ? {} : { status: filter };
      const response = await api.get('/admin/users', { params });
      if (response.data.success) {
        setUsers(response.data.data.users);
      }
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, userName) => {
    try {
      const response = await api.patch(`/admin/users/${userId}/approve`);
      if (response.data.success) {
        toast.success(`${userName} approved!`);
        fetchUsers();
      }
    } catch (err) {
      toast.error('Failed to approve user');
    }
  };

  const handleRevoke = async (userId, userName) => {
    if (window.confirm(`Revoke access for ${userName}?`)) {
      try {
        const response = await api.patch(`/admin/users/${userId}/revoke`);
        if (response.data.success) {
          toast.success(`${userName} revoked!`);
          fetchUsers();
        }
      } catch (err) {
        toast.error('Failed to revoke user');
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
      <h1 className="text-3xl font-bold text-navy-900 mb-6">User Management</h1>

      <div className="card p-6 mb-6 flex gap-3">
        {['all', 'pending', 'approved', 'revoked'].map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setLoading(true); }}
            className={`px-4 py-2 rounded font-medium ${
              filter === s
                ? 'bg-navy-700 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {users.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No users found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Division</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-navy-900">{u.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.division}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      u.status === 'approved' ? 'bg-green-100 text-green-800' :
                      u.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    {u.status === 'pending' && u.role !== 'admin' && (
                      <button
                        onClick={() => handleApprove(u._id, u.name)}
                        className="btn-secondary py-1 px-3 text-xs"
                      >
                        Approve
                      </button>
                    )}
                    {u.status !== 'revoked' && u.role !== 'admin' && (
                      <button
                        onClick={() => handleRevoke(u._id, u.name)}
                        className="text-red-600 hover:text-red-800 font-semibold text-xs"
                      >
                        Revoke
                      </button>
                    )}
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

export default AdminUsers;
