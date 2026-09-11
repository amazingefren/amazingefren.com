import { useEffect, useRef, useState } from 'react';
import type {
  EvidencePort,
  EvidenceSource,
  EvidenceState,
} from '../contracts/index.ts';
import './styles.css';

export function EvidenceWorkbench({
  port,
}: {
  audience: 'guest' | 'owner';
  port: EvidencePort;
}) {
  const [state, setState] = useState<EvidenceState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [kind, setKind] = useState<'claim' | 'observation'>('claim');
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [filter, setFilter] = useState<'all' | 'claim' | 'observation'>('all');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const current = state?.records.find((item) => item.id === selected) ?? null;
  const dirty =
    text !== (current?.text ?? '') ||
    source !==
      (current?.sources.map((item) => item.reference).join('\n') ?? '');
  function restore() {
    setText(current?.text ?? '');
    setSource(current?.sources.map((item) => item.reference).join('\n') ?? '');
  }
  useEffect(() => {
    void run({ operation: 'evidence.read' });
  }, []);
  useEffect(() => {
    if (current) {
      setKind(current.kind);
      setText(current.text);
      setSource(current.sources.map((item) => item.reference).join('\n'));
    }
  }, [current]);
  useEffect(() => {
    const block = (event: Event) => {
      if (dirty || busy) {
        event.preventDefault();
        setMessage('Save or discard your edits before leaving.');
      }
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty || busy) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('writing:before-navigate', block);
    window.addEventListener('beforeunload', unload);
    return () => {
      window.removeEventListener('writing:before-navigate', block);
      window.removeEventListener('beforeunload', unload);
    };
  }, [dirty, busy]);
  async function run(command: Parameters<EvidencePort['execute']>[0]) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await port.execute(command);
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      if ('value' in result) {
        setState(result.value);
        if (command.operation === 'evidence.create')
          setSelected(result.value.records.at(-1)?.id ?? null);
      } else {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(result.report, null, 2)], {
            type: 'application/json',
          }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = result.report.synthetic
          ? 'synthetic-reviewed-evidence.json'
          : 'reviewed-evidence.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      setMessage('Evidence could not be saved. Your edits remain here.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function choose(id: string | null) {
    if (dirty) {
      setMessage('Save or discard your edits before changing records.');
      return;
    }
    setSelected(id);
    setText('');
    setSource('');
    setMessage('');
  }
  function sources(): EvidenceSource[] {
    const values: EvidenceSource[] = [];
    for (const reference of source
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)) {
      const previous = current?.sources.find(
        (item) =>
          item.reference === reference &&
          !values.some((value) => value.id === item.id),
      );
      let index = 1;
      while (
        values.some((item) => item.id === `source-${index}`) ||
        current?.sources.some((item) => item.id === `source-${index}`)
      )
        index++;
      values.push(
        previous ?? {
          id: `source-${index}`,
          label: `Source ${index}`,
          reference,
        },
      );
    }
    return values;
  }
  const reviewed = current?.review === 'reviewed';
  return (
    <section className="evidence-workbench">
      <header>
        <h1>Evidence</h1>
        <button
          disabled={
            busy || !state?.records.some((item) => item.review === 'reviewed')
          }
          onClick={() => void run({ operation: 'evidence.export-reviewed' })}
        >
          Export reviewed
        </button>
      </header>
      {message && (
        <p className="ws-error" role="alert">
          {message}
        </p>
      )}
      <div className="evidence-grid">
        <aside>
          <label>
            Filter
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as typeof filter)
              }
            >
              <option value="all">All records</option>
              <option value="claim">Claims</option>
              <option value="observation">Observations</option>
            </select>
          </label>
          <div className="evidence-list">
            {state?.records
              .filter((item) => filter === 'all' || item.kind === filter)
              .map((item) => (
                <button
                  key={item.id}
                  disabled={busy}
                  aria-pressed={item.id === selected}
                  onClick={() => choose(item.id)}
                >
                  <span>{item.kind}</span>
                  <strong>{item.text}</strong>
                  <small>{item.review}</small>
                </button>
              ))}
          </div>
        </aside>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (reviewed) return;
            void run(
              current
                ? {
                    operation: 'evidence.update',
                    id: current.id,
                    revision: current.revision,
                    input: { text, sources: sources() },
                  }
                : {
                    operation: 'evidence.create',
                    input: { kind, text, sources: sources() },
                  },
            );
          }}
        >
          {current && (
            <p>
              {current.review} · revision {current.revision}
            </p>
          )}
          <label>
            Type
            <select
              value={kind}
              disabled={busy || Boolean(current)}
              onChange={(event) => setKind(event.target.value as typeof kind)}
            >
              <option value="claim">Claim</option>
              <option value="observation">Observation</option>
            </select>
          </label>
          <label>
            Record
            <textarea
              required
              maxLength={20000}
              readOnly={reviewed || busy}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <label>
            Sources
            <textarea
              readOnly={reviewed || busy}
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="One source reference per line"
            />
          </label>
          <div className="evidence-actions">
            <button
              type="submit"
              className="ws-primary"
              disabled={busy || reviewed || !text.trim() || !dirty}
            >
              {current ? 'Save revision' : 'Add record'}
            </button>
            {current && (
              <button
                type="button"
                disabled={busy || dirty || reviewed || !current.sources.length}
                onClick={() =>
                  void run({
                    operation: 'evidence.review',
                    id: current.id,
                    revision: current.revision,
                  })
                }
              >
                Review
              </button>
            )}
            {dirty && (
              <button type="button" disabled={busy} onClick={restore}>
                Discard edits
              </button>
            )}
            {current && (
              <button
                type="button"
                disabled={busy}
                onClick={() => choose(null)}
              >
                New record
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
