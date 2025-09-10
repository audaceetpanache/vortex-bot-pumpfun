import { projectsStore, saveProjects } from "./projectStore.js";

/**
 * Génère le menu Wallets pour un projet
 */
export function getWalletsMenu(projectId) {
  const project = projectsStore[projectId];
  if (!project) {
    return { text: "❌ Project not found", inline_keyboard: [] };
  }

  const text = `🏦 Project Wallets
Project: ${projectId}
Select a wallet to view details`;

  const inline_keyboard = [
    [
      { text: "➕ Create Wallet", callback_data: `create_wallet_${projectId}` },
      { text: "📥 Import Wallet", callback_data: `import_wallet_${projectId}` }
    ],
    [
      { text: "👑 Import Creator", callback_data: `import_creator_${projectId}` }
    ],
    [
      { text: "⬅️ Back", callback_data: `view_project_${projectId}` }
    ]
  ];

  return { text, inline_keyboard };
}

/**
 * Gère les interactions Wallets
 */
export function handleWalletsCallback(bot, callbackQuery, action, projectId) {
  const chatId = callbackQuery.message.chat.id;
  const project = projectsStore[projectId];
  if (!project) return;

  if (action === "create_wallet" || action === "import_wallet" || action === "import_creator") {
    bot.sendMessage(chatId, "✏️ Please enter a name for this wallet:");

    bot.once("message", (msg1) => {
      const walletName = msg1.text;
      bot.sendMessage(chatId, "🔑 Please send the private key for this wallet:");

      bot.once("message", (msg2) => {
        const privateKey = msg2.text;
        project.wallets.push({ name: walletName, privateKey });
        saveProjects();
        bot.sendMessage(chatId, `✅ Wallet "${walletName}" added to project ${projectId}.`);
        const { text, inline_keyboard } = getWalletsMenu(projectId);
        bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard } });
      });
    });
  }
}
