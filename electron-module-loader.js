// This plugin transforms the index.html to work with Electron's renderer process
export default function electronModuleLoader() {
  return {
    name: 'electron-module-loader',
    transformIndexHtml(html) {
      // For IIFE format, remove type="module" and crossorigin, add defer
      let result = html.replace(
        /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
        '<script defer src="$1"></script>'
      );
      
      // Also handle plain script tags - add defer if not present
      result = result.replace(
        /<script src="([^"]+)"><\/script>/g,
        '<script defer src="$1"></script>'
      );
      
      return result;
    },
  };
}