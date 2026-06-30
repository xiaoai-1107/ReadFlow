const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const rootDir = path.resolve(__dirname, '..')
const envFiles = ['.env', '.env.local', '.env.translate.local']

for (const fileName of envFiles) {
  const filePath = path.join(rootDir, fileName)
  if (!fs.existsSync(filePath)) {
    continue
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, equalsIndex).trim()
    let value = trimmed.slice(equalsIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

const config = {
  port: Number(process.env.READFLOW_TRANSLATION_PORT || 8787),
  host: process.env.READFLOW_TRANSLATION_HOST || process.env.READFLOW_TRANSLATION_BIND_HOST || '127.0.0.1',
  endpoint: process.env.BAIDU_TRANSLATE_ENDPOINT || 'https://fanyi-api.baidu.com/api/trans/vip/translate',
  appId: process.env.BAIDU_TRANSLATE_APP_ID || process.env.BAIDU_TRANSLATE_APPID || '',
  secretKey: process.env.BAIDU_TRANSLATE_SECRET_KEY || process.env.BAIDU_TRANSLATE_KEY || '',
  defaultFrom: process.env.BAIDU_TRANSLATE_FROM || 'auto',
  defaultTo: process.env.BAIDU_TRANSLATE_TO || 'zh',
  maxChars: Number(process.env.BAIDU_TRANSLATE_MAX_CHARS || 5000),
  timeoutMs: Number(process.env.BAIDU_TRANSLATE_TIMEOUT_MS || 30000),
  allowedOrigins: new Set(
    (process.env.READFLOW_TRANSLATION_ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
  )
}

function sendJson(response, statusCode, payload, origin) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin || 'http://127.0.0.1:5173',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  })
  response.end(JSON.stringify(payload))
}

function resolveCorsOrigin(request) {
  const origin = request.headers.origin
  if (!origin) {
    return 'http://127.0.0.1:5173'
  }

  if (config.allowedOrigins.has('*') || config.allowedOrigins.has(origin)) {
    return origin
  }

  return null
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', chunk => {
      body += chunk
      if (body.length > 1024 * 1024) {
        request.destroy()
        reject(new Error('Request body is too large.'))
      }
    })
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('Request body must be valid JSON.'))
      }
    })
    request.on('error', reject)
  })
}

function normalizeLanguage(language) {
  const value = String(language || '').trim().toLowerCase()
  if (!value) {
    return config.defaultTo
  }

  if (value === 'zh-cn' || value === 'zh-hans' || value === 'cn') {
    return 'zh'
  }

  if (value === 'zh-tw' || value === 'zh-hant') {
    return 'cht'
  }

  if (value.startsWith('en')) {
    return 'en'
  }

  if (value.startsWith('ja')) {
    return 'jp'
  }

  if (value.startsWith('ko')) {
    return 'kor'
  }

  return value
}

function md5(input) {
  return crypto.createHash('md5').update(input).digest('hex')
}

function createError(status, code, message) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

async function callBaiduTranslate({ text, targetLanguage, requestId }) {
  if (!config.appId || !config.secretKey) {
    throw createError(503, 'baidu_provider_not_configured', 'Baidu Translate APP ID or secret key is missing.')
  }

  const cleanText = String(text || '').trim()
  if (!cleanText) {
    throw createError(400, 'empty_text', 'Text is required.')
  }

  if (cleanText.length > config.maxChars) {
    throw createError(413, 'text_too_long', `Text is longer than ${config.maxChars} characters.`)
  }

  const salt = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const to = normalizeLanguage(targetLanguage)
  const sign = md5(`${config.appId}${cleanText}${salt}${config.secretKey}`)
  const params = new URLSearchParams({
    q: cleanText,
    from: config.defaultFrom,
    to,
    appid: config.appId,
    salt,
    sign
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

  let response
  try {
    response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params,
      signal: controller.signal
    })
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw createError(504, 'baidu_timeout', 'Baidu Translate request timed out.')
    }
    throw createError(502, 'baidu_request_failed', 'Could not reach Baidu Translate.')
  } finally {
    clearTimeout(timeout)
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw createError(502, 'baidu_invalid_response', 'Baidu Translate returned an invalid response.')
  }

  if (!response.ok || payload.error_code) {
    const errorCode = payload.error_code ? `baidu_${payload.error_code}` : 'baidu_http_error'
    const errorMessage = payload.error_msg || `Baidu Translate returned ${response.status}.`
    throw createError(502, errorCode, errorMessage)
  }

  const translatedText = Array.isArray(payload.trans_result)
    ? payload.trans_result.map(item => String(item.dst || '').trim()).filter(Boolean).join('\n')
    : ''

  if (!translatedText) {
    throw createError(502, 'baidu_empty_result', 'Baidu Translate returned an empty result.')
  }

  return {
    translatedText,
    provider: 'baidu-fanyi',
    requestId: requestId || null
  }
}

async function handleTranslate(request, response, origin) {
  let body
  try {
    body = await readJsonBody(request)
  } catch (error) {
    sendJson(response, 400, {
      error: 'invalid_request',
      message: error.message
    }, origin)
    return
  }

  try {
    const result = await callBaiduTranslate({
      text: body.text,
      targetLanguage: body.targetLanguage,
      requestId: body.requestId
    })
    sendJson(response, 200, result, origin)
  } catch (error) {
    sendJson(response, error.status || 500, {
      error: error.code || 'translation_failed',
      message: error.message || 'Translation failed.'
    }, origin)
  }
}

const server = http.createServer((request, response) => {
  const origin = resolveCorsOrigin(request)
  if (!origin) {
    sendJson(response, 403, {
      error: 'origin_not_allowed',
      message: 'Origin is not allowed by the translation proxy.'
    }, null)
    return
  }

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {}, origin)
    return
  }

  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`)

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, {
      ok: true,
      provider: 'baidu-fanyi',
      configured: Boolean(config.appId && config.secretKey)
    }, origin)
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/translate') {
    void handleTranslate(request, response, origin)
    return
  }

  sendJson(response, 404, {
    error: 'not_found',
    message: 'Use POST /api/translate.'
  }, origin)
})

server.listen(config.port, config.host, () => {
  const displayHost = config.host === '0.0.0.0' ? '127.0.0.1' : config.host
  console.log(`ReadFlow Baidu translation proxy listening on http://${displayHost}:${config.port}`)
  if (config.host === '0.0.0.0') {
    console.log('LAN access enabled. Use your computer LAN IP from the mobile device.')
  }
  console.log(`Provider configured: ${config.appId && config.secretKey ? 'yes' : 'no'}`)
})
