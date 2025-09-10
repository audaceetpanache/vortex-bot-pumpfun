import fs from "fs";

const DATA_FILE = "./data.json";

// Charger les projets
export function loadProjects() {
  try {
    const raw = fs.readFileSync(DATA_FILE);
    return JSON.parse(raw);
  } catch (err) {
    return { users: {} };
  }
}

// Sauvegarder les projets
export function saveProjects(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
