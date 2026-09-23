import { featureHelp } from '../help/featureHelp';

export const workspaceTools = [
  { id: 'search', ...featureHelp.search },
  { id: 'focus', ...featureHelp.focus },
  { id: 'inspect', ...featureHelp.inspect },
  { id: 'paths', ...featureHelp.paths },
  { id: 'relationships', ...featureHelp.relationships },
  { id: 'checks', ...featureHelp.checks },
] as const;

export type WorkspaceTool = typeof workspaceTools[number]['id'];
export type HighlightMode = 'search' | 'focus' | 'inspect' | 'paths';

export interface WorkspaceState {
  tool: WorkspaceTool | null;
  highlight: HighlightMode | null;
}

export const initialWorkspaceState: WorkspaceState = { tool: null, highlight: null };

type WorkspaceAction =
  | { type: 'select'; tool: WorkspaceTool }
  | { type: 'close' }
  | { type: 'highlight'; mode: HighlightMode }
  | { type: 'clear' }
  | { type: 'reset' };

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'select': {
      if (state.tool === action.tool) return { ...state, tool: null };
      const highlight = action.tool === 'search' || action.tool === 'focus'
        || action.tool === 'inspect' || action.tool === 'paths' ? action.tool : state.highlight;
      return { tool: action.tool, highlight };
    }
    case 'close':
      return { ...state, tool: null };
    case 'highlight':
      return { ...state, highlight: action.mode };
    case 'clear':
      return { ...state, highlight: null };
    case 'reset':
      return initialWorkspaceState;
  }
}
