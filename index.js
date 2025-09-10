import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "SECRET";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- Send message
async function sendMessage(chatId, text, keyboard = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  };
  if (keyboard) body.reply_markup = keyboard;
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Menus
function getHomeMenu(projects) {
  return {
    inline_keyboard: [
      ...projects.map((p) => [{ text: p.name, callback_data: `open_${p.id}` }]),
      [{ text: "➕ Nouveau projet", callback_data: "new_project" }],
    ],
  };
}

function getProjectMenu(project) {
  return {
    inline_keyboard: [
      [{ text: "✏️ Nom", callback_data: `edit_${project.id}_name` }],
      [{ text: "✏️ Symbole", callback_data: `edit_${project.id}_symbol` }],
      [{ text: "✏️ Description", callback_data: `edit_${project.id}_description` }],
      [{ text: "✏️ Wallet", callback_data: `edit_${project.id}_wallet` }],
      [{ text: "❌ Supprimer", callback_data: `delete_${project.id}` }],
      [{ text: "⬅️ Retour", callback_data: "home" }],
    ],
  };
}

// --- Routes
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    // Vérifier si l'utilisateur est en mode édition
    const editing = projectStore.getEditing(chatId);
    if (editing) {
      projectStore.updateProjectField(chatId, editing.projectId, editing.field, text);
      projectStore.clearEditing(chatId);
      const proj = projectStore.getProject(chatId, editing.projectId);
      await sendMessage(chatId, `✅ ${editing.field} mis à jour !\n\n*${proj.name}*\n${proj.description}\nSymbol: ${proj.symbol}\nWallet: ${proj.wallet}`, getProjectMenu(proj));
      return res.sendStatus(200);
    }

    // Commandes classiques
    if (text === "/start") {
      await sendMessage(chatId, "👋 Bienvenue dans le bot de gestion de projets !\n\nUtilise le menu pour commencer.", {
        inline_keyboard: [[{ text: "🏠 Accueil", callback_data: "home" }]],
      });
    } else if (text === "/home") {
      const projects = projectStore.getProjects(chatId);
      await sendMessage(chatId, "🏠 Voici vos projets :", getHomeMenu(projects));
    }
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    if (data === "home") {
      const projects = projectStore.getProjects(chatId);
      await sendMessage(chatId, "🏠 Voici vos projets :", getHomeMenu(projects));
    }

    if (data === "new_project") {
      const newProj = projectStore.addProject(chatId, "Nouveau projet");
      await sendMessage(chatId, `✨ Projet *${newProj.name}* créé !`, getProjectMenu(newProj));
    }

    if (data.startsWith("open_")) {
      const projectId = data.split("_")[1];
      const proj = projectStore.getProject(chatId, projectId);
      if (proj) {
        await sendMessage(chatId, `📂 *${proj.name}*\n${proj.description}\nSymbol: ${proj.symbol}\nWallet: ${proj.wallet}`, getProjectMenu(proj));
      }
    }

    if (data.startsWith("delete_")) {
      const projectId = data.split("_")[1];
      projectStore.deleteProject(chatId, projectId);
      const projects = projectStore.getProjects(chatId);
      await sendMessage(chatId, "🗑 Projet supprimé.\n\n🏠 Retour à l'accueil :", getHomeMenu(projects));
    }

    if (data.startsWith("edit_")) {
      const [_, projectId, field] = data.split("_");
      projectStore.setEditing(chatId, projectId, field);
      await sendMessage(chatId, `✏️ Envoie-moi la nouvelle valeur pour *${field}* :`);
    }
  }

  res.sendStatus(200);
});

// --- Webhook setup auto
app.listen(10000, async () => {
  console.log("✅ Serveur en ligne sur port 10000");

  const url = `https://vortex-bot-pumpfun.onrender.com/webhook/${WEBHOOK_SECRET}`;
  const r = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await r.json();
  console.log("✅ Webhook configuré :", data);
});
