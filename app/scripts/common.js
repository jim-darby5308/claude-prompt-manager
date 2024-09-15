// プロンプトの順番の変更
function applyPromptOrder(prompts) {
  prompts.sort((a, b) => {
    // lastUsedAtが存在しない場合は、0（1970年1月1日）とする
    const aLastUsed = a.lastUsedAt || 0;
    const bLastUsed = b.lastUsedAt || 0;
    
    // 降順で並べ替え（最新のものが先頭に来るように）
    return bLastUsed - aLastUsed;
  });
}

export { applyPromptOrder };
