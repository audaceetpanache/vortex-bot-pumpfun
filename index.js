// index.js (extrait complet avec /start et /home différenciés)
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- Utility: Send message ---
async function sendMessage(chatId, text, keyboard = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  };
  if (keyboard) {
    body.reply_markup = keyboard;
  }

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Menus ---
function getHomeMenu() {
  return {
    text: "🏠 *Home*\nQue veux-tu faire ?",
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Create Project", callback_data: "create_project" }],
        [{ text: "📂 My Projects", callback_data: "list_projects" }],
        [{ text: "⚙️ Settings", callback_data: "settings" }],
      ],
    },
  };
}

function getStartMenu() {
  return {
    text: "👋 Bienvenue sur *Vortex Bot* !\n\nCe bot te permet de créer et gérer tes projets simplement.",
    reply_markup: {
      inline_keyboard: [[{ text: "🏠 Go to Home", callback_data: "home" }]],
    },
  };
}

// --- Webhook handler ---
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === "/start") {
      const menu = getStartMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (text === "/home") {
      const menu = getHomeMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    if (data === "home") {
      const menu = getHomeMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }
    // ... le reste du callback_query déjà existant
  }

  res.sendStatus(200);
});

// --- Start server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);

  // Configure webhook automatiquement au démarrage
  const url = `https://vortex-bot-pumpfun.onrender.com/webhook/${WEBHOOK_SECRET}`;
  const resp = await fetch(`${TELEGRAM_API}/setWebhook?url=${url}`);
  const data = await resp.json();
  console.log("✅ Webhook configuré :", data);
});
