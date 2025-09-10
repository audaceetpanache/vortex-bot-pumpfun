import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { projectStore } from "./projectStore.js";
import { getLsniperSettingsMenu } from "./lsnipesettings.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "SECRET";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// --- Utils
async function sendMessage(chatId, text, keyboard = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  };
  if (keyboard) {
    body.reply_markup = keyboard;
  }
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function homeKeyboard(projects) {
  const rows = projects.map((p) => [
    { text: p.name, callback_data: `open_${p.id}` },
  ]);
  rows.push([{ text: "➕ Nouveau projet", callback_data: "new_project" }]);
  rows.push([{ text: "⚙️ Paramètres", callback_data: "settings" }]);
  return { inline_keyboard: rows };
}

function projectKeyboard(projectId) {
  return {
    inline_keyboard: [
      [
        { text: "✏️ Nom", callback_data: `edit_name_${projectId}` },
        { text: "🔤 Symbole", callback_data: `edit_symbol_${projectId}` },
      ],
      [
        { text: "📝 Description", callback_data: `edit_description_${projectId}` },
        { text: "👛 Wallet", callback_data: `edit_wallet_${projectId}` },
      ],
      [{ text: "🗑 Supprimer", callback_data: `delete_${projectId}` }],
      [{ text: "⬅️ Retour", callback_data: "home" }],
    ],
  };
}

// --- Webhook handler
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;
  console.log("Update reçu :", JSON.stringify(update, null, 2));

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === "/start") {
      await sendMessage(
        chatId,
        "👋 Bienvenue sur *Vortex Bot* !\n\n" +
          "Tu peux créer et gérer tes projets facilement.\n\n" +
          "👉 Utilise /home pour voir et gérer tes projets\n" +
          "👉 Utilise /lsnipesettings pour tes paramètres de snipe"
      );
    }

    if (text === "/home") {
      const projects = projectStore.getProjects(chatId);
      await sendMessage(chatId, "🏠 Voici tes projets :", homeKeyboard(projects));
    }

    if (text === "/lsnipesettings") {
      await sendMessage(
        chatId,
        "⚙️ Paramètres de snipe",
        getLsniperSettingsMenu()
      );
    }

    // gestion édition libre (quand user tape une réponse)
    if (projectStore.isEditing(chatId)) {
      const { field, projectId } = projectStore.getEditing(chatId);
      projectStore.updateProject(chatId, projectId, field, text);
      projectStore.clearEditing(chatId);
      await sendMessage(
        chatId,
        `✅ ${field} mis à jour !`,
        projectKeyboard(projectId)
      );
    }
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    if (data === "home") {
      const projects = projectStore.getProjects(chatId);
      await sendMessage(chatId, "🏠 Retour à l’accueil :", homeKeyboard(projects));
    }

    if (data === "new_project") {
      const newProj = projectStore.addProject(chatId, "Mon super projet");
      await sendMessage(chatId, "✨ Nouveau projet créé :", projectKeyboard(newProj.id));
    }

    if (data.startsWith("open_")) {
      const projectId = data.split("_")[1];
      const proj = projectStore.getProject(chatId, projectId);
      if (proj) {
        await sendMessage(
          chatId,
          `📂 *${proj.name}*\n\n` +
            `💠 Symbole: ${proj.symbol}\n` +
            `📝 Description: ${proj.description}\n` +
            `👛 Wallet: ${proj.wallet}`,
          projectKeyboard(proj.id)
        );
      }
    }

    if (data.startsWith("delete_")) {
      const projectId = data.split("_")[1];
      projectStore.deleteProject(chatId, projectId);
      const projects = projectStore.getProjects(chatId);
      await sendMessage(chatId, "🗑 Projet supprimé.", homeKeyboard(projects));
    }

    if (data.startsWith("edit_")) {
      const [_, field, projectId] = data.split("_");
      projectStore.setEditing(chatId, projectId, field);
      await sendMessage(chatId, `✏️ Envoie le nouveau *${field}* :`);
    }
  }

  res.sendStatus(200);
});

// --- Start server
app.listen(10000, async () => {
  console.log("✅ Serveur en ligne sur port 10000");

  // set webhook automatiquement
  const url = `https://vortex-bot-pumpfun.onrender.com/webhook/${WEBHOOK_SECRET}`;
  const resp = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await resp.json();
  console.log("✅ Webhook configuré :", data);
});
