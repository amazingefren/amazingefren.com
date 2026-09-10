import type { Command, Result, StudioPort, StudioState } from '../../contracts/writing/index.ts';

export const createWritingHttpAdapter = (port: StudioPort) => ({
  post: (command: Command): Promise<Result<StudioState>> => port.execute(command)
});

export const createWritingMcpTools = (port: StudioPort) => ({
  studio_writing_read: () => port.execute({ operation: 'studio.writing.read', input: {} }),
  studio_notes_create: (input: Extract<Command, { operation: 'studio.notes.create' }>['input']) => port.execute({ operation: 'studio.notes.create', input }),
  studio_notes_save: (input: Extract<Command, { operation: 'studio.notes.save' }>['input']) => port.execute({ operation: 'studio.notes.save', input }),
  studio_notes_restore: (input: Extract<Command, { operation: 'studio.notes.restore' }>['input']) => port.execute({ operation: 'studio.notes.restore', input }),
  studio_notes_archive: (input: Extract<Command, { operation: 'studio.notes.archive' }>['input']) => port.execute({ operation: 'studio.notes.archive', input }),
  studio_assets_add: (input: Extract<Command, { operation: 'studio.assets.add' }>['input']) => port.execute({ operation: 'studio.assets.add', input }),
  studio_assets_update: (input: Extract<Command, { operation: 'studio.assets.update' }>['input']) => port.execute({ operation: 'studio.assets.update', input }),
  studio_writing_reset: () => port.execute({ operation: 'studio.writing.reset', input: {} })
});

export const createWritingCliAdapter = (port: StudioPort) => ({ invoke: (command: Command): Promise<Result<StudioState>> => port.execute(command) });
