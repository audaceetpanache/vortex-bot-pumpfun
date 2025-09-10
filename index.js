// index.js
import express from "express";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ BOT_TOKEN is required in environment variables.");
  process.exit(1);
}
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// Accept both /webhook and /webhook/<secret> (if set)
const webhookPaths = WEBHOOK_SECRET ? ["/webhook", `/webhook/${WEBHOOK_SECRET}`] : ["/webhook"];

const userStates = {}; // { userId: { step: "...", projectId?: "..." } }

// ------ Helpers to call Telegram API ------
async function sendMessage(chatId, text, options = {}) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    ...options,
  };
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function editMessage(chatId, messageId, text, options = {}) {
  const body = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
    ...options,
  };
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ------ Menus ------
function startMenu() {
  return {
    text: `🌟 Welcome to VORTEX!\n🔥 Where Things Happen! 🔥

Available Features (demo):
• Create and manage projects

Use /home to access all features
Use /settings for configuration`,
    reply_markup: {
      inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }, { text: "⚙️ Settings", callback_data: "settings" }]]
    }
  };
}

function homeMenu(firstName) {
  return {
    text: `Yo ${firstName || ""}! Nice to see you again! 🔥
What's the move, boss?`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📂 Your Projects", callback_data: "your_projects" }, { text: "🚀 Create New Project", callback_data: "create_project" }],
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

function settingsMenu() {
  return {
    text: `⚙️ Settings
(Currently placeholder)`,
    reply_markup: {
      inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]]
    }
  };
}

function unavailableMenu() {
  return {
    text: "🚧 This feature is not supported yet, working on it",
    reply_markup: {
      inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]]
    }
  };
}

function projectListButtons(userId) {
  const projects = projectStore.getProjectsByUser(userId);
  if (!projects || projects.length === 0) return null;
  const rows = projects.map((p) => ([
    { text: `📄 ${p.name}`, callback_data: `open_project:${p.id}` },
    { text: "❌ Delete", callback_data: `delete_project:${p.id}` }
  ]));
  rows.push([{ text: "⬅️ Back", callback_data: "home" }]);
  return rows;
}

function projectDetailMenu(project) {
  return {
    text: `🎯 Project (${project.id})
Name: ${project.name || "—"}
(For now token metadata & wallets are placeholders)`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📝 Token Metadata", callback_data: `metadata:${project.id}` }],
        [{ text: "👛 Project Wallets", callback_data: `wallets:${project.id}` }],
        [{ text: "❌ Delete Project", callback_data: `delete_project:${project.id}` }],
        [{ text: "⬅️ Back", callback_data: "your_projects" }]
      ]
    }
  };
}

// ------ Webhook handler (accept both paths) ------
for (const p of webhookPaths) {
  app.post(p, async (req, res) => {
    const update = req.body;
    try {
      // ---------- Messages ----------
      if (update.message) {
        const chatId = update.message.chat.id;
        const userId = update.message.from.id;
        const text = update.message.text;

        // if user was in flow awaiting project name
        if (userStates[userId]?.step === "awaiting_project_name") {
          const name = (text || "").trim();
          if (!name) {
            await sendMessage(chatId, "❌ Name cannot be empty. Send a valid project name.");
            return res.sendStatus(200);
          }
          const project = projectStore.addProject(userId, name);
          delete userStates[userId];
          await sendMessage(chatId, `✅ Project *${project.name}* created!`, {
            reply_markup: { inline_keyboard: [[{ text: "📂 Your Projects", callback_data: "your_projects" }, { text: "⬅️ Back", callback_data: "home" }]] }
          });
          return res.sendStatus(200);
        }

        // commands
        if (text === "/start") {
          const menu = startMenu();
          await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
          return res.sendStatus(200);
        }

        if (text === "/home") {
          const menu = homeMenu(update.message.from.first_name);
          await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
          return res.sendStatus(200);
        }

        if (text === "/settings") {
          const menu = settingsMenu();
          await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
          return res.sendStatus(200);
        }
      }

      // ---------- Callback queries (button clicks) ----------
      if (update.callback_query) {
        const chatId = update.callback_query.message.chat.id;
        const messageId = update.callback_query.message.message_id;
        const data = update.callback_query.data;
        const userId = update.callback_query.from.id;

        // Home
        if (data === "home") {
          const menu = homeMenu(update.callback_query.from.first_name);
          await editMessage(chatId, messageId, menu.text, { reply_markup: menu.reply_markup });
          return res.sendStatus(200);
        }

        if (data === "settings") {
          const menu = settingsMenu();
          await editMessage(chatId, messageId, menu.text, { reply_markup: menu.reply_markup });
          return res.sendStatus(200);
        }

        if (data === "unavailable") {
          const menu = unavailableMenu();
          await editMessage(chatId, messageId, menu.text, { reply_markup: menu.reply_markup });
          return res.sendStatus(200);
        }

        // Your projects list
        if (data === "your_projects") {
          const rows = projectListButtons(userId);
          if (!rows) {
            await editMessage(chatId, messageId, "📂 You don't have any projects yet.", {
              reply_markup: { inline_keyboard: [[{ text: "🚀 Create New Project", callback_data: "create_project" }, { text: "⬅️ Back", callback_data: "home" }]] }
            });
            return res.sendStatus(200);
          }
          await editMessage(chatId, messageId, "📂 Your Projects:", { reply_markup: { inline_keyboard: rows } });
          return res.sendStatus(200);
        }

        // Create new project (start flow)
        if (data === "create_project") {
          userStates[userId] = { step: "awaiting_project_name" };
          await sendMessage(chatId, "✏️ Send me the name of your new project.");
          return res.sendStatus(200);
        }

        // Delete project
        if (data.startsWith("delete_project:")) {
          const projectId = data.split(":")[1];
          const ok = projectStore.deleteProject(userId, projectId);
          if (ok) {
            await editMessage(chatId, messageId, "🗑️ Project deleted.", { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]] } });
          } else {
            await sendMessage(chatId, "⚠️ Unable to delete project (not found).");
          }
          return res.sendStatus(200);
        }

        // Open project detail
        if (data.startsWith("open_project:")) {
          const projectId = data.split(":")[1];
          const proj = projectStore.getProject(userId, projectId);
          if (!proj) {
            await sendMessage(chatId, "⚠️ Project not found.");
            return res.sendStatus(200);
          }
          const menu = projectDetailMenu(proj);
          await editMessage(chatId, messageId, menu.text, { reply_markup: menu.reply_markup });
          return res.sendStatus(200);
        }

        // metadata & wallets (placeholders for now)
        if (data.startsWith("metadata:")) {
          const projectId = data.split(":")[1];
          await editMessage(chatId, messageId, "📝 Token Metadata — work in progress", { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: `open_project:${projectId}` }]] } });
          return res.sendStatus(200);
        }

        if (data.startsWith("wallets:")) {
          const projectId = data.split(":")[1];
          await editMessage(chatId, messageId, "👛 Project Wallets — work in progress", { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: `open_project:${projectId}` }]] } });
          return res.sendStatus(200);
        }
      }
    } catch (err) {
      console.error("Error handling update:", err);
    }

    res.sendStatus(200);
  });
}

// Health root
app.get("/", (_req, res) => res.send("✅ Vortex bot server running"));

// Start
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
