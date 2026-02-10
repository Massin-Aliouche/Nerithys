const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

const inputPath = path.resolve(__dirname, '../css/tailwind-input.css');
const outputPath = path.resolve(__dirname, '../css/style.css');

async function build() {
  try {
    const css = await fs.promises.readFile(inputPath, 'utf8');
    const result = await postcss([tailwindcss('./tailwind.config.cjs'), autoprefixer]).process(css, {
      from: inputPath,
      to: outputPath,
      map: { inline: false }
    });

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, result.css, 'utf8');
    if (result.map) {
      await fs.promises.writeFile(outputPath + '.map', result.map.toString(), 'utf8');
    }

    console.log('CSS généré ->', outputPath);
    process.exit(0);
  } catch (err) {
    console.error('Erreur lors de la génération du CSS:', err);
    process.exit(1);
  }
}

build();
