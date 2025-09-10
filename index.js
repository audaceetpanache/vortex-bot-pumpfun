import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import {
  projectsStore,
  saveProjects,
  generateId,
  isProjectValid,
  getUserValidProject
} from "./projectStore.js";
import { getMetadataMenu, handleMetadataCallback } from "./metadata.js";
import { getWalletsMenu, handleWalletsCallback } from "./wallets.js";
import { getUnavailableMenu } from "./unavailable.js";

// === BOT INIT ===
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

// === MENUS ===
function getStartMenu() {
  return {
    text: "🌟 Welcome to VORTEX!\n🔥 Where Things Happen! 🔥\nAvailable Features:",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🏠 Home", callback_data: "home" },
          { text: "⚙️ Settings", callback_data: "settings" }
        ]
      ]
    }
  };
}

function getHomeMenu(userId) {
  return {
    text: `Yo! Nice to see you again! 🔥\nWhat's the move, boss?`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📂 Your Projects", callback_data: "your_projects" }],
        [{ text: "🚀 Create new Project", callback_data: "create_project" }],
        [
          { text: "🚀 SPAM LAUNCH", callback_data: "feature_spamlaunch" },
          { text: "🤑 BUMP BOT 🤑", callback_data: "feature_bumpbot" }
        ],
        [
          { text: "💰 GET ALL SOL", callback_data: "feature_getallsol" },
          { text: "🎁 CLAIM DEV REWARDS", callback_data: "feature_claimdev" }
        ],
        [
          { text: "🔗 Referrals", callback_data: "feature_referrals" },
          { text: "❓ Help", callback_data: "feature_help" }
        ],
        [{ text: "👥 Discord", callback_data: "feature_discord" }]
      ]
    }
  };
}

function getSettingsMenu() {
  return {
    text: "⚙️ Settings\n(Currently demo)",
    reply_markup: {
      inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]]
    }
  };
}

// === HANDLERS ===
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, getStartMenu().text, {
    reply_markup: getStartMenu().reply_markup
  });
});

bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const userId = query.from.id;

  // === NAVIGATION ===
  if (data === "home") {
    bot.editMessageText(getHomeMenu(userId).text, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: getHomeMenu(userId).reply_markup
    });
  }

  if (data === "settings") {
    bot.editMessageText(getSettingsMenu().text, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: getSettingsMenu().reply_markup
    });
  }

  if (data === "your_projects") {
    const projects = projectsStore[userId] || [];
    if (projects.length === 0) {
      bot.answerCallbackQuery(query.id, { text: "No projects yet!" });
    } else {
      bot.editMessageText("📂 Your Projects:", {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: projects
            .map((p) => [
              { text: p.name, callback_data: `open_project_${p.id}` }
            ])
            .concat([[{ text: "⬅️ Back", callback_data: "home" }]])
        }
      });
    }
  }

  if (data === "create_project") {
    bot.sendMessage(chatId, "Enter a name for your new project:");
    bot.once("message", (msg) => {
      const projectName = msg.text.trim();
      if (!projectsStore[userId]) projectsStore[userId] = [];
      const newProject = {
        id: generateId(),
        name: projectName,
        metadata: {
          name: "",
          symbol: "",
          description: "",
          twitter: "",
          telegram: "",
          website: "",
          image: "",
          deployed: false
        },
        wallets: []
      };
      projectsStore[userId].push(newProject);
      saveProjects();
      bot.sendMessage(chatId, `✅ Project "${projectName}" created!`);
    });
  }

  // === PROJECT MENU ===
  if (data.startsWith("open_project_")) {
    const projectId = data.split("_")[2];
    const project = (projectsStore[userId] || []).find(
      (p) => p.id === projectId
    );

    if (!project) {
      bot.answerCallbackQuery(query.id, { text: "Project not found" });
      return;
    }

    bot.editMessageText(
      `🎯 Project ${project.id}\nName: ${project.name}\n\nChoose an option:`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [{ text: "📝 Token Metadata", callback_data: `metadata_${project.id}` }],
            [{ text: "👛 Project Wallets", callback_data: `wallets_${project.id}` }],
            [{ text: "⬅️ Back", callback_data: "your_projects" }]
          ]
        }
      }
    );
  }

  // === METADATA + WALLETS ===
  if (data.startsWith("metadata_")) {
    handleMetadataCallback(bot, query, userId);
  }

  if (data.startsWith("wallets_")) {
    handleWalletsCallback(bot, query, userId);
  }

  // === FEATURES that require validation ===
  if (data.startsWith("feature_")) {
    const validProject = getUserValidProject(userId);
    if (!validProject) {
      bot.editMessageText("🚧 You must complete a project first!", {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: getUnavailableMenu().reply_markup
      });
    } else {
      // pour l’instant on envoie vers "Unavailable"
      bot.editMessageText(getUnavailableMenu().text, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: getUnavailableMenu().reply_markup
      });
    }
  }
});

console.log("✅ Bot is running...");
