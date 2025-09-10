export function getLsniperSettingsMenu() {
  return {
    inline_keyboard: [
      [{ text: "⚡ Auto-snipe ON/OFF", callback_data: "ls_unavailable" }],
      [{ text: "💰 Budget", callback_data: "ls_unavailable" }],
      [{ text: "⏱ Délai", callback_data: "ls_unavailable" }],
      [{ text: "⬅️ Retour", callback_data: "home" }],
    ],
  };
}
