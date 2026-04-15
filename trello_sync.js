/**
 * trello_sync.js — CLI helper for syncing project state to the KlimaChallenge Trello board.
 *
 * Usage:
 *   node trello_sync.js add <list> <title> [description] [labels]
 *   node trello_sync.js move <card-id> <list>
 *   node trello_sync.js done <card-id>              — shortcut: moves card to current Done list
 *   node trello_sync.js update <card-id> [--name ""] [--desc ""] [--label ""]
 *   node trello_sync.js find <search-text>          — search cards by name
 *   node trello_sync.js lists                       — show all lists and IDs
 *   node trello_sync.js cards [list-name]            — show cards (optionally filtered by list)
 *   node trello_sync.js archive-done <new-list-name> — archive current Done list into a new list
 *
 * Labels (use with add/update): S, M, L, Pre-launch, Tech Debt, Bug Fix, UX/Polish
 *
 * Credentials loaded from .env in project root.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

// ── Load .env ──────────────────────────────────────────────────────────────────

const ENV_PATH = path.join(__dirname, ".env");
const env = {};
if (fs.existsSync(ENV_PATH)) {
  fs.readFileSync(ENV_PATH, "utf8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim();
    });
}

const KEY = env.TRELLO_KEY;
const TOKEN = env.TRELLO_TOKEN;
const BOARD_ID = env.TRELLO_BOARD_ID;

if (!KEY || !TOKEN || !BOARD_ID) {
  console.error("Missing TRELLO_KEY, TRELLO_TOKEN, or TRELLO_BOARD_ID in .env");
  process.exit(1);
}

// ── Well-known list names ──────────────────────────────────────────────────────

const DONE_LIST_NAME = "Done (Current)";

// ── Label name → ID cache (populated on first use) ────────────────────────────

let labelCache = null;

// ── HTTP helper ────────────────────────────────────────────────────────────────

function trelloRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const sep = apiPath.includes("?") ? "&" : "?";
    const fullPath = `/1/${apiPath}${sep}key=${KEY}&token=${TOKEN}`;

    const options = {
      hostname: "api.trello.com",
      path: fullPath,
      method,
      headers: {},
    };

    let payload = null;
    if (body && (method === "POST" || method === "PUT")) {
      payload = JSON.stringify(body);
      options.headers["Content-Type"] = "application/json";
      options.headers["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getLists() {
  return trelloRequest("GET", `boards/${BOARD_ID}/lists`);
}

async function findListByName(name) {
  const lists = await getLists();
  const lower = name.toLowerCase();
  const found = lists.find((l) => l.name.toLowerCase() === lower);
  if (!found) {
    console.error(`List "${name}" not found. Available lists:`);
    lists.forEach((l) => console.error(`  - ${l.name} (${l.id})`));
    process.exit(1);
  }
  return found;
}

async function getLabels() {
  if (labelCache) return labelCache;
  const labels = await trelloRequest("GET", `boards/${BOARD_ID}/labels`);
  labelCache = {};
  labels.forEach((l) => {
    if (l.name) labelCache[l.name.toLowerCase()] = l.id;
  });
  return labelCache;
}

async function resolveLabels(labelStr) {
  if (!labelStr) return [];
  const labels = await getLabels();
  return labelStr
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .map((name) => {
      const id = labels[name];
      if (!id) console.warn(`  Warning: label "${name}" not found, skipping`);
      return id;
    })
    .filter(Boolean);
}

async function getAllCards() {
  return trelloRequest("GET", `boards/${BOARD_ID}/cards?fields=id,name,desc,idList`);
}

async function getDoneList() {
  const lists = await getLists();
  // Find the "Done (Current)" list; create it if missing
  let done = lists.find((l) => l.name === DONE_LIST_NAME);
  if (!done) {
    console.log(`Creating "${DONE_LIST_NAME}" list...`);
    done = await trelloRequest("POST", `boards/${BOARD_ID}/lists`, {
      name: DONE_LIST_NAME,
      pos: "bottom",
    });
  }
  return done;
}

// ── Commands ───────────────────────────────────────────────────────────────────

async function cmdAdd(listName, title, desc, labelStr) {
  const list = await findListByName(listName);
  const labelIds = await resolveLabels(labelStr);
  const body = { name: title, idList: list.id, pos: "bottom" };
  if (desc) body.desc = desc;
  if (labelIds.length) body.idLabels = labelIds;
  const card = await trelloRequest("POST", "cards", body);
  console.log(`Created: "${card.name}" → ${list.name} (${card.shortUrl})`);
  return card;
}

async function cmdMove(cardId, listName) {
  const list = await findListByName(listName);
  const card = await trelloRequest("PUT", `cards/${cardId}`, { idList: list.id });
  console.log(`Moved: "${card.name}" → ${list.name}`);
  return card;
}

async function cmdDone(cardId) {
  const done = await getDoneList();
  const card = await trelloRequest("PUT", `cards/${cardId}`, { idList: done.id });
  console.log(`Completed: "${card.name}" → ${done.name}`);
  return card;
}

async function cmdUpdate(cardId, updates) {
  const body = {};
  if (updates.name) body.name = updates.name;
  if (updates.desc) body.desc = updates.desc;
  if (updates.label) {
    const ids = await resolveLabels(updates.label);
    if (ids.length) body.idLabels = ids;
  }
  const card = await trelloRequest("PUT", `cards/${cardId}`, body);
  console.log(`Updated: "${card.name}" (${card.shortUrl})`);
  return card;
}

async function cmdFind(searchText) {
  const cards = await getAllCards();
  const lists = await getLists();
  const listMap = {};
  lists.forEach((l) => (listMap[l.id] = l.name));

  const lower = searchText.toLowerCase();
  const matches = cards.filter(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      (c.desc && c.desc.toLowerCase().includes(lower))
  );

  if (matches.length === 0) {
    console.log(`No cards matching "${searchText}"`);
  } else {
    console.log(`Found ${matches.length} card(s):`);
    matches.forEach((c) => {
      console.log(`  ${c.id}  [${listMap[c.idList] || "?"}]  ${c.name}`);
    });
  }
  return matches;
}

async function cmdLists() {
  const lists = await getLists();
  const cards = await getAllCards();
  lists.forEach((l) => {
    const count = cards.filter((c) => c.idList === l.id).length;
    console.log(`  ${l.id}  ${l.name} (${count} cards)`);
  });
}

async function cmdCards(listName) {
  const cards = await getAllCards();
  const lists = await getLists();
  const listMap = {};
  lists.forEach((l) => (listMap[l.id] = l.name));

  let filtered = cards;
  if (listName) {
    const list = await findListByName(listName);
    filtered = cards.filter((c) => c.idList === list.id);
  }

  filtered.forEach((c) => {
    const ln = listMap[c.idList] || "?";
    console.log(`  ${c.id}  [${ln}]  ${c.name}`);
  });
  console.log(`\n${filtered.length} card(s) total`);
}

async function cmdArchiveDone(newListName) {
  const done = await getDoneList();
  const cards = await getAllCards();
  const doneCards = cards.filter((c) => c.idList === done.id);

  if (doneCards.length === 0) {
    console.log(`"${DONE_LIST_NAME}" is empty, nothing to archive.`);
    return;
  }

  // Create archive list at the position right before "Done (Current)"
  const archiveList = await trelloRequest("POST", `boards/${BOARD_ID}/lists`, {
    name: newListName,
    pos: done.pos - 1,
  });
  console.log(`Created archive list: "${archiveList.name}"`);

  // Move all current done cards to the archive
  for (const card of doneCards) {
    await trelloRequest("PUT", `cards/${card.id}`, { idList: archiveList.id });
  }
  console.log(`Archived ${doneCards.length} cards from "${DONE_LIST_NAME}" → "${newListName}"`);
}

// ── CLI entry point ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case "add": {
      // add <list> <title> [description] [labels]
      const [, list, title, desc, labels] = args;
      if (!list || !title) {
        console.error('Usage: add <list> <title> [description] [labels]');
        process.exit(1);
      }
      await cmdAdd(list, title, desc || "", labels || "");
      break;
    }
    case "move": {
      const [, cardId, listName] = args;
      if (!cardId || !listName) {
        console.error("Usage: move <card-id> <list-name>");
        process.exit(1);
      }
      await cmdMove(cardId, listName);
      break;
    }
    case "done": {
      const [, cardId] = args;
      if (!cardId) {
        console.error("Usage: done <card-id>");
        process.exit(1);
      }
      await cmdDone(cardId);
      break;
    }
    case "update": {
      // update <card-id> [--name ""] [--desc ""] [--label ""]
      const cardId = args[1];
      if (!cardId) {
        console.error('Usage: update <card-id> [--name ""] [--desc ""] [--label ""]');
        process.exit(1);
      }
      const updates = {};
      for (let i = 2; i < args.length; i += 2) {
        const flag = args[i].replace("--", "");
        updates[flag] = args[i + 1];
      }
      await cmdUpdate(cardId, updates);
      break;
    }
    case "find": {
      const searchText = args.slice(1).join(" ");
      if (!searchText) {
        console.error("Usage: find <search-text>");
        process.exit(1);
      }
      await cmdFind(searchText);
      break;
    }
    case "lists":
      await cmdLists();
      break;
    case "cards":
      await cmdCards(args[1] || null);
      break;
    case "archive-done": {
      const newName = args.slice(1).join(" ");
      if (!newName) {
        console.error("Usage: archive-done <new-list-name>");
        process.exit(1);
      }
      await cmdArchiveDone(newName);
      break;
    }
    default:
      console.log(`KlimaChallenge Trello Sync

Commands:
  add <list> <title> [desc] [labels]    Add a card to a list
  move <card-id> <list>                 Move a card to a list
  done <card-id>                        Move card to "${DONE_LIST_NAME}"
  update <card-id> [--name/--desc/--label]  Update card fields
  find <text>                           Search cards by name/description
  lists                                 Show all lists with card counts
  cards [list-name]                     Show all cards (optionally by list)
  archive-done <new-list-name>          Move all Done cards to a new archive list

Labels: S effort, M effort, L effort, Pre-launch, Tech Debt, Bug Fix, UX/Polish`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
