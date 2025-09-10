import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "SECRET";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

const userStates = {}; // chatId -> { mode, projectId, field }

// --- Send message utility ---
async function sendMessage(chatId, text, extra = {}) {
  return fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  });
}

// --- Menus ---
function getHomeMenu() {
  return {
    text: "🏠 Home - Manage your projects",
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Create Project", callback_data: "create_project" }],
        [{ text: "📂 My Projects", callback_data: "list_projects" }],
      ],
    },
  };
}

function getProjectListMenu(chatId) {
  const projects = projectStore.getProjects(chatId);
  if (projects.length === 0) {
    return { text: "📂 No projects yet." };
  }
  return {
    text: "📂 Your Projects:",
    reply_markup: {
      inline_keyboard: projects.map(p => [
        { text: p.name, callback_data: `open_${p.id}` },
      ]),
    },
  };
}

function getProjectDetailMenu(chatId, projectId) {
  const project = projectStore.getProject(chatId, projectId);
  if (!project) return { text: "❌ Project not found" };

  return {
    text: `📌 *${project.name}*\n\nSymbol: ${project.symbol}\nDescription: ${project.description}\nWallet: ${project.wallet}`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✏️ Edit Name", callback_data: `edit_${project.id}_name` },
          { text: "✏️ Edit Symbol", callback_data: `edit_${project.id}_symbol` },
        ],
        [
          { text: "✏️ Edit Description", callback_data: `edit_${project.id}_description` },
          { text: "✏️ Edit Wallet", callback_data: `edit_${project.id}_wallet` },
        ],
        [{ text: "❌ Delete Project", callback_data: `delete_${project.id}` }],
        [{ text: "⬅️ Back", callback_data: "list_projects" }],
      ],
    },
  };
}

// --- Handle Updates ---
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === "/start" || text === "/home") {
      const menu = getHomeMenu();
      await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
    } else if (userStates[chatId]?.mode === "edit") {
      const { projectId, field } = userStates[chatId];
      projectStore.updateProject(chatId, projectId, { [field]: text });
      delete userStates[chatId];
      const menu = getProjectDetailMenu(chatId, projectId);
      await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup, parse_mode: "Markdown" });
    }
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    if (data === "create_project") {
      projectStore.addProject(chatId, {
        name: "New Project",
        symbol: "N/A",
        description: "No description",
        wallet: "Not set",
      });
      const menu = getProjectListMenu(chatId);
      await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
    }

    if (data === "list_projects") {
      const menu = getProjectListMenu(chatId);
      await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
    }

    if (data.startsWith("open_")) {
      const projectId = data.replace("open_", "");
      const menu = getProjectDetailMenu(chatId, projectId);
      await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup, parse_mode: "Markdown" });
    }

    if (data.startsWith("edit_")) {
      const [_, projectId, field] = data.split("_");
      userStates[chatId] = { mode: "edit", projectId, field };
      await sendMessage(chatId, `✏️ Send me the new *${field}*`, { parse_mode: "Markdown" });
    }

    if (data.startsWith("delete_")) {
      const projectId = data.replace("delete_", "");
      projectStore.removeProject(chatId, projectId);
      const menu = getProjectListMenu(chatId);
      await sendMessage(chatId, "🗑️ Project deleted.\n\n" + menu.text, {
        reply_markup: menu.reply_markup,
      });
    }
  }

  res.sendStatus(200);
});

// --- Webhook Setup on startup ---
app.listen(10000, async () => {
  console.log("✅ Server running on port 10000");
  const url = `https://vortex-bot-pumpfun.onrender.com/webhook/${WEBHOOK_SECRET}`;
  const resp = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  console.log("✅ Webhook setup:", await resp.json());
});
