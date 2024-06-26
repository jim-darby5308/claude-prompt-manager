import { applyPromptOrder } from './common.js';
console.log(`'Allo 'Allo! Popup`)
document.addEventListener('DOMContentLoaded', function() {
  const promptSelect = document.getElementById('prompt-select');
  const promptPreview = document.getElementById('prompt-preview');
  const applyButton = document.getElementById('apply-button');
  const copyButton = document.getElementById('copy-button');
  const manageButton = document.getElementById('manage-button');
  const tagDropdown = document.getElementById('tag-dropdown'); // 追加: タグドロップダウンの取得

  // Localize UI
  localizeUI();

  // プロンプトとタグを読み込む関数 (追加)
  function loadPromptsAndTags() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['prompts', 'tags', 'filterTag', 'selectedPrompt'], function(data) {
        const prompts = data.prompts || [];
        const tags = data.tags || [];
        const filterTag = data.filterTag || '';
        const selectedPrompt = data.selectedPrompt || '';
        resolve({ prompts, tags, filterTag, selectedPrompt });
      });
    });
  }

  // タグのドロップダウンを更新する関数 (追加)
  function updateTagDropdown(tags, filterTag) {
    // 既存の選択肢をクリア
    while (tagDropdown.firstChild) {
      tagDropdown.removeChild(tagDropdown.firstChild);
    }
    // デフォルトの選択肢を追加
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.text = chrome.i18n.getMessage('selectTag');
    tagDropdown.appendChild(defaultOption);
    // タグの選択肢を追加  
    tags.forEach(function(tag) {
      if (tag !== 'all') { // 'all'タグを除外
        const option = document.createElement('option');
        option.value = tag;
        option.text = tag;
        if (tag === filterTag) {
          option.selected = true;
        }
        tagDropdown.appendChild(option);
      }
    });
  }

  // プロンプトのドロップダウンを更新する関数 (追加)
  function updatePromptDropdown(prompts, filterTag, selectedPrompt) {
    // 既存の選択肢をクリア
    while (promptSelect.firstChild) {
      promptSelect.removeChild(promptSelect.firstChild);
    }
    // プロンプトの選択肢を追加
    const checkOptions = new Set(); // selectedPromptがドロップダウンにあるかの確認
    prompts.forEach(function(prompt) {
      if (prompt.enable !== false && (filterTag === '' || prompt.tags.includes(filterTag) || prompt.tags.includes('all'))) {
        checkOptions.add(prompt.promptName);
        const option = document.createElement('option');
        option.value = prompt.promptName;
        option.text = prompt.promptName;
        promptSelect.appendChild(option);
      }
    });
    // プレビューを更新
    if (selectedPrompt && checkOptions.has(selectedPrompt)) {
      promptSelect.value = selectedPrompt;
    } else {
      promptSelect.selectedIndex = 0;
    } 
    updatePreview();
  }

  // ドロップダウンとプレビューを更新する関数 (追加)
  function updateDropdownsAndPreview() {
    loadPromptsAndTags().then(({ prompts, tags, filterTag, selectedPrompt }) => {
      updateTagDropdown(tags, filterTag);
      updatePromptDropdown(prompts, filterTag, selectedPrompt);
    });
  }

  // タグのドロップダウンの選択が変更されたときの処理 (追加)
  function onTagDropdownChange() {
    const filterTag = tagDropdown.value;
    chrome.storage.local.set({ filterTag }, function() {
      updateDropdownsAndPreview();
    });
  }

  function onPromptDropdownChange() {
    const selectedPrompt = promptDropdown.value;
    chrome.storage.local.set({ selectedPrompt }, function() {
      updateDropdownsAndPreview();
    });
  }

  // 選択されたプロンプトを入力エリアに適用する関数
  function applyPrompt() {
    const selectedPrompt = promptSelect.value;
    if (selectedPrompt) {
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || [];
        const index = prompts.findIndex(p => p.promptName === selectedPrompt);
        if (index !== -1) {
          const promptText = prompts[index].promptValue;
          prompts[index].usageCount = (prompts[index].usageCount || 0) + 1;
          prompts[index].lastUsedAt = Date.now();
          applyPromptOrder(prompts);
          chrome.storage.local.set({ prompts }, function() {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
              chrome.tabs.sendMessage(tabs[0].id, { action: 'applyPrompt', promptText: promptText });
            });
            updateDropdownsAndPreview();
          });
        }
      });
    }
  }

  // プロンプトをコピーする関数
  function copyPrompt() {
    const selectedPrompt = promptSelect.value;
    if (selectedPrompt) {
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || [];
        const index = prompts.findIndex(p => p.promptName === selectedPrompt);
        if (index !== -1) {
          const promptText = prompts[index].promptValue;
          prompts[index].usageCount = (prompts[index].usageCount || 0) + 1;
          prompts[index].lastUsedAt = Date.now();
          applyPromptOrder(prompts);
          chrome.storage.local.set({ prompts }, function() {
            navigator.clipboard.writeText(promptText).then(function() {
              console.log('Prompt copied to clipboard');
              showCopyNotification();
              updateDropdownsAndPreview();
            }, function(err) {
              console.error('Could not copy prompt: ', err);
            });
          });
        }
      });
    }
  }

  // コピートースト
  function showCopyNotification() {
    const notification = document.createElement('div');
    notification.textContent = chrome.i18n.getMessage('promptCopied');
    notification.classList.add('copy-notification');
    document.body.appendChild(notification);
  
    setTimeout(function() {
      notification.style.opacity = '0';
      setTimeout(function() {
        notification.remove();
      }, 500);
    }, 1500);
  }

  // プロンプト管理画面に遷移する関数
  function openManagementPage() {
    const selectedPrompt = promptSelect.value;
    chrome.tabs.create({ url: `manage.html?prompt=${encodeURIComponent(selectedPrompt)}` });
  }

  // プロンプトプレビューを更新する関数
  function updatePreview() {
    const selectedPrompt = promptSelect.value;
    while (promptPreview.firstChild) {
      promptPreview.removeChild(promptPreview.firstChild);
    }
    if (selectedPrompt) {
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || [];
        const prompt = prompts.find(p => p.promptName === selectedPrompt);
        if (prompt) {
          const previewText = prompt.promptValue;
          const previewTextNode = document.createTextNode(previewText);
          promptPreview.appendChild(previewTextNode);
          chrome.storage.local.set({ selectedPrompt });
        }
      });
    }
  }

  // イベントリスナーの登録
  applyButton.addEventListener('click', applyPrompt);
  copyButton.addEventListener('click', copyPrompt);
  manageButton.addEventListener('click', openManagementPage);
  promptSelect.addEventListener('change', updatePreview);
  tagDropdown.addEventListener('change', onTagDropdownChange); // 追加: タグドロップダウンの変更イベント

  // 初期化処理
  updateDropdownsAndPreview(); // 変更: ドロップダウンとプレビューの初期化
});

function localizeUI() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = chrome.i18n.getMessage(key);
  });
}
