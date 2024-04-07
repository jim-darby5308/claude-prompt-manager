console.log(`'Allo 'Allo! Content script`)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'applyPrompt') {
    const promptText = request.promptText;
    const lines = promptText.split('\n');
    const editableDivs = document.querySelectorAll('div[contenteditable="true"]');
    if (editableDivs.length > 0) {
      const lastEditableDiv = editableDivs[editableDivs.length - 1];
      // Clear existing content
      while (lastEditableDiv.firstChild) {
        lastEditableDiv.removeChild(lastEditableDiv.firstChild);
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
        lastEditableDiv.appendChild(p);
      });
      lastEditableDiv.focus(); // カーソルをdivの最後に移動
      const range = document.createRange();
      range.selectNodeContents(lastEditableDiv);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      console.error('Contenteditable div not found.');
    }
  }
});
