const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// 创建图标目录
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 创建 SVG 图标内容
const svgContent = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="80" fill="#3b82f6"/>
  <path d="M256 64L352 192H256V64Z" fill="white"/>
  <path d="M256 448L160 320H256V448Z" fill="white"/>
  <path d="M64 256L256 160V256H64Z" fill="white"/>
  <path d="M448 256L256 352V256H448Z" fill="white"/>
  <circle cx="256" cy="256" r="64" fill="#1e40af"/>
  <circle cx="256" cy="256" r="32" fill="white"/>
</svg>
`;

// 生成不同尺寸的 PNG 图标
async function generateIcons() {
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✓ Generated icon-${size}x${size}.png`);
  }

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);

