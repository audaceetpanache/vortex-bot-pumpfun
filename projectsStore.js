// projectsStore.js

const projectsStore = {};

/**
 * Crée un projet pour un utilisateur
 */
function createProject(userId, name) {
  if (!projectsStore[userId]) {
    projectsStore[userId] = [];
  }
  const project = {
    id: Date.now().toString(),
    name,
    metadataComplete: false,
    walletComplete: false
  };
  projectsStore[userId].push(project);
  return project;
}

/**
 * Récupère les projets d’un utilisateur
 */
function getProjects(userId) {
  return projectsStore[userId] || [];
}

/**
 * Récupère un projet précis
 */
function getProject(userId, projectId) {
  return (projectsStore[userId] || []).find(p => p.id === projectId);
}

module.exports = { createProject, getProjects, getProject };
