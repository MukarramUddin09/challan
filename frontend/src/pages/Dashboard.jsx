import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const endpoint = isAdmin ? '/admin/stats' : '/stats/my-division';
        const response = await api.get(endpoint);
        if (response.data.success) {
          setStats(response.data.data.stats);
        }
      } catch (err) {
        toast.error('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner spinner-lg text-navy-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome, {user?.name}</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon="📋" label="Total Challans" value={stats.totalChallans || 0} />
          <StatCard icon="₹" label="Total Fines" value={`₹${(stats.totalFines || 0).toLocaleString('en-IN')}`} />
          <StatCard icon="📬" label="Recent (7d)" value={stats.recentChallans || 0} />
          <StatCard icon="📈" label="Violations Sent Today" value={stats.violationsSentToday || 0} />
        </div>
      )}

      {isAdmin && stats?.byDivision && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-navy-900 mb-4">Challans by Division</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-navy-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Division</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Count</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Total Fines</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.byDivision.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-navy-900">{d._id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{d.count}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">₹{d.totalFines.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report generation */}
      {isAdmin && (
        <div className="mt-8 card p-6">
          <h2 className="text-xl font-bold text-navy-900 mb-4">Generate Violations Report</h2>
          <div className="flex gap-3 items-end">
            <div>
              <label className="label">Start Date</label>
              <input type="date" id="report-start" className="input" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" id="report-end" className="input" />
            </div>
            <div className="ml-auto">
              <button
                onClick={async () => {
                  const s = document.getElementById('report-start').value;
                  const e = document.getElementById('report-end').value;
                  if (!s || !e) {
                    toast.error('Please choose start and end dates');
                    return;
                  }
                  try {
                    const res = await api.post('/admin/reports', { startDate: s, endDate: e }, { responseType: 'blob' });
                    const url = window.URL.createObjectURL(res.data);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `violations-report-${s}-${e}.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    link.parentNode.removeChild(link);
                    toast.success('Report downloaded');
                  } catch (err) {
                    toast.error('Failed to generate report');
                  }
                }}
                className="btn-primary py-2"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="card p-6 flex items-start gap-4">
    <div className="text-3xl">{icon}</div>
    <div className="flex-1">
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold text-navy-900 mt-1">{value}</p>
    </div>
  </div>
);

export default Dashboard;
