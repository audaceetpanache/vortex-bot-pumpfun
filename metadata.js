import { projectsStore, saveProjects } from "./projectStore.js";

/**
 * Génère le menu Metadata pour un projet
 */
export function getMetadataMenu(projectId) {
  const project = projectsStore[projectId];
  if (!project) {
    return { text: "❌ Project not found", inline_keyboard: [] };
  }

  const md = project.metadata || {};
  const deployed = project.metadataDeployed ? "✅ Deployed" : "❌ Not yet deployed";

  const text = `🎯 Project ${projectId} Metadata
Select a field to edit:
Status: ${deployed}`;

  const inline_keyboard = [
    [
      { text: `Name: ${md.name || "❌"}`, callback_data: `edit_metadata_name_${projectId}` },
      { text: `Symbol: ${md.symbol || "❌"}`, callback_data: `edit_metadata_symbol_${projectId}` }
    ],
    [
      { text: "Description", callback_data: `edit_metadata_description_${projectId}` }
    ],
    [
      { text: "Twitter", callback_data: `edit_metadata_twitter_${projectId}` },
      { text: "Telegram", callback_data: `edit_metadata_telegram_${projectId}` }
    ],
    [
      { text: "Website", callback_data: `edit_metadata_website_${projectId}` },
      { text: "Image", callback_data: `edit_metadata_image_${projectId}` }
    ],
    [
      { text: "🚀 Deploy Metadata", callback_data: `deploy_metadata_${projectId}` }
    ],
    [
      { text: "📂 Clone Metadata", callback_data: `unavailable` }
    ],
    [
      { text: "⬅️ Back", callback_data: `view_project_${projectId}` }
    ]
  ];

  return { text, inline_keyboard };
}

/**
 * Gère les interactions Metadata
 */
export function handleMetadataCallback(bot, callbackQuery, action, projectId) {
  const chatId = callbackQuery.message.chat.id;
  const project = projectsStore[projectId];
  if (!project) return;

  // Edition d’un champ
  if (action.startsWith("edit_metadata_")) {
    const field = action.replace("edit_metadata_", "");
    bot.sendMessage(chatId, `✏️ Please send me the value for *${field}*`, { parse_mode: "Markdown" });

    bot.once("message", (msg) => {
      project.metadata[field] = msg.text;
      saveProjects();
      bot.sendMessage(chatId, `✅ ${field} updated!`);
      const { text, inline_keyboard } = getMetadataMenu(projectId);
      bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard } });
    });
    return;
  }

  // Déploiement
  if (action === "deploy_metadata") {
    if (!project.metadata.name || !project.metadata.symbol || !project.metadata.description) {
      return bot.sendMessage(chatId, "❌ Please fill Name, Symbol and Description before deploying.");
    }
    project.metadataDeployed = true;
    saveProjects();
    bot.sendMessage(chatId, "✅ Metadata deployed!");
    const { text, inline_keyboard } = getMetadataMenu(projectId);
    return bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard } });
  }
}
