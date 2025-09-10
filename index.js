import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "SECRET";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- État temporaire pour gérer l’édition
const userState = {}; // { chatId: { action: "edit_name", index: 0 } }

// --- Utility pour envoyer un message
async function sendMessage(chatId, text, extra = {}) {
  return fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  });
}

// --- Inline keyboard d’un projet
function getProjectMenu(index) {
  return {
    inline_keyboard: [
      [{ text: "✏️ Nom", callback_data: `edit_name_${index}` }],
      [{ text: "🔤 Symbole", callback_data: `edit_symbol_${index}` }],
      [{ text: "📝 Description", callback_data: `edit_description_${index}` }],
      [{ text: "💳 Wallet", callback_data: `edit_wallet_${index}` }],
      [{ text: "🗑 Supprimer", callback_data: `delete_${index}` }],
      [{ text: "⬅️ Retour", callback_data: "home" }],
    ],
  };
}

// --- Menu Home
function getHomeMenu(projects) {
  const buttons = projects.map((p, i) => [
    { text: `${p.name} (${p.symbol})`, callback_data: `project_${i}` },
  ]);
  buttons.push([{ text: "➕ Nouveau projet", callback_data: "new_project" }]);
  return { inline_keyboard: buttons };
}

// --- Route webhook
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    // Vérifie si l’utilisateur est en mode édition
    if (userState[chatId]) {
      const { action, index } = userState[chatId];
      delete userState[chatId];

      let field = "";
      if (action === "edit_name") field = "name";
      if (action === "edit_symbol") field = "symbol";
      if (action === "edit_description") field = "description";
      if (action === "edit_wallet") field = "wallet";

      projectStore.updateProject(chatId, index, { [field]: text });

      const proj = projectStore.getProjects(chatId)[index];
      await sendMessage(chatId, `✅ ${field} mis à jour : ${text}`, {
        reply_markup: getProjectMenu(index),
      });
      return res.sendStatus(200);
    }

    // Commandes classiques
    if (text === "/start") {
      await sendMessage(
        chatId,
        "👋 Bienvenue dans le bot de gestion de projets !\n\nUtilise le menu ci-dessous pour commencer.",
        {
          reply_markup: {
            inline_keyboard: [[{ text: "🏠 Accueil", callback_data: "home" }]],
          },
        }
      );
    } else if (text === "/home") {
      const projects = projectStore.getProjects(chatId);
      await sendMessage(chatId, "🏠 Accueil - Vos projets :", {
        reply_markup: getHomeMenu(projects),
      });
    }
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    if (data === "home") {
      const projects = projectStore.getProjects(chatId);
      await sendMessage(chatId, "🏠 Accueil - Vos projets :", {
        reply_markup: getHomeMenu(projects),
      });
    } else if (data === "new_project") {
      const newProj = {
        name: "Nouveau projet",
        symbol: "SYM",
        description: "Description ici",
        wallet: "Adresse du wallet",
      };
      projectStore.addProject(chatId, newProj);
      const projects = projectStore.getProjects(chatId);
      await sendMessage(chatId, "✨ Projet créé :", {
        reply_markup: getHomeMenu(projects),
      });
    } else if (data.startsWith("project_")) {
      const index = parseInt(data.split("_")[1], 10);
      const proj = projectStore.getProjects(chatId)[index];
      await sendMessage(
        chatId,
        `📄 Projet : ${proj.name}\nSymbole : ${proj.symbol}\nDescription : ${proj.description}\nWallet : ${proj.wallet}`,
        { reply_markup: getProjectMenu(index) }
      );
    } else if (data.startsWith("edit_")) {
      const [_, field, index] = data.split("_");
      userState[chatId] = { action: `edit_${field}`, index: parseInt(index, 10) };
      await sendMessage(chatId, `✏️ Envoie-moi la nouvelle valeur pour ${field} :`);
    } else if (data.startsWith("delete_")) {
      const index = parseInt(data.split("_")[1], 10);
      projectStore.deleteProject(chatId, index);
      const projects = projectStore.getProjects(chatId);
      await sendMessage(chatId, "🗑 Projet supprimé.", {
        reply_markup: getHomeMenu(projects),
      });
    }
  }

  res.sendStatus(200);
});

// --- Serveur
app.listen(10000, async () => {
  console.log("✅ Serveur en ligne sur port 10000");

  // Configure automatiquement le webhook au démarrage
  const url = `https://vortex-bot-pumpfun.onrender.com/webhook/${WEBHOOK_SECRET}`;
  const resp = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  console.log("✅ Webhook configuré :", await resp.json());
});
