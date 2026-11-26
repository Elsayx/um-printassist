import {
  getDocument,
  GlobalWorkerOptions,
} from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

export interface DocumentPage {
  widthMm: number
  heightMm: number
  thumbnail: string
}

export interface SourceDocument {
  name: string
  kind: 'pdf' | 'image'
  pages: DocumentPage[]
  warnings: string[]
  pixelSize?: { width: number; height: number }
}

const maxBytes = 20 * 1024 * 1024
const maxPages = 50
const thumbnailEdge = 880
const maxImagePixels = 40_000_000

const sampleNames = new Set([
  'lecture_handout_12p.pdf',
  'lecture_notes.pdf',
  'group_report.pdf',
  'slides_16x9.pdf',
  'mixed_sizes.pdf',
  'sample_image.png',
  'malformed.pdf',
])

function assetUrl(path: string) {
  return new URL(import.meta.env.BASE_URL + path, document.baseURI).href
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const context = canvas.getContext('2d', { alpha: false })
  if (!context)
    throw new Error(
      'This browser could not start a document preview. Try another browser.',
    )
  return { canvas, context }
}

function sizeChanged(page: DocumentPage, first: DocumentPage) {
  return (
    Math.abs(page.widthMm - first.widthMm) > 1 ||
    Math.abs(page.heightMm - first.heightMm) > 1
  )
}

class PreviewError extends Error {}

async function readPdf(file: File): Promise<SourceDocument> {
  const assetRoot = assetUrl('pdfjs-assets/')
  const loading = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    isEvalSupported: false,
    stopAtErrors: true,
    cMapUrl: assetRoot + 'cmaps/',
    cMapPacked: true,
    standardFontDataUrl: assetRoot + 'standard_fonts/',
    wasmUrl: assetRoot + 'wasm/',
    iccUrl: assetRoot + 'iccs/',
    canvasMaxAreaInBytes: 24 * 1024 * 1024,
  })
  try {
    const pdf = await loading.promise
    if (pdf.numPages > maxPages) {
      throw new PreviewError(
        'This prototype previews up to 50 PDF pages. Export a smaller page range and try again.',
      )
    }
    if (!pdf.numPages)
      throw new PreviewError(
        'This PDF has no pages. Choose a document with at least one page.',
      )
    const pages: DocumentPage[] = []
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index)
      const original = page.getViewport({ scale: 1 })
      if (
        !Number.isFinite(original.width) ||
        !Number.isFinite(original.height) ||
        Math.min(original.width, original.height) <= 0
      ) {
        throw new PreviewError(
          'A page has invalid dimensions. Export this document as a new PDF.',
        )
      }
      const viewport = page.getViewport({
        scale: thumbnailEdge / Math.max(original.width, original.height),
      })
      const { canvas, context } = makeCanvas(viewport.width, viewport.height)
      try {
        await page.render({
          canvas,
          canvasContext: context,
          viewport,
          background: 'white',
        }).promise
        pages.push({
          widthMm: (original.width * 25.4) / 72,
          heightMm: (original.height * 25.4) / 72,
          thumbnail: canvas.toDataURL('image/webp', 0.87),
        })
      } finally {
        // iOS retains canvas backing stores until the dimensions are released.
        canvas.width = canvas.height = 0
        page.cleanup()
      }
    }
    const warnings = pages.some((page) => sizeChanged(page, pages[0]))
      ? [
          'The source contains different page sizes or orientations. A single output paper size may scale pages differently.',
        ]
      : []
    return { name: file.name, kind: 'pdf', pages, warnings }
  } catch (error) {
    if (error instanceof PreviewError) throw error
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new Error(
        'This PDF is password-protected. Choose an unlocked copy you are allowed to use.',
      )
    }
    throw new Error(
      'This PDF could not be previewed. It may be damaged or unreadable. Export a fresh PDF and choose it again.',
    )
  } finally {
    await loading.destroy()
  }
}

function imageDimensions(data: DataView, png: boolean) {
  if (png && data.byteLength >= 24 && data.getUint32(12) === 0x49484452) {
    return { width: data.getUint32(16), height: data.getUint32(20) }
  }
  // Read JPEG start-of-frame before asking a phone to decode a large image.
  if (!png) {
    for (let offset = 2; offset + 4 < data.byteLength; ) {
      if (data.getUint8(offset++) !== 0xff) break
      while (offset < data.byteLength && data.getUint8(offset) === 0xff)
        offset++
      if (offset + 2 >= data.byteLength) break
      const marker = data.getUint8(offset++)
      if (marker === 0xda || marker === 0xd9) break
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
      const length = data.getUint16(offset)
      if (length < 2 || offset + length > data.byteLength) break
      const startOfFrame =
        marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
      if (startOfFrame && length >= 8) {
        return {
          width: data.getUint16(offset + 5),
          height: data.getUint16(offset + 3),
        }
      }
      offset += length
    }
  }
  throw new Error(
    'This image has an invalid header. Export a new JPEG or PNG and try again.',
  )
}

async function readImage(file: File, png: boolean): Promise<SourceDocument> {
  const dimensions = imageDimensions(
    new DataView(await file.arrayBuffer()),
    png,
  )
  if (!dimensions.width || !dimensions.height)
    throw new Error('This image has no usable dimensions.')
  if (dimensions.width * dimensions.height > maxImagePixels) {
    throw new Error(
      'This image is over the 40-megapixel preview limit. Resize it and try again.',
    )
  }

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () =>
        reject(
          new Error(
            'This image could not be opened. Export a new JPEG or PNG and try again.',
          ),
        )
      image.src = url
    })
    const width = image.naturalWidth
    const height = image.naturalHeight
    const scale = Math.min(1, thumbnailEdge / Math.max(width, height))
    const { canvas, context } = makeCanvas(width * scale, height * scale)
    try {
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const warnings = [
        `Image: ${width} × ${height} px. Physical size assumes 96 pixels per inch; actual print quality may vary.`,
      ]
      return {
        name: file.name,
        kind: 'image',
        warnings,
        pixelSize: { width, height },
        pages: [
          {
            widthMm: (width * 25.4) / 96,
            heightMm: (height * 25.4) / 96,
            thumbnail: canvas.toDataURL('image/webp', 0.87),
          },
        ],
      }
    } finally {
      canvas.width = canvas.height = 0
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function loadFile(file: File): Promise<SourceDocument> {
  if (!file.size)
    throw new Error(
      'This file is empty. Choose a file with at least one page or image.',
    )
  if (file.size > maxBytes)
    throw new Error(
      'This file exceeds the 20 MB preview limit. Choose a smaller file.',
    )
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (
    ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'odt', 'odp', 'txt'].includes(
      extension ?? '',
    )
  ) {
    throw new Error(
      'Layout cannot be verified for this format. Open the document in its original app, export it as a PDF, then choose that PDF.',
    )
  }
  if (!extension || !['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) {
    throw new Error(
      'Choose a PDF, JPEG or PNG. For other documents, export a PDF from the original app.',
    )
  }
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer())
  if (
    extension === 'pdf' &&
    new TextDecoder('ascii').decode(head).includes('%PDF-')
  )
    return readPdf(file)
  const isPng = extension === 'png'
  const signature = isPng
    ? [137, 80, 78, 71, 13, 10, 26, 10]
    : [0xff, 0xd8, 0xff]
  if (
    extension !== 'pdf' &&
    signature.every((byte, index) => head[index] === byte)
  )
    return readImage(file, isPng)
  throw new Error(
    'The file contents do not match its extension. Re-export the original as a PDF, JPEG or PNG.',
  )
}

const sampleCache = new Map<string, Promise<SourceDocument>>()

export async function loadSample(filename: string): Promise<SourceDocument> {
  if (!sampleNames.has(filename))
    throw new Error('This sample document is unavailable.')
  const previous = sampleCache.get(filename)
  if (previous) return previous
  const pending = (async () => {
    const response = await fetch(assetUrl('samples/' + filename))
    if (!response.ok)
      throw new Error(
        'This sample could not be loaded. Check the connection to the prototype and try again.',
      )
    return loadFile(new File([await response.blob()], filename))
  })()
  sampleCache.set(filename, pending)
  try {
    return await pending
  } catch (error) {
    sampleCache.delete(filename)
    throw error
  }
}
