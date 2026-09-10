import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ThemeControl } from '../../../design/ui/index.ts';
import { Editor, MarkdownPreview } from './Editor.tsx';
import type { Command, Publication, PublicationFields, StudioDocument, StudioProps, StudioState } from '../../../contracts/writing/index.ts';

const fieldsOf = (item: Publication): PublicationFields => ({ title: item.title, slug: item.slug, summary: item.summary, tags: item.tags, seoTitle: item.seoTitle, seoDescription: item.seoDescription, coverAssetId: item.coverAssetId });
const stamp = (value: string) => new Date(value).toLocaleDateString();
function download(name: string, content: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

export function PublicationsView(props: StudioProps) {
  const [state, setState] = useState(props.state);
  const [drafts, setDrafts] = useState<Record<string, StudioDocument>>({});
  const [metas, setMetas] = useState<Record<string, PublicationFields>>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState('');
  const [preview, setPreview] = useState(false);
  const [tools, setTools] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [tagText, setTagText] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const createDialog = useRef<HTMLDialogElement>(null);
  const options = useRef<HTMLDialogElement>(null);
  const chapters = useRef<HTMLDialogElement>(null);
  const release = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);
  const attempted = useRef('');
  useEffect(() => setState(props.state), [props.state]);
  useEffect(() => { setActive(''); setPreview(false); setTools(false); setTagText(null); setMessage(''); }, [props.recordId]);
  const project = state.publications.find(item => item.id === props.recordId);
  const source = project ? project.chapterIds.map(id => state.documents.find(item => item.id === id)).filter((item): item is StudioDocument => Boolean(item)) : [];
  const stored = source.find(item => item.id === active) ?? source[0];
  const chapter = stored ? drafts[stored.id] ?? stored : null;
  const fields = project ? metas[project.id] ?? fieldsOf(project) : null;
  const changed = source.filter(item => drafts[item.id]).map(item => drafts[item.id]);
  const dirty = Boolean(project && metas[project.id]) || changed.length > 0;
  const signature = JSON.stringify([props.recordId, changed, project && metas[project.id], retry]);
  useEffect(() => {
    props.onDirtyChange?.(dirty || saving);
    const block = (event: Event) => { if (dirty || saving) { event.preventDefault(); setMessage('Save your changes before leaving.'); } };
    const unload = (event: BeforeUnloadEvent) => { if (dirty || saving) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('writing:before-navigate', block);
    window.addEventListener('beforeunload', unload);
    return () => { window.removeEventListener('writing:before-navigate', block); window.removeEventListener('beforeunload', unload); props.onDirtyChange?.(false); };
  }, [dirty, saving, props.onDirtyChange]);
  async function run(command: Command): Promise<StudioState | null> {
    const result = await props.execute(command);
    if (result.ok) { setState(result.value); return result.value; }
    setMessage(result.error.message);
    return null;
  }
  function updateChapter(patch: Partial<StudioDocument>) {
    if (stored) setDrafts(all => ({ ...all, [stored.id]: { ...(all[stored.id] ?? stored), ...patch } }));
  }
  function updateMeta(patch: Partial<PublicationFields>) {
    if (!project) return;
    setMetas(all => ({ ...all, [project.id]: { ...(all[project.id] ?? fieldsOf(project)), ...patch } }));
    if (patch.title !== undefined && project.kind !== 'book') updateChapter({ title: patch.title });
  }
  async function save() {
    if (!project || locked.current || props.busy) return;
    locked.current = true; setSaving(true); setMessage('');
    let latest = state;
    try {
      for (const draft of changed) {
        const next = await run({ operation: 'studio.notes.save', input: { id: draft.id, expectedRevision: draft.revision, title: draft.title, body: draft.body, tags: draft.tags, collection: draft.collection, pinned: draft.pinned } });
        if (!next) return;
        latest = next;
        const saved = next.documents.find(item => item.id === draft.id)!;
        setDrafts(all => { const rest = { ...all }; if (rest[draft.id] === draft) delete rest[draft.id]; else if (rest[draft.id]) rest[draft.id] = { ...rest[draft.id], revision: saved.revision, revisions: saved.revisions }; return rest; });
      }
      const meta = metas[project.id];
      if (meta) {
        const current = latest.publications.find(item => item.id === project.id)!;
        if (await run({ operation: 'publishing.projects.update', input: { id: project.id, expectedVersion: current.version, fields: meta } })) setMetas(all => { const rest = { ...all }; if (rest[project.id] === meta) delete rest[project.id]; return rest; });
      }
    } finally { locked.current = false; setSaving(false); }
  }
  useEffect(() => {
    if (!dirty || saving || props.busy || attempted.current === signature) return;
    const timer = setTimeout(() => { attempted.current = signature; void save(); }, 1000);
    return () => clearTimeout(timer);
  }, [signature, dirty, saving, props.busy]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = await run({ operation: 'publishing.projects.create', input: { kind: form.get('kind') as Publication['kind'], title: String(form.get('title')) } });
    if (next) { createDialog.current?.close(); props.navigate('publishing', next.publications.at(-1)?.id); }
  }
  async function publish() {
    if (!project || dirty || locked.current || props.busy) return;
    locked.current = true; setSaving(true); setMessage('');
    try {
      let current = project;
      if (current.stage !== 'review') {
        const reviewed = await run({ operation: 'publishing.projects.review', input: { id: current.id, expectedVersion: current.version } });
        if (!reviewed) return;
        current = reviewed.publications.find(item => item.id === project.id)!;
      }
      if (await run({ operation: 'publishing.projects.publish', input: { id: current.id, expectedVersion: current.version } })) { release.current?.close(); setMessage(props.audience === 'guest' ? 'Guest release saved.' : 'Published.'); }
    } finally { locked.current = false; setSaving(false); }
  }
  if (!props.recordId) {
    const publications = state.publications.filter(item => (filter === 'all' || (filter === 'drafts' ? item.stage === 'draft' || item.stage === 'review' : item.stage === filter)) && `${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
    return <section className="publication-library"><header><h1>Publications</h1><button className="ws-primary" disabled={props.busy} onClick={() => createDialog.current?.showModal()}>New publication</button></header>{message && <p role="alert">{message}</p>}<div className="publication-filters"><nav aria-label="Publication status">{[['all', 'All'], ['drafts', 'Drafts'], ['published', 'Published']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</nav><input aria-label="Search publications" placeholder="Find a publication..." value={query} onChange={event => setQuery(event.target.value)} /></div><div className="publication-rows">{publications.map(item => <button key={item.id} onClick={() => props.navigate('publishing', item.id)}><span><strong>{item.title}</strong><small>{item.kind}{item.kind === 'book' ? ` / ${item.chapterIds.length} chapters` : ''}</small></span><span><small>{item.stage}</small><time>{stamp(item.updatedAt)}</time></span></button>)}</div>{!publications.length && <p className="publication-empty">No publications here yet.</p>}<dialog className="ws-dialog" ref={createDialog}><form onSubmit={create}><h2>New publication</h2><label>Title<input name="title" required autoFocus /></label><label>Format<select name="kind"><option value="article">Article</option><option value="page">Page</option><option value="book">Book</option></select></label><div className="studio-actions"><button type="button" onClick={() => createDialog.current?.close()}>Cancel</button><button className="ws-primary" disabled={props.busy}>Create</button></div></form></dialog></section>;
  }
  if (!project || !fields) return <section className="publication-library"><p>Publication not found.</p><button onClick={() => props.navigate('publishing')}>Publications</button></section>;
  return <section className="zen-writer"><header className="zen-toolbar"><div><button onClick={() => { if (dirty || saving) { void save(); return; } props.navigate('publishing'); }}>Publications</button><span className="zen-save-state" role="status">{saving ? 'Saving...' : dirty ? 'Unsaved' : 'Saved'}</span></div><div>{project.kind === 'book' && <button onClick={() => chapters.current?.showModal()}>Chapters</button>}<button aria-pressed={preview} onClick={() => setPreview(!preview)}>{preview ? 'Write' : 'Preview'}</button><button onClick={() => options.current?.showModal()}>Options</button><button className="ws-primary" disabled={props.busy || saving || dirty || !chapter} onClick={() => release.current?.showModal()}>{project.live ? 'Update' : 'Publish'}</button></div></header><div className="zen-manuscript">{message && <p className="studio-notice" role="alert">{message}{dirty && <button onClick={() => setRetry(value => value + 1)}>Retry save</button>}</p>}{chapter ? <>{project.kind === 'book' && <p className="zen-book-context">{fields.title} / Chapter {project.chapterIds.indexOf(chapter.id) + 1}</p>}{preview ? <h1 className="zen-title">{project.kind === 'book' ? chapter.title : fields.title}</h1> : <input className="zen-title" aria-label="Publication title" value={project.kind === 'book' ? chapter.title : fields.title} onChange={event => project.kind === 'book' ? updateChapter({ title: event.target.value }) : updateMeta({ title: event.target.value })} />}<Editor key={chapter.id} value={chapter.body} onChange={body => updateChapter({ body })} onSave={() => void save()} assets={state.assets} busy={saving || props.busy} quiet previewMode={preview} toolsMode={tools} /></> : <><h1>{fields.title}</h1><button className="ws-primary" disabled={props.busy} onClick={() => void run({ operation: 'publishing.projects.add-chapter', input: { id: project.id, expectedVersion: project.version, title: 'Chapter 1' } })}>Add first chapter</button></>}</div><dialog className="zen-panel ws-dialog" ref={options}><div className="zen-panel-heading"><h2>Publication settings</h2><button onClick={() => options.current?.close()}>Close</button></div><div className="zen-panel-content"><button onClick={() => { options.current?.close(); setTools(!tools); }}>Images and writing tools</button><button onClick={() => { options.current?.close(); props.navigate('media'); }}>Media library</button><ThemeControl />{project.kind === 'book' && <label>Book title<input value={fields.title} onChange={event => updateMeta({ title: event.target.value })} /></label>}<label>URL slug<input value={fields.slug} onChange={event => updateMeta({ slug: event.target.value })} /></label><label>Summary<textarea value={fields.summary} onChange={event => updateMeta({ summary: event.target.value })} /></label><label>Tags<input value={tagText ?? fields.tags.join(', ')} onChange={event => { setTagText(event.target.value); updateMeta({ tags: event.target.value.split(',').map(item => item.trim()).filter(Boolean) }); }} /></label><label>Cover image<select value={fields.coverAssetId ?? ''} onChange={event => updateMeta({ coverAssetId: event.target.value || null })}><option value="">No cover</option>{state.assets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><details><summary>Search metadata</summary><label>Search title<input value={fields.seoTitle} onChange={event => updateMeta({ seoTitle: event.target.value })} /></label><label>Search description<textarea value={fields.seoDescription} onChange={event => updateMeta({ seoDescription: event.target.value })} /></label></details>{chapter && <details><summary>Version history</summary>{chapter.revisions.slice().reverse().map(item => <button key={item.number} disabled={dirty || props.busy} onClick={() => void run({ operation: 'studio.notes.restore', input: { id: chapter.id, expectedRevision: chapter.revision, revision: item.number } })}>Restore revision {item.number}</button>)}</details>}<details><summary>Exports and releases</summary>{chapter && <button onClick={() => download(`${fields.slug || 'manuscript'}.md`, chapter.body, 'text/markdown')}>Download manuscript</button>}{project.releases.map(item => <button key={item.id} onClick={() => download(`${item.slug}-${item.id}.json`, JSON.stringify(item, null, 2), 'application/json')}>Release {stamp(item.publishedAt)}</button>)}{project.live && <button disabled={dirty || saving || props.busy} onClick={() => void run({ operation: 'publishing.projects.withdraw', input: { id: project.id, expectedVersion: project.version } })}>Withdraw publication</button>}</details><p>Scheduled publishing is not configured.</p></div></dialog><dialog className="zen-panel ws-dialog" ref={chapters}><div className="zen-panel-heading"><h2>Chapters</h2><button onClick={() => chapters.current?.close()}>Close</button></div><div className="zen-panel-content">{source.map((item, index) => <div className="zen-chapter-row" key={item.id}><button aria-pressed={item.id === chapter?.id} onClick={() => { setActive(item.id); chapters.current?.close(); }}>{index + 1}. {item.title}</button><button disabled={dirty || saving || props.busy || index === 0} onClick={() => { const ids = [...project.chapterIds]; [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; void run({ operation: 'publishing.projects.reorder', input: { id: project.id, expectedVersion: project.version, chapterIds: ids } }); }}>Up</button></div>)}<button disabled={dirty || saving || props.busy} onClick={() => void run({ operation: 'publishing.projects.add-chapter', input: { id: project.id, expectedVersion: project.version, title: `Chapter ${source.length + 1}` } })}>Add chapter</button></div></dialog><dialog className="ws-dialog" ref={release}><h2>{project.live ? 'Update publication?' : 'Publish this work?'}</h2><p>{fields.title}</p><p>{props.audience === 'guest' ? 'This creates a guest release only.' : 'This makes the saved manuscripts and referenced images public.'}</p>{message && <p role="alert">{message}</p>}<div className="studio-actions"><button disabled={saving} onClick={() => release.current?.close()}>Cancel</button><button className="ws-primary" disabled={dirty || saving || props.busy} onClick={() => void publish()}>{saving ? 'Publishing...' : 'Publish now'}</button></div></dialog></section>;
}
