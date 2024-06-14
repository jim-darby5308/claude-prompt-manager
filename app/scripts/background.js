console.log(`'Allo 'Allo! Event Page for Browser Action`)
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'update') {
    chrome.storage.local.get('prompts', function(data) {
      const prompts = data.prompts || [];
      const now = Date.now();
      const updatedPrompts = prompts.map(prompt => ({
        promptName: prompt.promptName,
        promptValue: prompt.promptValue,
        tags: prompt.tags || [],
        enable: prompt.enable !== false,
        usageCount: prompt.usageCount || 0,
        lastUsedAt: prompt.lastUsedAt || now
      }));
      chrome.storage.local.set({ prompts: updatedPrompts });
    });
  }
});