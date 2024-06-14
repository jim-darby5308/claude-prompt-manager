import Taggle from 'taggle';
import Awesomplete from 'awesomplete';
import { applyPromptOrder } from './common.js';

document.addEventListener('DOMContentLoaded', function() {
  const promptSelectElement = document.getElementById('prompt-select');
  const addPromptButton = document.getElementById('add-prompt-button');
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
  const enableInput = document.getElementById('enable-checkbox');

  // タグ入力の初期化
  const taggle = new Taggle('tag-input', {
    duplicateTagClass: 'bounce',
    additionalTagClasses: ['taggle-tag'],
    placeholder: ''
  });
  
  // オートコンプリートの初期化
  const awesomplete = new Awesomplete(taggle.getInput(), {
    list: [],
    autoFirst: false,
    minChars: 1
  });

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
    enableInput.checked = true;
    updateTaggle([]); // タグをクリア
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
          enableInput.checked = selectedPromptData.enable !== false; // デフォルトはtrue
          updateTaggle(selectedPromptData.tags || []); // タグを更新
          adjustTextareaHeight();
        }
      });
    } else {
      promptNameInput.value = '';
      promptTextInput.value = '';
      enableInput.checked = true;
      updateTaggle([]); // タグをクリア
      adjustTextareaHeight();
    }
  }

  // プロンプトを保存する関数
  function savePrompt() {
    const promptName = promptNameInput.value.trim();
    const promptText = promptTextInput.value.trim();
    const enable = enableInput.checked;
    const tags = Array.from(taggle.getTagValues());

    if (promptName && promptText) {
      chrome.storage.local.get(['prompts', 'tags'], function(data) {
        const prompts = data.prompts || [];
        const storedTags = data.tags || [];
        const index = prompts.findIndex(prompt => prompt.promptName === promptName);

        if (index !== -1) {
          prompts[index].promptValue = promptText;
          prompts[index].enable = enable;
          prompts[index].tags = tags;
        } else {
          const newPrompt = {
            promptName,
            promptValue: promptText,
            enable,
            tags,
            usageCount: 0,
            lastUsedAt: Date.now()
          };
          prompts.push(newPrompt);
        }
        applyPromptOrder(prompts);
        const updatedTags = new Set([...storedTags, ...tags]);
        chrome.storage.local.set({ prompts, tags: Array.from(updatedTags) }, function() {
          // プロンプトリストを更新
          loadPrompts().then(() => {
            // 保存したプロンプトを選択
            promptSelectElement.value = promptName;
            // フォームを更新
            promptSelectElement.dispatchEvent(new Event('change'));
            // オートコンプリートの候補を更新
            awesomplete.list = Array.from(updatedTags);
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
          const now = Date.now();
          const importedPrompts = jsonData.map(prompt => ({
            promptName: prompt.promptName,
            promptValue: prompt.promptValue,
            tags: prompt.tags || [],
            enable: prompt.enable !== false,
            usageCount: prompt.usageCount || 0,
            lastUsedAt: prompt.lastUsedAt || now
          }));
          chrome.storage.local.get('prompts', function(data) {
            const prompts = data.prompts || [];
            const mergedPrompts = [...prompts, ...importedPrompts];
            const uniquePrompts = Array.from(new Set(mergedPrompts.map(p => p.promptName)))
              .map(promptName => mergedPrompts.find(p => p.promptName === promptName));
            applyPromptOrder(uniquePrompts);
            const importedTags = new Set();
            uniquePrompts.forEach(prompt => {
              if (Array.isArray(prompt.tags)) {
                prompt.tags.forEach(tag => importedTags.add(tag));
              }
            });
            chrome.storage.local.set({ prompts: uniquePrompts, tags: importedTags }, function() {
              loadPrompts();
              awesomplete.list = importedTags;
            });
          });
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
    const maxHeight = window.innerHeight - textareaRect.top - (primaryButtonGroupRect.height + 50) - (secondaryButtonGroupRect.height + 50);
    promptTextInput.style.height = `${Math.min(promptTextInput.scrollHeight, maxHeight)}px`;
  }

  // Taggleのタグを更新する関数
  function updateTaggle(tags) {
    taggle.removeAll();
    tags.forEach(tag => taggle.add(tag));
  }
  
  // Taggleの入力をAwesompleteと連動させる関数
  function linkTaggleAndAwesomplete() {
    const taggleInput = taggle.getInput();
    
    // 'awesomplete-highlight'イベントを監視
    taggleInput.addEventListener('awesomplete-highlight', function(e) {
      // 選択された候補で入力欄の値を置き換える
      taggleInput.value = e.text.label;
    });
  
    // 'awesomplete-selectcomplete'イベントを監視
    taggleInput.addEventListener('awesomplete-selectcomplete', function(e) {
      e.preventDefault();
      taggle.add(taggleInput.value);
      // タグを追加後、入力欄をクリア
      taggleInput.value = '';
    });
  }
  // タブキーでの移動にinput_taggleを含める
  function handleTabKey(event) {
    if (event.key === 'Tab') {
      const focusableElements = Array.from(document.querySelectorAll('input, textarea, select, button'));
      const taggleInput = document.querySelector('.taggle_input');
  
      const currentIndex = focusableElements.indexOf(document.activeElement);
      let nextIndex;
  
      if (event.shiftKey) {
        if (document.activeElement === taggleInput) {
          nextIndex = focusableElements.indexOf(document.getElementById('enable-checkbox'));
        } else {
          nextIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length;
        }
      } else {
        if (document.activeElement === document.getElementById('enable-checkbox')) {
          taggleInput.focus();
          event.preventDefault();
          return;
        } else {
          nextIndex = (currentIndex + 1) % focusableElements.length;
        }
      }
  
      focusableElements[nextIndex].focus();
      event.preventDefault();
    }
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
  document.addEventListener('keydown', handleTabKey);

  // 初期化処理
  loadPrompts().then(() => {
    // URLパラメータから選択されたプロンプトを取得
    const urlParams = new URLSearchParams(window.location.search);
    const selectedPromptFromPopup = urlParams.get('prompt');

    if (selectedPromptFromPopup) {
      // 選択されたプロンプトが存在する場合、それを選択する
      promptSelectElement.value = decodeURIComponent(selectedPromptFromPopup);
      // フォームを更新
      updateForm();
    } else {
    // フォームを更新
    promptSelectElement.dispatchEvent(new Event('change'));
    }

    chrome.storage.local.get('tags', function(data) {
      const tags = data.tags || [];
      awesomplete.list = tags;
    });
    linkTaggleAndAwesomplete();
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
