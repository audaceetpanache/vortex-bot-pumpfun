import TelegramBot from "node-telegram-bot-api";
import { loadProjects, saveProjects } from "./utils.js";

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { webHook: true });

// === START ===
bot.onText(/\/start/, (msg) => {
  const text = `🌟 Welcome to VORTEX!
🔥 Where Things Happen! 🔥

Use /home to access all features
Use /settings for configuration`;

  bot.sendMessage(msg.chat.id, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🏠 Home", callback_data: "home" }],
        [{ text: "⚙️ Settings", callback_data: "settings" }],
      ],
    },
  });
});

// === HOME ===
bot.onText(/\/home/, (msg) => {
  showHome(msg.chat.id, msg.from.first_name);
});

function showHome(chatId, firstName) {
  const text = `Yo ${firstName}! Nice to see you again! 🔥
What's the move, boss?`;

  bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📂 Your Projects", callback_data: "your_projects" },
          { text: "🚀 Create new Project", callback_data: "create_project" },
        ],
        [
          { text: "🤑 BUMP BOT 🤑", callback_data: "unavailable" },
          { text: "💰 GET ALL SOL", callback_data: "unavailable" },
        ],
        [
          { text: "🎁 CLAIM DEV REWARDS", callback_data: "unavailable" },
          { text: "🔗 Referrals", callback_data: "unavailable" },
        ],
        [{ text: "❓ Help", url: "https://deployonvortex.gitbook.io/documentation/" }],
        [{ text: "👥 Discord", url: "https://discord.com/invite/vortexdeployer" }],
      ],
    },
  });
}

// === SETTINGS ===
bot.onText(/\/settings/, (msg) => {
  showSettings(msg.chat.id);
});

function showSettings(chatId) {
  const text = `⚙️ Settings
Current Settings:
• Tip Amount: Disabled
• Auto Tip: Enabled
• Max Tip: 0.01 SOL
• Priority Fee: 0.0005 SOL
• Buy Slippage: 15%
• Sell Slippage: 15%
• Safe Settings: Enabled`;

  bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💰 TIP: ❌", callback_data: "unavailable" },
          { text: "✅ AUTO TIP", callback_data: "unavailable" },
          { text: "📊 MAX: 0.01 SOL", callback_data: "unavailable" },
        ],
        [
          { text: "⚡️ PRIO: 0.0005 SOL", callback_data: "unavailable" },
          { text: "📈 BUY SLIPPAGE: 15%", callback_data: "unavailable" },
          { text: "📉 SELL SLIPPAGE: 15%", callback_data: "unavailable" },
        ],
        [
          { text: "🔒 UI SECURITY: 🟢", callback_data: "unavailable" },
          { text: "🎯 LSNIPE Settings", callback_data: "lsnipesettings" },
          { text: "📦 LBS Settings", callback_data: "unavailable" },
        ],
        [{ text: "⬅️ Back", callback_data: "home" }],
      ],
    },
  });
}

// === LSNIPE SETTINGS ===
function showLsnipe(chatId) {
  const text = `🎯 LSNIPE Settings - Preset: default
Current Settings:
• Dev Buy: 0%
• Dev Tip: 0 SOL
• Snipe Wallet: 0%
• Snipe Buy: 0%
• Snipe Tip: 0 SOL
• Max Sniper: 0%
• Risk Mode: ❌ Disabled`;

  bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💰 Dev Buy:0", callback_data: "unavailable" },
          { text: "💎 Dev Tip:0", callback_data: "unavailable" },
          { text: "🎯 Snipe Wallet: 0", callback_data: "unavailable" },
        ],
        [
          { text: "💫 Snipe Buy: 0", callback_data: "unavailable" },
          { text: "🌟 Snipe Tip:0", callback_data: "unavailable" },
          { text: "🚀 Max Sniper: 0", callback_data: "unavailable" },
        ],
        [
          { text: "⚡️ Risk Mode: OFF", callback_data: "unavailable" },
          { text: "📝 New Preset", callback_data: "unavailable" },
          { text: "✅ Default", callback_data: "unavailable" },
        ],
        [
          { text: "✏️", callback_data: "unavailable" },
          { text: "🗑️", callback_data: "unavailable" },
        ],
        [{ text: "⬅️ Back", callback_data: "settings" }],
      ],
    },
  });
}

// === UNAVAILABLE BLOCK ===
function showUnavailable(chatId) {
  bot.sendMessage(chatId, "🚧 This feature is not supported yet, working on it", {
    reply_markup: {
      inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]],
    },
  });
}

// === CALLBACK HANDLER ===
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;

  switch (query.data) {
    case "home":
      showHome(chatId, query.from.first_name);
      break;

    case "settings":
      showSettings(chatId);
      break;

    case "lsnipesettings":
      showLsnipe(chatId);
      break;

    case "unavailable":
      showUnavailable(chatId);
      break;

    case "create_project":
      bot.sendMessage(chatId, "📝 Quel est le *nom* de ton projet ?", {
        parse_mode: "Markdown",
      });

      bot.once("message", (response) => {
        const name = response.text;
        const userId = response.from.id;

        let data = loadProjects();
        if (!data.users[userId]) data.users[userId] = { projects: [] };

        const newProject = {
          id: `proj_${Date.now()}`,
          metadata: {
            name,
            symbol: "",
            description: "",
            twitter: "",
            telegram: "",
            website: "",
            image: "",
            deployed: false,
          },
          wallets: [],
        };

        data.users[userId].projects.push(newProject);
        saveProjects(data);

        bot.sendMessage(chatId, `✅ Projet *${name}* créé avec succès !`, {
          parse_mode: "Markdown",
        });
      });
      break;

    case "your_projects":
      bot.sendMessage(chatId, "📂 Liste de tes projets (à implémenter bientôt)");
      break;
  }

  bot.answerCallbackQuery(query.id);
});

export default bot;
