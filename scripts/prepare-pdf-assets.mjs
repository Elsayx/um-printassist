// PDF.js resolves character maps, standard fonts and image codecs by name at runtime.
import { cp, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const source = dirname(require.resolve('pdfjs-dist/package.json'))
const destination = resolve(here, '../public/pdfjs-assets')
await mkdir(destination, { recursive: true })
await cp(resolve(source, 'LICENSE'), resolve(destination, 'LICENSE'))
for (const folder of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  // Some PDF.js versions embed the color profile inside the decoder.
  try {
    await cp(resolve(source, folder), resolve(destination, folder), {
      recursive: true,
    })
  } catch (error) {
    if (folder !== 'iccs' || error.code !== 'ENOENT') throw error
  }
}
