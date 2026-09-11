export type Phase = 'build' | 'migrate' | 'deploy' | 'dry-run';
export type Command = {
  id: string;
  tool: 'node' | 'npm' | 'wrangler';
  args: readonly string[];
  owner?: boolean;
};
export type Deployment = {
  web: { config: string; builtConfig: string; name: string };
  owner: { config: string; name: string };
  databases: readonly { name: string; config: string }[];
};
export type CommandRunner = (command: Command) => Promise<void>;
