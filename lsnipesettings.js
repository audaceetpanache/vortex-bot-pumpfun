export function getLsniperSettingsMenu() {
  return {
    inline_keyboard: [
      [{ text: "⚡ Auto-snipe ON/OFF", callback_data: "toggle_autosnipe" }],
      [{ text: "💰 Budget", callback_data: "set_budget" }],
      [{ text: "⏱ Délai", callback_data: "set_delay" }],
      [{ text: "⬅️ Retour", callback_data: "home" }],
    ],
  };
}
