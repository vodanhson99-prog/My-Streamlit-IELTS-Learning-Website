import type { AppLocale } from "@/lib/settings/contracts"
import type { I18nDictionary, MessageKey } from "./contracts"

export type { MessageKey }

export const enMessages: I18nDictionary = {
  // Settings page
  "settings.title": "Settings",
  "settings.description": "Manage your learning preferences, AI tutor options, and local data storage.",
  "settings.language.title": "Language / Ngôn ngữ",
  "settings.language.description": "Choose the display language for settings and tutor interface.",
  "settings.language.en": "English",
  "settings.language.vi": "Tiếng Việt",
  "settings.tutor.title": "AI Writing Tutor",
  "settings.tutor.retryLabel": "Automatic Retry on Error",
  "settings.tutor.retryDescription": "Automatically retry transient network or service failures once before showing an error.",
  "settings.motion.title": "Display & Motion",
  "settings.motion.reduceLabel": "Reduced Motion",
  "settings.motion.reduceDescription": "Minimize animations across the workspace and tutor drawer.",
  "settings.data.title": "Local Data Management",
  "settings.data.description": "All your IELTS practice data and conversation history are stored locally in your browser.",
  "settings.data.clearTutor": "Clear Tutor History",
  "settings.data.clearTutorConfirm": "Are you sure you want to clear all tutor chat history? This cannot be undone.",
  "settings.data.clearTutorSuccess": "Tutor history cleared.",
  "settings.data.clearAll": "Clear All Local Progress",
  "settings.data.clearAllConfirm": "Are you sure you want to reset all test attempts, scores, and saved evaluations? This cannot be undone.",
  "settings.data.clearAllSuccess": "All local practice progress cleared.",

  // Tutor Chrome
  "tutor.title": "AI Writing Tutor",
  "tutor.subtitle": "Read-only pedagogical assistant",
  "tutor.send": "Send",
  "tutor.thinking": "Tutor is thinking...",
  "tutor.tryAgain": "Try again",
  "tutor.close": "Close tutor panel",
  "tutor.askPlaceholder": "Ask tutor about feedback or grammar...",
  "tutor.emptyStateTitle": "Ask anything about your essay",
  "tutor.emptyStateDescription": "Ask how to overcome specific band blockers, improve collocations, or clarify grammar mistakes.",
  "tutor.suggestedFollowUps": "Suggested questions",
  "tutor.errorGeneric": "Tutor temporarily unavailable. Please try again.",
}

export const viMessages: I18nDictionary = {
  // Settings page
  "settings.title": "Cài đặt",
  "settings.description": "Quản lý tùy chọn học tập, trợ lý AI và dữ liệu lưu trữ trên trình duyệt của bạn.",
  "settings.language.title": "Ngôn ngữ / Language",
  "settings.language.description": "Chọn ngôn ngữ hiển thị cho phần cài đặt và trợ lý học tập.",
  "settings.language.en": "English",
  "settings.language.vi": "Tiếng Việt",
  "settings.tutor.title": "Trợ lý AI Viết",
  "settings.tutor.retryLabel": "Tự động thử lại khi lỗi",
  "settings.tutor.retryDescription": "Tự động thử lại một lần khi mạng hoặc dịch vụ gặp sự cố tạm thời trước khi báo lỗi.",
  "settings.motion.title": "Hiển thị & Chuyển động",
  "settings.motion.reduceLabel": "Giảm chuyển động (Reduced Motion)",
  "settings.motion.reduceDescription": "Tối giản hiệu ứng động trong không gian luyện thi và bảng trợ lý.",
  "settings.data.title": "Quản lý dữ liệu cục bộ",
  "settings.data.description": "Toàn bộ lịch sử làm bài và trò chuyện với trợ lý được lưu cục bộ trên trình duyệt của bạn.",
  "settings.data.clearTutor": "Xóa lịch sử trò chuyện Trợ lý",
  "settings.data.clearTutorConfirm": "Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện với trợ lý? Thao tác này không thể hoàn tác.",
  "settings.data.clearTutorSuccess": "Đã xóa lịch sử trợ lý.",
  "settings.data.clearAll": "Xóa toàn bộ tiến độ làm bài",
  "settings.data.clearAllConfirm": "Bạn có chắc muốn xóa toàn bộ lịch sử thi thử, điểm số và bài chấm? Thao tác này không thể hoàn tác.",
  "settings.data.clearAllSuccess": "Đã xóa toàn bộ tiến độ làm bài.",

  // Tutor Chrome
  "tutor.title": "Trợ lý AI Viết",
  "tutor.subtitle": "Trợ lý sư phạm hỗ trợ học tập",
  "tutor.send": "Gửi",
  "tutor.thinking": "Trợ lý đang suy nghĩ...",
  "tutor.tryAgain": "Thử lại",
  "tutor.close": "Đóng trợ lý",
  "tutor.askPlaceholder": "Hỏi trợ lý về nhận xét hoặc ngữ pháp...",
  "tutor.emptyStateTitle": "Hỏi bất cứ điều gì về bài viết của bạn",
  "tutor.emptyStateDescription": "Hỏi cách cải thiện band điểm, trau chuốt từ vựng hay giải thích các lỗi ngữ pháp.",
  "tutor.suggestedFollowUps": "Câu hỏi gợi ý",
  "tutor.errorGeneric": "Trợ lý tạm thời không phản hồi. Vui lòng thử lại.",
}

export function getMessages(locale: AppLocale): I18nDictionary {
  return locale === "vi" ? viMessages : enMessages
}

export function t(locale: AppLocale, key: MessageKey): string {
  const dict = getMessages(locale)
  return dict[key] || enMessages[key] || key
}
