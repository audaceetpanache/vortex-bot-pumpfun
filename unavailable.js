export function getUnavailableMenu() {
  return {
    text: "🚧 This feature is not supported yet, working on it",
    reply_markup: {
      inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]]
    }
  };
}
