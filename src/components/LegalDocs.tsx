import { useEffect, useState } from 'react'
import { LEGAL_DOCS, loadLegalDoc, type LegalDoc } from '../legal/documents'
import { renderMarkdown } from '../legal/markdown'

/** Pestañas con el aviso de privacidad y los términos de uso. */
export function LegalDocs({ initial = 'privacidad' }: { initial?: LegalDoc }) {
  const [doc, setDoc] = useState<LegalDoc>(initial)
  const [texts, setTexts] = useState<Partial<Record<LegalDoc, string>>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (texts[doc]) return
    let alive = true
    loadLegalDoc(doc)
      .then((t) => alive && setTexts((prev) => ({ ...prev, [doc]: t })))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [doc, texts])

  return (
    <div className="legal">
      <div className="tabs" role="tablist">
        {(Object.keys(LEGAL_DOCS) as LegalDoc[]).map((d) => (
          <button key={d} type="button" role="tab" aria-selected={doc === d} className={doc === d ? 'active' : ''} onClick={() => setDoc(d)}>
            {LEGAL_DOCS[d].title}
          </button>
        ))}
      </div>
      <article className="legal-body">
        {texts[doc] ? renderMarkdown(texts[doc]!) : error ? <p className="text-alta">{error}</p> : <p className="muted">Cargando…</p>}
      </article>
    </div>
  )
}
