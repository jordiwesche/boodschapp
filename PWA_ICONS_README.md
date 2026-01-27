# PWA Icons Setup

De PWA heeft app icons nodig voor installatie op verschillende devices.

## Vereiste Icons

Maak de volgende icon bestanden en plaats ze in `/public`:

1. **icon-192x192.png** - 192x192 pixels (Android)
2. **icon-512x512.png** - 512x512 pixels (Android, splash screen)

## Icon Design Tips

- Gebruik een simpele, herkenbare icon
- Zorg voor goede contrast (voor maskable icons)
- Test op verschillende achtergronden
- Gebruik transparante achtergrond of witte achtergrond

## Tools om Icons te Maken

- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)

## Tijdelijke Placeholder

Totdat de echte icons gemaakt zijn, kun je tijdelijke placeholder icons gebruiken:

```bash
# Maak een simpele placeholder (vereist ImageMagick)
convert -size 192x192 xc:#3b82f6 -pointsize 72 -fill white -gravity center -annotate +0+0 "🛒" public/icon-192x192.png
convert -size 512x512 xc:#3b82f6 -pointsize 200 -fill white -gravity center -annotate +0+0 "🛒" public/icon-512x512.png
```

Of gebruik een online tool om een emoji-based icon te genereren.
