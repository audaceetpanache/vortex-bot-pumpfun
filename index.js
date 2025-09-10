import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- Utility: Send message
async function sendMessage(chatId, text, reply_markup = null) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup,
      parse_mode: "Markdown"
    })
  });
  return res.json();
}

// --- Webhook route
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    await handleMessage(update.message);
  } else if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  }

  res.sendStatus(200);
});

// --- Handle text messages
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Cas édition projet
  const editing = projectStore.getEditing(chatId);
  if (editing) {
    projectStore.updateProject(chatId, editing.projectId, {
      [editing.field]: text
    });
    projectStore.clearEditing(chatId);

    const proj = projectStore.getProject(chatId, editing.projectId);
    return showProjectDetails(chatId, proj);
  }

  // Commandes
  if (text === "/start") {
    return sendMessage(chatId, startText, startMenu);
  }

  if (text === "/home") {
    return showHome(chatId);
  }
}

// --- Handle inline keyboard buttons
async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === "home") {
    return showHome(chatId);
  }

  if (data === "settings") {
    return sendMessage(chatId, "⚙️ Settings menu (not implemented yet)");
  }

  if (data === "create_project") {
    const newProj = projectStore.addProject(chatId, "New Project");
    return showProjectDetails(chatId, newProj);
  }

  if (data.startsWith("open_project_")) {
    const projId = data.replace("open_project_", "");
    const proj = projectStore.getProject(chatId, projId);
    if (proj) return showProjectDetails(chatId, proj);
  }

  if (data.startsWith("edit_")) {
    const [_, field, projId] = data.split("_");
    projectStore.setEditing(chatId, projId, field);
    return sendMessage(chatId, `✏️ Send me the new value for *${field}*`);
  }

  if (data.startsWith("delete_project_")) {
    const projId = data.replace("delete_project_", "");
    projectStore.deleteProject(chatId, projId);
    return showHome(chatId);
  }
}

// --- UI Components

const startText = `
🌟 Welcome to VORTEX!
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
Use /settings for configuration
`;

const startMenu = {
  inline_keyboard: [
    [
      { text: "🏠 Home", callback_data: "home" },
      { text: "⚙️ Settings", callback_data: "settings" }
    ]
  ]
};

async function showHome(chatId) {
  const projects = projectStore.getProjects(chatId);
  const buttons = projects.map((p) => [
    { text: `📂 ${p.name}`, callback_data: `open_project_${p.id}` }
  ]);
  buttons.push([{ text: "➕ Create Project", callback_data: "create_project" }]);

  return sendMessage(chatId, "🏠 Home\n\nSelect a project or create a new one:", {
    inline_keyboard: buttons
  });
}

async function showProjectDetails(chatId, proj) {
  const text = `🎯 Project *${proj.name}*
Symbol: ${proj.symbol || "❌"}
Description: ${proj.description || "❌"}
Wallet: ${proj.wallet || "❌"}`;

  const buttons = [
    [
      { text: "✏️ Edit Name", callback_data: `edit_name_${proj.id}` },
      { text: "✏️ Edit Symbol", callback_data: `edit_symbol_${proj.id}` }
    ],
    [
      {
        text: "✏️ Edit Description",
        callback_data: `edit_description_${proj.id}`
      }
    ],
    [{ text: "✏️ Edit Wallet", callback_data: `edit_wallet_${proj.id}` }],
    [{ text: "❌ Delete Project", callback_data: `delete_project_${proj.id}` }],
    [{ text: "⬅️ Back", callback_data: "home" }]
  ];

  return sendMessage(chatId, text, { inline_keyboard: buttons });
}

// --- Start server & auto-set webhook
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);

  try {
    const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/webhook/${WEBHOOK_SECRET}`;
    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    console.log("✅ Webhook configuré :", data);
  } catch (err) {
    console.error("❌ Erreur setWebhook", err);
  }
});
