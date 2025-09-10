// index.js
import express from "express";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ BOT_TOKEN missing in environment variables. Stopping.");
  process.exit(1);
}
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

const webhookPaths = WEBHOOK_SECRET ? ["/webhook", `/webhook/${WEBHOOK_SECRET}`] : ["/webhook"];
const userStates = {}; // track user flows: { [userId]: { step: string, projectId?: string, field?: string } }

// ---------- Helpers to call Telegram ----------
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

// ---------- Menus ----------
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
    reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]] }
  };
}

function unavailableMenu() {
  return {
    text: "🚧 This feature is not supported yet, working on it",
    reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]] }
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
  const md = project.metadata || {};
  const deployed = project.metadata && project.metadata.deployed ? "✅" : "❌";
  return {
    text: `🎯 Project (${project.id})
Name: ${project.name || "—"}
Metadata deployed: ${deployed}`,
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

function metadataMenu(project) {
  const md = project.metadata || {};
  const deployed = md.deployed ? "✅ Metadata deployed" : "❌ Metadata not yet deployed";
  return {
    text: `🎯 Project (${project.id}) Metadata
Status: ${deployed}
Select a field to edit:`,
    reply_markup: {
      inline_keyboard: [
        [{ text: `Name: ${md.name || "❌"}`, callback_data: `meta_edit:${project.id}:name` }, { text: `Symbol: ${md.symbol || "❌"}`, callback_data: `meta_edit:${project.id}:symbol` }],
        [{ text: `Description: ${md.description ? "✓" : "❌"}`, callback_data: `meta_edit:${project.id}:description` }],
        [{ text: `Twitter: ${md.twitter || "—"}`, callback_data: `meta_edit:${project.id}:twitter` }, { text: `Telegram: ${md.telegram || "—"}`, callback_data: `meta_edit:${project.id}:telegram` }],
        [{ text: `Website: ${md.website || "—"}`, callback_data: `meta_edit:${project.id}:website` }, { text: `Image: ${md.image ? "✅" : "—"}`, callback_data: `meta_edit:${project.id}:image` }],
        [{ text: "🚀 Deploy Metadata", callback_data: `meta_deploy:${project.id}` }],
        [{ text: "📋 Clone Metadata", callback_data: "unavailable" }],
        [{ text: "⬅️ Back", callback_data: `open_project:${project.id}` }]
      ]
    }
  };
}

// ---------- Webhook handlers ----------
for (const path of webhookPaths) {
  app.post(path, async (req, res) => {
    const update = req.body;
    try {
      // ---- Incoming messages ----
      if (update.message) {
        const chatId = update.message.chat.id;
        const userId = update.message.from.id;
        const text = update.message.text || "";

        // If user is in a flow expecting metadata value
        const state = userStates[userId];
        if (state && state.step === "editing_metadata") {
          const projectId = state.projectId;
          const field = state.field;
          const value = text.trim();
          if (!value) {
            await sendMessage(chatId, "❌ Empty value — please send a non-empty value.");
            return res.sendStatus(200);
          }
          projectStore.updateMetadata(userId, projectId, field, value);
          // if mandatory fields filled? we keep deploy logic in button
          delete userStates[userId];
          await sendMessage(chatId, `✅ ${field} updated!`, {
            reply_markup: metadataMenu(projectStore.getProject(userId, projectId)).reply_markup
          });
          return res.sendStatus(200);
        }

        // Commands
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
          await sendMessage(chatId, menu.text, { reply_markup: menu.reply_m
