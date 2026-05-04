import React, { useState, useEffect } from 'react';
import axios from 'axios';

// 1. Định nghĩa kiểu dữ liệu cho một bản ghi phân phối
interface Distribution {
  id: number;
  artistName: string;
  status: 'pending' | 'approved' | string; // Giúp TypeScript hiểu các trạng thái của text
  submittedDate: string;
}

// 2. Định nghĩa kiểu dữ liệu cho phản hồi từ API Backend
interface ApiResponse {
  success: boolean;
  data: Distribution[];
}

const DistributionList: React.FC = () => {
  // 3. Khai báo kiểu dữ liệu cho State
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const userId = 1;

  useEffect(() => {
    const fetchDistributions = async () => {
      try {
        // 4. Ép kiểu cho response của axios
        const response = await axios.get<ApiResponse>(`http://localhost:5000/api/distributions?userId=${userId}`);
        
        if (response.data.success) {
          setDistributions(response.data.data);
        } else {
          setError("Không thể lấy dữ liệu từ hệ thống.");
        }
      } catch (err) {
        console.error("Lỗi Frontend:", err);
        setError("Lỗi kết nối đến Server. Hãy kiểm tra Backend đã chạy chưa.");
      } finally {
        setLoading(false);
      }
    };

    fetchDistributions();
  }, []);

  if (loading) return <div className="p-5 text-white">Đang tải dữ liệu...</div>;
  if (error) return <div className="p-5 text-red-500">{error}</div>;

  return (
    <div className="p-5 font-sans">
      <h2 className="text-xl font-bold mb-4 text-white">Danh sách yêu cầu phân phối nhạc</h2>
      <table className="w-full border-collapse text-left text-zinc-300">
        <thead className="bg-zinc-800">
          <tr>
            <th className="p-3 border border-zinc-700">ID</th>
            <th className="p-3 border border-zinc-700">Tên Nghệ Sĩ</th>
            <th className="p-3 border border-zinc-700">Trạng Thái</th>
            <th className="p-3 border border-zinc-700"> Ngày Gửi</th>
          </tr>
        </thead>
        <tbody>
          {distributions.length > 0 ? (
            distributions.map((item) => (
              <tr key={item.id} className="border border-zinc-700 hover:bg-zinc-800/50">
                <td className="p-3">#{item.id}</td>
                <td className="p-3 font-medium">{item.artistName}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    item.status === 'pending' 
                      ? 'bg-yellow-500/20 text-yellow-500' 
                      : 'bg-green-500/20 text-green-500'
                  }`}>
                    {item.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-3 text-zinc-500">{item.submittedDate}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="p-3 text-center border border-zinc-700">Không có yêu cầu nào.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DistributionList;