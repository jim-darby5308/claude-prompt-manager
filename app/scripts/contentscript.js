console.log(`'Allo 'Allo! Content script`)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'applyPrompt') {
    const promptText = request.promptText;
    const lines = promptText.split('\n');
    const editableDiv = document.querySelector('div[contenteditable="true"]');
    if (editableDiv) {
      // Clear existing content
      while (editableDiv.firstChild) {
        editableDiv.removeChild(editableDiv.firstChild);
      }
      lines.forEach((line, index) => {
        const p = document.createElement('p');
        if (line.trim() === '' && index !== lines.length - 1) {
          const br = document.createElement('br');
          br.classList.add('ProseMirror-trailingBreak');
          p.appendChild(br);
        } else {
          const textNode = document.createTextNode(line);
          p.appendChild(textNode);
        }
        editableDiv.appendChild(p);
      });
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
