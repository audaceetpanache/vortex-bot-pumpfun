// projectStore.js
class ProjectStore {
  constructor() {
    this.projects = {}; // chatId -> array of projects
  }

  getProjects(chatId) {
    if (!this.projects[chatId]) {
      this.projects[chatId] = [];
    }
    return this.projects[chatId];
  }

  addProject(chatId, project) {
    const projects = this.getProjects(chatId);
    const newProject = {
      id: Date.now().toString(),
      name: project.name || "Unnamed",
      symbol: project.symbol || "N/A",
      description: project.description || "No description",
      wallet: project.wallet || "Not set",
    };
    projects.push(newProject);
    return newProject;
  }

  getProject(chatId, projectId) {
    return this.getProjects(chatId).find(p => p.id === projectId);
  }

  updateProject(chatId, projectId, updates) {
    const project = this.getProject(chatId, projectId);
    if (project) {
      Object.assign(project, updates);
    }
    return project;
  }

  removeProject(chatId, projectId) {
    this.projects[chatId] = this.getProjects(chatId).filter(
      p => p.id !== projectId
    );
  }
}

export const projectStore = new ProjectStore();
