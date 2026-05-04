import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url' // Thêm dòng này
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Định nghĩa lại __dirname cho môi trường ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '');
        // Dùng path.resolve kết hợp với __dirname mới định nghĩa
        return path.resolve(__dirname, 'src/assets', filename);
      }
      return null;
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias này giúp Hiền viết import từ '@/components/...' gọn hơn
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Đảm bảo các file này được xử lý như tài sản tĩnh
  assetsInclude: ['**/*.svg', '**/*.csv'],
})