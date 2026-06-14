# Responsive Image Generator

App locale Next.js pour deposer une image et generer un ZIP responsive en AVIF, WebP et JPEG.

## Stack

- Next.js App Router, React 19, TypeScript
- `sharp` cote serveur Node.js pour les conversions
- `jszip` pour construire l'archive telechargee
- Sortie locale uniquement en v1, sans stockage cloud

## Installation

```bash
npm install
npm run dev
```

Ouvrez ensuite `http://localhost:3000`.

## Usage

1. Deposez ou selectionnez une image JPEG, PNG ou WebP statique.
2. Ajustez le nom du dossier si besoin.
3. Cliquez sur `Generer le ZIP`.

Le ZIP suit cette structure :

```text
nom-image/
  avif/
    nom-image-mobile.avif
    nom-image-tablet.avif
    nom-image-desktop.avif
  webp/
    nom-image-mobile.webp
    nom-image-tablet.webp
    nom-image-desktop.webp
  jpeg/
    nom-image-mobile.jpeg
    nom-image-tablet.jpeg
    nom-image-desktop.jpeg
  manifest.json
```

## Presets et formats

- Mobile : 480 px
- Tablet : 768 px
- Desktop : 1200 px
- Ratio original conserve, sans crop
- Pas d'upscale : si la source est plus petite qu'un preset, la largeur source est utilisee et le manifest contient un avertissement
- Qualites : JPEG 82, WebP 78, AVIF 50
- Metadonnees EXIF supprimees par defaut

## Exemple HTML

```html
<picture>
  <source
    type="image/avif"
    srcset="
      /images/hero/avif/hero-mobile.avif 480w,
      /images/hero/avif/hero-tablet.avif 768w,
      /images/hero/avif/hero-desktop.avif 1200w
    "
  />
  <source
    type="image/webp"
    srcset="
      /images/hero/webp/hero-mobile.webp 480w,
      /images/hero/webp/hero-tablet.webp 768w,
      /images/hero/webp/hero-desktop.webp 1200w
    "
  />
  <img
    src="/images/hero/jpeg/hero-desktop.jpeg"
    srcset="
      /images/hero/jpeg/hero-mobile.jpeg 480w,
      /images/hero/jpeg/hero-tablet.jpeg 768w,
      /images/hero/jpeg/hero-desktop.jpeg 1200w
    "
    sizes="(max-width: 640px) 480px, (max-width: 1024px) 768px, 1200px"
    width="1200"
    height="675"
    alt=""
  />
</picture>
```

## Limites v1

- Taille d'upload maximale : 25 MB
- Formats acceptes : JPEG, PNG, WebP statique
- Formats refuses : SVG, GIF anime, HEIC/HEIF
- Traitement en memoire, adapte a l'usage local et aux petites demos

## Vercel

Une demo Vercel est possible avec la route API en runtime Node.js (`export const runtime = "nodejs"`). Gardez les limites serverless en tete : taille de body, memoire disponible et duree d'execution peuvent varier selon l'offre et la configuration. Pour une v2 SaaS, stocker les resultats dans Cloudflare R2 avec URLs publiques ou signees serait une evolution naturelle.

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run build
```
