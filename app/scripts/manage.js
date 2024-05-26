document.addEventListener('DOMContentLoaded', function() {
  const promptSelectElement = document.getElementById('prompt-select');
  const addPromptButton = document.getElementById('add-prompt-button');
  const promptFormElement = document.getElementById('prompt-form');
  const promptNameInput = document.getElementById('prompt-name');
  const promptTextInput = document.getElementById('prompt-text');
  const saveButton = document.getElementById('save-button');
  const deleteButton = document.getElementById('delete-button');
  const reorderButton = document.getElementById('reorder-button');
  const importButton = document.getElementById('import-button');
  const exportButton = document.getElementById('export-button');
  const closeButton = document.getElementById('close-button');
  const confirmationDialog = document.getElementById('confirmation-dialog');
  const okButton = document.getElementById('ok-button');
  const cancelButton = document.getElementById('cancel-button');

  // Localize UI
  localizeUI();

  closeButton.addEventListener('click', function() {
    window.close();
  });

  // ローカルストレージからプロンプトを読み込み、ドロップダウンリストに追加する関数
  function loadPrompts() {
    return new Promise((resolve) => {
      while (promptSelectElement.firstChild) {
        promptSelectElement.removeChild(promptSelectElement.firstChild);
      }
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || [];
        prompts.forEach(function(prompt) {
          const option = document.createElement('option');
          option.value = prompt.promptName;
          option.text = prompt.promptName;
          promptSelectElement.appendChild(option);
        });
        // プロンプトが選択された時の処理を追加
        promptSelectElement.addEventListener('change', updateForm);
        resolve();
      });
    });
  }

  // 新規プロンプトを追加する関数
  function addNewPrompt() {
    promptNameInput.value = '';
    promptTextInput.value = '';
    promptNameInput.focus();
  }

  // 選択されたプロンプトでフォームを更新する関数
  function updateForm() {
    const selectedPrompt = promptSelectElement.value;
    if (selectedPrompt) {
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || [];
        const selectedPromptData = prompts.find(prompt => prompt.promptName === selectedPrompt);
        if (selectedPromptData) {
          promptNameInput.value = selectedPromptData.promptName;
          promptTextInput.value = selectedPromptData.promptValue;
          adjustTextareaHeight();
        }
      });
    } else {
      promptNameInput.value = '';
      promptTextInput.value = '';
      adjustTextareaHeight();
    }
  }

  // プロンプトを保存する関数
  function savePrompt() {
    const promptName = promptNameInput.value.trim();
    const promptText = promptTextInput.value.trim();
    if (promptName && promptText) {
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || [];
        const index = prompts.findIndex(prompt => prompt.promptName === promptName);
        if (index !== -1) {
          prompts[index].promptValue = promptText;
        } else {
          prompts.push({ promptName, promptValue: promptText });
        }
        chrome.storage.local.set({ prompts }, function() {
          // プロンプトリストを更新
          loadPrompts().then(() => {
            // 保存したプロンプトを選択
            promptSelectElement.value = promptName;
            // フォームを更新
            promptSelectElement.dispatchEvent(new Event('change'));
            showSaveNotification();
          });
        });
      });
    }
  }

  function showSaveNotification() {
    const notification = document.createElement('div');
    notification.textContent = chrome.i18n.getMessage('promptSaved');
    notification.classList.add('save-notification');
    document.body.appendChild(notification);
  
    setTimeout(function() {
      notification.style.opacity = '0';
      setTimeout(function() {
        notification.remove();
      }, 500);
    }, 1500);
  }

  // 削除確認ダイアログを表示する関数
  function showDeleteConfirmation() {
    confirmationDialog.style.display = 'flex';
  }

  // 削除確認ダイアログを閉じる関数
  function hideDeleteConfirmation() {
    confirmationDialog.style.display = 'none';
  }

  // プロンプトを削除する関数
  function deletePrompt() {
    const promptName = promptNameInput.value.trim();
    if (promptName) {
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || [];
        const updatedPrompts = prompts.filter(prompt => prompt.promptName !== promptName);
        chrome.storage.local.set({ prompts: updatedPrompts }, function() {
          promptNameInput.value = '';
          promptTextInput.value = '';
          loadPrompts();
          hideDeleteConfirmation();
        });
      });
    }
  }

  // プロンプトをエクスポートする関数
  function exportPrompts() {
    chrome.storage.local.get('prompts', function(data) {
      const prompts = data.prompts || [];
      const jsonData = JSON.stringify(prompts, null, 2);
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
        try {
          const jsonData = JSON.parse(reader.result);
          if (Array.isArray(jsonData)) {
            // 新データ形式の場合
            chrome.storage.local.set({ prompts: jsonData }, function() {
              loadPrompts();
            });
          } else if (typeof jsonData === 'object') {
            // 旧データ形式の場合
            const prompts = Object.entries(jsonData).map(([promptName, promptValue]) => ({ promptName, promptValue }));
            chrome.storage.local.set({ prompts }, function() {
              loadPrompts();
            });
          } else {
            console.error('Invalid JSON data format');
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      };
      reader.readAsText(file);
    });
    fileInput.click();
  }

  // プロンプトの並べ替えページを開くボタン
  function openReorderPage() {
    chrome.tabs.create({ url: 'reorder.html' }, function() {
      window.close();
    });
  }

  // テキストエリアの高さを調整する関数を追加
  function adjustTextareaHeight() {
    promptTextInput.style.height = 'auto';
    const textareaRect = promptTextInput.getBoundingClientRect();
    const primaryButtonGroupRect = document.querySelector('.button-group.primary-actions').getBoundingClientRect();
    const secondaryButtonGroupRect = document.querySelector('.button-group.secondary-actions').getBoundingClientRect();
    maxHeight = window.innerHeight - textareaRect.top - (primaryButtonGroupRect.height + 50) - (secondaryButtonGroupRect.height + 50);
    promptTextInput.style.height = `${Math.min(promptTextInput.scrollHeight, maxHeight)}px`;
  }

  // イベントリスナーの登録
  addPromptButton.addEventListener('click', addNewPrompt);
  saveButton.addEventListener('click', savePrompt);
  deleteButton.addEventListener('click', showDeleteConfirmation);
  okButton.addEventListener('click', deletePrompt);
  cancelButton.addEventListener('click', hideDeleteConfirmation);
  importButton.addEventListener('click', importPrompts);
  exportButton.addEventListener('click', exportPrompts);
  promptTextInput.addEventListener('input', adjustTextareaHeight); // テキストエリアの内容が変更された時に高さを調整
  reorderButton.addEventListener('click', openReorderPage);
  window.addEventListener('resize', adjustTextareaHeight); // ウィンドウのリサイズ時にも高さを調整

  // 初期化処理
  loadPrompts().then(() => {
    // フォームを更新
    promptSelectElement.dispatchEvent(new Event('change'));
  });
});

function localizeUI() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = chrome.i18n.getMessage(key);
  });

  const titleElements = document.querySelectorAll('[data-i18n-title]');
  titleElements.forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    element.title = chrome.i18n.getMessage(key);
  });
}
