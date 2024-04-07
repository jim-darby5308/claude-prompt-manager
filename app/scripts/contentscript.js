console.log(`'Allo 'Allo! Content script`)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'applyPrompt') {
    const promptText = request.promptText;
    const lines = promptText.split('\n');
    const formattedPromptText = lines.map((line, index) => {
      if (line.trim() === '' && index !== lines.length - 1) {
        return '<p><br class="ProseMirror-trailingBreak"></p>';
      } else {
        return `<p>${line}</p>`;
      }
    }).join('');
    const editableDiv = document.querySelector('div[contenteditable="true"]');
    if (editableDiv) {
      editableDiv.innerHTML = formattedPromptText;
      editableDiv.focus(); // カーソルをdivの最後に移動
      const range = document.createRange();
      range.selectNodeContents(editableDiv);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      console.error('Contenteditable div not found.');
    }
  }
});
