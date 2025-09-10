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
const WEBHOOK_URL = `${process.env.RENDER_EXTERNAL_URL}/webhook/${WEBHOOK_SECRET}`;

// --- Fonction utilitaire pour envoyer un message
async function sendMessage(chatId, text, extra = {}) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...extra })
  });
}

// --- Menus
function getStartMenu() {
  return {
    text: "👋 Bienvenue sur le bot !",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🏠 Home", callback_data: "home" }],
        [{ text: "⚙️ Settings", callback_data: "settings" }]
      ]
    }
  };
}

function getHomeMenu() {
  return {
    text: "🏠 Accueil",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📂 Mes projets", callback_data: "my_projects" }],
        [{ text: "➕ Créer un nouveau projet", callback_data: "create_project" }],
        [{ text: "📌 Bouton 1", callback_data: "unavailable" }],
        [{ text: "📌 Bouton 2", callback_data: "unavailable" }],
        [{ text: "📌 Bouton 3", callback_data: "unavailable" }],
        [{ text: "📌 Bouton 4", callback_data: "unavailable" }],
        [{ text: "📌 Bouton 5", callback_data: "unavailable" }],
        [{ text: "📌 Bouton 6", callback_data: "unavailable" }]
      ]
    }
  };
}

function getSettingsMenu() {
  return {
    text: "⚙️ Réglages généraux",
    reply_markup: {
      inline_keyboard: [
        [{ text: "lsnipesettings", callback_data: "unavailable" }],
        [{ text: "⬅️ Retour", callback_data: "home" }]
      ]
    }
  };
}

function getProjectMenu(project) {
  return {
    text: `📌 Projet : ${project.name}\n\n🪙 Symbole : ${project.symbol || "-"}\n📝 Description : ${project.description || "-"}\n👛 Wallet : ${project.wallet || "-"}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "✏️ Modifier nom", callback_data: `edit_${project.id}_name` }],
        [{ text: "✏️ Modifier symbole", callback_data: `edit_${project.id}_symbol` }],
        [{ text: "✏️ Modifier description", callback_data: `edit_${project.id}_description` }],
        [{ text: "✏️ Modifier wallet", callback_data: `edit_${project.id}_wallet` }],
        [{ text: "🗑️ Supprimer projet", callback_data: `delete_${project.id}` }],
        [{ text: "⬅️ Retour", callback_data: "my_projects" }]
      ]
    }
  };
}

function getMyProjectsMenu(chatId) {
  const projects = projectStore.getProjects(chatId);
  if (!projects.length) {
    return {
      text: "📂 Vous n'avez aucun projet.",
      reply_markup: {
        inline_keyboard: [[{ text: "⬅️ Retour", callback_data: "home" }]]
      }
    };
  }

  return {
    text: "📂 Mes projets",
    reply_markup: {
      inline_keyboard: [
        ...projects.map((p) => [{ text: p.name, callback_data: `project_${p.id}` }]),
        [{ text: "⬅️ Retour", callback_data: "home" }]
      ]
    }
  };
}

// --- Gestion des callbacks inline
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;

  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // Vérifier si l'utilisateur est en mode édition
      const edit = projectStore.isEditing(chatId);
      if (edit) {
        const updated = projectStore.applyEdit(chatId, text);
        if (updated) {
          await sendMessage(chatId, "✅ Projet mis à jour !");
          const menu = getProjectMenu(updated);
          await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
        }
        return res.sendStatus(200);
      }

      if (text === "/start") {
        const menu = getStartMenu();
        await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
      } else if (text === "/home") {
        const menu = getHomeMenu();
        await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
      }
    }

    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;

      if (data === "home") {
        const menu = getHomeMenu();
        await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
      } else if (data === "settings") {
        const menu = getSettingsMenu();
        await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
      } else if (data === "unavailable") {
        const menu = getUnavailableMenu();
        await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
      } else if (data === "create_project") {
        const newProj = projectStore.addProject(chatId, "Mon super projet");
        const menu = getProjectMenu(newProj);
        await sendMessage(chatId, "✅ Projet créé !");
        await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
      } else if (data === "my_projects") {
        const menu = getMyProjectsMenu(chatId);
        await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
      } else if (data.startsWith("project_")) {
        const projectId = data.split("_")[1];
        const project = projectStore.getProject(chatId, projectId);
        if (project) {
          const menu = getProjectMenu(project);
          await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
        }
      } else if (data.startsWith("edit_")) {
        const [, projectId, field] = data.split("_");
        projectStore.startEditing(chatId, projectId, field);
        await sendMessage(chatId, `✏️ Envoyez-moi la nouvelle valeur pour *${field}*`, { parse_mode: "Markdown" });
      } else if (data.startsWith("delete_")) {
        const projectId = data.split("_")[1];
        projectStore.deleteProject(chatId, projectId);
        const menu = getMyProjectsMenu(chatId);
        await sendMessage(chatId, "🗑️ Projet supprimé.");
        await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erreur :", err);
    res.sendStatus(500);
  }
});

// --- Lancer serveur et configurer webhook
app.listen(10000, async () => {
  console.log("✅ Serveur en ligne sur port 10000");

  try {
    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: WEBHOOK_URL })
    });
    const data = await res.json();
    console.log("✅ Webhook configuré :", data);
  } catch (err) {
    console.error("❌ Erreur configuration webhook :", err);
  }
});
