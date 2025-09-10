import { projectsStore, saveProjects } from "./projectStore.js";

export function getMetadataMenu(projectId) {
  const project = projectsStore[projectId];
  const metadata = project.metadata;

  const isComplete = metadata.name && metadata.symbol && metadata.description && project.wallets.length > 0;
  const statusText = isComplete ? "✅ Metadata deployed" : "❌ Metadata not yet deployed";

  const text = `🎯 Project (${projectId}) Metadata
Select a field to edit:
${statusText}`;

  const inline_keyboard = [
    [
      { text: "📝 Name", callback_data: `edit_metadata_name_${projectId}` },
      { text: "🔣 Symbol", callback_data: `edit_metadata_symbol_${projectId}` }
    ],
    [
      { text: "📖 Description", callback_data: `edit_metadata_description_${projectId}` },
      { text: "🐦 Twitter", callback_data: `edit_metadata_twitter_${projectId}` }
    ],
    [
      { text: "💬 Telegram", callback_data: `edit_metadata_telegram_${projectId}` }
    ],
    [
      { text: "🌐 Website", callback_data: `edit_metadata_website_${projectId}` },
      { text: "🖼️ Image", callback_data: `edit_metadata_image_${projectId}` }
    ],
    [
      { text: "🚀 Deploy Metadata", callback_data: `deploy_metadata_${projectId}` }
    ],
    [
      { text: "📋 Clone Metadata", callback_data: `unavailable` },
      { text: "⬅️ Back", callback_data: `view_project_${projectId}` }
    ]
  ];

  return { text, inline_keyboard };
}

export function handleMetadataCallback(bot, msg, action, projectId) {
  const chatId = msg.message.chat.id;
  const project = projectsStore[projectId];
  if (!project) return;

  switch (action) {
    case "deploy_metadata":
      if (
        project.metadata.name &&
        project.metadata.symbol &&
        project.metadata.description &&
        project.wallets.length > 0
      ) {
        project.metadataDeployed = true;
        saveProjects();
        bot.sendMessage(chatId, "✅ Metadata deployed successfully!");
      } else {
        bot.sendMessage(chatId, "⚠️ Please complete all mandatory fields and add at least one wallet.");
      }
      break;

    case "edit_metadata_name":
    case "edit_metadata_symbol":
    case "edit_metadata_description":
    case "edit_metadata_twitter":
    case "edit_metadata_telegram":
    case "edit_metadata_website":
    case "edit_metadata_image": {
      const field = action.replace("edit_metadata_", "");
      bot.sendMessage(chatId, `✏️ Please enter the value for ${field}:`);

      bot.once("message", (response) => {
        project.metadata[field] = response.text;
        saveProjects();
        bot.sendMessage(chatId, `✅ ${field} updated!`, {
          reply_markup: { inline_keyboard: getMetadataMenu(projectId).inline_keyboard }
        });
      });
      break;
    }

    default:
      bot.sendMessage(chatId, "❌ Unknown metadata action");
  }
}
