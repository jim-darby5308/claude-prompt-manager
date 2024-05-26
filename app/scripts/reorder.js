import Sortable from 'sortablejs'
document.addEventListener('DOMContentLoaded', function() {
  const promptList = document.getElementById('prompt-list');
  const closeButton = document.getElementById('close-button');

  // Localize UI
  localizeUI();

  // ローカルストレージからプロンプトを読み込み、リストに追加する関数
  function loadPrompts() {
    chrome.storage.local.get('prompts', function(data) {
      const prompts = data.prompts || [];
      prompts.forEach(prompt => {
        const listItem = document.createElement('li');
        listItem.textContent = prompt.promptName;
        listItem.setAttribute('data-prompt', prompt.promptName);
        promptList.appendChild(listItem);
      });
      enableDragAndDrop();
    });
  }

  // ドラッグアンドドロップ機能を有効にする関数
  function enableDragAndDrop() {
    new Sortable(promptList, {
      animation: 150,
      ghostClass: 'ghost',
      onEnd: function(evt) {
        // Update the order of prompts in storage
        const promptNames = Array.from(promptList.querySelectorAll('li')).map(li => li.getAttribute('data-prompt'));
        chrome.storage.local.get('prompts', function(data) {
          const prompts = data.prompts || [];
          const updatedPrompts = promptNames.map(name => prompts.find(p => p.promptName === name));
          chrome.storage.local.set({ prompts: updatedPrompts });
        });
      }
    });
  }

  // 並べ替えページを閉じる関数
  function closePage() {
    window.close();
  }

  // イベントリスナーの登録
  closeButton.addEventListener('click', closePage);

  // 初期化処理
  loadPrompts();
});

function localizeUI() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = chrome.i18n.getMessage(key);
  });
}

