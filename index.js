import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "secret";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- Utility: Send message
async function sendMessage(chatId, text, reply_markup = null) {
  return fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup })
  });
}

// --- Menus
function getHomeMenu(chatId) {
  const projects = projectStore.getProjects(chatId);
  const buttons = projects.map(p => [{ text: p.name, callback_data: `open_${p.id}` }]);
  buttons.push([{ text: "➕ Nouveau projet", callback_data: "new_project" }]);
  return {
    text: "🏠 Accueil - Choisis un projet",
    reply_markup: { inline_keyboard: buttons }
  };
}

function getProjectMenu(chatId, projectId) {
  const proj = projectStore.getProject(chatId, projectId);
  if (!proj) return { text: "❌ Projet introuvable" };
  return {
    text: `📌 Projet : ${proj.name}\n\n💠 Symbole : ${proj.symbol}\n📝 Description : ${proj.description}\n👛 Wallet : ${proj.wallet}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "✏️ Nom", callback_data: `edit_${projectId}_name` }],
        [{ text: "✏️ Symbole", callback_data: `edit_${projectId}_symbol` }],
        [{ text: "✏️ Description", callback_data: `edit_${projectId}_description` }],
        [{ text: "✏️ Wallet", callback_data: `edit_${projectId}_wallet` }],
        [{ text: "❌ Supprimer", callback_data: `delete_${projectId}` }],
        [{ text: "⬅️ Retour", callback_data: "home" }]
      ]
    }
  };
}

// --- Webhook
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    // Vérifie si l'utilisateur est en mode édition
    const editState = projectStore.getEditState(chatId);
    if (editState) {
      projectStore.updateProject(chatId, editState.projectId, editState.field, text);
      projectStore.clearEditState(chatId);

      const menu = getProjectMenu(chatId, editState.projectId);
      await sendMessage(chatId, `✅ ${editState.field} mis à jour !`);
      await sendMessage(chatId, menu.text, menu.reply_markup);
      return res.sendStatus(200);
    }

    if (text === "/start" || text === "/home") {
      const menu = getHomeMenu(chatId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    }
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    if (data === "home") {
      const menu = getHomeMenu(chatId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data === "new_project") {
      const newProj = projectStore.addProject(chatId, "Mon projet", "SYM", "Description...", "Wallet...");
      const menu = getProjectMenu(chatId, newProj.id);
      await sendMessage(chatId, `✅ Projet créé !`);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data.startsWith("open_")) {
      const projectId = data.split("_")[1];
      const menu = getProjectMenu(chatId, projectId);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data.startsWith("delete_")) {
      const projectId = data.split("_")[1];
      projectStore.deleteProject(chatId, projectId);
      const menu = getHomeMenu(chatId);
      await sendMessage(chatId, `🗑 Projet supprimé`);
      await sendMessage(chatId, menu.text, menu.reply_markup);
    } else if (data.startsWith("edit_")) {
      const [, projectId, field] = data.split("_");
      projectStore.setEditState(chatId, projectId, field);
      await sendMessage(chatId, `✏️ Envoie-moi le nouveau ${field} :`);
    }
  }

  res.sendStatus(200);
});

// --- Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);

  // Auto configure webhook
  const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/webhook/${WEBHOOK_SECRET}`;
  const resp = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });
  console.log("✅ Webhook configuré :", await resp.json());
});
