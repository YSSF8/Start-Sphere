const defaultEngine = document.getElementById('defaultEngine');
const clearFavorites = document.getElementById('clearFavorites');
const resetSettings = document.getElementById('resetSettings');

const searchEngines = JSON.parse(localStorage.getItem('searchEngines')) || {
    'DuckDuckGo': 'https://duckduckgo.com/?q=',
    'Google': 'https://www.google.com/search?q=',
    'Bing': 'https://www.bing.com/search?q=',
    'Yahoo': 'https://search.yahoo.com/search?p=',
    'Ecosia': 'https://www.ecosia.org/search?q='
};

Object.keys(searchEngines).forEach(engine => {
    const option = document.createElement('option');
    option.value = engine;
    option.textContent = engine;
    defaultEngine.appendChild(option);
});

defaultEngine.value = localStorage.getItem('selectedSearchEngine') || 'DuckDuckGo';

defaultEngine.addEventListener('change', () => {
    localStorage.setItem('selectedSearchEngine', defaultEngine.value);
    new Modal('Search engine updated successfully!');
});

clearFavorites.addEventListener('click', () => {
    new Modal('Are you sure you want to clear all favorites?', {
        ':danger:Clear': modal => {
            localStorage.removeItem('favorites');
            modal.remove();
            new Modal('All favorites have been cleared.');
        },
        'Cancel': modal => modal.remove()
    });
});

resetSettings.addEventListener('click', () => {
    new Modal('Are you sure you want to reset all settings?', {
        ':danger:Reset': modal => {
            localStorage.clear();
            modal.remove();
            location.reload();
        },
        'Cancel': modal => modal.remove()
    });
});

class Modal {
    constructor(content = 'New Modal', options = { 'Close': modal => modal.remove() }) {
        const optionKeys = Object.keys(options);

        if (optionKeys.length === 0) {
            throw new Error('Invalid options provided');
        }

        this.modal = document.createElement('div');
        this.modal.classList.add('modal');

        const buttonHtml = optionKeys.map(key => {
            let buttonClass = 'modal-button';
            let buttonText = key;

            const regex = /^:([\w-]*?):/;
            const styleMatch = key.match(regex);
            if (styleMatch) {
                buttonClass += ` button|status button-${styleMatch[1]}`;
                buttonText = key.replace(regex, '');
            }

            return `<button class="${buttonClass}" data-option="${key}">${buttonText}</button>`;
        }).join('');

        this.modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-inner-content">${content}</div>
                <div class="modal-options">${buttonHtml}</div>
            </div>
        `;

        document.body.appendChild(this.modal);

        this.modal.querySelectorAll('.modal-button').forEach(button => {
            button.addEventListener('click', () => {
                const option = button.dataset.option;
                if (options[option] && options[option] instanceof Function) {
                    options[option](this.modal);
                } else {
                    throw new Error('Invalid option provided.\nOptions must be a function.');
                }
            });
        });
    }
}