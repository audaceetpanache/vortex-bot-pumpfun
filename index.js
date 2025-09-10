import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import { projectStore } from "./projectStore.js";

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

const userStates = {}; // Pour suivre où en est chaque utilisateur

// --- Utils ---
async function sendMessage(chatId, text, options = {}) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      ...options,
    }),
  });
}

// --- Webhook ---
app.post("/webhook", async (req, res) => {
  const update = req.body;

  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const text = update.message.text;

      // --- Création projet : attente du nom
      if (userStates[userId]?.step === "awaiting_project_name") {
        const project = projectStore.addProject(userId, text);
        delete userStates[userId];
        await sendMessage(chatId, `✅ Project *${project.name}* created!`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📂 Your Projects", callback_data: "your_projects" }],
              [{ text: "⬅️ Back", callback_data: "home" }],
            ],
          },
        });
        return;
      }

      // Commande /start
      if (text === "/start") {
        await sendMessage(
          chatId,
          "🌟 Welcome to VORTEX!\n🔥 Where Things Happen! 🔥\nAvailable Features:\n• Manage your projects\n\nUse /home to access all features",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🏠 Home", callback_data: "home" }],
                [{ text: "⚙️ Settings", callback_data: "settings" }],
              ],
            },
          }
        );
      }

      // Commande /home
      if (text === "/home") {
        await sendMessage(
          chatId,
          `Yo ${update.message.from.first_name}! Nice to see you again! 🔥\nWhat's the move, boss?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📂 Your Projects", callback_data: "your_projects" }],
                [{ text: "🚀 Create New Project", callback_data: "create_project" }],
                [{ text: "⬅️ Back", callback_data: "start" }],
              ],
            },
          }
        );
      }
    }

    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const userId = update.callback_query.from.id;
      const data = update.callback_query.data;

      // --- Navigation ---
      if (data === "home") {
        await sendMessage(
          chatId,
          `Yo ${update.callback_query.from.first_name}! Nice to see you again! 🔥\nWhat's the move, boss?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📂 Your Projects", callback_data: "your_projects" }],
                [{ text: "🚀 Create New Project", callback_data: "create_project" }],
                [{ text: "⬅️ Back", callback_data: "start" }],
              ],
            },
          }
        );
      }

      if (data === "settings") {
        await sendMessage(chatId, "⚙️ Settings (placeholder)", {
          reply_markup: {
            inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]],
          },
        });
      }

      // --- Gestion des projets ---
      if (data === "your_projects") {
        const projects = projectStore.getProjectsByUser(userId);
        if (projects.length === 0) {
          await sendMessage(chatId, "📂 You don't have any projects yet.", {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🚀 Create New Project", callback_data: "create_project" }],
                [{ text: "⬅️ Back", callback_data: "home" }],
              ],
            },
          });
        } else {
          const buttons = projects.map((p) => [
            { text: `📄 ${p.name}`, callback_data: `open_project:${p.id}` },
            { text: "❌ Delete", callback_data: `delete_project:${p.id}` },
          ]);
          buttons.push([{ text: "⬅️ Back", callback_data: "home" }]);

          await sendMessage(chatId, "📂 Your Projects:", {
            reply_markup: { inline_keyboard: buttons },
          });
        }
      }

      if (data === "create_project") {
        await sendMessage(chatId, "✏️ Send me the name of your new project.");
        userStates[userId] = { step: "awaiting_project_name" };
      }

      if (data.startsWith("delete_project:")) {
        const projectId = data.split(":")[1];
        const ok = projectStore.deleteProject(userId, projectId);
        if (ok) {
          await sendMessage(chatId, "🗑️ Project deleted.");
        } else {
          await sendMessage(chatId, "⚠️ Unable to delete project.");
        }
      }

      if (data.startsWith("open_project:")) {
        const projectId = data.split(":")[1];
        const project = projectStore
          .getProjectsByUser(userId)
          .find((p) => p.id === projectId);

        if (project) {
          await sendMessage(chatId, `📄 Project: *${project.name}*`, {
            reply_markup: {
              inline_keyboard: [[{ text: "⬅️ Back", callback_data: "your_projects" }]],
            },
          });
        } else {
          await sendMessage(chatId, "⚠️ Project not found.");
        }
      }
    }
  } catch (err) {
    console.error("Error handling update:", err);
  }

  res.sendStatus(200);
});

// --- Start server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
