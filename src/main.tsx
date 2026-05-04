import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' // Đảm bảo dòng này trỏ đúng file App của Figma
import './styles/tailwind.css' // Import CSS để có màu tím
import './styles/theme.css'
import './styles/sonner-toast.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)