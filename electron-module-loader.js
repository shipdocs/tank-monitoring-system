// This plugin transforms the index.html to work with Electron's renderer process
export default function electronModuleLoader() {
  return {
    name: 'electron-module-loader',
    transformIndexHtml(html) {
      // For IIFE format, remove type="module" and crossorigin, add defer
      // Fixed regex to properly handle script end tags with optional spaces
      let result = html.replace(
        /<script\s+type="module"\s+crossorigin\s+src="([^"]+)"\s*><\s*\/\s*script\s*>/gi,
        '<script defer src="$1"></script>',
      );

      // Also handle plain script tags - add defer if not present
      // Fixed regex to properly handle script end tags with optional spaces
      result = result.replace(
        /<script\s+src="([^"]+)"\s*><\s*\/\s*script\s*>/gi,
        '<script defer src="$1"></script>',
      );

      return result;
    },
  };
}
