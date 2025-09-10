import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- Utility: Send message
async function sendMessage(chatId, text, reply_markup = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup,
  };
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// --- Menus
function getStartMenu() {
  return {
    text: "🌟 Welcome to VORTEX!\n🔥 Where Things Happen! 🔥\n\nUse /home to access all features\nUse /settings for configuration",
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

function getHomeMenu(firstName, userId) {
  const projects = projectStore.getUserProjects(userId);
  const projectButtons =
    projects.length > 0
      ? projects.map((p) => [
          { text: `📂 ${p.name}`, callback_data: `open_project:${p.id}` },
        ])
      : [];

  return {
    text: `Yo ${firstName}! Nice to see you again! 🔥\nWhat's the move, boss?`,
    reply_markup: {
      inline_keyboard: [
        ...projectButtons,
        [{ text: "🚀 Create new Project", callback_data: "create_project" }],
      ],
    },
  };
}

function getProjectMenu(project) {
  const isMetadataComplete =
    project.metadata.name && project.metadata.symbol && project.metadata.description;
  const isWalletComplete = project.wallets.length > 0;

  let statusText = "❌ Project not yet validated";
  if (isMetadataComplete && isWalletComplete) {
    statusText = "✅ Project validated and complete!";
  }

  return {
    text: `🎯 Project (${project.id})\nName: ${project.name}\n\nStatus: ${statusText}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📝 Token Metadata", callback_data: `metadata:${project.id}` }],
        [{ text: "👛 Project Wallets", callback_data: `wallets:${project.id}` }],
        [{ text: "🗑️ Delete Project", callback_data: `delete_project:${project.id}` }],
        [{ text: "⬅️ Back", callback_data: "home" }],
      ],
    },
  };
}

function getMetadataMenu(project) {
  const metadata = project.metadata || {};
  const isComplete = metadata.name && metadata.symbol && metadata.description;

  let statusText = "❌ Metadata not yet deployed";
  if (isComplete) statusText = "✅ Metadata complete";

  return {
    text: `🎯 Project (${project.id}) Metadata\n\nStatus: ${statusText}\n\nSelect a field to edit:`,
    reply_markup: {
      inline_keyboard: [
        [{ text: `Name: ${metadata.name || "❌"}`, callback_data: `edit_metadata:name:${project.id}` }],
        [{ text: `Symbol: ${metadata.symbol || "❌"}`, callback_data: `edit_metadata:symbol:${project.id}` }],
        [{ text: `Description: ${metadata.description || "❌"}`, callback_data: `edit_metadata:description:${project.id}` }],
        [{ text: `Twitter: ${metadata.twitter || "❌"}`, callback_data: `edit_metadata:twitter:${project.id}` }],
        [{ text: `Telegram: ${metadata.telegram || "❌"}`, callback_data: `edit_metadata:telegram:${project.id}` }],
        [{ text: `Website: ${metadata.website || "❌"}`, callback_data: `edit_metadata:website:${project.id}` }],
        [{ text: "⬅️ Back", callback_data: `open_project:${project.id}` }],
      ],
    },
  };
}

// --- Handle updates
async function handleUpdate(update) {
  if (update.message) {
    const chatId = update.message.chat.id;
    const userId = update.message.from.id;
    const firstName = update.message.from.first_name;

    if (update.message.text === "/start") {
      const menu = getStartMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }

    if (update.message.text === "/home") {
      const menu = getHomeMenu(firstName, userId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const userId = update.callback_query.from.id;
    const firstName = update.callback_query.from.first_name;
    const data = update.callback_query.data;

    if (data === "home") {
      const menu = getHomeMenu(firstName, userId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }

    if (data === "settings") {
      await sendMessage(chatId, "⚙️ Settings menu (soon).", {
        inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]],
      });
    }

    if (data === "create_project") {
      const project = projectStore.createProject(userId, "New Project");
      const menu = getProjectMenu(project);
      await sendMessage(chatId, `Project created: ${project.name}`, menu.reply_markup);
    }

    if (data.startsWith("open_project:")) {
      const projectId = data.split(":")[1];
      const project = projectStore.getProject(userId, projectId);
      if (project) {
        const menu = getProjectMenu(project);
        await sendMessage(chatId, menu.text, menu.reply_markup);
      }
    }

    if (data.startsWith("delete_project:")) {
      const projectId = data.split(":")[1];
      projectStore.deleteProject(userId, projectId);
      const menu = getHomeMenu(firstName, userId);
      await sendMessage(chatId, "🗑️ Project deleted.", menu.reply_markup);
    }

    if (data.startsWith("metadata:")) {
      const projectId = data.split(":")[1];
      const project = projectStore.getProject(userId, projectId);
      if (project) {
        const menu = getMetadataMenu(project);
        await sendMessage(chatId, menu.text, menu.reply_markup);
      }
    }
  }
}

// --- Webhook route
if (WEBHOOK_SECRET) {
  app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
    try {
      const update = req.body;
      await handleUpdate(update);
    } catch (err) {
      console.error("Error handling update:", err);
    }
    return res.sendStatus(200);
  });
}

// health
app.get("/", (_req, res) => res.send("✅ Vortex bot server running"));

// start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
