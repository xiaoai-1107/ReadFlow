interface ReaderDebugEvent {
  type: string
  at: number
  details: Record<string, unknown>
}

interface ReaderDebugStore {
  enabled: boolean
  events: ReaderDebugEvent[]
  counters: Record<string, number>
  state: Record<string, unknown>
  samples: Record<string, Record<string, unknown>[]>
}

declare global {
  interface Window {
    __READFLOW_DEBUG__?: ReaderDebugStore
  }
}

const DEBUG_QUERY_KEY = 'rfDebug'
const DEBUG_SESSION_KEY = '__READFLOW_DEBUG__'
const MAX_EVENT_COUNT = 400
const MAX_SAMPLE_COUNT = 80

export function isReaderDebugEnabled() {
  if (typeof window === 'undefined') {
    return false
  }

  const queryValue = new URLSearchParams(window.location.search).get(DEBUG_QUERY_KEY)
  if (queryValue === '1') {
    window.sessionStorage.setItem(DEBUG_SESSION_KEY, '1')
    return true
  }

  return window.sessionStorage.getItem(DEBUG_SESSION_KEY) === '1'
}

function createDebugStore(): ReaderDebugStore {
  return {
    enabled: true,
    events: [],
    counters: {},
    state: {},
    samples: {}
  }
}

export function getReaderDebugStore(): ReaderDebugStore | null {
  if (!isReaderDebugEnabled() || typeof window === 'undefined') {
    return null
  }

  window.__READFLOW_DEBUG__ ??= createDebugStore()
  return window.__READFLOW_DEBUG__
}

export function pushReaderDebugEvent(type: string, details: Record<string, unknown> = {}) {
  const store = getReaderDebugStore()
  if (!store) {
    return
  }

  store.events.push({
    type,
    at: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    details
  })

  if (store.events.length > MAX_EVENT_COUNT) {
    store.events.splice(0, store.events.length - MAX_EVENT_COUNT)
  }

  console.log('[ReadFlowDebug]', type, details)
}

export function incrementReaderDebugCounter(name: string, amount = 1) {
  const store = getReaderDebugStore()
  if (!store) {
    return
  }

  store.counters[name] = (store.counters[name] ?? 0) + amount
}

export function mergeReaderDebugState(patch: Record<string, unknown>) {
  const store = getReaderDebugStore()
  if (!store) {
    return
  }

  Object.assign(store.state, patch)
}

export function appendReaderDebugSample(bucket: string, sample: Record<string, unknown>) {
  const store = getReaderDebugStore()
  if (!store) {
    return
  }

  const target = store.samples[bucket] ?? []
  target.push(sample)
  if (target.length > MAX_SAMPLE_COUNT) {
    target.splice(0, target.length - MAX_SAMPLE_COUNT)
  }
  store.samples[bucket] = target
}
