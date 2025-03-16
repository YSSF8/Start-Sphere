const userInput = document.querySelector('.user-input');
const input = userInput.querySelector('input');
const searchButton = userInput.querySelector('.search-button');
const favoriteList = document.querySelector('.favorite-list');
const addFavorite = favoriteList.querySelector('.add-favorite');

userInput.addEventListener('focusin', () => {
    userInput.classList.add('focus');
    input.focus();
});

userInput.addEventListener('focusout', () => {
    userInput.classList.remove('focus');
});

const searchEngines = JSON.parse(localStorage.getItem('searchEngines')) || {
    'DuckDuckGo': 'https://duckduckgo.com/?q=',
    'Google': 'https://www.google.com/search?q=',
    'Bing': 'https://www.bing.com/search?q=',
    'Yahoo': 'https://search.yahoo.com/search?p=',
    'Ecosia': 'https://www.ecosia.org/search?q='
};

let selectedEngine = localStorage.getItem('selectedSearchEngine') || 'DuckDuckGo';
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

searchButton.addEventListener('click', doSearch);
input.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
});

function doSearch() {
    const query = input.value;
    if (query.trim() === '') return;

    search(selectedEngine, query);
}

function search(engine, query) {
    const searchEngine = searchEngines[engine];
    location.href = `${searchEngine || 'https://duckduckgo.com/?q='}${encodeURIComponent(query)}`;
}

addFavorite.addEventListener('click', () => {
    new Modal(`
        <div class="add-favorite-modal">
            <div class="fav-modal-input url-input">
                <div class="fav-modal-label">URL</div>
                <input type="text" value="https://" placeholder="" advanced-focus>
            </div>
            <div class="fav-modal-input title-input">
                <div class="fav-modal-label">Title</div>
                <input type="text" placeholder="">
            </div>
        </div>
    `, {
        ':accent:Add': async modal => {
            const title = document.querySelector('.title-input input').value.trim();
            const url = document.querySelector('.url-input input').value.trim();

            if (title === '' || url === '') {
                new Modal('Please enter a valid title and URL.');
                return;
            }

            if (!/^https?:\/\/[\w-]+\..+/i.test(url)) {
                new Modal('Please enter a valid URL.');
                return;
            }

            favorites.push({ title, url });
            localStorage.setItem('favorites', JSON.stringify(favorites));

            const last = favorites[favorites.length - 1];
            const a = document.createElement('a');
            a.href = last.url;
            a.innerHTML = `
            <div class="favorite" title="${last.title}">
                <img src="" class="favicon" draggable="false" alt="">
            </div>
            `;
            favoriteList.insertBefore(a, addFavorite);

            a.draggable = true;
            initializeDragAndDrop();

            a.addEventListener('contextmenu', e => handleContextMenu(e, a));

            modalClosingAnimation(modal);

            const response = await fetch(`/get_favicon?url=${encodeURIComponent(last.url)}`);
            const data = await response.text();
            const img = a.querySelector('img');
            img.src = data;
        },
        'Cancel': modal => {
            modalClosingAnimation(modal);
        }
    });
});


function modalClosingAnimation(element, duration = 300) {
    element.style.animation = `modal-fade-out ${duration}ms forwards`;
    element.querySelector('.modal-content').style.animation = `modal-content-out ${duration}ms ease forwards`;

    setTimeout(() => {
        element.remove();
    }, 300);
}

function initializeDragAndDrop() {
    const favorites = favoriteList.querySelectorAll('a:not(.add-favorite)');

    favorites.forEach(favorite => {
        favorite.draggable = true;

        favorite.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.target.classList.add('dragging');

            // Store the initial position
            const items = [...favoriteList.querySelectorAll('a:not(.add-favorite)')];
            e.dataTransfer.setData('text/plain', items.indexOf(e.target));
        });

        favorite.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            updateFavoritesOrder();
        });

        favorite.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const draggingItem = favoriteList.querySelector('.dragging');
            if (draggingItem === favorite) return;

            const items = [...favoriteList.querySelectorAll('a:not(.add-favorite)')];
            const currentPos = items.indexOf(favorite);
            const rect = favorite.getBoundingClientRect();
            const offset = e.clientX - rect.left;

            if (offset > rect.width / 2) {
                favorite.after(draggingItem);
            } else {
                favorite.before(draggingItem);
            }
        });
    });
}

function updateFavoritesOrder() {
    const orderedFavorites = [...favoriteList.querySelectorAll('a:not(.add-favorite)')].map(a => ({
        title: a.querySelector('.favorite').getAttribute('title'),
        url: a.href
    }));

    favorites = orderedFavorites;
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

async function loadFavorites() {
    const favoritePromises = favorites.map(async favorite => {
        const a = document.createElement('a');
        a.href = favorite.url;
        a.innerHTML = `
        <div class="favorite" title="${favorite.title}">
            <img src="" class="favicon" draggable="false" alt="">
        </div>
        `;
        favoriteList.insertBefore(a, addFavorite);

        const response = await fetch(`/get_favicon?url=${encodeURIComponent(favorite.url)}`);
        const data = await response.text();

        const img = a.querySelector('.favicon');
        img.src = data;
    });

    await Promise.all(favoritePromises);
    initializeDragAndDrop();
}

loadFavorites();

let contextOptions = [];

favoriteList.querySelectorAll('a').forEach(a => {
    a.addEventListener('contextmenu', e => {
        if (e.target === addFavorite) return;
        e.preventDefault();

        handleContextMenu(e, a);

        contextmenu(contextOptions, { x: e.clientX, y: e.clientY });
    });
});

function handleContextMenu(e, a) {
    e.preventDefault();

    const favoriteList = document.querySelector('.favorite-list');

    contextOptions = [
        {
            title: 'Open',
            click: () => {
                location.href = a.href;
            }
        },
        {
            title: 'Open in new tab',
            click: () => {
                window.open(a.href, '_blank');
            }
        },

    ];

    if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        let openedWindows = 0;

        contextOptions.push({
            title: 'Open in popup window',
            click: () => {
                const width = 600,
                    height = 400;
                const left = screen.width / 2 - width / 2,
                    top = screen.height / 2 - height / 2;
                window.open(a.href, `popupWindow-${++openedWindows}`, `width=${width},height=${height},left=${left},top=${top}`);
            }
        });
    }

    contextOptions.push({
        title: 'Copy URL',
        click: () => {
            try {
                navigator.clipboard.writeText(a.href);
            } catch {
                new Modal('Failed to copy URL to clipboard.');
            }
        }
    },
    {
        title: 'Remove',
        click: () => {
            const allItems = Array.from(favoriteList.children);
            const toRemove = a;
            const remainingItems = allItems.filter(item => item !== toRemove);

            const initialRects = remainingItems.map(item => item.getBoundingClientRect());
            const removeRect = toRemove.getBoundingClientRect();

            const clone = toRemove.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.left = `${removeRect.left}px`;
            clone.style.top = `${removeRect.top}px`;
            clone.style.width = `${removeRect.width}px`;
            clone.style.height = `${removeRect.height}px`;
            clone.style.margin = '0';
            clone.style.zIndex = '1000';
            favoriteList.appendChild(clone);

            toRemove.remove();

            const finalRects = remainingItems.map(item => item.getBoundingClientRect());

            remainingItems.forEach((item, i) => {
                const deltaX = initialRects[i].left - finalRects[i].left;
                const deltaY = initialRects[i].top - finalRects[i].top;
                item.style.transition = 'none';
                item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                item.offsetWidth;
                item.style.transition = 'transform 200ms ease-out';
                item.style.transform = 'translate(0, 0)';
            });

            clone.style.transition = 'transform 200ms ease-out, opacity 200ms ease-out';
            clone.style.transform = 'scale(0.5)';
            clone.style.opacity = '0';

            setTimeout(() => {
                clone.remove();
                remainingItems.forEach(item => {
                    item.style.transition = '';
                    item.style.transform = '';
                });
            }, 300);

            const index = favorites.findIndex(favorite =>
                favorite.url.replace(/\/$/, '') === toRemove.href.replace(/\/$/, '')
            );
            if (index !== -1) {
                favorites.splice(index, 1);
                try {
                    localStorage.setItem('favorites', JSON.stringify(favorites));
                } catch (error) {
                    console.error('Failed to update localStorage:', error);
                }
            } else {
                console.warn('Favorite not found in array');
            }
        }
    });

    contextmenu(contextOptions, { x: e.clientX || e.touches[0].clientX, y: e.clientY || e.touches[0].clientY });
}

function contextmenu(items = [], position = { x: 0, y: 0 }) {
    const existingMenus = document.querySelectorAll('.contextmenu');
    existingMenus.forEach(menu => menu.remove());

    const ctx = document.createElement('div');
    ctx.classList.add('contextmenu');
    document.body.appendChild(ctx);

    for (let i = 0; i < items.length; i++) {
        const item = document.createElement('div');
        item.classList.add('contextmenu-item');
        item.textContent = items[i].title;
        item.addEventListener('click', items[i].click);
        ctx.appendChild(item);
    }

    const menuWidth = ctx.offsetWidth;
    const menuHeight = ctx.offsetHeight;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    if (x + menuWidth > viewportWidth) {
        x = viewportWidth - menuWidth;
    }

    if (y + menuHeight > viewportHeight) {
        y = viewportHeight - menuHeight;
    }

    if (x < 0) {
        x = 0;
    }

    if (y < 0) {
        y = 0;
    }

    ctx.style.left = `${x}px`;
    ctx.style.top = `${y}px`;

    document.addEventListener('click', () => {
        ctx.remove();
    });
}

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

        document.querySelectorAll('[advanced-focus]').forEach((_, index) => {
            if (index > 0) {
                this.modal.remove();
                throw new Error('Only one element can have the "advanced-focus" attribute.');
            }
        });

        const advancedFocusElement = this.modal.querySelector('[advanced-focus]');
        if (advancedFocusElement) {
            advancedFocusElement.focus();
            if (advancedFocusElement.tagName === 'INPUT' || advancedFocusElement.tagName === 'TEXTAREA') {
                advancedFocusElement.selectionStart = advancedFocusElement.selectionEnd = advancedFocusElement.value.length;
            }
        }

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

const suggestions = userInput.querySelector('.suggestions');
let debounceTimeout;

input.addEventListener('input', async () => {
    const query = input.value.trim();

    clearTimeout(debounceTimeout);

    if (query === '') {
        suggestions.classList.remove('active');
        suggestions.innerHTML = '';
        return;
    }

    debounceTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/suggestions?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            suggestions.innerHTML = '';

            data.forEach(item => {
                const suggestionItem = document.createElement('div');
                suggestionItem.classList.add('suggestion-item');
                suggestionItem.textContent = item.phrase;

                suggestionItem.addEventListener('click', () => {
                    input.value = item.phrase;
                    suggestions.classList.remove('active');
                    doSearch();
                });

                suggestions.appendChild(suggestionItem);
            });

            if (data.length > 0) {
                suggestions.classList.add('active');
            } else {
                suggestions.classList.remove('active');
            }
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        }
    }, 300);
});

document.addEventListener('click', (e) => {
    if (!userInput.contains(e.target)) {
        suggestions.classList.remove('active');
    }
});

input.addEventListener('keydown', e => {
    const items = suggestions.querySelectorAll('.suggestion-item');
    const active = suggestions.querySelector('.suggestion-item.active');

    if (items.length === 0) return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            if (!active) {
                items[0].classList.add('active');
                input.value = items[0].textContent;
            } else {
                const next = active.nextElementSibling;
                if (next) {
                    active.classList.remove('active');
                    next.classList.add('active');
                    input.value = next.textContent;
                }
            }
            break;

        case 'ArrowUp':
            e.preventDefault();
            if (active) {
                const prev = active.previousElementSibling;
                if (prev) {
                    active.classList.remove('active');
                    prev.classList.add('active');
                    input.value = prev.textContent;
                }
            }
            break;

        case 'Escape':
            suggestions.classList.remove('active');
            break;
    }
});