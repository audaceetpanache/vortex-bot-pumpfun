import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- utilitaire pour envoyer un message
async function sendMessage(chatId, text, replyMarkup) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
    }),
  });
}

// --- Menu Home (inchangé)
function getHomeMenu(chatId) {
  const projects = projectStore.getProjects(chatId);
  const buttons = projects.map((p, idx) => [
    { text: `${p.name} (${p.symbol})`, callback_data: `project_${idx}` },
  ]);
  buttons.push([{ text: "➕ Nouveau projet", callback_data: "new_project" }]);

  return {
    text: "🏠 Home — Gestion des projets",
    reply_markup: { inline_keyboard: buttons },
  };
}

// --- Webhook
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === "/start") {
      // Message d’accueil simple
      await sendMessage(chatId, "👋 Bienvenue sur ton bot !", {
        inline_keyboard: [[{ text: "🏠 Aller au Home", callback_data: "home" }]],
      });
    } else if (text === "/home") {
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
      const newProj = projectStore.addProject(chatId, {
        name: "Nouveau projet",
        symbol: "SYM",
        description: "Description...",
        wallet: "AdresseWallet",
      });
      await sendMessage(
        chatId,
        `✅ Projet créé : ${newProj.name}`,
        getHomeMenu(chatId).reply_markup
      );
    } else if (data.startsWith("project_")) {
      const idx = parseInt(data.split("_")[1]);
      const project = projectStore.getProjects(chatId)[idx];
      if (project) {
        await sendMessage(
          chatId,
          `📌 Projet sélectionné :\n\n` +
            `Nom: ${project.name}\n` +
            `Symbole: ${project.symbol}\n` +
            `Description: ${project.description}\n` +
            `Wallet: ${project.wallet}`,
          {
            inline_keyboard: [
              [{ text: "✏️ Modifier nom", callback_data: `edit_name_${idx}` }],
              [{ text: "✏️ Modifier symbole", callback_data: `edit_symbol_${idx}` }],
              [{ text: "✏️ Modifier description", callback_data: `edit_desc_${idx}` }],
              [{ text: "✏️ Modifier wallet", callback_data: `edit_wallet_${idx}` }],
              [{ text: "🗑 Supprimer", callback_data: `delete_${idx}` }],
              [{ text: "⬅️ Retour", callback_data: "home" }],
            ],
          }
        );
      }
    } else if (data.startsWith("delete_")) {
      const idx = parseInt(data.split("_")[1]);
      projectStore.deleteProject(chatId, idx);
      await sendMessage(chatId, "🗑 Projet supprimé.", getHomeMenu(chatId).reply_markup);
    }
  }

  res.sendStatus(200);
});

// --- Démarrage du serveur
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);
});
