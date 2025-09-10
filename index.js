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
          `Yo ${update.message.from.first_name}! Nic_
