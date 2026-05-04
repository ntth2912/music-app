import React from 'react';
// Sử dụng @ để trỏ thẳng vào thư mục src (theo cấu hình vite.config.ts của bạn)
import DistributionList from '../../components/DistributionList';

const DistributionPage: React.FC = () => {
    return (
        <div className="p-4"> 
            {/* Tận dụng Tailwind CSS đã cài trong Vite của bạn */}
            <h1 className="text-xl font-bold text-white mb-4">Quản lý Phân phối</h1>
            <DistributionList />
        </div>
    );
};

export default DistributionPage;