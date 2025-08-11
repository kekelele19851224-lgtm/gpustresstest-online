# Three.js Local Backup Setup (Optional)

For improved reliability, you can optionally download and host Three.js locally as a backup.

## Download Three.js r128

1. Download Three.js r128 from: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
2. Save it as `three.min.js` in your website root directory
3. The website will automatically use this as a backup if all CDNs fail

## File Structure
```
gpustresstest.online/
├── index.html
├── main.js
├── style.css
├── three.min.js (optional backup)
└── other files...
```

## Current CDN Sources (in order)
1. Cloudflare CDN: `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`
2. jsDelivr CDN: `https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js` 
3. unpkg CDN: `https://unpkg.com/three@0.128.0/build/three.min.js`
4. Local backup: `./three.min.js` (if exists)

The website will automatically try these sources in order until one succeeds.