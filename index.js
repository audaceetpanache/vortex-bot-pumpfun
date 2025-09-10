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

// --- Utility: Send message
async function sendMessage(chatId, text, reply_markup) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup }),
  });
}

// --- Menus ---
function getStartMenu() {
  return {
    text: `🌟 Welcome to VORTEX!

🔥 Where the magic happens! 🔥

Available Features:
• Launch pump.fun tokens
• Create or import multiple wallets
• Auto-fund wallets with SOL disperser
• Bundle up to 24 wallets
• CTO pump.fun/raydium tokens
• Delayed bundles on pump.fun
• Advanced swap manager with intervals, sell-all functions.
• Anti-MEV protection`,
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

function getHomeMenu() {
  return {
    text: `👋 Welcome back!

What’s next? Pick an option below:

• 📂 My Projects  
• 🚀 Create a New Project  
• 🚀 Spam Launch  
• 🤖 Bump Bot  
• 💰 Withdraw All SOL  
• 🎁 Claim Dev Rewards  
• 🔗 Referrals  
• ❓ Help  
• 👥 Discord`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📂 My Projects", callback_data: "my_projects" },
          { text: "🚀 Create New Project", callback_data: "create_project" }
        ],
        [{ text: "🚀 Spam Launch", callback_data: "unavailable_home" }],
        [{ text: "🤖 Bump Bot", callback_data: "unavailable_home" }],
        [{ text: "💰 Withdraw All SOL", callback_data: "unavailable_home" }],
        [
          { text: "🎁 Claim Dev Rewards", callback_data: "unavailable_home" },
          { text: "🔗 Referrals", callback_data: "unavailable_home" },
          { text: "❓ Help", url: "https://deployonvortex.gitbook.io/documentation/" }
        ],
        [{ text: "👥 Discord", url: "https://discord.com/invite/vortexdeployer" }],
        [{ text: "⬅️ Back", callback_data: "back_start" }]
      ]
    }
  };
}

function getSettingsMenu() {
  return {
    text: '⚙️ Settings à compléter',
    reply_markup: {
      inline_keyboard: [
        [{ text: "💰 TIP: ❌", callback_data: "unavailable_settings" }],
        [{ text: "✅ AUTO TIP", callback_data: "unavailable_settings" }],
        [{ text: "📊 MAX: 0.01 SOL", callback_data: "unavailable_settings" }],
        [{ text: "⚡️ PRIO: 0.0005 SOL", callback_data: "unavailable_settings" }],
        [{ text: "📈 BUY: 15%", callback_data: "unavailable_settings" }],
        [{ text: "📉 SELL: 15%", callback_data: "unavailable_settings" }],
        [{ text: "🔓 UI SECURITY 🟢", callback_data: "unavailable_settings" }],
        [{ text: "🎯 LSNIPE Settings", callback_data: "unavailable_settings" }],
        [{ text: "📦 LBS Settings", callback_data: "unavailable_settings" }],
        [{ text: "⬅️ Back", callback_data: "back_start" }]
      ]
    }
  };
}

function getProjectMenu(project) {
  return {
    text: `📌 Projet: ${project.name}\n\n🪪 Symbole: ${project.symbol}\n📖 Description: ${project.description}\n👛 Wallet: ${project.wallet}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "✏️ Modifier Nom", callback_data: `edit_name:${project.id}` }],
        [{ text: "✏️ Modifier Symbole", callback_data: `edit_symbol:${project.id}` }],
        [{ text: "✏️ Modifier Description", callback_data: `edit_description:${project.id}` }],
        [{ text: "✏️ Modifier Wallet", callback_data: `edit_wallet:${project.id}` }],
        [{ text: "🗑️ Supprimer projet", callback_data: `delete_project:${project.id}` }],
        [{ text: "🚀 Déployer projet", callback_data: `deploy_project:${project.id}` }],
        [{ text: "⬅️ Back", callback_data: "my_projects" }]
      ]
    }
  };
}

function getProjectsListMenu(chatId) {
  const projects = projectStore.getProjects(chatId);
  if (projects.length === 0) {
    return {
      text: "📂 Vous n'avez aucun projet.",
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ Créer un projet", callback_data: "create_project" }],
          [{ text: "⬅️ Back", callback_data: "home" }]
        ]
      }
    };
  }

  return {
    text: "📂 Mes projets",
    reply_markup: {
      inline_keyboard: [
        ...projects.map((p) => [{ text: p.name, callback_data: `project:${p.id}` }]),
        [{ text: "➕ Créer un projet", callback_data: "create_project" }],
        [{ text: "⬅️ Back", callback_data: "home" }]
      ]
    }
  };
}

// --- Webhook handler ---
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  const update = req.body;
  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      if (projectStore.isEditing(chatId)) {
        const { projectId, field } = projectStore.getEditing(chatId);
        projectStore.applyEdit(chatId, projectId, field, text);
        const project = projectStore.getProject(chatId, projectId);
        await sendMessage(chatId, "✅ Information mise à jour !", getProjectMenu(project).reply_markup);
      } else if (text === "/start") {
        const menu = getStartMenu();
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
      } else if (data === "back_start") {
        const menu = getStartMenu();
        await sendMessage(chatId, menu.text, menu.reply_markup);
      } else if (data === "my_projects") {
        const menu = getProjectsListMenu(chatId);
        await sendMessage(chatId, menu.text, menu.reply_markup);
      } else if (data.startsWith("project:")) {
        const projectId = data.split(":")[1];
        const project = projectStore.getProject(chatId, projectId);
        if (project) {
          const menu = getProjectMenu(project);
          await sendMessage(chatId, menu.text, menu.reply_markup);
        }
      } else if (data === "create_project") {
        const newProj = projectStore.addProject(chatId, "Nouveau projet");
        const menu = getProjectMenu(newProj);
        await sendMessage(chatId, "🆕 Projet créé :", menu.reply_markup);
      } else if (data.startsWith("delete_project:")) {
        const projectId = data.split(":")[1];
        projectStore.deleteProject(chatId, projectId);
        const menu = getProjectsListMenu(chatId);
        await sendMessage(chatId, "🗑️ Projet supprimé.", menu.reply_markup);
      } else if (data.startsWith("edit_")) {
        const [action, projectId] = data.split(":");
        const field = action.replace("edit_", "");
        projectStore.startEditing(chatId, projectId, field);
        await sendMessage(chatId, `✏️ Envoyez la nouvelle valeur pour ${field} :`);
      } else if (data.startsWith("deploy_project:")) {
        const projectId = data.split(":")[1];
        const project = projectStore.getProject(chatId, projectId);
        if (project.name && project.symbol && project.description && project.wallet) {
          await sendMessage(chatId, "🚀 Projet déployé avec succès !");
        } else {
          await sendMessage(chatId, "⚠️ Impossible de déployer. Tous les champs doivent être remplis !");
        }
      } else if (data.startsWith("unavailable")) {
        const menu = getUnavailableMenu();
        await sendMessage(chatId, menu.text, menu.reply_markup);
      }
    }
  } catch (err) {
    console.error("❌ Erreur :", err);
  }
  res.sendStatus(200);
});

// --- Server + webhook setup
app.listen(10000, async () => {
  console.log("✅ Serveur en ligne sur port 10000");
  try {
    const res = await fetch(`${TELEGRAM_API}/setWebhook?url=${process.env.RENDER_EXTERNAL_URL}/webhook/${WEBHOOK_SECRET}`);
    const data = await res.json();
    console.log("✅ Webhook configuré :", data);
  } catch (err) {
    console.error("❌ Erreur config webhook :", err);
  }
});
