import Sortable from 'sortablejs'

document.addEventListener('DOMContentLoaded', function() {
  const promptList = document.getElementById('prompt-list');
  const closeButton = document.getElementById('close-button');
  const manageButton = document.getElementById('manage-button');

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
        const movedPromptName = evt.item.getAttribute('data-prompt');
        const newIndex = evt.newIndex;
        
        chrome.storage.local.get('prompts', function(data) {
          const prompts = data.prompts || [];
          const movedPrompt = prompts.find(p => p.promptName === movedPromptName);
          
          if (newIndex > 0) {
            const prevPrompt = prompts[newIndex - 1];
            movedPrompt.usageCount = prevPrompt.usageCount;
            movedPrompt.lastUsedAt = Date.now();
          } else {
            movedPrompt.usageCount = prompts[newIndex + 1].usageCount + 1;
            movedPrompt.lastUsedAt = Date.now();
          }
  
          prompts.splice(prompts.findIndex(p => p.promptName === movedPromptName), 1);
          prompts.splice(newIndex, 0, movedPrompt);
  
          chrome.storage.local.set({ prompts: prompts });
        });
      }
    });
  }

  // 並べ替えページを閉じる関数
  function closePage() {
    window.close();
  }

  // 管理ページに戻る関数
  function managePage() {
    chrome.tabs.create({ url: 'manage.html' }, function() {
      window.close();
    });
  }

  // イベントリスナーの登録
  closeButton.addEventListener('click', closePage);
  manageButton.addEventListener('click', managePage);

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

