import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, 'public', 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function render(size, outputPath) {
  try {
    const resvg = new Resvg(svgBuffer, {
      fitTo: {
        mode: 'width',
        value: size,
      },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    
    fs.writeFileSync(outputPath, pngBuffer);
    console.log(`Successfully generated icon size ${size}x${size} at: ${outputPath}`);
  } catch (error) {
    console.error(`Failed to generate icon size ${size}:`, error);
  }
}

async function main() {
  console.log('Generating premium PWA icons from SVG vector structure...');
  
  await render(192, path.join(__dirname, 'public', 'icon-192.png'));
  await render(512, path.join(__dirname, 'public', 'icon-512.png'));
  await render(180, path.join(__dirname, 'public', 'apple-touch-icon.png'));
  await render(32, path.join(__dirname, 'public', 'favicon-32.png'));
  await render(16, path.join(__dirname, 'public', 'favicon-16.png'));
  
  console.log('All launcher resources generated successfully!');
}

main().catch(console.error);
