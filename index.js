import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

import { projectStore } from "./projectStore.js";
import { getUnavailableMenu } from "./unavailable.js";
import { getLSnipeSettingsMenu } from "./lsnipesettings.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "SECRET";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- utility function to send message
async function sendMessage(chatId, text, reply_markup = null) {
  const payload = { chat_id: chatId, text, parse_mode: "Markdown" };
  if (reply_markup) payload.reply_markup = reply_markup;
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// --- start menu
function getStartMenu() {
  return {
    text: "👋 Welcome to Vortex Bot!\n\nManage your projects, wallets, and settings easily.",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🏠 Home", callback_data: "home" }],
        [{ text: "⚙️ Settings", callback_data: "settings" }],
        [{ text: "🔫 LSnip Settings", callback_data: "lsnipesettings" }],
      ],
    },
  };
}

// --- home menu
function getHomeMenu(chatId) {
  const projects = projectStore.getProjects(chatId);
  const buttons = projects.map((p, idx) => [
    { text: `${p.name} (${p.symbol})`, callback_data: `project_${idx}` },
  ]);
  buttons.push([{ text: "➕ New Project", callback_data: "new_project" }]);
  return {
    text: "🏠 Your Projects",
    reply_markup: { inline_keyboard: buttons },
  };
}

// --- settings menu
function getSettingsMenu() {
  return {
    text: "⚙️ Settings\n\nGeneral bot settings will be here.",
    reply_markup: {
      inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]],
    },
  };
}

// --- project details
function getProjectMenu(chatId, projectIndex) {
  const project = projectStore.getProject(chatId, projectIndex);
  if (!project) return { text: "❌ Project not found", reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]] } };

  return {
    text: `📌 *${project.name}*\nSymbol: ${project.symbol}\nDescription: ${project.description}\nWallet: ${project.wallet}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "✏️ Edit Name", callback_data: `edit_name_${projectIndex}` }],
        [{ text: "✏️ Edit Symbol", callback_data: `edit_symbol_${projectIndex}` }],
        [{ text: "✏️ Edit Description", callback_data: `edit_description_${projectIndex}` }],
        [{ text: "✏️ Edit Wallet", callback_data: `edit_wallet_${projectIndex}` }],
        [{ text: "🗑 Delete Project", callback_data: `delete_project_${projectIndex}` }],
        [{ text: "⬅️ Back", callback_data: "home" }],
      ],
    },
  };
}

// --- webhook route
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === "/start") {
      const menu = getStartMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (text === "/home") {
      const menu = getHomeMenu(chatId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (text === "/lsnipesettings") {
      const menu = getLSnipeSettingsMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }
  } else if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    if (data === "home") {
      const menu = getHomeMenu(chatId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "settings") {
      const menu = getSettingsMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "lsnipesettings") {
      const menu = getLSnipeSettingsMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "unavailable") {
      const menu = getUnavailableMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "new_project") {
      projectStore.addProject(chatId, {
        name: "New Project",
        symbol: "XXX",
        description: "Empty description",
        wallet: "0x0000000000000000000000000000000000000000",
      });
      const menu = getHomeMenu(chatId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data.startsWith("project_")) {
      const index = parseInt(data.split("_")[1]);
      const menu = getProjectMenu(chatId, index);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data.startsWith("delete_project_")) {
      const index = parseInt(data.split("_")[2]);
      projectStore.deleteProject(chatId, index);
      const menu = getHomeMenu(chatId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data.startsWith("edit_")) {
      const [_, field, index] = data.split("_");
      projectStore.setEditing(chatId, field, parseInt(index));
      await sendMessage(chatId, `✏️ Send me the new value for *${field}*`);
    }
  }

  res.sendStatus(200);
});

// --- handle edition responses
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;
  if (update.message) {
    const chatId = update.message.chat.id;
    const editing = projectStore.getEditing(chatId);
    if (editing) {
      projectStore.updateProjectField(chatId, editing.index, editing.field, update.message.text);
      projectStore.clearEditing(chatId);
      const menu = getProjectMenu(chatId, editing.index);
      await sendMessage(chatId, `✅ Updated *${editing.field}*`, menu.reply_markup);
    }
  }
  res.sendStatus(200);
});

// --- start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);

  // configure webhook automatically
  const url = `https://vortex-bot-pumpfun.onrender.com/webhook/${WEBHOOK_SECRET}`;
  const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await response.json();
  console.log("✅ Webhook setup:", data);
});
