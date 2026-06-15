// diag-extract.js — ручная распаковка кэшированного Electron тем же extract-zip,
// что использует electron-packager, но с полным перехватом ошибок.
// Запуск:  node diag-extract.js

const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

process.on('unhandledRejection', (e) => { console.error('UNHANDLED REJECTION:', e); process.exit(1) })
process.on('uncaughtException', (e) => { console.error('UNCAUGHT EXCEPTION:', e); process.exit(1) })

async function main() {
  // 1. Находим кэшированный zip Electron
  const cacheRoot = path.join(process.env.LOCALAPPDATA || os.homedir(), 'electron', 'Cache')
  console.log('Cache root:', cacheRoot)
  let zipPath = null
  if (fs.existsSync(cacheRoot)) {
    for (const sub of fs.readdirSync(cacheRoot)) {
      const dir = path.join(cacheRoot, sub)
      if (!fs.statSync(dir).isDirectory()) continue
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith('.zip')) zipPath = path.join(dir, f)
      }
    }
  }
  // запасной вариант — кастомный кэш из electron_config_cache
  if (!zipPath && process.env.electron_config_cache) {
    const c = process.env.electron_config_cache
    if (fs.existsSync(c)) {
      const walk = (d) => fs.readdirSync(d).forEach((f) => {
        const p = path.join(d, f)
        if (fs.statSync(p).isDirectory()) walk(p)
        else if (f.endsWith('.zip')) zipPath = p
      })
      walk(c)
    }
  }
  if (!zipPath) { console.error('НЕ НАЙДЕН zip Electron в кэше'); process.exit(2) }

  const sizeMB = (fs.statSync(zipPath).size / 1048576).toFixed(1)
  console.log('Найден zip:', zipPath, `(${sizeMB} MB)`)

  // 2. Целевая папка распаковки
  const dest = path.join('C:\\build', 'diag-extract-out')
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  console.log('Распаковываю в:', dest)

  // 3. Тот же extract-zip, что и у electron-packager
  const extract = require('extract-zip')
  let count = 0
  await extract(zipPath, {
    dir: dest,
    onEntry: (entry) => {
      count++
      if (count <= 5 || count % 50 === 0) console.log('  entry', count, entry.fileName)
    },
  })

  // 4. Проверяем результат
  const exe = path.join(dest, 'electron.exe')
  console.log('ГОТОВО. Файлов распаковано:', count)
  console.log('electron.exe на месте:', fs.existsSync(exe))
  if (fs.existsSync(exe)) {
    console.log('Размер electron.exe:', (fs.statSync(exe).size / 1048576).toFixed(1), 'MB')
  }
}

main().then(() => console.log('SUCCESS')).catch((e) => {
  console.error('EXTRACT FAILED:')
  console.error(e && e.stack ? e.stack : e)
  process.exit(1)
})
