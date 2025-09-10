// Simple in-memory store for projects
class ProjectStore {
  constructor() {
    this.projects = {}; // { userId: [ { id, name, metadata, wallets } ] }
  }

  // Generate a unique ID
  generateId() {
    return Math.random().toString(36).substring(2, 10);
  }

  // Get all projects for a user
  getUserProjects(userId) {
    if (!this.projects[userId]) {
      this.projects[userId] = [];
    }
    return this.projects[userId];
  }

  // Get a single project by id
  getProject(userId, projectId) {
    const projects = this.getUserProjects(userId);
    return projects.find((p) => p.id === projectId);
  }

  // Create a new project
  createProject(userId, name) {
    const project = {
      id: this.generateId(),
      name,
      metadata: {
        name: null,
        symbol: null,
        description: null,
        twitter: null,
        telegram: null,
        website: null,
        image: null,
      },
      wallets: [],
    };
    this.getUserProjects(userId).push(project);
    return project;
  }

  // Delete a project
  deleteProject(userId, projectId) {
    if (!this.projects[userId]) return;
    this.projects[userId] = this.projects[userId].filter((p) => p.id !== projectId);
  }

  // Update project metadata
  updateMetadata(userId, projectId, field, value) {
    const project = this.getProject(userId, projectId);
    if (project) {
      project.metadata[field] = value;
    }
    return project;
  }

  // Add a wallet to project
  addWallet(userId, projectId, wallet) {
    const project = this.getProject(userId, projectId);
    if (project) {
      project.wallets.push(wallet);
    }
    return project;
  }
}

export const projectStore = new ProjectStore();
