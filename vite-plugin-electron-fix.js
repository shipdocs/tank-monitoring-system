export default function electronModuleFix() {
  return {
    name: 'electron-module-fix',
    transformIndexHtml(html) {
      // For Electron compatibility, we need to ensure scripts load correctly
      // Remove type="module" and add defer instead
      return html.replace(
        /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
        '<script defer src="$1"></script>',
      );
    },
  };
}
