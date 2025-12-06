import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Cargar variables de entorno (incluyendo las de Vercel que empiezan por VITE_)
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Inyectar la variable VITE_GEMINI_API_KEY en process.env.API_KEY
      // Esto permite que el código use 'process.env.API_KEY' en el navegador
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
    },
  };
});