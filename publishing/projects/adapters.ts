import type {
  Command,
  Result,
  StudioPort,
  StudioState,
} from '../../contracts/writing/index.ts';

type ProjectCommand = Extract<
  Command,
  { operation: `publishing.projects.${string}` }
>;

export const createPublicationProjectHttpAdapter = (port: StudioPort) => ({
  post: (command: ProjectCommand): Promise<Result<StudioState>> =>
    port.execute(command),
});

export const createPublicationProjectMcpTools = (port: StudioPort) => ({
  publishing_projects_create: (
    input: Extract<
      ProjectCommand,
      { operation: 'publishing.projects.create' }
    >['input'],
  ) => port.execute({ operation: 'publishing.projects.create', input }),
  publishing_projects_update: (
    input: Extract<
      ProjectCommand,
      { operation: 'publishing.projects.update' }
    >['input'],
  ) => port.execute({ operation: 'publishing.projects.update', input }),
  publishing_projects_add_chapter: (
    input: Extract<
      ProjectCommand,
      { operation: 'publishing.projects.add-chapter' }
    >['input'],
  ) => port.execute({ operation: 'publishing.projects.add-chapter', input }),
  publishing_projects_reorder: (
    input: Extract<
      ProjectCommand,
      { operation: 'publishing.projects.reorder' }
    >['input'],
  ) => port.execute({ operation: 'publishing.projects.reorder', input }),
  publishing_projects_review: (
    input: Extract<
      ProjectCommand,
      { operation: 'publishing.projects.review' }
    >['input'],
  ) => port.execute({ operation: 'publishing.projects.review', input }),
  publishing_projects_publish: (
    input: Extract<
      ProjectCommand,
      { operation: 'publishing.projects.publish' }
    >['input'],
  ) => port.execute({ operation: 'publishing.projects.publish', input }),
  publishing_projects_schedule: (
    input: Extract<
      ProjectCommand,
      { operation: 'publishing.projects.schedule' }
    >['input'],
  ) => port.execute({ operation: 'publishing.projects.schedule', input }),
  publishing_projects_cancel_schedule: (
    input: Extract<
      ProjectCommand,
      { operation: 'publishing.projects.cancel-schedule' }
    >['input'],
  ) =>
    port.execute({ operation: 'publishing.projects.cancel-schedule', input }),
  publishing_projects_withdraw: (
    input: Extract<
      ProjectCommand,
      { operation: 'publishing.projects.withdraw' }
    >['input'],
  ) => port.execute({ operation: 'publishing.projects.withdraw', input }),
});

export const createPublicationProjectCliAdapter = (port: StudioPort) => ({
  invoke: (command: ProjectCommand): Promise<Result<StudioState>> =>
    port.execute(command),
});
