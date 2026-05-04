import React from 'react';
import Sidebar from './Sidebar'; // Đảm bảo file Sidebar.tsx nằm cùng thư mục này

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* 1. Sidebar cố định bên trái */}
      <aside className="w-64 fixed inset-y-0 left-0 z-50 bg-zinc-950">
        <Sidebar />
      </aside>
      
      {/* 2. Nội dung chính bên phải */}
      {/* pl-64 để nội dung không bị Sidebar đè lên */}
      <main className="flex-1 pl-64 overflow-y-auto min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}