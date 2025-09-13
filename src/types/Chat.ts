export interface UseChatLogicProps {
  toggleComponentVisibility: () => void;
  ensureThread: () => Promise<string>;
  activeThreadId: string | null;
  [key: string]: any;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  versions?: string[];
  currentVersion?: number;
  turnId?: string;
  isLoading?: boolean;
  [key: string]: any;
}
