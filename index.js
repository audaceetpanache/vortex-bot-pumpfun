import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "SECRET";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const WEBHOOK_URL = `https://vortex-bot-pumpfun.onrender.com/webhook/${WEBHOOK_SECRET}`;

// --- Fonction utilitaire pour envoyer un message
async function sendMessage(chatId, text, reply_markup = null) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup,
    }),
  });
  return res.json();
}

// --- Webhook handler
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  console.log("Update reçu :", JSON.stringify(req.body, null, 2));

  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === "/start") {
      await sendMessage(chatId, "🌟 Welcome to VORTEX!\n🔥 Where Things Happen! 🔥", {
        inline_keyboard: [
          [{ text: "🏠 Home", callback_data: "home" }],
          [{ text: "⚙️ Settings", callback_data: "settings" }],
        ],
      });
    }

    if (text === "/home") {
      await sendHomeMenu(chatId);
    }
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    if (data === "home") {
      await sendHomeMenu(chatId);
    }

    if (data === "create_project") {
      const newProj = projectStore.addProject(chatId, "Mon super projet");
      await sendMessage(chatId, `✅ Projet créé : ${newProj.name}`);
      await sendHomeMenu(chatId);
    }

    if (data.startsWith("open_project_")) {
      const projectId = data.replace("open_project_", "");
      const projects = projectStore.getProjects(chatId);
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        await sendMessage(chatId, `📂 Projet : ${project.name}`, {
          inline_keyboard: [
            [{ text: "🗑️ Supprimer", callback_data: `delete_project_${project.id}` }],
            [{ text: "⬅️ Back", callback_data: "home" }],
          ],
        });
      } else {
        await sendMessage(chatId, "❌ Projet introuvable.");
      }
    }

    if (data.startsWith("delete_project_")) {
      const projectId = data.replace("delete_project_", "");
      const ok = projectStore.deleteProject(chatId, projectId);
      if (ok) {
        await sendMessage(chatId, "🗑️ Projet supprimé.");
      } else {
        await sendMessage(chatId, "❌ Impossible de supprimer ce projet.");
      }
      await sendHomeMenu(chatId);
    }
  }

  res.sendStatus(200);
});

// --- Menu principal HOME
async function sendHomeMenu(chatId) {
  const projects = projectStore.getProjects(chatId);

  const keyboard = [];

  if (projects.length > 0) {
    projects.forEach((proj) => {
      keyboard.push([{ text: `📂 ${proj.name}`, callback_data: `open_project_${proj.id}` }]);
    });
  }

  keyboard.push([{ text: "🚀 Create new Project", callback_data: "create_project" }]);

  await sendMessage(chatId, "🏠 Home\nVoici vos projets :", {
    inline_keyboard: keyboard,
  });
}

// --- Démarrage serveur
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);

  // Auto-config du webhook
  try {
    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: WEBHOOK_URL }),
    });
    const data = await res.json();
    console.log("✅ Webhook configuré :", data);
  } catch (err) {
    console.error("❌ Erreur config webhook :", err);
  }
});
