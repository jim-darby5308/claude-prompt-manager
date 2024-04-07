document.addEventListener('DOMContentLoaded', function() {
  const promptList = document.getElementById('prompt-list');
  const promptForm = document.getElementById('prompt-form');
  const promptNameInput = document.getElementById('prompt-name');
  const promptTextInput = document.getElementById('prompt-text');
  const importButton = document.getElementById('import-button');
  const exportButton = document.getElementById('export-button');
  const closeButton = document.getElementById('close-button');

  // Localize UI
  localizeUI();

  closeButton.addEventListener('click', function() {
    window.close();
  });

  // ローカルストレージからプロンプトを読み込み、一覧表示する関数
  function loadPrompts() {
    while (promptList.firstChild) {
      promptList.removeChild(promptList.firstChild);
    }
    chrome.storage.local.get(null, function(data) {
      for (const key in data) {
        const listItem = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = key;
        const editButton = document.createElement('button');
        editButton.classList.add('edit-button');
        editButton.dataset.prompt = key;
        editButton.textContent = chrome.i18n.getMessage('edit');
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.dataset.prompt = key;
        deleteButton.textContent = chrome.i18n.getMessage('delete');
        listItem.appendChild(nameSpan);
        listItem.appendChild(editButton);
        listItem.appendChild(deleteButton);
        promptList.appendChild(listItem);
      }
    });
  }

  // プロンプトを保存する関数
  function savePrompt(event) {
    event.preventDefault();
    const promptName = promptNameInput.value.trim();
    const promptText = promptTextInput.value.trim();
    if (promptName && promptText) {
      chrome.storage.local.set({ [promptName]: promptText }, function() {
        promptNameInput.value = '';
        promptTextInput.value = '';
        loadPrompts();
      });
    }
  }

  // プロンプトを削除する関数
  function deletePrompt(promptName) {
    chrome.storage.local.remove(promptName, function() {
      loadPrompts();
    });
  }

  // プロンプトを編集する関数
  function editPrompt(promptName) {
    chrome.storage.local.get(promptName, function(data) {
      promptNameInput.value = promptName;
      promptTextInput.value = data[promptName];
      promptForm.onsubmit = function() {
        savePrompt(event);
      };
    });
  }

  // プロンプトをエクスポートする関数
  function exportPrompts() {
    chrome.storage.local.get(null, function(data) {
      const jsonData = JSON.stringify(data);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prompts.json';
      a.click();
    });
  }

  // プロンプトをインポートする関数
  function importPrompts() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    fileInput.addEventListener('change', function(event) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = function() {
        const jsonData = JSON.parse(reader.result);
        chrome.storage.local.set(jsonData, function() {
          loadPrompts();
        });
      };
      reader.readAsText(file);
    });
    fileInput.click();
  }


  // イベントリスナーの登録
  promptForm.addEventListener('submit', savePrompt);
  promptList.addEventListener('click', function(event) {
    if (event.target.classList.contains('delete-button')) {
      const promptName = event.target.dataset.prompt;
      deletePrompt(promptName);
    } else if (event.target.classList.contains('edit-button')) {
      const promptName = event.target.dataset.prompt;
      editPrompt(promptName);
    }
  });
  importButton.addEventListener('click', importPrompts);
  exportButton.addEventListener('click', exportPrompts);

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
