import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const patchPath = resolve(process.argv[2] || 'YumeAI-fixes-v2.patch')
const patch = await readFile(patchPath, 'utf8')
const lines = patch.replaceAll('\r\n', '\n').split('\n')
const changes = []
let filePath = ''
let hunk = null

function saveHunk() {
  if (filePath && hunk)
    changes.push({ filePath, oldText: hunk.old.join('\n'), newText: hunk.new.join('\n') })
  hunk = null
}

for (const line of lines) {
  if (line.startsWith('diff --git ')) {
    saveHunk()
    filePath = ''
    continue
  }
  if (line.startsWith('+++ b/')) {
    filePath = line.slice(6)
    continue
  }
  if (line.startsWith('@@')) {
    saveHunk()
    hunk = { old: [], new: [] }
    continue
  }
  if (!hunk)
    continue
  if (line.startsWith(' ')) {
    hunk.old.push(line.slice(1))
    hunk.new.push(line.slice(1))
  }
  else if (line.startsWith('-')) {
    hunk.old.push(line.slice(1))
  }
  else if (line.startsWith('+')) {
    hunk.new.push(line.slice(1))
  }
}
saveHunk()

if (!changes.length)
  throw new Error('Không tìm thấy thay đổi trong file patch.')

const grouped = new Map()
for (const change of changes) {
  const list = grouped.get(change.filePath) || []
  list.push(change)
  grouped.set(change.filePath, list)
}

let changedFiles = 0
for (const [relativePath, fileChanges] of grouped) {
  const absolutePath = resolve(relativePath)
  let original
  try {
    original = await readFile(absolutePath, 'utf8')
  }
  catch {
    throw new Error(`Không tìm thấy file: ${relativePath}. Hãy chạy lệnh tại thư mục gốc của project.`)
  }

  const usesCrlf = original.includes('\r\n')
  let content = original.replaceAll('\r\n', '\n')
  let changed = false

  for (const { oldText, newText } of fileChanges) {
    if (content.includes(oldText)) {
      content = content.replace(oldText, newText)
      changed = true
      continue
    }
    if (content.includes(newText))
      continue
    throw new Error(`Không tìm thấy đoạn mã cần sửa trong: ${relativePath}. File có thể khác phiên bản trên GitHub.`)
  }

  if (changed) {
    await writeFile(absolutePath, usesCrlf ? content.replaceAll('\n', '\r\n') : content, 'utf8')
    changedFiles++
    console.log(`Đã sửa: ${relativePath}`)
  }
  else {
    console.log(`Đã có sẵn thay đổi: ${relativePath}`)
  }
}

console.log(`Hoàn tất. Đã cập nhật ${changedFiles} file.`)
