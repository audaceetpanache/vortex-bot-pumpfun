import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "SECRET";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- Utilitaire pour envoyer un message
async function sendMessage(chatId, text, keyboard = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  };
  if (keyboard) {
    payload.reply_markup = { inline_keyboard: keyboard };
  }
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// --- Start (écran d’accueil)
async function sendStartMenu(chatId) {
  const keyboard = [
    [{ text: "🏠 Home", callback_data: "home" }],
    [{ text: "⚙️ Settings", callback_data: "settings" }],
  ];
  await sendMessage(
    chatId,
    "👋 Bienvenue dans le bot *Vortex Pumpfun* !\n\nChoisis une option ci-dessous pour continuer :",
    keyboard
  );
}

// --- Menu Home
async function sendHomeMenu(chatId) {
  const keyboard = [
    [{ text: "📂 Mes projets", callback_data: "list_projects" }],
    [{ text: "➕ Créer un nouveau projet", callback_data: "create_project" }],
    [
      { text: "🔹 Bouton 1", callback_data: "unavailable" },
      { text: "🔹 Bouton 2", callback_data: "unavailable" },
    ],
    [
      { text: "🔹 Bouton 3", callback_data: "unavailable" },
      { text: "🔹 Bouton 4", callback_data: "unavailable" },
    ],
    [
      { text: "🔹 Bouton 5", callback_data: "unavailable" },
      { text: "🔹 Bouton 6", callback_data: "unavailable" },
    ],
  ];
  await sendMessage(chatId, "🏠 *Home* – choisis une option :", keyboard);
}

// --- Menu Settings
async function sendSettingsMenu(chatId) {
  const keyboard = [
    [{ text: "⚡ Paramètre 1", callback_data: "unavailable" }],
    [{ text: "⚡ Paramètre 2", callback_data: "unavailable" }],
    [{ text: "⚡ Paramètre 3", callback_data: "unavailable" }],
  ];
  await sendMessage(chatId, "⚙️ *Settings* – réglages généraux :", keyboard);
}

// --- Placeholder indisponible
async function sendUnavailable(chatId) {
  await sendMessage(
    chatId,
    "⏳ Cette fonctionnalité n'est pas encore disponible."
  );
}

// --- Liste des projets
async function listProjects(chatId) {
  const projects = projectStore.getProjects(chatId);
  if (!projects.length) {
    await sendMessage(
      chatId,
      "📂 Tu n’as pas encore de projet.\n\n👉 Clique sur *Créer un nouveau projet* pour commencer."
    );
    return;
  }
  const keyboard = projects.map((p, i) => [
    { text: `${p.name} (${p.symbol})`, callback_data: `project_${i}` },
  ]);
  await sendMessage(chatId, "📂 *Mes projets* :", keyboard);
}

// --- Vue d’un projet
async function viewProject(chatId, index) {
  const project = projectStore.getProjects(chatId)[index];
  if (!project) return;

  const text = `📌 *${project.name}*\n\n💠 Symbole : ${project.symbol}\n📝 Description : ${project.description}\n👛 Wallet : ${project.wallet}`;
  const keyboard = [
    [
      { text: "✏️ Nom", callback_data: `edit_name_${index}` },
      { text: "✏️ Symbole", callback_data: `edit_symbol_${index}` },
    ],
    [
      { text: "✏️ Description", callback_data: `edit_description_${index}` },
      { text: "✏️ Wallet", callback_data: `edit_wallet_${index}` },
    ],
    [{ text: "🗑 Supprimer", callback_data: `delete_project_${index}` }],
    [{ text: "⬅️ Retour", callback_data: "list_projects" }],
  ];
  await sendMessage(chatId, text, keyboard);
}

// --- Création de projet (basique)
async function createProject(chatId) {
  const newProj = projectStore.addProject(chatId, {
    name: "Nouveau projet",
    symbol: "SYM",
    description: "Description...",
    wallet: "Wallet...",
  });
  const projects = projectStore.getProjects(chatId);
  const index = projects.length - 1;
  await viewProject(chatId, index);
}

// --- Webhook handler
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      if (text === "/start") {
        await sendStartMenu(chatId);
      } else if (text === "/home") {
        await sendHomeMenu(chatId);
      } else if (text === "/settings") {
        await sendSettingsMenu(chatId);
      }
    }

    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;

      if (data === "home") await sendHomeMenu(chatId);
      else if (data === "settings") await sendSettingsMenu(chatId);
      else if (data === "unavailable") await sendUnavailable(chatId);
      else if (data === "list_projects") await listProjects(chatId);
      else if (data === "create_project") await createProject(chatId);
      else if (data.startsWith("project_")) {
        const index = parseInt(data.split("_")[1]);
        await viewProject(chatId, index);
      } else if (data.startsWith("delete_project_")) {
        const index = parseInt(data.split("_")[2]);
        projectStore.deleteProject(chatId, index);
        await listProjects(chatId);
      } else if (data.startsWith("edit_")) {
        const [_, field, index] = data.split("_");
        projectStore.startEditing(chatId, parseInt(index), field);
        await sendMessage(chatId, `✏️ Envoie la nouvelle valeur pour *${field}* :`);
      }
    }

    if (update.message && projectStore.isEditing(update.message.chat.id)) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      projectStore.applyEdit(chatId, text);
      await sendMessage(chatId, "✅ Projet mis à jour !");
      await listProjects(chatId);
    }
  } catch (err) {
    console.error("❌ Erreur :", err);
  }

  res.sendStatus(200);
});

// --- Lancement serveur
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);

  // Auto set webhook
  const url = `https://vortex-bot-pumpfun.onrender.com/webhook/${WEBHOOK_SECRET}`;
  try {
    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    console.log("✅ Webhook configuré :", data);
  } catch (err) {
    console.error("❌ Erreur config webhook :", err);
  }
});
