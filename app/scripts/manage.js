import Taggle from 'taggle';
import Awesomplete from 'awesomplete';
import Fuse from 'fuse.js';
import { applyPromptOrder } from './common.js';

document.addEventListener('DOMContentLoaded', function() {
  const promptFilterInput = document.getElementById('prompt-filter');
  const promptDropdown = document.getElementById('prompt-dropdown');
  const addPromptButton = document.getElementById('add-prompt-button');
  const promptNameInput = document.getElementById('prompt-name');
  const promptTextInput = document.getElementById('prompt-text');
  const saveButton = document.getElementById('save-button');
  const deleteButton = document.getElementById('delete-button');
  const importButton = document.getElementById('import-button');
  const exportButton = document.getElementById('export-button');
  const closeButton = document.getElementById('close-button');
  const confirmationDialog = document.getElementById('confirmation-dialog');
  const okButton = document.getElementById('ok-button');
  const cancelButton = document.getElementById('cancel-button');
  const enableInput = document.getElementById('enable-checkbox');

  let prompts = [];
  let fuse;

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

  // ローカルストレージからプロンプトを読み込む関数
  function loadPrompts() {
    return new Promise((resolve) => {
      chrome.storage.local.get('prompts', function(data) {
        prompts = data.prompts || [];
        fuse = new Fuse(prompts, {
          keys: ['promptName'],
          threshold: 0.4,
          ignoreLocation: true,
          useExtendedSearch: true
        });
        updateFilteredPrompts();
        resolve();
      });
    });
  }

  // フィルタリングされたプロンプトを更新する関数
  function updateFilteredPrompts() {
    const filterText = promptFilterInput.value;
    let filteredPrompts;

    if (filterText.trim() === '') {
      filteredPrompts = prompts;
    } else {
      filteredPrompts = fuse.search(filterText).map(result => result.item);
    }

    promptDropdown.innerHTML = '';
    filteredPrompts.forEach(prompt => {
      const option = document.createElement('div');
      option.textContent = prompt.promptName;
      option.classList.add('prompt-option');
      option.addEventListener('click', () => selectPrompt(prompt));
      promptDropdown.appendChild(option);
    });

    if (filteredPrompts.length > 0) {
      promptDropdown.style.display = 'block';
    } else {
      promptDropdown.style.display = 'none';
    }
  }

  // プロンプトを選択する関数
  function selectPrompt(prompt) {
    // 最新のプロンプトデータを使用
    const latestPrompt = prompts.find(p => p.promptName === prompt.promptName) || prompt;
    promptNameInput.value = latestPrompt.promptName;
    promptTextInput.value = latestPrompt.promptValue;
    enableInput.checked = latestPrompt.enable !== false;
    updateTaggle(latestPrompt.tags || []);
    adjustTextareaHeight();
    promptDropdown.style.display = 'none';
    promptFilterInput.value = '';
  }


  // 新規プロンプトを追加する関数
  function addNewPrompt() {
    promptNameInput.value = '';
    promptTextInput.value = '';
    promptNameInput.focus();
    enableInput.checked = true;
    updateTaggle([]);
    promptFilterInput.value = '';
    promptDropdown.style.display = 'none';
  }

  // プロンプトを保存する関数
  function savePrompt() {
    const promptName = promptNameInput.value.trim();
    const promptText = promptTextInput.value.trim();
    const enable = enableInput.checked;
    const tags = Array.from(taggle.getTagValues());
  
    if (promptName && promptText) {
      const index = prompts.findIndex(prompt => prompt.promptName === promptName);

      if (index !== -1) {
        prompts[index].promptValue = promptText;
        prompts[index].enable = enable;
        prompts[index].tags = tags;
        prompts[index].lastUsedAt = Date.now(); // 既存のプロンプトを更新した場合も lastUsedAt を更新
      } else {
        const newPrompt = {
          promptName,
          promptValue: promptText,
          enable,
          tags,
          lastUsedAt: Date.now() // 新規プロンプト作成時に lastUsedAt を設定
        };
        prompts.push(newPrompt);
      }
      applyPromptOrder(prompts);

      // すべてのプロンプトから使用されているタグを収集
      const updatedTags = new Set(prompts.flatMap(prompt => prompt.tags));

      chrome.storage.local.set({ prompts, tags: Array.from(updatedTags) }, function() {
        // プロンプトリストを更新
        updateFilteredPrompts();
        
        // 保存したプロンプトを選択
        selectPrompt(prompts.find(p => p.promptName === promptName));
        
        // オートコンプリートの候補を更新
        awesomplete.list = Array.from(updatedTags);
        
        // Fuse.jsのインスタンスを更新（もし使用している場合）
        if (typeof fuse !== 'undefined') {
          fuse.setCollection(prompts);
        }
        
        showSaveNotification();
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
      prompts = prompts.filter(prompt => prompt.promptName !== promptName);
      chrome.storage.local.set({ prompts }, function() {
          promptNameInput.value = '';
          promptTextInput.value = '';
        fuse.setCollection(prompts);
        updateFilteredPrompts();
          hideDeleteConfirmation();
        });
    }
  }

  // プロンプトをエクスポートする関数
  function exportPrompts() {
      const jsonData = JSON.stringify(prompts, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prompts.json';
      a.click();
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
          prompts = [...prompts, ...importedPrompts];
          const uniquePrompts = Array.from(new Set(prompts.map(p => p.promptName)))
            .map(promptName => prompts.find(p => p.promptName === promptName));
            applyPromptOrder(uniquePrompts);
          const importedTags = new Set(uniquePrompts.flatMap(prompt => prompt.tags));
          chrome.storage.local.set({ prompts: uniquePrompts, tags: Array.from(importedTags) }, function() {
            prompts = uniquePrompts;
            fuse.setCollection(prompts);
            updateFilteredPrompts();
            awesomplete.list = Array.from(importedTags);
          });
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      };
      reader.readAsText(file);
    });
    fileInput.click();
  }

  // テキストエリアの高さを調整する関数
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
      const focusableElements = Array.from(document.querySelectorAll('input, textarea, select, button, .prompt-option'));
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
  promptFilterInput.addEventListener('input', updateFilteredPrompts);
  promptFilterInput.addEventListener('focus', () => {
    if (promptFilterInput.value === '') {
      updateFilteredPrompts();
    }
  });
  document.addEventListener('click', (e) => {
    if (!promptDropdown.contains(e.target) && e.target !== promptFilterInput) {
      promptDropdown.style.display = 'none';
    }
  });
  addPromptButton.addEventListener('click', addNewPrompt);
  saveButton.addEventListener('click', savePrompt);
  deleteButton.addEventListener('click', showDeleteConfirmation);
  okButton.addEventListener('click', deletePrompt);
  cancelButton.addEventListener('click', hideDeleteConfirmation);
  importButton.addEventListener('click', importPrompts);
  exportButton.addEventListener('click', exportPrompts);
  promptTextInput.addEventListener('input', adjustTextareaHeight); // テキストエリアの内容が変更された時に高さを調整
  window.addEventListener('resize', adjustTextareaHeight); // ウィンドウのリサイズ時にも高さを調整
  document.addEventListener('keydown', handleTabKey);

  // 初期化処理
  function initialize() {
    loadPrompts().then(() => {
      // URLパラメータから選択されたプロンプトを取得
      const urlParams = new URLSearchParams(window.location.search);
      const selectedPromptFromPopup = urlParams.get('prompt');

      if (selectedPromptFromPopup) {
        // 選択されたプロンプトが存在する場合、それを選択する
        const selectedPrompt = prompts.find(p => p.promptName === decodeURIComponent(selectedPromptFromPopup));
        if (selectedPrompt) {
          selectPrompt(selectedPrompt);
        }
      }

      chrome.storage.local.get('tags', function(data) {
        const tags = data.tags || [];
        awesomplete.list = tags;
      });
      linkTaggleAndAwesomplete();
    });
  }

  initialize();
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
