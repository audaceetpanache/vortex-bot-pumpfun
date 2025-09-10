// unavailable.js
export function getUnavailableMenu() {
  return {
    text: "🚧 Cette fonctionnalité n'est pas encore disponible.",
    reply_markup: {
      inline_keyboard: [[{ text: "⬅️ Retour", callback_data: "home" }]],
    },
  };
}
