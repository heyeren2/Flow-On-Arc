import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        // Manual chunks for better caching - vendor code changes less often
        manualChunks: {
          // Core React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Ethereum libraries (largest chunks)
          'vendor-ethers': ['ethers'],
          'vendor-wagmi': ['wagmi', 'viem', '@tanstack/react-query'],
          // Wallet connectors (loaded when needed)
          'vendor-rainbowkit': ['@rainbow-me/rainbowkit'],
          // UI libraries
          'vendor-ui': ['framer-motion', 'lucide-react'],
        },
      },
      onwarn(warning, warn) {
        // Suppress specific warnings that might cause build failures
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        warn(warning);
      },
    },
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['ethers', 'wagmi', '@rainbow-me/rainbowkit'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});

