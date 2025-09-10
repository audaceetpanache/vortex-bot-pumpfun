import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- Simple in-memory store ---
let projects = {};

// --- Utility: Send message with inline keyboard ---
async function sendMessage(chatId, text, reply_markup) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup }),
  });
}

// --- Menus ---
function getStartMenu(firstName) {
  return {
    text: `🌟 Welcome to VORTEX!\n🔥 Where Things Happen! 🔥\n\nAvailable Features:\n• Launch pump.fun tokens\n• Create or import multiple wallets\n• Auto-fund wallets via SOL disperser\n• Bundle up to 24 wallets\n• CTO pump.fun/raydium tokens\n• Delayed bundle on pump.fun\n• Advanced swap manager with intervals, sell all functions.\n• Anti-MEV protection\n\nUse /home to access all features\nUse /settings for configuration`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🏠 Home", callback_data: "home" },
          { text: "⚙️ Settings", callback_data: "settings" },
        ],
      ],
    },
  };
}

function getHomeMenu(firstName) {
  return {
    text: `Yo ${firstName}! Nice to see you again! 🔥\nWhat's the move, boss? Wanna mint some fresh heat or clip profits from your existing bag? 💸\nHit the buttons below and let's make it happen:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📂 Your Projects", callback_data: "your_projects" },
          { text: "🚀 Create new Project", callback_data: "create_project" },
        ],
        [{ text: "🚀 SPAM LAUNCH", callback_data: "unavailable" }],
        [{ text: "🤑 BUMP BOT 🤑", callback_data: "unavailable" }],
        [{ text: "💰 GET ALL SOL", callback_data: "unavailable" }],
        [{ text: "🎁 CLAIM DEV REWARDS", callback_data: "unavailable" }],
        [
          { text: "🔗 Referrals", callback_data: "unavailable" },
          {
            text: "❓ Help",
            url: "https://deployonvortex.gitbook.io/documentation/",
          },
        ],
        [{ text: "👥 Discord", url: "https://discord.com/invite/vortexdeployer" }],
      ],
    },
  };
}

function getSettingsMenu() {
  return {
    text: `⚙️ Settings
Current Settings:
• Tip Amount: Disabled
• Auto Tip: Enabled
• Max Tip: 0.01 SOL
• Priority Fee: 0.0005 SOL
• Buy Slippage: 15%
• Sell Slippage: 15%
• Safe Settings: Enabled`,
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
        [{ text: "🔒 UI SECURITY: 🟢", callback_data: "unavailable" }],
        [{ text: "⬅️ Back", callback_data: "home" }],
        [
          { text: "🎯 LSNIPE Settings", callback_data: "unavailable" },
          { text: "📦 LBS Settings", callback_data: "unavailable" },
        ],
      ],
    },
  };
}

function getUnavailableMenu() {
  return {
    text: "🚧 This feature is not supported yet, working on it",
    reply_markup: {
      inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]],
    },
  };
}

// --- Webhook ---
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;
  console.log("Update received:", update);

  if (update.message) {
    const chatId = update.message.chat.id;
    const firstName = update.message.from.first_name;

    if (update.message.text === "/start") {
      const menu = getStartMenu(firstName);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (update.message.text === "/home") {
      const menu = getHomeMenu(firstName);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (update.message.text === "/settings") {
      const menu = getSettingsMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const firstName = update.callback_query.from.first_name;
    const data = update.callback_query.data;

    if (data === "home") {
      const menu = getHomeMenu(firstName);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "settings") {
      const menu = getSettingsMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "unavailable") {
      const menu = getUnavailableMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }
  }

  res.sendStatus(200);
});

// --- Start Express server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
