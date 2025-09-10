const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { createProject, getProjects, getProject, updateMetadata } = require("./projectsStore");

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

// === METADATA MENU ===
function getMetadataMenu(project) {
  const m = project.metadata;
  const deployed = m.deployed ? "✅" : "❌";
  return {
    text: `🎯 Project ${project.id} Metadata\nSelect a field to edit:\nStatus: ${deployed} Metadata deployed`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: `Name: ${m.name || "❌"}`, callback_data: `edit_${project.id}_name` },
          { text: `Symbol: ${m.symbol || "❌"}`, callback_data: `edit_${project.id}_symbol` }
        ],
        [{ text: `Description: ${m.description || "❌"}`, callback_data: `edit_${project.id}_description` }],
        [
          { text: `Twitter: ${m.twitter || "—"}`, callback_data: `edit_${project.id}_twitter` },
          { text: `Telegram: ${m.telegram || "—"}`, callback_data: `edit_${project.id}_telegram` }
        ],
        [{ text: `Website: ${m.website || "—"}`, callback_data: `edit_${project.id}_website` }],
        [{ text: `Image: ${m.image ? "✅" : "—"}`, callback_data: `edit_${project.id}_image` }],
        [{ text: "🚀 Deploy Metadata", callback_data: `deploy_${project.id}` }],
        [{ text: "📂 Clone Metadata", callback_data: "unavailable" }],
        [{ text: "⬅️ Back", callback_data: `open_project_${project.id}` }]
      ]
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

  // OUVRIR TOKEN METADATA
  if (data.startsWith("metadata_")) {
    const projectId = data.split("_")[1];
    const project = getProject(userId, projectId);

    if (!project) return;

    bot.editMessageText(getMetadataMenu(project).text, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: getMetadataMenu(project).reply_markup
    });
  }

  // EDIT UN CHAMP
  if (data.startsWith("edit_")) {
    const [, projectId, field] = data.split("_");
    bot.sendMessage(chatId, `✏️ Enter a value for ${field}:`);

    bot.once("message", (msg) => {
      updateMetadata(userId, projectId, field, msg.text);
      const project = getProject(userId, projectId);

      bot.sendMessage(chatId, `✅ ${field} updated!`, {
        reply_markup: {
          inline_keyboard: [[{ text: "⬅️ Back to Metadata", callback_data: `metadata_${projectId}` }]]
        }
      });
    });
  }

  // DEPLOY METADATA
  if (data.startsWith("deploy_")) {
    const projectId = data.split("_")[1];
    const project = getProject(userId, projectId);

    if (!project) return;

    const m = project.metadata;
    if (!m.name || !m.symbol || !m.description) {
      bot.answerCallbackQuery(query.id, { text: "❌ Missing required fields" });
      return;
    }

    m.deployed = true;
    bot.editMessageText(getMetadataMenu(project).text, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: getMetadataMenu(project).reply_markup
    });
  }

  // UNAVAILABLE
  if (data === "unavailable") {
    bot.editMessageText("🚧 This feature is not supported yet, working on it", {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "⬅️ Back", callback_data: "home" }]]
      }
    });
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
