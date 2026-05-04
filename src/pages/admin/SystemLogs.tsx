import { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Info, XCircle, Filter, Download } from 'lucide-react';

export default function SystemLogs() {
  const [filterType, setFilterType] = useState<'all' | 'info' | 'warning' | 'error' | 'success'>('all');

  const logs = [
    { id: 1, type: 'success', message: 'Bài hát "Lạc Trôi" đã được phê duyệt', user: 'Admin #1', timestamp: '2024-04-26 14:30:25', details: 'Song ID: 1, Artist: Sơn Tùng MTP' },
    { id: 2, type: 'info', message: 'Người dùng mới đăng ký: listener@music.com', user: 'System', timestamp: '2024-04-26 14:25:10', details: 'User ID: 1, Role: Listener' },
    { id: 3, type: 'warning', message: 'Số lượng request API vượt ngưỡng 80%', user: 'System Monitor', timestamp: '2024-04-26 14:20:05', details: 'Current: 8000/10000 requests/hour' },
    { id: 4, type: 'error', message: 'Upload file thất bại do vượt quá dung lượng', user: 'Artist #3', timestamp: '2024-04-26 14:15:30', details: 'File size: 150MB, Limit: 100MB' },
    { id: 5, type: 'success', message: 'Chiến dịch quảng cáo "Concert Mùa Hè" đã được kích hoạt', user: 'Advertiser #4', timestamp: '2024-04-26 14:10:15', details: 'Budget: 8,000,000đ, Duration: 60 days' },
    { id: 6, type: 'info', message: 'Database backup hoàn tất thành công', user: 'System', timestamp: '2024-04-26 14:00:00', details: 'Backup size: 2.5GB, Duration: 12 minutes' },
    { id: 7, type: 'warning', message: 'Phát hiện nội dung vi phạm bản quyền tiềm năng', user: 'Content Filter', timestamp: '2024-04-26 13:55:20', details: 'Song ID: 15, Similarity: 87%' },
    { id: 8, type: 'error', message: 'Kết nối database tạm thời bị gián đoạn', user: 'System', timestamp: '2024-04-26 13:50:45', details: 'Duration: 3 seconds, Auto-recovered' },
    { id: 9, type: 'success', message: 'Gợi ý cá nhân hóa đã được cập nhật cho 1,234 người dùng', user: 'Recommendation Engine', timestamp: '2024-04-26 13:45:00', details: 'Processing time: 45 seconds' },
    { id: 10, type: 'info', message: 'Nghệ sĩ "Sơn Tùng MTP" đã upload bài hát mới', user: 'Artist #3', timestamp: '2024-04-26 13:40:30', details: 'Song: "Making My Way", Genre: EDM' },
  ];

  const filteredLogs = filterType === 'all' ? logs : logs.filter(log => log.type === filterType);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getLogBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-600/10 border-green-600/30';
      case 'error': return 'bg-red-600/10 border-red-600/30';
      case 'warning': return 'bg-yellow-600/10 border-yellow-600/30';
      default: return 'bg-blue-600/10 border-blue-600/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black text-white p-6">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Activity className="w-10 h-10 text-blue-400" />
              System Logs
            </h1>
            <p className="text-gray-400">Giám sát hoạt động và sự kiện hệ thống</p>
          </div>

          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-all">
            <Download className="w-5 h-5" />
            Xuất Logs
          </button>
        </div>

        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filterType === 'all' ? 'bg-purple-600' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Tất cả ({logs.length})
          </button>
          <button
            onClick={() => setFilterType('info')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              filterType === 'info' ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <Info className="w-4 h-4" />
            Info ({logs.filter(l => l.type === 'info').length})
          </button>
          <button
            onClick={() => setFilterType('success')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              filterType === 'success' ? 'bg-green-600' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Success ({logs.filter(l => l.type === 'success').length})
          </button>
          <button
            onClick={() => setFilterType('warning')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              filterType === 'warning' ? 'bg-yellow-600' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Warning ({logs.filter(l => l.type === 'warning').length})
          </button>
          <button
            onClick={() => setFilterType('error')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              filterType === 'error' ? 'bg-red-600' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <XCircle className="w-4 h-4" />
            Error ({logs.filter(l => l.type === 'error').length})
          </button>
        </div>

        <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium">Loại</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Thời gian</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Thông báo</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Người dùng</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getLogBgColor(log.type)} border`}>
                        {getLogIcon(log.type)}
                        <span className="text-sm capitalize">{log.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{log.timestamp}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{log.message}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{log.user}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-600/20 border border-blue-600/30 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-6 h-6 text-blue-400" />
              <span className="text-2xl font-bold">{logs.filter(l => l.type === 'info').length}</span>
            </div>
            <p className="text-sm text-gray-400">Thông báo thông tin</p>
          </div>

          <div className="bg-green-600/20 border border-green-600/30 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span className="text-2xl font-bold">{logs.filter(l => l.type === 'success').length}</span>
            </div>
            <p className="text-sm text-gray-400">Hoạt động thành công</p>
          </div>

          <div className="bg-yellow-600/20 border border-yellow-600/30 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold">{logs.filter(l => l.type === 'warning').length}</span>
            </div>
            <p className="text-sm text-gray-400">Cảnh báo</p>
          </div>

          <div className="bg-red-600/20 border border-red-600/30 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-6 h-6 text-red-400" />
              <span className="text-2xl font-bold">{logs.filter(l => l.type === 'error').length}</span>
            </div>
            <p className="text-sm text-gray-400">Lỗi hệ thống</p>
          </div>
        </div>
      </div>
    </div>
  );
}
