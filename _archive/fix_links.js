const fs = require('fs');
const path = require('path');
const files = [
  'app/impresa/catalogo/CatalogoForm.tsx',
  'app/impresa/dico/nuova/NuovaDiCoForm.tsx',
  'app/impresa/dico/nuova/page.tsx',
  'app/impresa/fatture-passive/nuova/NuovaFatturaPassivaForm.tsx',
  'app/impresa/fatture-passive/nuova/page.tsx',
  'app/impresa/fatture/nuova/NuovaFatturaForm.tsx',
  'app/impresa/fatture/nuova/page.tsx',
  'app/ufficio/fatture-passive/nuova/NuovaFatturaPassivaFormUfficio.tsx',
  'app/ufficio/fatture/nuova/NuovaFatturaFormUfficio.tsx',
  'app/ufficio/ordini/nuovo/OrdineFormUfficio.tsx',
  'app/operaio/giornata/[id]/lavori/FlussoGiornata.tsx'
];

for (const relPath of files) {
  const file = path.join('c:/Users/luigi/Desktop/quadro/Desktop/quadro', relPath);
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('<a href="/')) {
    content = content.replace(/<a href="\//g, '<Link href="/');
    content = content.replace(/<\/a>/g, '</Link>');
    changed = true;
  }
  if (content.includes('<a href={`/')) {
    content = content.replace(/<a href=\{\`/g, '<Link href={`');
    content = content.replace(/<\/a>/g, '</Link>');
    changed = true;
  }

  if (changed && !content.includes('import Link')) {
    content = content.replace(/('use client'|'use server');?(\r?\n)/, "$1$2import Link from 'next/link';$2");
    if (!content.includes('import Link')) {
        content = "import Link from 'next/link';\n" + content;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed:', relPath);
  }
}
