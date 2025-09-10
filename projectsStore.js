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
    metadata: {
      name: null,
      symbol: null,
      description: null,
      twitter: null,
      telegram: null,
      website: null,
      image: null,
      deployed: false
    },
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

/**
 * Met à jour un champ metadata
 */
function updateMetadata(userId, projectId, field, value) {
  const project = getProject(userId, projectId);
  if (project) {
    project.metadata[field] = value;
  }
  return project;
}

module.exports = { createProject, getProjects, getProject, updateMetadata };
