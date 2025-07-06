# 🔐 Code Signing Setup voor Tank Monitoring System

Code signing is essentieel voor auto-updates en voorkomt beveiligingswaarschuwingen bij gebruikers.

## 📋 Overzicht

### Waarom Code Signing?
- **Vertrouwen**: Gebruikers zien geen "Unknown Publisher" waarschuwingen
- **Auto-updates**: Vereist voor betrouwbare auto-updates op Windows en macOS
- **Beveiliging**: Garandeert dat de software niet is gewijzigd

### Huidige Status
- ❌ **Windows**: Geen code signing (gebruikers krijgen waarschuwingen)
- ❌ **macOS**: Geen code signing (gebruikers krijgen waarschuwingen)
- ✅ **Linux**: Geen code signing vereist

## 🪟 Windows Code Signing

### Certificaat verkrijgen
1. **Optie 1: EV Code Signing Certificate** (Aanbevolen)
   - Providers: DigiCert, Sectigo, GlobalSign
   - Kosten: €300-500 per jaar
   - Voordeel: Directe SmartScreen reputatie

2. **Optie 2: Standard Code Signing Certificate**
   - Goedkoper: €100-200 per jaar
   - Nadeel: SmartScreen waarschuwingen tot reputatie is opgebouwd

### Configuratie
```json
// package.json - Windows signing
"win": {
  "certificateFile": "path/to/certificate.p12",
  "certificatePassword": "password",
  "signingHashAlgorithms": ["sha256"],
  "timeStampServer": "http://timestamp.digicert.com"
}
```

### GitHub Actions Secrets
```
WIN_CSC_LINK: base64 encoded certificate
WIN_CSC_KEY_PASSWORD: certificate password
```

## 🍎 macOS Code Signing

### Apple Developer Account
1. **Apple Developer Program**: $99/jaar
2. **Developer ID Application Certificate** aanvragen
3. **Developer ID Installer Certificate** voor .pkg bestanden

### Configuratie
```json
// package.json - macOS signing
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)",
  "hardenedRuntime": true,
  "entitlements": "build/entitlements.mac.plist",
  "entitlementsInherit": "build/entitlements.mac.plist"
}
```

### Entitlements bestand
```xml
<!-- build/entitlements.mac.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

### GitHub Actions Secrets
```
APPLE_ID: Apple ID email
APPLE_ID_PASSWORD: App-specific password
CSC_LINK: base64 encoded certificate
CSC_KEY_PASSWORD: certificate password
```

## 🔧 Implementatie Stappen

### 1. Certificaten verkrijgen
- [ ] Windows: EV Code Signing Certificate bestellen
- [ ] macOS: Apple Developer Account + certificates

### 2. GitHub Secrets configureren
- [ ] WIN_CSC_LINK en WIN_CSC_KEY_PASSWORD
- [ ] APPLE_ID, APPLE_ID_PASSWORD, CSC_LINK, CSC_KEY_PASSWORD

### 3. package.json updaten
- [ ] Windows signing configuratie toevoegen
- [ ] macOS signing configuratie toevoegen

### 4. Entitlements bestand maken
- [ ] build/entitlements.mac.plist aanmaken

### 5. Workflow updaten
- [ ] Environment variables toevoegen aan GitHub Actions

## 📝 Tijdelijke Oplossing

Tot code signing is geïmplementeerd:

### Windows
- Gebruikers krijgen SmartScreen waarschuwing
- Instructies: "More info" → "Run anyway"

### macOS
- Gebruikers krijgen Gatekeeper waarschuwing
- Instructies: System Preferences → Security → "Open Anyway"

## 💰 Kosten Overzicht

| Platform | Certificaat Type | Jaarlijkse Kosten | Voordelen |
|----------|------------------|-------------------|-----------|
| Windows | EV Code Signing | €300-500 | Directe reputatie |
| Windows | Standard | €100-200 | Goedkoper |
| macOS | Developer ID | $99 | Apple ecosystem |

## 🚀 Prioriteit

1. **Hoog**: Windows EV Certificate (meeste gebruikers)
2. **Medium**: macOS Developer ID
3. **Laag**: Windows Standard (als budget beperkt is)

## 📚 Resources

- [Electron Code Signing](https://www.electron.build/code-signing)
- [Windows Code Signing](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
- [macOS Code Signing](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
