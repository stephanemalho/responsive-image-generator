# Responsive Image Generator

App locale Next.js pour deposer une ou plusieurs images associees et generer un ZIP responsive en AVIF, WebP et JPEG.

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

1. Deposez ou selectionnez une ou plusieurs images JPEG, PNG ou WebP statiques.
2. Ajustez le nom du dossier si besoin.
3. Cliquez sur `Generer le ZIP`.

Avec une seule image, le ZIP suit cette structure :

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

Avec plusieurs images, elles sont stockees dans le meme dossier et partagent le meme nom de base. Chaque image recoit un numero apres le nom de base :

```text
nom-chien/
  avif/
    nom-chien-1-mobile.avif
    nom-chien-1-tablet.avif
    nom-chien-1-desktop.avif
    nom-chien-2-mobile.avif
    nom-chien-2-tablet.avif
    nom-chien-2-desktop.avif
  webp/
    nom-chien-1-mobile.webp
    nom-chien-2-mobile.webp
  jpeg/
    nom-chien-1-mobile.jpeg
    nom-chien-2-mobile.jpeg
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
- En selection multiple, la limite de 25 MB s'applique a chaque image

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

- Taille d'upload maximale : 25 MB par image
- Formats acceptes : JPEG, PNG, WebP statique
- Formats refuses : SVG, GIF anime, HEIC/HEIF
- Traitement en memoire, adapte a l'usage local et aux petites demos
- Demo Vercel : gardez le lot sous environ 4 MB au total. Les Vercel Functions limitent le corps de requete et de reponse a 4.5 MB, ce qui inclut l'upload et le ZIP genere.

## Vercel

Une demo Vercel est possible avec la route API en runtime Node.js (`export const runtime = "nodejs"`). Gardez les limites serverless en tete : taille de body, memoire disponible et duree d'execution peuvent varier selon l'offre et la configuration. La v1 locale accepte des images plus lourdes que la demo Vercel.

Pour une v2 SaaS, stocker les resultats dans Cloudflare R2 avec URLs publiques ou signees serait une evolution naturelle. Cela contournerait la limite de 4.5 MB en envoyant les fichiers vers un stockage objet plutot que dans le corps de la reponse Vercel.

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run build
```
