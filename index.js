import { Telegraf } from "telegraf";
import express from "express";
import fetch from "node-fetch";

import { projects } from "./projectStore.js";
import { getMetadataMenu } from "./metadata.js";
import { getWalletsMenu } from "./wallets.js";
import { getUnavailableMenu } from "./unavailable.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- Utility: Send message
async function sendMessage(chatId, text, reply_markup = null) {
  const url = `${TELEGRAM_API}/sendMessage`;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    reply_markup,
  };
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Utility: Edit message (for inline keyboards)
async function editMessage(chatId, messageId, text, reply_markup = null) {
  const url = `${TELEGRAM_API}/editMessageText`;
  const body = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
    reply_markup,
  };
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Routes
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  // Handle messages (/start, /home, etc.)
  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === "/start") {
      await sendMessage(
        chatId,
        "🌟 Welcome to VORTEX!\n🔥 Where Things Happen! 🔥\nAvailable Features:\n• Create and manage projects\nUse /home to access all features\nUse /settings for configuration",
        {
          inline_keyboard: [
            [
              { text: "🏠 Home", callback_data: "home" },
              { text: "⚙️ Settings", callback_data: "settings" },
            ],
          ],
        }
      );
    }

    if (text === "/home") {
      await sendMessage(
        chatId,
        `Yo ${update.message.from.first_name}! Nice to see you again! 🔥\nWhat's the move, boss?`,
        {
          inline_keyboard: [
            [{ text: "📂 Your Projects", callback_data: "your_projects" }],
            [{ text: "🚀 Create new Project", callback_data: "create_project" }],
            [{ text: "🚧 SPAM LAUNCH", callback_data: "unavailable" }],
            [{ text: "🤑 BUMP BOT 🤑", callback_data: "unavailable" }],
            [{ text: "💰 GET ALL SOL", callback_data: "unavailable" }],
            [{ text: "🎁 CLAIM DEV REWARDS", callback_data: "unavailable" }],
            [
              { text: "🔗 Referrals", callback_data: "unavailable" },
              { text: "❓ Help", url: "https://deployonvortex.gitbook.io/documentation/" },
            ],
            [{ text: "👥 Discord", url: "https://discord.com/invite/vortexdeployer" }],
          ],
        }
      );
    }

    if (text === "/settings") {
      await sendMessage(chatId, "⚙️ Settings\nCurrent Settings:\n• Safe Settings: Enabled", {
        inline_keyboard: [
          [{ text: "⬅️ Back", callback_data: "home" }],
          [{ text: "🚧 More settings", callback_data: "unavailable" }],
        ],
      });
    }
  }

  // Handle button clicks (callback_query)
  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const messageId = update.callback_query.message.message_id;
    const data = update.callback_query.data;
    const userId = update.callback_query.from.id;

    if (data === "home") {
      await editMessage(
        chatId,
        messageId,
        `Yo ${update.callback_query.from.first_name}! Nice to see you again! 🔥\nWhat's the move, boss?`,
        {
          inline_keyboard: [
            [{ text: "📂 Your Projects", callback_data: "your_projects" }],
            [{ text: "🚀 Create new Project", callback_data: "create_project" }],
            [{ text: "🚧 SPAM LAUNCH", callback_data: "unavailable" }],
            [{ text: "🤑 BUMP BOT 🤑", callback_data: "unavailable" }],
            [{ text: "💰 GET ALL SOL", callback_data: "unavailable" }],
            [{ text: "🎁 CLAIM DEV REWARDS", callback_data: "unavailable" }],
            [
              { text: "🔗 Referrals", callback_data: "unavailable" },
              { text: "❓ Help", url: "https://deployonvortex.gitbook.io/documentation/" },
            ],
            [{ text: "👥 Discord", url: "https://discord.com/invite/vortexdeployer" }],
          ],
        }
      );
    }

    if (data === "settings") {
      await editMessage(chatId, messageId, "⚙️ Settings\nCurrent Settings:\n• Safe Settings: Enabled", {
        inline_keyboard: [
          [{ text: "⬅️ Back", callback_data: "home" }],
          [{ text: "🚧 More settings", callback_data: "unavailable" }],
        ],
      });
    }

    if (data === "unavailable") {
      const unavailable = getUnavailableMenu();
      await editMessage(chatId, messageId, unavailable.text, unavailable.reply_markup);
    }

    if (data === "your_projects") {
      const projects = projectStore.getProjects(userId);
      if (projects.length === 0) {
        await editMessage(
          chatId,
          messageId,
          "📂 You don't have any projects yet.",
          {
            inline_keyboard: [
              [{ text: "🚀 Create new Project", callback_data: "create_project" }],
              [{ text: "⬅️ Back", callback_data: "home" }],
            ],
          }
        );
      } else {
        await editMessage(chatId, messageId, "📂 Your Projects:", {
          inline_keyboard: [
            ...projects.map((p) => [{ text: p.name, callback_data: `project_${p.id}` }]),
            [{ text: "⬅️ Back", callback_data: "home" }],
          ],
        });
      }
    }

    if (data === "create_project") {
      const project = projectStore.createProject(userId);
      await editMessage(
        chatId,
        messageId,
        `🚀 Project created with ID: ${project.id}\nNow configure Metadata or Wallets.`,
        {
          inline_keyboard: [
            [{ text: "📝 Token Metadata", callback_data: `metadata_${project.id}` }],
            [{ text: "👛 Project Wallets", callback_data: `wallets_${project.id}` }],
            [{ text: "⬅️ Back", callback_data: "your_projects" }],
          ],
        }
      );
    }

    if (data.startsWith("project_")) {
      const projectId = data.split("_")[1];
      const project = projectStore.getProject(userId, projectId);

      if (!project) {
        await editMessage(chatId, messageId, "❌ Project not found.", {
          inline_keyboard: [[{ text: "⬅️ Back", callback_data: "your_projects" }]],
        });
        return;
      }

      await editMessage(chatId, messageId, `🎯 Project ${project.id}`, {
        inline_keyboard: [
          [{ text: "📝 Token Metadata", callback_data: `metadata_${project.id}` }],
          [{ text: "👛 Project Wallets", callback_data: `wallets_${project.id}` }],
          [{ text: "⬅️ Back", callback_data: "your_projects" }],
        ],
      });
    }

    if (data.startsWith("metadata_")) {
      const projectId = data.split("_")[1];
      const menu = getMetadataMenu(userId, projectId);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
    }

    if (data.startsWith("wallets_")) {
      const projectId = data.split("_")[1];
      const menu = getWalletsMenu(userId, projectId);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
