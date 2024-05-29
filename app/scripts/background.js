console.log(`'Allo 'Allo! Event Page for Browser Action`)
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'update') {
    // 拡張機能がアップデートされたときの処理
    chrome.storage.local.get('prompts', function(data) {
      const prompts = data.prompts || [];
      if (prompts.length > 0) {
        // promptsが存在する場合、最初のプロンプトをチェック
        const firstPrompt = prompts[0];
        if (!firstPrompt.hasOwnProperty('tags') || !firstPrompt.hasOwnProperty('enable')) {
          // 旧データ構造の場合、新データ構造に変換
          const updatedPrompts = prompts.map(prompt => ({
            promptName: prompt.promptName,
            promptValue: prompt.promptValue,
            tags: [],
            enable: true
          }));
          chrome.storage.local.set({ prompts: updatedPrompts });
        }
      }
    });
  }
});