import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "secret";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- Utility
async function sendMessage(chatId, text, keyboard = null) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: keyboard || undefined,
    }),
  });
}

// --- Start & Home
function getStartMenu() {
  return {
    inline_keyboard: [
      [{ text: "🏠 Home", callback_data: "home" }],
      [{ text: "⚙️ Settings", callback_data: "settings" }],
    ],
  };
}

function getHomeMenu(userId) {
  const projects = projectStore.getProjects(userId);
  return {
    inline_keyboard: [
      [{ text: "📂 Your Projects", callback_data: "list_projects" }],
      [{ text: "🚀 Create new Project", callback_data: "create_project" }],
      [
        {
          text: "🤑 BUMP BOT 🤑",
          callback_data: "bump_bot",
        },
      ],
      [
        {
          text: "🎁 CLAIM DEV REWARDS",
          callback_data: "rewards",
        },
      ],
    ],
  };
}

// --- Handlers
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;
  if (update.message) {
    const chatId = update.message.chat.id;
    if (update.message.text === "/start") {
      await sendMessage(
        chatId,
        "🌟 Welcome to VORTEX!\n🔥 Where Things Happen! 🔥",
        getStartMenu()
      );
    }
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const userId = String(chatId);
    const data = update.callback_query.data;

    if (data === "home") {
      await sendMessage(chatId, "🏠 Home Menu", getHomeMenu(userId));
    }

    if (data === "create_project") {
      const project = projectStore.addProject(userId, "Untitled Project");
      await sendMessage(
        chatId,
        `✅ Project created: ${project.name} (ID: ${project.id})`
      );
    }

    if (data === "list_projects") {
      const projects = projectStore.getProjects(userId);
      if (!projects.length) {
        await sendMessage(chatId, "❌ You have no projects yet.");
      } else {
        const keyboard = {
          inline_keyboard: projects.map((p) => [
            { text: p.name, callback_data: `open_${p.id}` },
            { text: "🗑️ Delete", callback_data: `delete_${p.id}` },
          ]),
        };
        await sendMessage(chatId, "📂 Your Projects:", keyboard);
      }
    }

    if (data.startsWith("delete_")) {
      const projectId = data.split("_")[1];
      projectStore.deleteProject(userId, projectId);
      await sendMessage(chatId, "🗑️ Project deleted.");
    }

    if (data.startsWith("open_")) {
      const projectId = data.split("_")[1];
      const proj = projectStore.getProject(userId, projectId);
      if (!proj) {
        await sendMessage(chatId, "❌ Project not found.");
      } else {
        await sendMessage(
          chatId,
          `📂 Project: ${proj.name}\nSymbol: ${proj.symbol || "❌"}\nDescription: ${
            proj.description || "❌"
          }\nWallets: ${proj.wallets.length}\nValidated: ${
            proj.validated ? "✅" : "❌"
          }`
        );
      }
    }
  }

  res.sendStatus(200);
});

// --- Server
app.listen(10000, async () => {
  console.log("✅ Serveur en ligne sur port 10000");

  // auto set webhook
  const url = `${process.env.RENDER_EXTERNAL_URL}/webhook/${WEBHOOK_SECRET}`;
  const resp = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await resp.json();
  console.log("✅ Webhook configuré :", data);
});
