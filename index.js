import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "SECRET";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const WEBHOOK_PATH = `/webhook/${WEBHOOK_SECRET}`;

// --- Utility: Send message
async function sendMessage(chatId, text, reply_markup = null) {
  const payload = { chat_id: chatId, text, reply_markup };
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// --- Start command
async function handleStart(chatId, firstName) {
  const text = `🌟 Welcome to VORTEX!
🔥 Where Things Happen! 🔥
Available Features:
• Launch pump.fun tokens
• Create or import multiple wallets
• Auto-fund wallets via SOL disperser
• Bundle up to 24 wallets
• CTO pump.fun/raydium tokens
• Delayed bundle on pump.fun
• Advanced swap manager with intervals, sell all functions.
• Anti-MEV protection

Use /home to access all features
Use /settings for configuration`;

  const reply_markup = {
    inline_keyboard: [
      [
        { text: "🏠 Home", callback_data: "home" },
        { text: "⚙️ Settings", callback_data: "settings" },
      ],
    ],
  };

  await sendMessage(chatId, text, reply_markup);
}

// --- Home command
async function handleHome(chatId, firstName) {
  const text = `Yo ${firstName}! Nice to see you again! 🔥
What's the move, boss? Wanna mint some fresh heat or clip profits from your existing bag? 💸
Hit the buttons below and let's make it happen:`;

  const reply_markup = {
    inline_keyboard: [
      [{ text: "📂 Your Projects", callback_data: "list_projects" }],
      [{ text: "🚀 Create new Project", callback_data: "create_project" }],
      [{ text: "🚀 SPAM LAUNCH", callback_data: "unavailable" }],
      [{ text: "🤑 BUMP BOT 🤑", callback_data: "unavailable" }],
      [{ text: "💰 GET ALL SOL", callback_data: "unavailable" }],
      [
        { text: "🎁 CLAIM DEV REWARDS", callback_data: "unavailable" },
        { text: "🔗 Referrals", callback_data: "unavailable" },
      ],
      [{ text: "❓ Help", url: "https://deployonvortex.gitbook.io/documentation/" }],
      [{ text: "👥 Discord", url: "https://discord.com/invite/vortexdeployer" }],
    ],
  };

  await sendMessage(chatId, text, reply_markup);
}

// --- Settings command (placeholder)
async function handleSettings(chatId) {
  const text = `⚙️ Settings
Current Settings:
• Tip Amount: Disabled
• Auto Tip: Enabled
• Max Tip: 0.01 SOL
• Priority Fee: 0.0005 SOL
• Buy Slippage: 15%
• Sell Slippage: 15%
• Safe Settings: Enabled`;

  const reply_markup = {
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
    ],
  };

  await sendMessage(chatId, text, reply_markup);
}

// --- Project menu
async function showProjectMenu(chatId, projectId) {
  const project = projectStore.getProject(chatId, projectId);
  if (!project) return;

  const text = `🎯 Project (${project.id})
Name: ${project.name || "❌"}
Symbol: ${project.symbol || "❌"}
Description: ${project.description || "❌"}
Wallet: ${project.wallet || "❌"}`;

  const reply_markup = {
    inline_keyboard: [
      [{ text: "✏️ Edit Name", callback_data: `edit_name_${project.id}` }],
      [{ text: "✏️ Edit Symbol", callback_data: `edit_symbol_${project.id}` }],
      [{ text: "✏️ Edit Description", callback_data: `edit_description_${project.id}` }],
      [{ text: "✏️ Edit Wallet", callback_data: `edit_wallet_${project.id}` }],
      [{ text: "🗑️ Delete Project", callback_data: `delete_project_${project.id}` }],
      [{ text: "⬅️ Back", callback_data: "list_projects" }],
    ],
  };

  await sendMessage(chatId, text, reply_markup);
}

// --- List projects
async function listProjects(chatId) {
  const projects = projectStore.getProjects(chatId);

  if (!projects || projects.length === 0) {
    await sendMessage(chatId, "📂 You have no projects yet. Create one!", {
      inline_keyboard: [[{ text: "🚀 Create Project", callback_data: "create_project" }]],
    });
    return;
  }

  const buttons = projects.map((p) => [{ text: p.name, callback_data: `project_${p.id}` }]);
  buttons.push([{ text: "⬅️ Back", callback_data: "home" }]);

  await sendMessage(chatId, "📂 Your Projects:", { inline_keyboard: buttons });
}

// --- Webhook handler
app.post(WEBHOOK_PATH, async (req, res) => {
  const body = req.body;

  if (body.message) {
    const chatId = body.message.chat.id;
    const firstName = body.message.chat.first_name || "";

    if (body.message.text === "/start") {
      await handleStart(chatId, firstName);
    } else if (body.message.text === "/home") {
      await handleHome(chatId, firstName);
    } else if (body.message.text === "/settings") {
      await handleSettings(chatId);
    }
  } else if (body.callback_query) {
    const chatId = body.callback_query.message.chat.id;
    const firstName = body.callback_query.message.chat.first_name || "";
    const data = body.callback_query.data;

    if (data === "home") {
      await handleHome(chatId, firstName);
    } else if (data === "settings") {
      await handleSettings(chatId);
    } else if (data === "list_projects") {
      await listProjects(chatId);
    } else if (data === "create_project") {
      const newProj = projectStore.addProject(chatId, "New Project");
      await showProjectMenu(chatId, newProj.id);
    } else if (data.startsWith("project_")) {
      const projectId = parseInt(data.split("_")[1], 10);
      await showProjectMenu(chatId, projectId);
    } else if (data.startsWith("delete_project_")) {
      const projectId = parseInt(data.split("_")[2], 10);
      projectStore.deleteProject(chatId, projectId);
      await listProjects(chatId);
    } else if (data === "unavailable") {
      await sendMessage(chatId, "🚧 This feature is not supported yet, working on it", {
        inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]],
      });
    }
  }

  res.sendStatus(200);
});

// --- Webhook setup
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);

  const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}${WEBHOOK_PATH}`;
  try {
    const resp = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await resp.json();
    console.log("✅ Webhook configuré :", data);
  } catch (err) {
    console.error("❌ Erreur setWebhook :", err.message);
  }
});
