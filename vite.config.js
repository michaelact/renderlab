export default {
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      input: 'index.html',
      output: {
        inlineDynamicImports: true
      }
    }
  },
  plugins: [
    {
      name: 'inline-assets',
      apply: 'build',
      enforce: 'post',
      async generateBundle(_, bundle) {
        const htmlFile = bundle['index.html'];
        if (!htmlFile) return;

        let html = htmlFile.source;

        // Find and inline CSS files
        for (const [fileName, asset] of Object.entries(bundle)) {
          if (fileName.endsWith('.css')) {
            const css = asset.source;
            html = html.replace(
              new RegExp(`<link[^>]*href="[^"]*${fileName.split('/').pop()}"[^>]*>`),
              `<style>${css}</style>`
            );
          }
        }

        // Find and inline JS files
        for (const [fileName, asset] of Object.entries(bundle)) {
          if (fileName.endsWith('.js')) {
            const js = asset.code;
            html = html.replace(
              new RegExp(`<script[^>]*src="[^"]*${fileName.split('/').pop()}"[^>]*></script>`),
              `<script>${js}</script>`
            );
          }
        }

        htmlFile.source = html;

        // Remove the separate asset files from the bundle
        for (const fileName of Object.keys(bundle)) {
          if (fileName.endsWith('.js') || fileName.endsWith('.css')) {
            delete bundle[fileName];
          }
        }
      }
    }
  ],
  server: {
    open: true,
    host: 'localhost',
    port: 5173
  }
}
