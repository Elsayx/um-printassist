// Development-only catalogue check; TypeScript is already a project dependency.
import ts from 'typescript'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const parse = file => ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
const walk = (node, visit) => { visit(node); ts.forEachChild(node, child => walk(child, visit)) }
const keys = new Set()
for (const file of ['messages', 'validation', 'directory']) {
  walk(parse(`src/i18n/${file}.ts`), node => {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name)) keys.add(node.name.text)
  })
}
const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(join(directory, entry.name)) : /\.tsx$/.test(entry.name) ? [join(directory, entry.name)] : [],
)
const missing = new Set()
const invariant = /^(Print|Assist|UM|N|m|A[34] · [\d ×]+mm)$/
for (const file of files('src')) {
  walk(parse(file), node => {
    if (!ts.isCallExpression(node) || node.expression.getText() !== 't') return
    const first = node.arguments[0]
    if (!first || !ts.isStringLiteral(first)) return
    const text = first.text.replace(/\s+/g, ' ').trim()
    if (/[A-Za-z]/.test(text) && !keys.has(text) && !invariant.test(text)) missing.add(text)
  })
}
if (missing.size) {
  console.error('Missing translations:\n' + [...missing].sort().join('\n'))
  process.exitCode = 1
} else console.log(`All static UI messages have Chinese and Portuguese translations (${keys.size} catalogue entries).`)
