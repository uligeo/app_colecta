import type { ReactNode } from 'react'

/** Negritas y enlaces dentro de una línea, construidos como elementos (sin HTML inyectado). */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(
      m[1] ? (
        <b key={m.index}>{m[1]}</b>
      ) : (
        <a key={m.index} href={m[3]} target="_blank" rel="noreferrer">
          {m[2]}
        </a>
      ),
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

/** Convierte el subconjunto de Markdown usado en los documentos legales: títulos, párrafos y listas. */
export function renderMarkdown(source: string): ReactNode[] {
  const out: ReactNode[] = []
  let list: string[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) out.push(<p key={out.length}>{inline(para.join(' '))}</p>)
    if (list.length) out.push(<ul key={out.length}>{list.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>)
    para = []
    list = []
  }
  for (const raw of source.split('\n')) {
    const line = raw.trim()
    if (!line) {
      flush()
    } else if (line.startsWith('# ')) {
      flush()
      out.push(<h1 key={out.length}>{line.slice(2)}</h1>)
    } else if (line.startsWith('## ')) {
      flush()
      out.push(<h2 key={out.length}>{line.slice(3)}</h2>)
    } else if (line.startsWith('- ')) {
      if (para.length) flush()
      list.push(line.slice(2))
    } else {
      if (list.length) flush()
      para.push(line)
    }
  }
  flush()
  return out
}
