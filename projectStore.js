// projectStore.js

// On garde les projets en mémoire (pas de base de données pour l'instant)
const projectsByUser = {};

// Ajouter un projet
function addProject(userId, name) {
  if (!projectsByUser[userId]) {
    projectsByUser[userId] = [];
  }
  const newProject = {
    id: Date.now().toString(), // ID unique basé sur le timestamp
    name,
    metadata: null,
    wallets: [],
  };
  projectsByUser[userId].push(newProject);
  return newProject;
}

// Récupérer tous les projets d’un utilisateur
function getProjects(userId) {
  return projectsByUser[userId] || [];
}

// Supprimer un projet
function deleteProject(userId, projectId) {
  if (!projectsByUser[userId]) return false;
  projectsByUser[userId] = projectsByUser[userId].filter(
    (proj) => proj.id !== projectId
  );
  return true;
}

// Exporter les fonctions
export const projectStore = {
  addProject,
  getProjects,
  deleteProject,
};
