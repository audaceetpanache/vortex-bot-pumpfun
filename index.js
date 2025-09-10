import express from "express";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const WEBHOOK_URL = `https://vortex-bot-pumpfun.onrender.com/webhook/${WEBHOOK_SECRET}`;

// --- Fonction utilitaire pour envoyer un message
async function sendMessage(chatId, text, keyboard = null) {
  const body = {
    chat_id: chatId,
    text,
    reply_markup: keyboard,
  };

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Menus
function getHomeMenu() {
  return {
    text: "🏠 Home — que veux-tu faire ?",
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Nouveau projet", callback_data: "new_project" }],
        [{ text: "📂 Mes projets", callback_data: "list_projects" }],
        [{ text: "⚙️ Settings", callback_data: "settings" }],
      ],
    },
  };
}

function getSettingsMenu() {
  return {
    text: "⚙️ Paramètres (pas encore dispo)",
    reply_markup: {
      inline_keyboard: [[{ text: "⬅️ Retour", callback_data: "home" }]],
    },
  };
}

// --- Webhook
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === "/start" || text === "/home") {
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
    } else if (data === "settings") {
      const menu = getSettingsMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "new_project") {
      const newProj = projectStore.addProject(chatId, "Mon super projet");
      await sendMessage(chatId, `✅ Projet créé : ${newProj.name}`);
    } else if (data === "list_projects") {
      const projects = projectStore.getProjects(chatId);
      if (projects.length === 0) {
        await sendMessage(chatId, "📭 Aucun projet trouvé.");
      } else {
        const keyboard = {
          inline_keyboard: projects.map((p) => [
            { text: p.name, callback_data: `open_${p.id}` },
            { text: "🗑 Supprimer", callback_data: `delete_${p.id}` },
          ]),
        };
        await sendMessage(chatId, "📂 Tes projets :", keyboard);
      }
    } else if (data.startsWith("delete_")) {
      const id = parseInt(data.split("_")[1]);
      projectStore.deleteProject(chatId, id);
      await sendMessage(chatId, "🗑 Projet supprimé !");
    } else if (data.startsWith("open_")) {
      const id = parseInt(data.split("_")[1]);
      const project = projectStore.getProjects(chatId).find((p) => p.id === id);
      if (project) {
        await sendMessage(chatId, `📄 Projet : ${project.name}`);
      } else {
        await sendMessage(chatId, "❌ Projet introuvable.");
      }
    }
  }

  res.sendStatus(200);
});

// --- Lancement serveur
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);

  // Auto-set webhook à chaque démarrage
  try {
    const resp = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        secret_token: WEBHOOK_SECRET,
      }),
    });
    const data = await resp.json();
    console.log("✅ Webhook configuré :", data);
  } catch (err) {
    console.error("❌ Erreur config webhook :", err);
  }
});
