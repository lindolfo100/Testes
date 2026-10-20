export const STORAGE_KEYS = {
  ACTIVE_SESSION_ID: 'quiz_active_session_id',
  ACTIVE_SESSION_PIN: 'quiz_active_session_pin',
  PLAYER_PIN: 'quiz_player_pin',
  PLAYER_ID: 'quiz_player_id',
  PLAYER_NICKNAME: 'quiz_player_nick',
  SAVED_NICKNAME: 'quiz_saved_nickname',
  PLAYER_ANSWERED_KEY: 'quiz_player_answered_key',
  PLAYER_SELECTED_ANSWER: 'quiz_player_selected_answer',
  PWA_BANNER_DISMISSED: 'valendo_pwa_banner_dismissed',
  // Chave Gemini pessoal do professor: fica somente neste aparelho
  USER_GEMINI_API_KEY: 'valendo_gemini_api_key',
} as const;
