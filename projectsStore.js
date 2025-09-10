import fs from "fs";

export let projectsStore = {};

const FILE = "./db.json";

if (fs.existsSync(FILE)) {
  projectsStore = JSON.parse(fs.readFileSync(FILE));
}

export function saveProjects() {
  fs.writeFileSync(FILE, JSON.stringify(projectsStore, null, 2));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

// ✅ Check if a project is fully valid
export function isProjectValid(project) {
  return (
    project.metadata &&
    project.metadata.deployed &&
    project.metadata.name &&
    project.metadata.symbol &&
    project.metadata.description &&
    project.wallets &&
    project.wallets.length > 0
  );
}

export function getUserValidProject(userId) {
  const projects = projectsStore[userId] || [];
  return projects.find((p) => isProjectValid(p));
}
