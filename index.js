import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import { projectStore } from "./projectStore.js";
import { getUnavailableMenu } from "./unavailable.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "SECRET";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- Utilitaire pour envoyer un message
async function sendMessage(chatId, text, reply_markup = null) {
  const payload = { chat_id: chatId, text, reply_markup };
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// --- Menus principaux
function getStartMenu() {
  return {
    text: "👋 Bienvenue sur le bot Vortex Pumpfun !",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🏠 Home", callback_data: "home" }],
        [{ text: "⚙️ Settings", callback_data: "settings" }],
      ],
    },
  };
}

function getHomeMenu() {
  return {
    text: "🏠 Accueil",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📂 Mes projets", callback_data: "my_projects" }],
        [{ text: "➕ Créer un nouveau projet", callback_data: "create_project" }],
        [{ text: "🔘 Bouton 1", callback_data: "unavailable" }],
        [{ text: "🔘 Bouton 2", callback_data: "unavailable" }],
        [{ text: "🔘 Bouton 3", callback_data: "unavailable" }],
        [{ text: "🔘 Bouton 4", callback_data: "unavailable" }],
        [{ text: "🔘 Bouton 5", callback_data: "unavailable" }],
        [{ text: "🔘 Bouton 6", callback_data: "unavailable" }],
        [{ text: "⬅️ Retour", callback_data: "start" }],
      ],
    },
  };
}

function getSettingsMenu() {
  return {
    text: "⚙️ Réglages généraux",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Option A", callback_data: "unavailable" }],
        [{ text: "Option B", callback_data: "unavailable" }],
        [{ text: "⬅️ Retour", callback_data: "start" }],
      ],
    },
  };
}

// --- Gestion des projets
function getProjectListMenu(chatId) {
  const projects = projectStore.getProjects(chatId);
  if (projects.length === 0) {
    return {
      text: "📂 Vous n'avez encore aucun projet.",
      reply_markup: {
        inline_keyboard: [[{ text: "➕ Créer un projet", callback_data: "create_project" }], [{ text: "⬅️ Retour", callback_data: "home" }]],
      },
    };
  }
  return {
    text: "📂 Mes projets",
    reply_markup: {
      inline_keyboard: [
        ...projects.map((p) => [{ text: p.name, callback_data: `project_${p.id}` }]),
        [{ text: "⬅️ Retour", callback_data: "home" }],
      ],
    },
  };
}

function getProjectDetailMenu(chatId, projectId) {
  const project = projectStore.getProject(chatId, projectId);
  if (!project) return { text: "❌ Projet introuvable" };
  return {
    text: `📄 Projet : ${project.name}\n\n💠 Symbole: ${project.symbol}\n📝 Description: ${project.description}\n👛 Wallet: ${project.wallet}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "✏️ Nom", callback_data: `edit_name_${project.id}` }],
        [{ text: "✏️ Symbole", callback_data: `edit_symbol_${project.id}` }],
        [{ text: "✏️ Description", callback_data: `edit_description_${project.id}` }],
        [{ text: "✏️ Wallet", callback_data: `edit_wallet_${project.id}` }],
        [{ text: "🗑 Supprimer", callback_data: `delete_${project.id}` }],
        [{ text: "⬅️ Retour", callback_data: "my_projects" }],
      ],
    },
  };
}

// --- Webhook Telegram
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === "/start") {
      const menu = getStartMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    if (data === "start") {
      const menu = getStartMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "home") {
      const menu = getHomeMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "settings") {
      const menu = getSettingsMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "unavailable") {
      const menu = getUnavailableMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "my_projects") {
      const menu = getProjectListMenu(chatId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "create_project") {
      const newProj = projectStore.addProject(chatId, "Nouveau projet");
      const menu = getProjectDetailMenu(chatId, newProj.id);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data.startsWith("project_")) {
      const projectId = data.split("_")[1];
      const menu = getProjectDetailMenu(chatId, projectId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data.startsWith("edit_")) {
      const [_, field, projectId] = data.split("_");
      projectStore.setEditing(chatId, projectId, field);
      await sendMessage(chatId, `✏️ Envoyez la nouvelle valeur pour ${field}`);
    } else if (data.startsWith("delete_")) {
      const projectId = data.split("_")[1];
      projectStore.deleteProject(chatId, projectId);
      const menu = getProjectListMenu(chatId);
      await sendMessage(chatId, "🗑 Projet supprimé", menu.reply_markup);
    }
  }

  // Gestion édition texte
  if (update.message && update.message.text && !update.message.text.startsWith("/")) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    const editing = projectStore.getEditing(chatId);
    if (editing) {
      projectStore.updateProject(chatId, editing.projectId, { [editing.field]: text });
      projectStore.clearEditing(chatId);
      const menu = getProjectDetailMenu(chatId, editing.projectId);
      await sendMessage(chatId, "✅ Projet mis à jour", menu.reply_markup);
    }
  }

  res.sendStatus(200);
});

// --- Serveur
app.listen(10000, async () => {
  console.log("✅ Serveur en ligne sur port 10000");

  // Auto-set webhook
  const url = `https://vortex-bot-pumpfun.onrender.com/webhook/${WEBHOOK_SECRET}`;
  const resp = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  console.log("✅ Webhook configuré :", await resp.json());
});
