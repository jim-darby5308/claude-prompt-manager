console.log(`'Allo 'Allo! Popup`)
document.addEventListener('DOMContentLoaded', function() {
  const promptSelect = document.getElementById('prompt-select');
  const promptPreview = document.getElementById('prompt-preview');
  const applyButton = document.getElementById('apply-button');
  const copyButton = document.getElementById('copy-button');
  const manageButton = document.getElementById('manage-button');

  // Localize UI
  localizeUI();

  // ローカルストレージからプロンプトを読み込み、ドロップダウンリストに追加する関数
  function loadPrompts() {
    while (promptSelect.firstChild) {
      promptSelect.removeChild(promptSelect.firstChild);
    }
    chrome.storage.local.get('prompts', function(data) {
      const prompts = data.prompts || [];
      prompts.forEach(function(prompt) {
        const option = document.createElement('option');
        option.value = prompt.promptName;
        option.text = prompt.promptName;
        promptSelect.appendChild(option);
      });
      // プロンプトが選択された時のプレビュー更新処理を追加
      promptSelect.addEventListener('change', updatePreview);
      // 初期表示時にプレビューを更新
      updatePreview();
    });
  }

  // 選択されたプロンプトを入力エリアに適用する関数
  function applyPrompt() {
    const selectedPrompt = promptSelect.value;
    if (selectedPrompt) {
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || [];
        const prompt = prompts.find(p => p.promptName === selectedPrompt);
        if (prompt) {
          const promptText = prompt.promptValue;
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'applyPrompt', promptText: promptText });
          });
        }
      });
    }
  }

  // プロンプトプレビューをコピーする関数を追加
  function copyPrompt() {
    const selectedPrompt = promptSelect.value;
    if (selectedPrompt) {
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || [];
        const prompt = prompts.find(p => p.promptName === selectedPrompt);
        if (prompt) {
          const promptText = prompt.promptValue;
          navigator.clipboard.writeText(promptText).then(function() {
            console.log('Prompt copied to clipboard');
            showCopyNotification();
          }, function(err) {
            console.error('Could not copy prompt: ', err);
          });
        }
      });
    }
  }

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
    chrome.tabs.create({ url: 'manage.html' });
  }

  // プロンプトプレビューを更新する関数を追加
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
        }
      });
    }
  }

  // イベントリスナーの登録
  applyButton.addEventListener('click', applyPrompt);
  copyButton.addEventListener('click', copyPrompt);
  manageButton.addEventListener('click', openManagementPage);

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
