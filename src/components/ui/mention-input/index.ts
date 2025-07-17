/**
 * @fileoverview 提及输入模块索引
 * @description 统一导出提及输入相关的组件、Hook和类型
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

// 导出Hook
export { useUserSearch } from './hooks/use-user-search';
export { useMentionParser } from './hooks/use-mention-parser';

// 导出组件
export { SuggestionList, SuggestionItem } from './components/SuggestionList';

// 导出类型
export type {
  UserSuggestion,
  SearchConfig,
  SearchResult,
} from './hooks/use-user-search';

export type {
  MentionInfo,
  ParseResult,
  CursorPosition,
} from './hooks/use-mention-parser';

export type {
  SuggestionListProps,
  SuggestionItemProps,
} from './components/SuggestionList';
