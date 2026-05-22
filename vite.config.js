export default {
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: () => undefined
      }
    }
  },
  server: {
    open: true,
    host: 'localhost',
    port: 5173
  }
}
