import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import projectStore from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${TOKEN}`;

// --- Helpers Telegram ---
async function sendMessage(chatId, text, replyMarkup = null) {
  try {
    await fetch(`${API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: replyMarkup,
      }),
    });
  } catch (err) {
    console.error("Erreur sendMessage:", err.message);
  }
}

function homeKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📂 Mes projets", callback_data: "my_projects" }],
      [{ text: "➕ Créer un projet", callback_data: "create_project" }],
      [{ text: "🔹 Bouton 1", callback_data: "unavailable" }],
      [{ text: "🔹 Bouton 2", callback_data: "unavailable" }],
      [{ text: "🔹 Bouton 3", callback_data: "unavailable" }],
      [{ text: "🔹 Bouton 4", callback_data: "unavailable" }],
      [{ text: "🔹 Bouton 5", callback_data: "unavailable" }],
      [{ text: "🔹 Bouton 6", callback_data: "unavailable" }],
    ],
  };
}

// --- Page d’accueil (Home) ---
function sendHome(chatId) {
  sendMessage(chatId, "🏠 Bienvenue sur la page d'accueil :", {
    inline_keyboard: homeKeyboard().inline_keyboard,
  });
}

// --- Webhook ---
app.post(`/webhook/${process.env.BOT_USERNAME}`, async (req, res) => {
  const update = req.body;

  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      if (text === "/start") {
        await sendMessage(chatId, "👋 Bienvenue sur le bot !", {
          inline_keyboard: [
            [{ text: "🏠 Home", callback_data: "go_home" }],
            [{ text: "⚙️ Settings", callback_data: "settings" }],
          ],
        });
      } else if (text === "/home") {
        sendHome(chatId);
      } else if (projectStore.isEditing(chatId)) {
        projectStore.applyEdit(chatId, text);
        sendMessage(chatId, "✅ Information mise à jour !");
        sendHome(chatId);
      }
    } else if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;

      if (data === "go_home") {
        sendHome(chatId);
      } else if (data === "settings") {
        sendMessage(chatId, "⚙️ Réglages :", {
          inline_keyboard: [
            [{ text: "Option A", callback_data: "unavailable" }],
            [{ text: "Option B", callback_data: "unavailable" }],
            [{ text: "⬅️ Back", callback_data: "go_home" }],
          ],
        });
      } else if (data === "my_projects") {
        const projects = projectStore.getProjects(chatId);
        if (projects.length === 0) {
          sendMessage(chatId, "📂 Vous n'avez pas encore de projets.");
        } else {
          const buttons = projects.map((p, i) => [
            { text: `${p.name} (${p.symbol})`, callback_data: `project_${i}` },
          ]);
          buttons.push([{ text: "⬅️ Back", callback_data: "go_home" }]);
          sendMessage(chatId, "📂 Vos projets :", {
            inline_keyboard: buttons,
          });
        }
      } else if (data === "create_project") {
        projectStore.addProject(chatId, {
          name: "Nouveau projet",
          symbol: "SYM",
          description: "Description vide",
          wallet: "Wallet vide",
        });
        sendMessage(chatId, "✅ Projet créé !");
        sendHome(chatId);
      } else if (data.startsWith("project_")) {
        const index = parseInt(data.split("_")[1]);
        const project = projectStore.getProjects(chatId)[index];
        if (!project) return;

        sendMessage(
          chatId,
          `📌 Projet : ${project.name}\n💠 Symbole : ${project.symbol}\n📝 Description : ${project.description}\n💳 Wallet : ${project.wallet}`,
          {
            inline_keyboard: [
              [{ text: "✏️ Nom", callback_data: `edit_${index}_name` }],
              [{ text: "✏️ Symbole", callback_data: `edit_${index}_symbol` }],
              [
                { text: "✏️ Description", callback_data: `edit_${index}_description` },
              ],
              [{ text: "✏️ Wallet", callback_data: `edit_${index}_wallet` }],
              [{ text: "🚀 Déployer", callback_data: `deploy_${index}` }],
              [{ text: "🗑️ Supprimer", callback_data: `delete_${index}` }],
              [{ text: "⬅️ Back", callback_data: "my_projects" }],
            ],
          }
        );
      } else if (data.startsWith("edit_")) {
        const [_, index, field] = data.split("_");
        projectStore.startEditing(chatId, parseInt(index), field);
        sendMessage(chatId, `✏️ Envoyez la nouvelle valeur pour ${field} :`);
      } else if (data.startsWith("delete_")) {
        const index = parseInt(data.split("_")[1]);
        projectStore.deleteProject(chatId, index);
        sendMessage(chatId, "🗑️ Projet supprimé.");
        sendHome(chatId);
      } else if (data.startsWith("deploy_")) {
        const index = parseInt(data.split("_")[1]);
        const project = projectStore.getProjects(chatId)[index];
        if (project.name && project.symbol && project.description && project.wallet) {
          sendMessage(chatId, "🚀 Projet déployé avec succès !");
        } else {
          sendMessage(chatId, "⚠️ Impossible de déployer : toutes les infos ne sont pas remplies.");
        }
      } else if (data === "unavailable") {
        sendMessage(chatId, "❌ Cette fonctionnalité n'est pas disponible pour le moment.");
      }
    }
  } catch (err) {
    console.error("❌ Erreur :", err.message);
  }

  res.sendStatus(200);
});

// --- Lancement serveur ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);

  // Définir automatiquement le webhook
  const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/webhook/${process.env.BOT_USERNAME}`;
  try {
    const res = await fetch(`${API_URL}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    console.log("✅ Webhook configuré :", data);
  } catch (err) {
    console.error("❌ Erreur Webhook:", err.message);
  }
});
