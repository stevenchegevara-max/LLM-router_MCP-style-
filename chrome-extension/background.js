chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ask-router",
    title: 'Ask LLM Router about: "%s"',
    contexts: ["selection"],
  });
});

async function openUI(query) {
  const url = `http://localhost:8787/ui?q=${encodeURIComponent(query)}`;
  await chrome.tabs.create({ url });
}

chrome.omnibox.onInputEntered.addListener(async (text) => {
  const q = (text || "").trim();
  if (!q) return;
  await openUI(q);
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "ask-router" && info.selectionText) {
    await openUI(info.selectionText);
  }
});
