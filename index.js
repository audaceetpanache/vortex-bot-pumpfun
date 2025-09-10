import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

import { projectStore } from "./projectStore.js";
import { getUnavailableMenu } from "./unavailable.js";
import { getLSnipeSettingsMenu } from "./lsnipesettings.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const WEBHOOK_URL = `${process.env.RENDER_EXTERNAL_URL}/webhook/${WEBHOOK_SECRET}`;

// --- Utility: Send message
async function sendMessage(chatId, text, replyMarkup = null) {
  const body = { chat_id: chatId, text, parse_mode: "Markdown" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Menus
function getStartMenu() {
  return {
    text: "👋 Bienvenue dans le bot Vortex !\n\nAvec ce bot, tu peux créer et gérer tes projets facilement.",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🏠 Accueil", callback_data: "home" }],
        [{ text: "⚙️ Paramètres", callback_data: "settings" }],
        [{ text: "🛠 LSnipe Settings", callback_data: "lsnipesettings" }]
      ],
    },
  };
}

function getHomeMenu(chatId) {
  const projects = projectStore.getProjects(chatId);
  const keyboard = projects.map((p) => [
    { text: `📁 ${p.name}`, callback_data: `open_${p.id}` },
  ]);
  keyboard.push([{ text: "➕ Nouveau projet", callback_data: "new_project" }]);
  return { text: "🏠 Accueil - Tes projets :", reply_markup: { inline_keyboard: keyboard } };
}

function getProjectMenu(chatId, projectId) {
  const project = projectStore.getProject(chatId, projectId);
  if (!project) return { text: "❌ Projet introuvable." };

  return {
    text: `📁 *${project.name}*\n\n💠 Symbole : ${project.symbol}\n📝 Description : ${project.description}\n👛 Wallet : ${project.wallet}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "✏️ Nom", callback_data: `edit_name_${projectId}` }],
        [{ text: "✏️ Symbole", callback_data: `edit_symbol_${projectId}` }],
        [{ text: "✏️ Description", callback_data: `edit_description_${projectId}` }],
        [{ text: "✏️ Wallet", callback_data: `edit_wallet_${projectId}` }],
        [{ text: "🗑 Supprimer", callback_data: `delete_${projectId}` }],
        [{ text: "⬅️ Retour", callback_data: "home" }],
      ],
    },
  };
}

// --- Webhook
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === "/start") {
      const menu = getStartMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }

    if (text === "/home") {
      const menu = getHomeMenu(chatId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }

    if (text === "/lsnipesettings") {
      const menu = getLSnipeSettingsMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    if (data === "home") {
      const menu = getHomeMenu(chatId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }

    if (data === "lsnipesettings") {
      const menu = getLSnipeSettingsMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }

    if (data === "unavailable") {
      const menu = getUnavailableMenu();
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }

    if (data === "new_project") {
      const newProj = projectStore.addProject(chatId, "Nouveau projet");
      const menu = getProjectMenu(chatId, newProj.id);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }

    if (data.startsWith("open_")) {
      const projectId = data.split("_")[1];
      const menu = getProjectMenu(chatId, projectId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }

    if (data.startsWith("delete_")) {
      const projectId = data.split("_")[1];
      projectStore.deleteProject(chatId, projectId);
      const menu = getHomeMenu(chatId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }

    if (data.startsWith("edit_")) {
      const [_, field, projectId] = data.split("_");
      projectStore.setPendingEdit(chatId, projectId, field);
      await sendMessage(chatId, `✏️ Envoie-moi la nouvelle valeur pour *${field}* :`);
    }
  }

  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const pending = projectStore.getPendingEdit(chatId);

    if (pending) {
      projectStore.updateProjectField(chatId, pending.projectId, pending.field, update.message.text);
      projectStore.clearPendingEdit(chatId);

      const menu = getProjectMenu(chatId, pending.projectId);
      await sendMessage(chatId, "✅ Champ mis à jour !");
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }
  }

  res.sendStatus(200);
});

// --- Start server
app.listen(10000, async () => {
  console.log("✅ Serveur en ligne sur port 10000");

  const res = await fetch(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}`);
  const data = await res.json();
  console.log("✅ Webhook configuré :", data);
});
