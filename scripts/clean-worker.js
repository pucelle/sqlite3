const fs = require('node:fs')


const filePath = __dirname + '/../out/worker/index.js'
let text = fs.readFileSync(filePath).toString('utf8')
text = text.replace('Object.defineProperty(exports, "__esModule", { value: true });\n', '')
fs.writeFileSync(filePath, text)
