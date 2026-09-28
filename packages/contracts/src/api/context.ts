export interface RunContextSelection {
  skillIds?: string[];
  pluginIds?: string[];
  mcpServerIds?: string[];
  connectorIds?: string[];
  workspaceItems?: RunContextItem[];
}

export type RunContextItemKind =
  | 'design-files'
  | 'design-system'
  | 'project'
  | 'local-code'
  | 'file'
  | 'folder'
  | 'project'
  | 'local-code'
  | 'browser'
  | 'terminal'
  | 'side-chat'
  | 'live-artifact';

export interface RunContextItem {
  id: string;
  kind: RunContextItemKind;
  label: string;
  tabId?: string;
  path?: string;
  absolutePath?: string;
  url?: string;
  title?: string;
}

export interface ProjectContextPluginRef {
  id: string;
  title: string;
  description?: string;
}

export interface ProjectContextMcpServerRef {
  id: string;
  label?: string;
  transport?: string;
  url?: string;
  command?: string;
}

export interface ProjectContextConnectorRef {
  id: string;
  name: string;
  provider?: string;
  category?: string;
  description?: string;
  status?: string;
  accountLabel?: string;
}
