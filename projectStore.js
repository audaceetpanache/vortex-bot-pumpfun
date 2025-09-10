// projectStore.js

const projectsByUser = {};

// Ajouter un projet
function addProject(userId, name) {
  if (!projectsByUser[userId]) {
    projectsByUser[userId] = [];
  }
  const newProject = {
    id: Date.now().toString(),
    name,
    metadata: null,
    wallets: [],
  };
  projectsByUser[userId].push(newProject);
  return newProject;
}

// Récupérer tous les projets
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

export const projectStore = {
  addProject,
  getProjects,
  deleteProject,
};
