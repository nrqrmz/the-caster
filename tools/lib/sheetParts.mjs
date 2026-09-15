// tools/lib/sheetParts.mjs
// PURE (no fs). Texto de un módulo de partes GENERADO a partir de resultados de convertFigure.
// Lo usan los generadores por hoja de referencia (gen-fire-basics, gen-fire-advanced).
const hex = (c) => `0x${c.toString(16).padStart(6, '0')}`;
// `size` solo cuando el cuadro del cuerpo no mide 32: los módulos de cuerpo 32 no cambian.
const bodyText = (b) => `{ x: ${b.x}, y: ${b.y}${b.size != null && b.size !== 32 ? `, size: ${b.size}` : ''} }`;

// results: [[key, { gridW, gridH, body, colors, rows }], …] en el orden de salida.
// header: líneas de comentario literales. prefix: prefijo de cada parte ('fb_', 'fa_').
export function renderSheetParts(results, { header, prefix, metaName, partsName }) {
  const lines = [
    ...header,
    '',
    `export const ${metaName} = {`,
    ...results.map(([key, r]) => `  ${key}: { gridW: ${r.gridW}, gridH: ${r.gridH}, body: ${bodyText(r.body)} },`),
    '};',
    '',
    `export const ${partsName} = {`,
  ];
  for (const [key, r] of results) {
    lines.push(
      `  ${prefix}${key}: {`,
      `    res: 32, w: ${r.gridW}, h: ${r.gridH}, anchor: { x: 0, y: 0 },`,
      `    colors: { ${Object.entries(r.colors).map(([ch, c]) => `'${ch}': ${hex(c)}`).join(', ')} },`,
      '    down: [',
      ...r.rows.map((row) => `      '${row}',`),
      '    ],',
      '  },',
    );
  }
  lines.push('};', '');
  return lines.join('\n');
}
