const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { createProject, getProjects, getProject } = require("./projectsStore");

const app = express();
const PORT = process.env.PORT || 10000;

// ⚠️ Mets ton token dans Render secrets
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ BOT_TOKEN manquant dans les variables d'environnement !");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: false });

// === MENUS ===
function getStartMenu() {
  return {
    text: "🌟 Welcome to VORTEX!\n🔥 Where Things Happen! 🔥",
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
        [{ text: "🚀 Create new Project", callback_data: "create_project" }]
      ]
    }
  };
}

function getSettingsMenu() {
  return {
    text: "⚙️ Settings\n(Currently empty demo)",
    reply_markup: {
      inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]]
    }
  };
}

// === COMMANDES ===
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, getStartMenu().text, {
    reply_markup: getStartMenu().reply_markup
  });
});

// === CALLBACKS ===
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const userId = query.from.id;

  // HOME
  if (data === "home") {
    bot.editMessageText(getHomeMenu(userId).text, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: getHomeMenu(userId).reply_markup
    });
  }

  // SETTINGS
  if (data === "settings") {
    bot.editMessageText(getSettingsMenu().text, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: getSettingsMenu().reply_markup
    });
  }

  // LISTE DES PROJETS
  if (data === "your_projects") {
    const projects = getProjects(userId);

    if (projects.length === 0) {
      bot.editMessageText("📂 Your Projects:\n\nYou don’t have any project yet.", {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Create new Project", callback_data: "create_project" }],
            [{ text: "⬅️ Back", callback_data: "home" }]
          ]
        }
      });
    } else {
      bot.editMessageText("📂 Your Projects:", {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: projects.map((p) => [
            { text: p.name, callback_data: `open_project_${p.id}` }
          ]).concat([[{ text: "⬅️ Back", callback_data: "home" }]])
        }
      });
    }
  }

  // CREER UN PROJET
  if (data === "create_project") {
    bot.sendMessage(chatId, "📝 Enter a name for your new project:");

    bot.once("message", (msg) => {
      const project = createProject(userId, msg.text);
      bot.sendMessage(chatId, `✅ Project "${project.name}" created!`, {
        reply_markup: {
          inline_keyboard: [[{ text: "📂 Your Projects", callback_data: "your_projects" }]]
        }
      });
    });
  }

  // OUVRIR UN PROJET
  if (data.startsWith("open_project_")) {
    const projectId = data.split("_")[2];
    const project = getProject(userId, projectId);

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
});

// === EXPRESS SERVER ===
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ Bot is running.");
});

// Webhook
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
