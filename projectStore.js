// projectStore.js
import fs from "fs";
const FILE = "./projects.json";

function load() {
  try {
    if (!fs.existsSync(FILE)) {
      fs.writeFileSync(FILE, JSON.stringify({ users: {} }, null, 2));
    }
    const raw = fs.readFileSync(FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load projects.json:", e);
    return { users: {} };
  }
}

function save(data) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to save projects.json:", e);
  }
}

const data = load();

function genId() {
  return Math.random().toString(36).substring(2, 9);
}

export const projectStore = {
  // Create project
  addProject(userId, name) {
    const id = genId();
    const project = {
      id,
      name,
      createdAt: new Date().toISOString(),
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
      wallets: [],
      validated: false
    };
    data.users[userId] ||= [];
    data.users[userId].push(project);
    save(data);
    return project;
  },

  // Get list of projects for a user
  getProjectsByUser(userId) {
    return data.users[userId] || [];
  },

  // Get single project
  getProject(userId, projectId) {
    return (data.users[userId] || []).find((p) => p.id === projectId);
  },

  // Delete project
  deleteProject(userId, projectId) {
    const list = data.users[userId] || [];
    const idx = list.findIndex((p) => p.id === projectId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    data.users[userId] = list;
    save(data);
    return true;
  },

  // Update metadata field (and save)
  updateMetadata(userId, projectId, key, value) {
    const project = this.getProject(userId, projectId);
    if (!project) return false;
    project.metadata ||= {};
    project.metadata[key] = value;
    // if we update a metadata field, we may need to revalidate
    this._maybeValidate(project);
    save(data);
    return true;
  },

  // Add a wallet object { name, privateKey } and revalidate
  addWallet(userId, projectId, wallet) {
    const project = this.getProject(userId, projectId);
    if (!project) return false;
    project.wallets ||= [];
    project.wallets.push(wallet);
    // after adding a wallet, revalidate
    this._maybeValidate(project);
    save(data);
    return true;
  },

  // Mark metadata deployed (boolean)
  setMetadataDeployed(userId, projectId, deployed = true) {
    const project = this.getProject(userId, projectId);
    if (!project) return false;
    project.metadata ||= {};
    project.metadata.deployed = !!deployed;
    this._maybeValidate(project);
    save(data);
    return true;
  },

  // Check if a project is valid (rules from the pitch)
  isProjectValid(project) {
    if (!project) return false;
    const md = project.metadata || {};
    const metadataComplete = !!(md.name && md.symbol && md.description && md.deployed);
    const walletsComplete = Array.isArray(project.wallets) && project.wallets.length > 0;
    return metadataComplete && walletsComplete;
  },

  // Validate (set project.validated true/false) and persist; returns new validated status
  _maybeValidate(project) {
    const shouldBeValid = this.isProjectValid(project);
    project.validated = !!shouldBeValid;
    // note: caller will save() after calling this in other methods
    return project.validated;
  },

  // Convenience: find a user's first valid project (or null)
  getUserValidProject(userId) {
    const list = this.getProjectsByUser(userId);
    return list.find((p) => p.validated) || null;
  }
};
