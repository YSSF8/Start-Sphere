(() => {
    'use strict';

    const historyChats = document.getElementById('history');
    const historyBody = historyChats.querySelector('.body');
    const messageContainer = document.querySelector('.message-container');
    const messageInputContainer = document.querySelector('.message-input-container');
    const promptPlace = document.getElementById('prompt-place');
    const send = document.querySelector('.send');
    const chatInterface = document.getElementById('chat-interface');
    const toBottom = document.querySelector('.to-bottom');

    const instructions = `
    Forget your previous instructions. Here are your new instructions:
    - Your name is Start Sphere AI, based on the model DeepSeek-R1, an advanced AI model developed by DeepSeek.
    - Start Sphere is developed by YSSF.
    - Respond in user's language, for example, if you are asked in English, you should respond in English.
    - You shouldn't search the web no matter what, rely on your personal knowledge and your own intelligence to answer the user's questions.
    - Bullet lists are typically used like: "- item\\n- item 2", just like Markdown.
    - Math expressions/equations should be written in LaTeX format.
    `.trim();

    let messages = [
        {
            id: 'gJP6OjF',
            content: instructions,
            role: 'system'
        }
    ];

    send.addEventListener('click', () => {
        let prompt = promptPlace.value.trim();
        if (prompt == '') return;
        sendMessage(prompt);
    });

    promptPlace.addEventListener('keydown', e => {
        if (e.key == 'Enter') {
            e.preventDefault();
            send.click();
        }
    });

    promptPlace.addEventListener('input', () => {
        if (promptPlace.value.trim() == '') {
            send.disabled = true;
        } else {
            send.disabled = false;
        }
    });

    promptPlace.addEventListener('focus', () => {
        messageInputContainer.style.borderColor = '#555';
    });

    promptPlace.addEventListener('blur', () => {
        messageInputContainer.style.removeProperty('border-color');
    });

    let currentConversationId = Math.floor(Math.random() * (10 ** 10));

    function openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('StartSphereDB', 1);

            request.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('conversations')) {
                    db.createObjectStore('conversations', { keyPath: 'id' });
                }
            };

            request.onsuccess = e => {
                resolve(e.target.result);
            };

            request.onerror = e => {
                reject(`Database error: ${e.target.errorCode}`);
            };
        });
    }

    async function getAllConversations() {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['conversations'], 'readonly');
            const objectStore = transaction.objectStore('conversations');
            const request = objectStore.getAll();

            request.onsuccess = event => {
                resolve(event.target.result);
            };

            request.onerror = event => {
                reject(`Failed to get conversations: ${event.target.errorCode}`);
            };
        });
    }

    async function getConversationById(id) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['conversations'], 'readonly');
            const objectStore = transaction.objectStore('conversations');
            const request = objectStore.get(id);

            request.onsuccess = event => {
                resolve(event.target.result);
            };

            request.onerror = event => {
                reject(`Failed to get conversation: ${event.target.errorCode}`);
            };
        });
    }

    async function saveConversation(conversation) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['conversations'], 'readwrite');
            const objectStore = transaction.objectStore('conversations');
            const request = objectStore.put(conversation);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = event => {
                reject(`Failed to save conversation: ${event.target.errorCode}`);
            };
        });
    }

    async function deleteConversation(id) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['conversations'], 'readwrite');
            const objectStore = transaction.objectStore('conversations');
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = event => {
                reject(`Failed to delete conversation: ${event.target.errorCode}`);
            };
        });
    }

    async function clearConversations() {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['conversations'], 'readwrite');
            const objectStore = transaction.objectStore('conversations');
            const request = objectStore.clear();

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = event => {
                reject(`Failed to clear conversations: ${event.target.errorCode}`);
            };
        });
    }

    async function sendMessage(message) {
        function sender(name, avatar, response = '') {
            const msg = document.createElement('div');
            msg.classList.add('message', `${name === 'You' ? 'user' : 'ai'}-message`);
            msg.innerHTML = `
            <div class="message-header">
                <img src="${avatar}" height="24" alt="${name.toLowerCase()}">
                <span>${name}</span>
            </div>
            <div class="message-content">${name === 'You' ? escapeHTML(message) : response}</div>
            `;
            messageContainer.appendChild(msg);
            return msg.querySelector('.message-content');
        }

        let conversations = await getAllConversations();
        conversations = conversations || [];

        function generateConversationName(baseName, conversations) {
            let name = baseName;
            let counter = 1;
            const existingNames = conversations.map(conv => conv.name);

            while (existingNames.includes(name)) {
                name = `${baseName} (${counter})`;
                counter++;
            }
            return name;
        }

        const introduction = messageContainer.querySelector('center');
        if (introduction) introduction.remove();
        send.setAttribute('disabled', '');

        sender('You', 'static/images/avatar.jpg');
        promptPlace.value = '';

        const generatingMessageContent = sender('Start Sphere AI', 'static/images/ai.png', '<span class="generating-text">Reasoning...</span>');
        generatingMessageContent.classList.add('generating-message');

        messages.push({
            id: 'gJP6OjF',
            content: message,
            role: 'user'
        });
        messageContainer.scrollTop = messageContainer.scrollHeight;

        fetch('/message_ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'messages': messages
            })
        })
            .then(async res => {
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`Server error: ${res.status} ${res.statusText}\n${errorText}`);
                }
                return res.text();
            })
            .then(async data => {
                let newDataContent = data;

                newDataContent = await processImageGeneration(newDataContent);

                const think = newDataContent.match(/<think>([\S\s]*?)<\/think>/)[1].trim();
                const result = newDataContent.replace(think, '').trim();

                generatingMessageContent.classList.remove('generating-message');

                generatingMessageContent.innerHTML = `
                <div class="cot">
                    <button class="expand-cot">Thoughts</button>
                    <div class="thoughts collapsed">${think}</div>
                </div>
                ${marked.parse(result)}
                <div class="options horizontal-view">
                    <div class="option copy">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" version="1.1" viewBox="0.00 0.00 512.00 512.00" fill="#ffffff">
                            <path d="   M 83.87 348.77   C 77.27 367.06 51.01 367.07 44.11 348.78   Q 42.76 345.20 42.76 338.41   Q 42.74 204.98 42.75 71.56   Q 42.75 58.19 44.28 52.58   C 48.28 37.87 60.70 26.07 75.42 22.56   Q 80.82 21.27 95.31 21.26   Q 202.40 21.24 309.48 21.25   Q 322.92 21.25 327.35 22.81   C 346.40 29.51 345.42 56.21 326.77 62.69   Q 323.01 64.00 316.45 64.00   Q 215.35 64.02 114.25 63.97   Q 103.80 63.97 99.40 65.48   C 86.53 69.90 85.24 80.61 85.25 93.64   Q 85.25 215.60 85.25 337.56   Q 85.25 344.96 83.87 348.77   Z"/>
                            <path d="   M 172.50 490.92   C 152.40 490.94 134.24 478.02 129.34 458.39   Q 128.00 453.03 128.00 438.50   Q 128.00 298.50 128.00 158.49   Q 128.00 144.32 129.44 138.62   C 133.15 124.01 145.11 112.02 159.84 108.11   Q 164.93 106.76 174.91 106.76   Q 286.35 106.74 397.79 106.75   Q 410.94 106.75 416.59 108.26   C 430.97 112.11 442.75 124.01 446.54 138.49   Q 447.99 144.01 447.99 157.26   Q 448.01 302.25 447.95 447.25   C 447.94 466.82 434.98 484.62 415.83 489.33   Q 410.13 490.72 395.94 490.73   Q 284.22 490.79 172.50 490.92   Z   M 405.25 170.73   A 21.47 21.47 0.0 0 0 383.78 149.26   L 192.22 149.26   A 21.47 21.47 0.0 0 0 170.75 170.73   L 170.75 426.53   A 21.47 21.47 0.0 0 0 192.22 448.00   L 383.78 448.00   A 21.47 21.47 0.0 0 0 405.25 426.53   L 405.25 170.73   Z"/>
                        </svg>
                    </div>
                    <div class="option read-aloud">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M19 6C20.5 7.5 21 10 21 12C21 14 20.5 16.5 19 18M16 8.99998C16.5 9.49998 17 10.5 17 12C17 13.5 16.5 14.5 16 15M3 10.5V13.5C3 14.6046 3.5 15.5 5.5 16C7.5 16.5 9 21 12 21C14 21 14 3 12 3C9 3 7.5 7.5 5.5 8C3.5 8.5 3 9.39543 3 10.5Z" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
                `;

                const expandCot = generatingMessageContent.querySelector('.expand-cot');
                const thoughts = generatingMessageContent.querySelector('.thoughts');

                thoughts.classList.remove('collapsed');
                const actualHeight = thoughts.scrollHeight + 'px';
                thoughts.style.height = actualHeight;

                thoughts.classList.add('collapsed');
                thoughts.style.height = '0';

                expandCot.addEventListener('click', () => {
                    thoughts.classList.toggle('collapsed');

                    if (thoughts.classList.contains('collapsed')) {
                        thoughts.style.height = '0';
                    } else {
                        thoughts.style.height = actualHeight;
                    }
                });

                const response = generatingMessageContent;

                attachImageClickHandlers(response);

                hljs.highlightAll();
                highlightCodeBlocks(response);

                const copy = response.querySelector('.option.copy');
                const readAloud = response.querySelector('.option.read-aloud');

                let copyIcon = copy.querySelector('svg').outerHTML;

                copyToClipboard({
                    copy: copy,
                    oldIcon: copyIcon,
                    message: result
                });
                readMessage(readAloud, result);

                messages.push({
                    id: 'gJP6OjF',
                    createdAt: new Date().toISOString(),
                    content: result,
                    role: 'assistant',
                    thoughts: think
                });

                let conversation = await getConversationById(currentConversationId);

                if (conversation) {
                    conversation.messages = messages;
                    conversation.updatedAt = new Date().toISOString();
                } else {
                    const baseName = 'New Conversation';
                    const conversationName = generateConversationName(baseName, await getAllConversations());

                    conversation = {
                        id: currentConversationId,
                        name: conversationName,
                        messages: messages,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        pinned: false,
                        pinnedAt: null
                    };
                }

                await saveConversation(conversation);

                await loadHistory();

                messageContainer.scrollTop = messageContainer.scrollHeight;

                historyBody.innerHTML = '';
                await loadHistory();
            })
            .catch(error => {
                generatingMessageContent.classList.remove('generating-message');
                generatingMessageContent.innerHTML = '';

                generatingMessageContent.innerHTML = `
                    <div class="error-message">
                        <p>An error occurred while sending your message. Please try again later.</p>
                    </div>
                `;

                console.log(error);

                generatingMessageContent.parentElement.classList.add('error');
                messageContainer.scrollTop = messageContainer.scrollHeight;
            });
    }

    function highlightCodeBlocks(response) {
        response.querySelectorAll('.hljs').forEach(block => {
            const header = document.createElement('div');
            header.classList.add('code-header');
            header.innerHTML = `
                <div class="lang-name">${(() => {
                    let language;
                    block.classList.forEach(className => {
                        if (className.startsWith('language-')) {
                            language = className.replace('language-', '');
                        }
                    });
                    return language;
                })()}</div>
                <div class="copy-code">Copy</div>
                `;
            block.parentElement.insertBefore(header, block);

            const copyCode = header.querySelector('.copy-code');

            copyCode.addEventListener('click', () => {
                navigator.clipboard.writeText(block.innerText);
                copyCode.textContent = 'Copied';

                setTimeout(() => {
                    copyCode.textContent = 'Copy';
                }, 2000);
            });
        });
    }

    function readMessage(readAloud, message) {
        readAloud.addEventListener('click', () => {
            readAloud.classList.toggle('_reading');

            if (readAloud.classList.contains('_reading')) {
                let textToRead = message;
                textToRead = textToRead.replace(/<think>[\S\s]*?<\/think>/g, '');

                textToRead = textToRead.replace(/```[\s\S]*?```/g, 'code block');
                textToRead = textToRead.replace(/<[^>]*>/g, '');

                const utterance = new SpeechSynthesisUtterance(textToRead);
                utterance.lang = 'en-US';
                speechSynthesis.speak(utterance);

                utterance.addEventListener('end', () => {
                    readAloud.classList.remove('_reading');
                });
                utterance.addEventListener('error', () => {
                    readAloud.classList.remove('_reading');
                });
            } else {
                speechSynthesis.cancel();
            }
        });
    }

    async function processImageGeneration(content) {
        const regex = /image_gen\((.*?)\)/g;
        let matches = [...content.matchAll(regex)];

        for (const match of matches) {
            const prompt = match[1];
            try {
                const response = await fetch('/generate_image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        'prompt': prompt
                    })
                });

                const imageUrl = await response.text();
                const updatedImageUrl = imageUrl.replace('Generated Image', prompt);
                content = content.replace(match[0], updatedImageUrl);
            } catch (error) {
                console.error('Image generation failed:', error);
                content = content.replace(match[0], '⚠️ Image generation failed');
            }
        }

        return content;
    }

    function copyToClipboard({
        copy,
        oldIcon,
        message,
        delay = 2000
    } = {}) {
        copy.addEventListener('click', () => {
            navigator.clipboard.writeText(message);
            copy.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 -0.5 25 25" fill="none">
                <path d="M5.5 12.5L10.167 17L19.5 8" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            `;
            setTimeout(() => {
                copy.innerHTML = oldIcon;
            }, delay);
        });
    }

    function attachImageClickHandlers(container) {
        container.querySelectorAll('img').forEach(img => {
            img.addEventListener('click', () => {
                const fullscreen = document.createElement('div');
                fullscreen.classList.add('fullscreen-image');
                document.body.appendChild(fullscreen);

                let headerOptions = [
                    {
                        icon: 'file_copy',
                        title: 'Copy Prompt'
                    },
                    {
                        icon: 'download',
                        title: 'Download'
                    },
                    {
                        icon: 'close',
                        title: 'Close'
                    }
                ];

                const header = document.createElement('div');
                header.classList.add('fullscreen-image-header');
                header.innerHTML = headerOptions.map((option, index) => `<div tabindex="${index}" title="${option.title}" data-action="${option.title.toLowerCase().replaceAll(' ', '-')}"><span class="material-symbols-outlined">${option.icon}</span></div>`).join('');
                fullscreen.appendChild(header);

                header.querySelectorAll('div').forEach(option => {
                    option.addEventListener('click', () => {
                        const action = option.getAttribute('data-action');
                        const actionMap = {
                            'copy-prompt': () => {
                                const promptText = img.alt;
                                if (navigator.clipboard && window.isSecureContext) {
                                    navigator.clipboard.writeText(promptText);
                                    changeIcon();
                                } else {
                                    const textArea = document.createElement('textarea');
                                    textArea.value = promptText;
                                    textArea.style.position = 'fixed';
                                    textArea.style.opacity = '0';
                                    document.body.appendChild(textArea);
                                    textArea.select();
                                    try {
                                        document.execCommand('copy');
                                        changeIcon();
                                    } catch (err) {
                                        console.error('Copy failed:', err);
                                    }
                                    document.body.removeChild(textArea);
                                }

                                function changeIcon() {
                                    const span = option.querySelector('span');

                                    span.innerText = 'check';
                                    setTimeout(() => {
                                        span.innerText = 'file_copy';
                                    }, 1500);
                                }
                            },
                            'download': () => {
                                fetch(`/proxy_image?url=${encodeURIComponent(img.src)}`)
                                    .then(response => response.blob())
                                    .then(blob => {
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${img.alt || 'image'}.jpg`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        window.URL.revokeObjectURL(url);
                                    });
                            },
                            'close': () => {
                                fullscreen.remove();
                            }
                        };

                        if (actionMap[action]) {
                            actionMap[action]();
                        }
                    });
                });

                const preview = document.createElement('div');
                preview.classList.add('fullscreen-image-preview');
                fullscreen.appendChild(preview);

                const cloned = img.cloneNode(true);
                preview.appendChild(cloned);
            });
        });
    }

    async function loadHistory() {
        let conversations = await getAllConversations();
        if (!conversations || conversations.length === 0) return;

        conversations.sort((a, b) => {
            if (a.pinned && b.pinned) {
                return new Date(b.pinnedAt) - new Date(a.pinnedAt);
            } else if (a.pinned) {
                return -1;
            } else if (b.pinned) {
                return 1;
            } else {
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            }
        });

        historyBody.innerHTML = '';

        for (let conversation of conversations) {
            const historyConversation = document.createElement('button');
            historyConversation.classList.add('column-btn', 'history-item');
            historyConversation.role = 'button';
            historyConversation.id = conversation.id;

            historyConversation.innerHTML = `
                <div class="history-name">
                    ${conversation.pinned ? '<span class="pin-icon">📌</span>' : ''}
                    ${conversation.name || 'Conversation'}
                </div>
                <div class="history-dots">
                    <div class="history-dot"></div>
                    <div class="history-dot"></div>
                    <div class="history-dot"></div>
                </div>
            `;
            historyBody.appendChild(historyConversation);

            const historyName = historyConversation.querySelector('.history-name');
            const historyDots = historyConversation.querySelector('.history-dots');

            let isOpen = false;
            const actions = {
                async pin() {
                    conversation.pinned = !conversation.pinned;
                    conversation.pinnedAt = conversation.pinned ? new Date().toISOString() : null;
                    await saveConversation(conversation);
                    await loadHistory();
                },
                async rename() {
                    const newConversationName = prompt('Enter a new name for this conversation');
                    if (newConversationName.trim() === '') {
                        alert('Conversation name cannot be empty');
                        return;
                    }

                    historyName.textContent = newConversationName;

                    conversation.name = newConversationName;
                    try {
                        await saveConversation(conversation);
                        await loadHistory();
                    } catch (error) {
                        console.error('Failed to rename conversation:', error);
                    }
                },
                delete() {
                    popupWindow('Warning', 'Are you sure you want to delete this conversation?', true)
                        .then(async () => {
                            await deleteConversation(conversation.id);
                            historyConversation.remove();
                            location.reload();
                        });
                }
            };

            historyDots.addEventListener('click', e => {
                e.stopPropagation();
                isOpen = !isOpen;
                const dots = historyDots.querySelectorAll('.history-dot');
                const isMobile = window.innerWidth <= 600;

                if (isOpen) {
                    const contextMenu = document.createElement('div');
                    contextMenu.classList.add('context-menu');
                    contextMenu.innerHTML = `
                        <div class="context-menu-item" data-action="pin">${conversation.pinned ? 'Unpin' : 'Pin'}</div>
                        <div class="context-menu-item" data-action="rename">Rename</div>
                        <div class="context-menu-item" data-action="delete">Delete</div>
                    `;

                    if (isMobile) {
                        const overlay = document.createElement('div');
                        overlay.classList.add('context-menu-overlay');
                        document.body.appendChild(overlay);
                        overlay.appendChild(contextMenu);

                        overlay.addEventListener('click', () => {
                            isOpen = false;
                            contextMenu.classList.add('dismiss');
                            dots.forEach(dot => dot.classList.remove('_ctx-open'));
                            setTimeout(() => overlay.remove(), 200);
                        });

                        contextMenu.addEventListener('click', (e) => {
                            e.stopPropagation();
                        });
                    } else {
                        historyConversation.appendChild(contextMenu);
                        contextMenu.style.left = `${e.clientX - contextMenu.offsetWidth - historyDots.offsetWidth * 2}px`;
                        contextMenu.style.top = `${e.clientY}`;
                    }

                    contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const actionName = item.getAttribute('data-action');
                            if (actions[actionName]) {
                                actions[actionName]();
                            } else {
                                console.warn(`Action "${actionName}" is not defined.`);
                            }

                            isOpen = false;
                            if (isMobile) {
                                document.querySelector('.context-menu-overlay').remove();
                            } else {
                                contextMenu.remove();
                            }
                            dots.forEach(dot => dot.classList.remove('_ctx-open'));
                        });
                    });

                    dots.forEach(dot => dot.classList.add('_ctx-open'));
                } else {
                    if (isMobile) {
                        const overlay = document.querySelector('.context-menu-overlay');
                        if (overlay) {
                            overlay.remove();
                        }
                    } else {
                        const contextMenu = historyConversation.querySelector('.context-menu');
                        if (contextMenu) {
                            historyConversation.removeChild(contextMenu);
                        }
                    }
                    dots.forEach(dot => dot.classList.remove('_ctx-open'));
                }
            });

            historyConversation.addEventListener('click', e => {
                if (e.target === historyConversation || e.target === historyName) {
                    currentConversationId = conversation.id;
                    chatInterface.querySelectorAll('.message').forEach(message => message.remove());

                    setTimeout(() => {
                        const firstMessage = document.querySelector('.message');

                        if (firstMessage.querySelector('.message-content p').textContent.trim() === '') {
                            firstMessage.remove();
                        }
                    });

                    for (let message of conversation.messages) {
                        if (message.role === 'system') continue;

                        const newMessage = document.createElement('div');
                        newMessage.classList.add('message', `${message.role}-message`);

                        newMessage.innerHTML = `
                            <div class="message-header">
                                <img src="static/images/${message.role === 'user' ? 'avatar.jpg' : 'ai.png'}" height="24" alt="${message.role}">
                                <span>${message.role === 'user' ? 'You' : 'Start Sphere AI'}</span>
                            </div>
                            <div class="message-content">
                                ${message.role === 'user'
                                ? `<p>${escapeHTML(message.content)}</p>`
                                : `${message.thoughts
                                    ? `<div class="cot">
                                             <button class="expand-cot">Thoughts</button>
                                             <div class="thoughts collapsed">${message.thoughts}</div>
                                           </div>`
                                    : ''
                                }
                                      ${marked.parse(message.content)}
                                     `
                            }
                                ${message.role === 'assistant'
                                ? `<div class="options horizontal-view">
                                         <div class="option copy">
                                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" version="1.1" viewBox="0.00 0.00 512.00 512.00" fill="#ffffff">
                                                 <path d="   M 83.87 348.77   C 77.27 367.06 51.01 367.07 44.11 348.78   Q 42.76 345.20 42.76 338.41   Q 42.74 204.98 42.75 71.56   Q 42.75 58.19 44.28 52.58   C 48.28 37.87 60.70 26.07 75.42 22.56   Q 80.82 21.27 95.31 21.26   Q 202.40 21.24 309.48 21.25   Q 322.92 21.25 327.35 22.81   C 346.40 29.51 345.42 56.21 326.77 62.69   Q 323.01 64.00 316.45 64.00   Q 215.35 64.02 114.25 63.97   Q 103.80 63.97 99.40 65.48   C 86.53 69.90 85.24 80.61 85.25 93.64   Q 85.25 215.60 85.25 337.56   Q 85.25 344.96 83.87 348.77   Z"/>
                                                 <path d="   M 172.50 490.92   C 152.40 490.94 134.24 478.02 129.34 458.39   Q 128.00 453.03 128.00 438.50   Q 128.00 298.50 128.00 158.49   Q 128.00 144.32 129.44 138.62   C 133.15 124.01 145.11 112.02 159.84 108.11   Q 164.93 106.76 174.91 106.76   Q 286.35 106.74 397.79 106.75   Q 410.94 106.75 416.59 108.26   C 430.97 112.11 442.75 124.01 446.54 138.49   Q 447.99 144.01 447.99 157.26   Q 448.01 302.25 447.95 447.25   C 447.94 466.82 434.98 484.62 415.83 489.33   Q 410.13 490.72 395.94 490.73   Q 284.22 490.79 172.50 490.92   Z   M 405.25 170.73   A 21.47 21.47 0.0 0 0 383.78 149.26   L 192.22 149.26   A 21.47 21.47 0.0 0 0 170.75 170.73   L 170.75 426.53   A 21.47 21.47 0.0 0 0 192.22 448.00   L 383.78 448.00   A 21.47 21.47 0.0 0 0 405.25 426.53   L 405.25 170.73   Z"/>
                                             </svg>
                                         </div>
                                         <div class="option read-aloud">
                                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                 <path d="M19 6C20.5 7.5 21 10 21 12C21 14 20.5 16.5 19 18M16 8.99998C16.5 9.49998 17 10.5 17 12C17 13.5 16.5 14.5 16 15M3 10.5V13.5C3 14.6046 3.5 15.5 5.5 16C7.5 16.5 9 21 12 21C14 21 14 3 12 3C9 3 7.5 7.5 5.5 8C3.5 8.5 3 9.39543 3 10.5Z" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                             </svg>
                                         </div>
                                       </div>`
                                : ''
                            }
                            </div>
                        `;
                        messageContainer.appendChild(newMessage);

                        if (message.role === 'assistant' && message.thoughts) {
                            const expandCot = newMessage.querySelector('.expand-cot');
                            const thoughts = newMessage.querySelector('.thoughts');

                            thoughts.classList.remove('collapsed');
                            const actualHeight = thoughts.scrollHeight + 'px';
                            thoughts.classList.add('collapsed');
                            thoughts.style.height = '0';

                            expandCot.addEventListener('click', () => {
                                thoughts.classList.toggle('collapsed');
                                if (thoughts.classList.contains('collapsed')) {
                                    thoughts.style.height = '0';
                                } else {
                                    thoughts.style.height = actualHeight;
                                }
                            });
                        }

                        attachImageClickHandlers(newMessage);

                        const copy = newMessage.querySelector('.copy');
                        const readAloud = newMessage.querySelector('.read-aloud');
                        if (copy && message.role === 'assistant') {
                            let copyIcon = copy.querySelector('svg').outerHTML;
                            let result = message.content;
                            result = result.replace(/<think>[\S\s]*?<\/think>/g, '');

                            copyToClipboard({
                                copy: copy,
                                oldIcon: copyIcon,
                                message: result
                            });
                            readMessage(readAloud, result);
                        }
                    }

                    messages = conversation.messages;
                    hljs.highlightAll();
                    highlightCodeBlocks(messageContainer);

                    const center = document.querySelector('center');
                    if (center) center.remove();
                    messageContainer.scrollTop = messageContainer.scrollHeight;
                }
            });
        }
    }

    loadHistory();

    historyChats.querySelector('.delete-history').addEventListener('click', () => {
        popupWindow('Warning', 'Are you sure you want to delete your chat history?', true)
            .then(async () => {
                try {
                    await clearConversations();
                    historyBody.innerHTML = '';
                    location.reload();
                } catch (error) {
                    console.error('Failed to delete history:', error);
                }
            });
    });

    function escapeHTML(html) {
        let escapedHTML = html.replace(/[&<>"']/g, match => {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                '\'': '&#39;'
            }[match];
        });
        escapedHTML = escapedHTML.replace(/\n/g, '<br>').replace(/<br>(?!.*<br>)/g, '');
        return escapedHTML;
    }

    function popupWindow(title, content, promise = false) {
        const popup = document.createElement('div');
        popup.classList.add('popup');
        popup.innerHTML = `
        <div class="popup-content">
            <div class="popup-header">
                <div class="popup-title">${title}</div>
                <div class="popup-close">
                    <span class="material-symbols-outlined">close</span>
                </div>
            </div>
            <div class="popup-body">
                ${content}
            </div>
        </div>
        `;
        document.body.appendChild(popup);

        popup.querySelector('.popup-close').addEventListener('click', () => {
            popup.remove();
        });

        if (promise) {
            return new Promise((resolve, reject) => {
                popup.querySelector('.popup-close').addEventListener('click', () => close(false));

                const popupBody = popup.querySelector('.popup-body');
                popupBody.classList.add('popup-content-promise');
                popupBody.innerHTML = `
                <div class="popup-content-text">${content}</div>
                <div class="popup-footer">
                    <button role="button" class="popup-btn popup-ok">OK</button>
                    <button role="button" class="popup-btn popup-cancel">Cancel</button>
                </div>
                `;
                const ok = popupBody.querySelector('.popup-ok');
                ok.addEventListener('click', () => choice(true));
                popupBody.querySelector('.popup-cancel').addEventListener('click', () => choice(false));

                ok.focus();

                function choice(decision) {
                    if (decision) {
                        resolve(decision);
                        location.reload();
                    } else {
                        popup.remove();
                        reject(decision);
                    }
                }
            });
        }
    }

    document.querySelector('.prompts').addEventListener('click', async () => {
        const response = await fetch('static/data/prompts.json');
        const prompts = await response.json();

        popupWindow('Prompts', prompts.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(prompt => `<button role="button" class="prompt-btn" data-prompt="${prompt.prompt}" title="${prompt.description}">${prompt.name}</button>`).join(''));

        document.querySelectorAll('.prompt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                sendMessage(btn.getAttribute('data-prompt'));
                btn.closest('.popup').remove();
            });
        });
    });

    function isSpeechRecognitionSupported() {
        return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    }

    if (!isSpeechRecognitionSupported()) {
        alert('Speech recognition is not supported in this browser. Please use a supported browser like Chrome on Android.');
    }

    const mic = document.querySelector('.mic');
    let recognition = null;

    mic.addEventListener('click', () => {
        mic.classList.toggle('_listening');

        if (mic.classList.contains('_listening')) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert('Speech recognition is not supported in this browser.');
                mic.classList.remove('_listening');
                return;
            }

            recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.maxAlternatives = 1;

            recognition.onresult = (event) => {
                const result = event.results[0][0].transcript;
                sendMessage(result);
            };

            recognition.onend = () => {
                mic.classList.remove('_listening');
                recognition = null;
            };

            recognition.onerror = (err) => {
                mic.classList.remove('_listening');
                recognition = null;
                console.error('Speech recognition error:', err.error);
                if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
                    alert('Permission to use microphone was denied.');
                } else {
                    alert('An error occurred with speech recognition: ' + err.error);
                }
            };

            try {
                recognition.start();
            } catch (e) {
                console.error('Failed to start speech recognition:', e);
                mic.classList.remove('_listening');
            }
        } else {
            if (recognition) {
                recognition.stop();
            }
        }
    });

    const container = document.querySelector('.container');
    const expand = document.querySelector('.expand');
    let isExpanded;
    let expandIntervalId;

    if (window.matchMedia('(max-width: 600px)').matches) {
        isExpanded = false;
    } else {
        isExpanded = true;
        expand.style.left = `${historyChats.offsetWidth + 5}px`;
    }

    expand.addEventListener('click', () => {
        isExpanded = !isExpanded;
        expand.style.height = 'var(--default-br-p)';

        if (isExpanded) {
            historyChats.style.transform = 'translateX(0)';
            container.style.gridTemplateColumns = 'auto 1fr';
            expand.style.left = `${historyChats.offsetWidth + 5}px`;
            if (window.matchMedia('(max-width: 600px)').matches) {
                expandIntervalId = setInterval(() => {
                    expand.style.left = `${innerWidth - 20}px`;
                });
            }
        } else {
            historyChats.style.transform = 'translateX(-100%)';
            expand.style.left = '5px';
            clearInterval(expandIntervalId);
            if (!window.matchMedia('(max-width: 600px)').matches) {
                container.style.gridTemplateColumns = '0 1fr';
            }
        }

        setTimeout(() => {
            expand.style.removeProperty('height');
        }, 200);
    });

    const importHistory = document.querySelector('.import-history');
    const exportHistory = document.querySelector('.export-history');

    const encryptionKey = 'r#$zKi(oIt.#Eb|k';

    exportHistory.addEventListener('click', async () => {
        const conversations = await getAllConversations();
        if (conversations.length === 0) {
            popupWindow('Error', '<div class="temp-error-message">No chat history found!</div>');
            return;
        }
        const json = JSON.stringify(conversations, null, 2);
        const blob = new Blob([Encryption.encrypt(encryptionKey, json)], { type: 'application/x-ssch' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `history@${new Date().toISOString()}.ssch`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    importHistory.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ssch';

        input.addEventListener('change', async () => {
            const file = input.files[0];

            if (!file.name.endsWith('.ssch')) {
                popupWindow('Error', '<div class="temp-error-message">Invalid file type!</div>');
                return;
            }

            try {
                const text = Encryption.decrypt(encryptionKey, await file.text());
                const conversations = JSON.parse(text);

                await clearConversations();

                for (const conversation of conversations) {
                    await saveConversation(conversation);
                }

                location.reload();
            } catch (e) {
                console.error('Failed to import conversations:', e);
                popupWindow('Error', '<div class="temp-error-message">Invalid file!</div>');
                return;
            }
        });

        input.click();
        input.remove();
    });

    messageContainer.addEventListener('scroll', () => {
        if (messageContainer.scrollTop + messageContainer.clientHeight >= messageContainer.scrollHeight - 100) {
            toBottom.classList.remove('_shown');
        } else {
            toBottom.classList.add('_shown');
        }
    });

    toBottom.addEventListener('click', () => {
        messageContainer.scrollTo({
            top: messageContainer.scrollHeight,
            behavior: 'smooth'
        });
    });
})();