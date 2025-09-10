export function getLSnipeSettingsMenu() {
  return {
    text: "⚙️ LSnip Settings\n\nThese features are under construction 🚧",
    reply_markup: {
      inline_keyboard: [
        [{ text: "⏱ Sniping Speed", callback_data: "unavailable" }],
        [{ text: "💰 Max Buy Amount", callback_data: "unavailable" }],
        [{ text: "📊 Risk Management", callback_data: "unavailable" }],
        [{ text: "⬅️ Back", callback_data: "home" }]
      ]
    }
  };
}
