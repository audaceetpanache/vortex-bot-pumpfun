// index.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

import { projectStore } from "./projectStore.js";
import { getUnavailableMenu } from "./unavailable.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- Utils ---
async function sendMessage(chatId, text, reply_markup = null) {
  const body = { chat_id: chatId, text, reply_markup };
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Menus ---
function getStartMenu() {
  return {
    text: "👋 Bienvenue sur Vortex Bot !\n\nChoisis une option pour commencer.",
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
    text: "🏠 Accueil - Choisis une option :",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📂 Mes projets", callback_data: "list_projects" }],
        [{ text: "➕ Créer un nouveau projet", callback_data: "create_project" }],
        [{ text: "🔹 Bouton 1", callback_data: "unavailable" }],
        [{ text: "🔹 Bouton 2", callback_data: "unavailable" }],
        [{ text: "🔹 Bouton 3", callback_data: "unavailable" }],
        [{ text: "🔹 Bouton 4", callback_data: "unavailable" }],
        [{ text: "🔹 Bouton 5", callback_data: "unavailable" }],
        [{ text: "🔹 Bouton 6", callback_data: "unavailable" }],
      ],
    },
  };
}

function getSettingsMenu() {
  return {
    text: "⚙️ Réglages généraux :",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Option 1", callback_data: "unavailable" }],
        [{ text: "Option 2", callback_data: "unavailable" }],
        [{ text: "⬅️ Retour", callback_data: "home" }],
      ],
    },
  };
}

function getProjectMenu(chatId, project) {
  const deployReady = projectStore.canDeploy(project);
  const missing = projectStore.getMissingFields(project);

  return {
    text: `📄 Projet : ${project.name}\n\n` +
          `Symbole : ${project.symbol || "❌"}\n` +
          `Description : ${project.description || "❌"}\n` +
          `Wallet : ${project.wallet || "❌"}\n\n` +
          (deployReady
            ? "✅ Ce projet peut être déployé."
            : `⚠️ Informations manquantes : ${missing.join(", ")}`),
    reply_markup: {
      inline_keyboard: [
        [{ text: "✏️ Nom", callback_data: `edit_${project.id}_name` }],
        [{ text: "✏️ Symbole", callback_data: `edit_${project.id}_symbol` }],
        [{ text: "✏️ Description", callback_data: `edit_${project.id}_description` }],
        [{ text: "✏️ Wallet", callback_data: `edit_${project.id}_wallet` }],
        [{ text: "🚀 Déployer le projet", callback_data: `deploy_${project.id}` }],
        [{ text: "🗑️ Supprimer", callback_data: `delete_${project.id}` }],
        [{ text: "⬅️ Retour", callback_data: "list_projects" }],
      ],
    },
  };
}

// --- Handlers ---
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      const editState = projectStore.isEditing(chatId);
      if (editState) {
        const updatedProject = projectStore.applyEdit(chatId, text);
        if (updatedProject) {
          const menu = getProjectMenu(chatId, updatedProject);
          await sendMessage(chatId, menu.text, menu.reply_markup);
        }
        return res.sendStatus(200);
      }

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
      } else if (data === "settings") {
        const menu = getSettingsMenu();
        await sendMessage(chatId, menu.text, menu.reply_markup);
      } else if (data === "unavailable") {
        const menu = getUnavailableMenu();
        await sendMessage(chatId, menu.text, menu.reply_markup);
      } else if (data === "list_projects") {
        const projects = projectStore.getProjects(chatId);
        if (projects.length === 0) {
          await sendMessage(chatId, "📂 Aucun projet pour le moment.");
        } else {
          for (const p of projects) {
            const menu = getProjectMenu(chatId, p);
            await sendMessage(chatId, menu.text, menu.reply_markup);
          }
        }
      } else if (data === "create_project") {
        const newProj = projectStore.addProject(chatId, "Mon super projet");
        const menu = getProjectMenu(chatId, newProj);
        await sendMessage(chatId, menu.text, menu.reply_markup);
      } else if (data.startsWith("delete_")) {
        const projectId = data.split("_")[1];
        projectStore.deleteProject(chatId, projectId);
        await sendMessage(chatId, "🗑️ Projet supprimé.");
      } else if (data.startsWith("edit_")) {
        const [_, projectId, field] = data.split("_");
        projectStore.startEditing(chatId, projectId, field);
        await sendMessage(chatId, `✏️ Envoie le nouveau ${field} :`);
      } else if (data.startsWith("deploy_")) {
        const projectId = data.split("_")[1];
        const project = projectStore.getProject(chatId, projectId);

        if (projectStore.canDeploy(project)) {
          await sendMessage(chatId, "🚀 Projet déployé avec succès !");
        } else {
          const missing = projectStore.getMissingFields(project);
          await sendMessage(
            chatId,
            `⚠️ Impossible de déployer. Champs manquants : ${missing.join(", ")}`
          );
        }
      }
    }
  } catch (err) {
    console.error("❌ Erreur :", err);
  }

  res.sendStatus(200);
});

// --- Start server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);

  // Configure webhook
  const url = `https://api.telegram.org/bot${TOKEN}/setWebhook`;
  const webhookUrl = `https://vortex-bot-pumpfun.onrender.com/webhook/${WEBHOOK_SECRET}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await resp.json();
    console.log("✅ Webhook configuré :", data);
  } catch (err) {
    console.error("❌ Erreur Webhook :", err);
  }
});
