import { getUnavailableMenu } from "./unavailable.js";

export function getLsnipeSettingsMenu() {
  return {
    text: "🎯 LSNIPE Settings - Preset: default\n\n" +
          "Current Settings:\n" +
          "• Dev Buy: 0%\n" +
          "• Dev Tip: 0 SOL\n" +
          "• Snipe Wallet: 0%\n" +
          "• Snipe Buy: 0%\n" +
          "• Snipe Tip: 0 SOL\n" +
          "• Max Sniper: 0%\n" +
          "• Risk Mode: ❌ Disabled",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💰 Dev Buy:0", callback_data: "unavailable" },
          { text: "💎 Dev Tip:0", callback_data: "unavailable" },
          { text: "🎯 Snipe Wallet:0", callback_data: "unavailable" }
        ],
        [
          { text: "💫 Snipe Buy:0", callback_data: "unavailable" },
          { text: "🌟 Snipe Tip:0", callback_data: "unavailable" },
          { text: "🚀 Max Sniper:0", callback_data: "unavailable" }
        ],
        [
          { text: "⚡ Risk Mode: OFF", callback_data: "unavailable" },
          { text: "📝 New Preset", callback_data: "unavailable" },
          { text: "✅ Default", callback_data: "unavailable" }
        ],
        [
          { text: "✏️", callback_data: "unavailable" }
        ],
        [
          { text: "🗑️", callback_data: "unavailable" }
        ],
        [
          { text: "⬅️ Back", callback_data: "home" }
        ]
      ]
    }
  };
}
