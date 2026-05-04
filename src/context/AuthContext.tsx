import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
  // Thêm dấu ? và đảm bảo luôn có mảng mặc định khi login
  favoriteGenres: string[]; 
  favoriteArtists: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: any) => void;
  logout: () => void;
  updateUser: (newData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  const login = (serverData: any) => {
    // CHỈNH SỬA TẠI ĐÂY: Đảm bảo favoriteGenres luôn là mảng, không bị undefined
    const normalizedUser: User = {
      ...serverData,
      id: serverData.user_id || serverData.id,
      favoriteGenres: serverData.favoriteGenres || [], // Nếu server không trả về thì để mảng rỗng
      favoriteArtists: serverData.favoriteArtists || []
    };

    setUser(normalizedUser);
    localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const updateUser = (newData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...newData };
      localStorage.setItem('currentUser', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};