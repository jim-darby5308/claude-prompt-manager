// プロンプトの順番の変更
function applyPromptOrder(prompts) {
  prompts.sort((a, b) => {
    // 未使用1日経過で使用1回分スコアをマイナス
    // 1000(msec) * 60(sec) * 60(min) * 24(h) * 1(day)
    const msecDiviser = 86400000 
    const now = Date.now();
    const a_score = a.usageCount - (now - a.lastUsedAt) / msecDiviser;
    const b_score = b.usageCount - (now - b.lastUsedAt) / msecDiviser;
    if (a_score !== b_score) {
      return b_score - a_score;
    }
    return prompts.indexOf(a) - prompts.indexOf(b);
  });
}

export { applyPromptOrder };
