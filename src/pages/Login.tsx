import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Đang gửi yêu cầu đăng nhập...");

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      console.log("Phản hồi từ Server:", response.data);

      if (response.data) {
        // Đảm bảo dữ liệu khớp với Interface User trong AuthContext
        const userData = {
          ...response.data,
          favoriteGenres: response.data.favoriteGenres || [],
          favoriteArtists: response.data.favoriteArtists || []
        };

        login(userData); 
        console.log("Đăng nhập thành công, đang chuyển hướng...");

        // Chuyển hướng sau một khoảng nghỉ cực ngắn để Context kịp lưu
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 100);
      }
    } catch (error: any) {
      console.error("Lỗi đăng nhập:", error);
      alert(error.response?.data?.message || "Sai tài khoản hoặc mật khẩu!");
    }
  }; // Kết thúc hàm handleLogin

  return (
    <div style={{ backgroundColor: '#111827', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <form onSubmit={handleLogin} style={{ 
        padding: '40px', 
        backgroundColor: '#1f2937', 
        borderRadius: '8px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px',
        width: '320px',
        color: 'white'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Đăng nhập</h2>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          style={{ padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#374151', color: 'white' }}
          required 
        />
        <input 
          type="password" 
          placeholder="Mật khẩu" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          style={{ padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#374151', color: 'white' }}
          required 
        />
        <button type="submit" style={{ 
          padding: '10px', 
          backgroundColor: '#2563eb', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}>
          Xác nhận
        </button>
      </form>
    </div>
  );
}