import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

import { projectStore } from "./projectStore.js";
import { getLsniperSettingsMenu } from "./lsnipesettings.js";
import { getUnavailableMenu } from "./unavailable.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const WEBHOOK_URL = `${process.env.RENDER_EXTERNAL_URL}/webhook/${WEBHOOK_SECRET}`;

// ------------------ UTIL ------------------
async function sendMessage(chatId, text, reply_markup = null) {
  const payload = { chat_id: chatId, text, reply_markup };
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ------------------ COMMANDES ------------------
async function handleCommand(chatId, text) {
  if (text === "/start") {
    await sendMessage(
      chatId,
      "🌟 Welcome to VORTEX!\n🔥 Where Things Happen! 🔥\nAvailable Features:\n• Launch pump.fun tokens\n• Create or import multiple wallets\n• Auto-fund wallets via SOL disperser\n• Bundle up to 24 wallets\n• CTO pump.fun/raydium tokens\n• Delayed bundle on pump.fun\n• Advanced swap manager with intervals, sell all functions.\n• Anti-MEV protection\n\nUse /home to access all features\nUse /settings for configuration",
      {
        inline_keyboard: [
          [{ text: "🏠 Home", callback_data: "home" }],
          [{ text: "⚙️ Settings", callback_data: "settings" }],
        ],
      }
    );
  }

  if (text === "/home") {
    await sendHome(chatId);
  }

  if (text === "/lsnipesettings") {
    await sendMessage(chatId, "🎯 LSNIPE Settings - Preset: default", getLsniperSettingsMenu());
  }
}

// ------------------ MENUS ------------------
async function sendHome(chatId) {
  await sendMessage(
    chatId,
    `Yo! Nice to see you again! 🔥\nWhat's the move, boss?`,
    {
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
        [
          { text: "❓ Help", url: "https://deployonvortex.gitbook.io/documentation/" },
          { text: "👥 Discord", url: "https://discord.com/invite/vortexdeployer" },
        ],
      ],
    }
  );
}

function buildProjectMenu(chatId, projectId) {
  const project = projectStore.getProject(chatId, projectId);
  if (!project) return { text: "❌ Projet introuvable" };

  return {
    text: `🎯 Project (${project.id})\nName: ${project.name}\nSymbol: ${project.symbol}\nDescription: ${project.description}\nWallet: ${project.wallet}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "✏️ Edit Name", callback_data: `edit_name_${project.id}` }],
        [{ text: "✏️ Edit Symbol", callback_data: `edit_symbol_${project.id}` }],
        [{ text: "✏️ Edit Description", callback_data: `edit_description_${project.id}` }],
        [{ text: "✏️ Edit Wallet", callback_data: `edit_wallet_${project.id}` }],
        [{ text: "❌ Delete Project", callback_data: `delete_project_${project.id}` }],
        [{ text: "⬅️ Back", callback_data: "list_projects" }],
      ],
    },
  };
}

// ------------------ CALLBACKS ------------------
async function handleCallback(chatId, data) {
  if (data === "home") {
    await sendHome(chatId);
  }

  if (data === "settings") {
    await sendMessage(chatId, "⚙️ Settings (indisponible)", getUnavailableMenu().reply_markup);
  }

  if (data === "unavailable") {
    const menu = getUnavailableMenu();
    await sendMessage(chatId, menu.text, menu.reply_markup);
  }

  if (data === "list_projects") {
    const projects = projectStore.getProjects(chatId);
    if (!projects.length) {
      await sendMessage(chatId, "📂 You have no projects yet.", {
        inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]],
      });
    } else {
      const buttons = projects.map((p) => [{ text: p.name, callback_data: `project_${p.id}` }]);
      buttons.push([{ text: "⬅️ Back", callback_data: "home" }]);
      await sendMessage(chatId, "📂 Your Projects:", { inline_keyboard: buttons });
    }
  }

  if (data === "create_project") {
    const newProj = projectStore.addProject(chatId, "New Project", "SYM", "No description yet", "No wallet yet");
    const menu = buildProjectMenu(chatId, newProj.id);
    await sendMessage(chatId, menu.text, menu.reply_markup);
  }

  if (data.startsWith("project_")) {
    const projectId = data.split("_")[1];
    const menu = buildProjectMenu(chatId, projectId);
    await sendMessage(chatId, menu.text, menu.reply_markup);
  }

  if (data.startsWith("delete_project_")) {
    const projectId = data.replace("delete_project_", "");
    projectStore.deleteProject(chatId, projectId);
    await sendMessage(chatId, "🗑️ Project deleted.");
    await sendHome(chatId);
  }

  if (data.startsWith("edit_")) {
    const [_, field, projectId] = data.split("_");
    projectStore.setPendingEdit(chatId, projectId, field);
    await sendMessage(chatId, `✏️ Send me the new value for ${field}`);
  }

  if (data === "ls_unavailable") {
    const menu = getUnavailableMenu();
    await sendMessage(chatId, menu.text, menu.reply_markup);
  }
}

// ------------------ MESSAGES ------------------
async function handleMessage(chatId, text) {
  const pending = projectStore.getPendingEdit(chatId);
  if (pending) {
    const { projectId, field } = pending;
    projectStore.updateProject(chatId, projectId, field, text);
    projectStore.clearPendingEdit(chatId);
    const menu = buildProjectMenu(chatId, projectId);
    await sendMessage(chatId, `✅ ${field} updated.`, menu.reply_markup);
  } else {
    await handleCommand(chatId, text);
  }
}

// ------------------ EXPRESS ------------------
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;
  if (update.message) {
    await handleMessage(update.message.chat.id, update.message.text);
  }
  if (update.callback_query) {
    await handleCallback(update.callback_query.message.chat.id, update.callback_query.data);
  }
  res.sendStatus(200);
});

app.listen(10000, async () => {
  console.log("✅ Serveur en ligne sur port 10000");

  // Webhook auto
  try {
    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: WEBHOOK_URL }),
    });
    const data = await res.json();
    console.log("✅ Webhook configuré :", data);
  } catch (err) {
    console.error("❌ Erreur webhook", err);
  }
});
