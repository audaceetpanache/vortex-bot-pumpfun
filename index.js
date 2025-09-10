import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";
import { getUnavailableMenu } from "./unavailable.js";
import { getLsnipeSettingsMenu } from "./lsnipesettings.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "secret";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- Utility: Send message
async function sendMessage(chatId, text, reply_markup = null) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup
    })
  });
}

// --- START COMMAND
function getStartMenu(firstName) {
  return {
    text:
      "🌟 Welcome to VORTEX!\n" +
      "🔥 Where Things Happen! 🔥\n\n" +
      "Available Features:\n" +
      "• Launch pump.fun tokens\n" +
      "• Create or import multiple wallets\n" +
      "• Auto-fund wallets via SOL disperser\n" +
      "• Bundle up to 24 wallets\n" +
      "• CTO pump.fun/raydium tokens\n" +
      "• Delayed bundle on pump.fun\n" +
      "• Advanced swap manager with intervals, sell all functions.\n" +
      "• Anti-MEV protection\n\n" +
      "Use /home to access all features\n" +
      "Use /settings for configuration",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🏠 Home", callback_data: "home" },
          { text: "⚙️ Settings", callback_data: "settings" }
        ]
      ]
    }
  };
}

// --- HOME COMMAND
function getHomeMenu(firstName) {
  return {
    text:
      `Yo ${firstName}! Nice to see you again! 🔥\n` +
      "What's the move, boss? Wanna mint some fresh heat or clip profits from your existing bag? 💸\n" +
      "Hit the buttons below and let's make it happen:",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📂 Your Projects", callback_data: "list_projects" }, { text: "🚀 Create new Project", callback_data: "create_project" }],
        [{ text: "🚀 SPAM LAUNCH", callback_data: "unavailable" }],
        [{ text: "🤑 BUMP BOT 🤑", callback_data: "unavailable" }],
        [{ text: "💰 GET ALL SOL", callback_data: "unavailable" }],
        [{ text: "🎁 CLAIM DEV REWARDS", callback_data: "unavailable" }],
        [{ text: "🔗 Referrals", callback_data: "unavailable" }, { text: "❓ Help", url: "https://deployonvortex.gitbook.io/documentation/" }],
        [{ text: "👥 Discord", url: "https://discord.com/invite/vortexdeployer" }]
      ]
    }
  };
}

// --- SETTINGS COMMAND
function getSettingsMenu() {
  return {
    text:
      "⚙️ Settings\n" +
      "Current Settings:\n" +
      "• Tip Amount: Disabled\n" +
      "• Auto Tip: Enabled\n" +
      "• Max Tip: 0.01 SOL\n" +
      "• Priority Fee: 0.0005 SOL\n" +
      "• Buy Slippage: 15%\n" +
      "• Sell Slippage: 15%\n" +
      "• Safe Settings: Enabled",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💰 TIP: ❌", callback_data: "unavailable" },
          { text: "✅ AUTO TIP", callback_data: "unavailable" },
          { text: "📊 MAX: 0.01 SOL", callback_data: "unavailable" }
        ],
        [
          { text: "⚡️ PRIO: 0.0005 SOL", callback_data: "unavailable" },
          { text: "📈 BUY SLIPPAGE: 15%", callback_data: "unavailable" },
          { text: "📉 SELL SLIPPAGE: 15%", callback_data: "unavailable" }
        ],
        [
          { text: "🔒 UI SECURITY: 🟢", callback_data: "unavailable" }
        ],
        [
          { text: "⬅️ Back", callback_data: "home" },
          { text: "🎯 LSNIPE Settings", callback_data: "lsnipesettings" }
        ],
        [
          { text: "📦 LBS Settings", callback_data: "unavailable" }
        ]
      ]
    }
  };
}

// --- Handle Webhook
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const body = req.body;
  console.log("Update received:", JSON.stringify(body, null, 2));

  if (body.message) {
    const chatId = body.message.chat.id;
    const text = body.message.text;
    const firstName = body.message.chat.first_name || "friend";

    if (text === "/start") {
      const menu = getStartMenu(firstName);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (text === "/home") {
      const menu = getHomeMenu(firstName);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (text === "/settings") {
      const menu = getSettingsMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (text === "/lsnipesettings") {
      const menu = getLsnipeSettingsMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }
  }

  if (body.callback_query) {
    const chatId = body.callback_query.message.chat.id;
    const data = body.callback_query.data;
    const firstName = body.callback_query.message.chat.first_name || "friend";

    if (data === "home") {
      const menu = getHomeMenu(firstName);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "settings") {
      const menu = getSettingsMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "lsnipesettings") {
      const menu = getLsnipeSettingsMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "unavailable") {
      const menu = getUnavailableMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }
  }

  res.sendStatus(200);
});

// --- Set Webhook automatically
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);
  try {
    const url = `https://vortex-bot-pumpfun.onrender.com/webhook/${WEBHOOK_SECRET}`;
    const res = await fetch(`${TELEGRAM_API}/setWebhook?url=${url}`);
    const data = await res.json();
    console.log("✅ Webhook configuré :", data);
  } catch (err) {
    console.error("❌ Erreur Webhook :", err);
  }
});
