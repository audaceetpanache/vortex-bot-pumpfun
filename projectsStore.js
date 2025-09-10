// projectStore.js
import { randomUUID } from "crypto";

class ProjectStore {
  constructor() {
    this.projects = {}; // { userId: [ { id, name, metadata, wallets, validated } ] }
  }

  createProject(userId) {
    if (!this.projects[userId]) {
      this.projects[userId] = [];
    }
    const project = {
      id: randomUUID().slice(0, 8),
      name: `Project ${this.projects[userId].length + 1}`,
      metadata: {
        name: null,
        symbol: null,
        description: null,
        twitter: null,
        telegram: null,
        website: null,
        image: null,
        deployed: false,
      },
      wallets: [],
      validated: false,
    };
    this.projects[userId].push(project);
    return project;
  }

  getProjects(userId) {
    return this.projects[userId] || [];
  }

  getProject(userId, projectId) {
    return (this.projects[userId] || []).find((p) => p.id === projectId);
  }

  updateMetadata(userId, projectId, key, value) {
    const project = this.getProject(userId, projectId);
    if (project) {
      project.metadata[key] = value;
    }
  }

  addWallet(userId, projectId, wallet) {
    const project = this.getProject(userId, projectId);
    if (project) {
      project.wallets.push(wallet);
    }
  }

  validateProject(userId, projectId) {
    const project = this.getProject(userId, projectId);
    if (!project) return false;

    const m = project.metadata;
    const metadataComplete = m.name && m.symbol && m.description;
    const walletsComplete = project.wallets.length > 0;

    project.validated = metadataComplete && walletsComplete;
    return project.validated;
  }
}

export const projectStore = new ProjectStore();
