window.addEventListener('DOMContentLoaded', () => {
    fetch('/get_bing_background')
        .then(response => response.json())
        .then(data => {
            if (data.image_url) {
                document.body.style.backgroundImage = `url('${data.image_url}')`;
            }
        });

    const defaultTheme = localStorage.getItem('theme') || 'system';
    setTheme(defaultTheme);
});

const settingsBtn = document.getElementById('btn-settings');
const input = document.getElementById("search");
const searchBtn = document.getElementById("btn-search");
const suggestionZone = document.querySelector('.suggestion-zone');
const add = document.querySelector('.item.add');
const fav = document.getElementById('fav');
let favorites = JSON.parse(localStorage.getItem('fav')) || [];

searchBtn.addEventListener('click', () => {
    if (input.value == '') {
        return;
    }

    location.href = getSearchEngineURL(localStorage.getItem('searchEngine')) + input.value;
});

input.addEventListener('keyup', e => {
    const suggestions = Array.from(suggestionZone.querySelectorAll('.search-suggestion'));

    if (suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
            if (currentIndex < suggestions.length - 1) {
                currentIndex++;
                highlightSuggestion(suggestions, currentIndex);
            }
        } else if (e.key === 'ArrowUp') {
            if (currentIndex > 0) {
                currentIndex--;
                highlightSuggestion(suggestions, currentIndex);
            }
        } else if (e.key === 'Enter') {
            if (currentIndex >= 0 && currentIndex < suggestions.length) {
                input.value = suggestions[currentIndex].textContent;
                suggestionZone.style.display = 'none';
                e.preventDefault();
                searchBtn.click();
            }
        }
    }
});

function highlightSuggestion(suggestions, index) {
    suggestions.forEach((suggestion, i) => {
        suggestion.style.backgroundColor = i === index ? 'var(--default-hover)' : 'transparent';
    });
}

let currentIndex = -1;

input.addEventListener('input', () => {
    if (input.value.trim() === '') suggestionZone.style.removeProperty('display');

    fetch('/suggestions?q=' + encodeURIComponent(input.value))
        .then(response => response.json())
        .then(data => {
            const suggestions = data.map(suggestion => suggestion.phrase);
            suggestionZone.style.display = suggestions.length > 0 ? 'block' : 'none';
            suggestionZone.innerHTML = suggestions.map(suggestion => `<a href="${getSearchEngineURL(localStorage.getItem('searchEngine')) + suggestion}"><div class="search-suggestion">${suggestion}</div></a>`).join('');
            currentIndex = -1;
        });
});

input.addEventListener('focusin', () => {
    suggestionZone.style.display = input.value.trim() === '' ? 'none' : 'block';
});

input.addEventListener('focusout', () => {
    suggestionZone.style.display = 'none';
});

add.addEventListener('click', () => {
    const newFav = document.createElement('div');
    newFav.classList.add('fav-menu');
    newFav.innerHTML = `
        <input type="text" value="https://" placeholder="URL" id="url" spellcheck="false">
        <br>
        <input type="text" placeholder="Title" id="title">
        <br>
        <button class="btn-add">Add</button>
        <button class="btn-cancel">Cancel</button>
    `;
    document.body.appendChild(newFav);

    newFav.style.pointerEvents = 'all';
    document.body.style.pointerEvents = 'none';

    setTimeout(() => {
        newFav.style.boxShadow = `0 0 0 ${screen.width * 2}px rgba(0, 0, 0, .5)`;
    });

    function close() {
        newFav.style.boxShadow = 'none';
        newFav.style.animation = 'close 200ms forwards';

        setTimeout(() => {
            newFav.remove();
            document.body.style.removeProperty('pointer-events');
        }, 200);
    }

    newFav.querySelector('.btn-cancel').addEventListener('click', close);

    const url = newFav.querySelector('#url');
    const title = newFav.querySelector('#title');

    url.focus();
    url.selectionStart = url.value.length;

    let currentFocus = -1;

    title.addEventListener('input', () => {
        if (title.value == '') {
            const suggestions = newFav.querySelector('.title-suggestions');
            if (suggestions) {
                newFav.removeChild(suggestions);
            }
            return;
        }

        let lowerCaseTitle = title.value.toLowerCase();

        fetch(`https://www.bingapis.com/api/v7/suggestions?appid=B1513F135D0D1D1FC36E8C31C30A31BB25E804D0&setmkt=en-US&q=${lowerCaseTitle}`)
            .then(res => res.json())
            .then(data => {
                let allSuggestions = data.suggestionGroups[0].searchSuggestions;

                if (allSuggestions.length == 0) {
                    const suggestions = newFav.querySelector('.title-suggestions');
                    if (suggestions) {
                        newFav.removeChild(suggestions);
                        currentFocus = -1;
                    }
                    return;
                }

                let suggestions = newFav.querySelector('.title-suggestions');
                if (!suggestions) {
                    suggestions = document.createElement('div');
                    suggestions.classList.add('title-suggestions');
                    suggestions.style.top = `${title.offsetTop + title.offsetHeight + 4}px`;
                    newFav.appendChild(suggestions);
                } else {
                    suggestions.innerHTML = '';
                }

                for (let i in allSuggestions) {
                    const suggestion = document.createElement('div');
                    suggestion.textContent = allSuggestions[i].displayText.replace(/(^.|(?<=\s+).)/g, match => match.toUpperCase());
                    suggestion.classList.add('title-suggestion');
                    suggestion.role = 'button';
                    suggestion.tabIndex = 0;

                    suggestion.addEventListener('click', () => {
                        title.value = suggestion.textContent;
                        if (newFav.contains(suggestions)) {
                            newFav.removeChild(suggestions);
                        }
                    });

                    suggestions.appendChild(suggestion);
                }

                document.addEventListener('click', e => {
                    suggestions.querySelectorAll('.title-suggestion').forEach(suggestion => {
                        if (e.target != suggestion && newFav.contains(suggestions)) {
                            newFav.removeChild(suggestions);
                            currentFocus = -1;
                        }
                    });
                });
            })
            .catch(error => {
                popup(`An error occured: ${error.toString().split(':')[1].split('\n')[0]}`);
                console.log(error);
            });

        if (lowerCaseTitle == '/request') {
            fetch('/get_title?url=' + encodeURIComponent(url.value))
                .then(res => res.text())
                .then(data => {
                    if (data.startsWith('An error occurred')) {
                        popup(`${data.split(':')[0]}: Host(${data.match(/(?<=host=')(.*?)(?=')/g)}), Port(${data.match(/(?<=port=)\d+/g)})`);
                        return;
                    }

                    title.value = data;
                })
                .catch(() => {
                    popup('An error occured');
                    title.value = '';
                });
        } else if (lowerCaseTitle == '/expect') {
            const urlValue = url.value.split(/https?:\/\//g)[1].split(/\./g);
            const lastWordBeforeDot = urlValue[urlValue.length - 2];
            const firstChar = lastWordBeforeDot.charAt(0).toUpperCase() + lastWordBeforeDot.slice(1);
            title.value = firstChar.indexOf('-') != -1 ? firstChar.replace('-', '') : firstChar;
        } else if (lowerCaseTitle == '/predict') {
            title.value = 'Predicting...';
            predictTitle(url.value).then(data => {
                title.value = data.result;
            });
        }
    });

    title.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();

            const suggestions = document.querySelector('.title-suggestions');
            if (!suggestions) return;

            let items = suggestions.querySelectorAll('.title-suggestion');

            if (e.key == 'ArrowUp') {
                currentFocus--;
                if (currentFocus < 0) currentFocus = items.length - 1;
            } else if (e.key == 'ArrowDown') {
                currentFocus++;
                if (currentFocus >= items.length) currentFocus = 0;
            }

            items.forEach(item => item.classList.remove('focused'));

            if (currentFocus >= 0 && currentFocus < items.length) {
                items[currentFocus].classList.add('focused');
                items[currentFocus].scrollIntoView({ block: 'nearest' });
            }
        }
    });

    title.addEventListener('keyup', e => {
        if (e.key === 'Enter') {
            e.preventDefault();

            const focused = document.querySelector('.title-suggestion.focused');
            if (focused) {
                title.value = focused.textContent;
                document.querySelector('.title-suggestions').remove();
            }
        }
    });

    function addFav() {
        if (!/^https?:\/\/.+/i.test(url.value)) {
            popup('Please enter a valid URL');
            return;
        }

        favorites.push({
            url: url.value,
            title: title.value
        });
        localStorage.setItem('fav', JSON.stringify(favorites));

        if (title.value.trim().length == 0) {
            title.value = url.value;
            favorites[favorites.length - 1].title = url.value;
            localStorage.setItem('fav', JSON.stringify(favorites));
        }

        const newFavItem = document.createElement('div');
        newFavItem.classList.add('item');
        newFavItem.title = title.value;
        newFavItem.draggable = true;
        newFavItem.dataset.index = favorites.length - 1;
        newFavItem.innerHTML = `
            <a href="${url.value}">
                <img src="" alt="">
                <center><div>${title.value}</div></center>
            </a>
            <button class="btn-options" title="More options">...</button>
            <div class="options">
                <button class="btn-visit" title="Visit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" version="1.1" viewBox="0.00 0.00 512.00 512.00" class="svg-icon">
                        <path d="   M 198.22 73.11   Q 124.50 97.31 87.13 165.30   Q 84.25 170.54 81.86 172.43   C 68.11 183.30 49.55 167.89 58.09 151.83   C 122.74 30.22 280.61 -5.46 390.96 77.80   Q 427.91 105.69 451.19 146.56   C 453.67 150.91 456.30 155.10 456.26 159.93   C 456.14 173.50 440.38 181.12 430.15 172.16   Q 427.60 169.93 423.98 163.51   Q 386.75 97.45 313.85 73.14   A 0.44 0.43 -5.2 0 0 313.33 73.76   Q 335.25 113.26 343.14 158.07   C 343.74 161.50 342.86 165.55 340.91 168.59   C 333.04 180.89 314.57 177.27 311.46 163.15   C 305.85 137.66 298.74 112.44 285.93 89.82   C 280.15 79.62 266.84 62.05 253.59 64.18   C 245.25 65.53 236.68 74.27 231.99 81.01   C 216.31 103.55 207.79 131.15 202.43 157.73   Q 200.75 166.04 198.94 168.90   C 191.55 180.53 173.21 177.83 169.58 164.15   Q 168.61 160.51 169.99 153.38   Q 178.11 111.30 198.89 73.92   Q 199.59 72.66 198.22 73.11   Z"/>
                        <path d="   M 95.33 262.80   Q 88.40 277.84 80.81 292.77   Q 77.97 298.35 75.22 300.57   C 68.37 306.10 56.68 304.75 51.67 297.24   Q 50.00 294.74 47.85 286.79   Q 40.56 259.91 33.32 233.02   Q 31.17 225.02 31.70 221.30   C 33.72 207.36 52.91 202.41 61.16 213.96   Q 63.24 216.87 64.99 224.12   Q 67.06 232.64 69.01 241.39   A 0.37 0.37 0.0 0 0 69.71 241.47   Q 75.43 229.24 81.40 216.91   Q 84.32 210.89 90.40 208.91   C 99.91 205.80 107.58 211.25 111.05 220.21   Q 113.09 225.49 120.65 241.46   Q 120.99 242.17 121.23 241.42   Q 124.35 231.56 127.29 221.85   Q 129.11 215.82 131.26 213.22   C 140.76 201.71 159.38 207.75 160.31 222.49   Q 160.56 226.47 158.34 233.78   Q 150.05 260.98 141.82 288.19   Q 139.68 295.25 137.33 298.07   C 131.89 304.60 120.56 305.45 114.20 299.37   Q 111.90 297.18 109.26 291.46   Q 102.65 277.17 96.16 262.80   A 0.46 0.45 -44.8 0 0 95.33 262.80   Z"/>
                        <path d="   M 255.33 262.80   Q 248.46 277.73 240.92 292.54   Q 237.88 298.51 235.06 300.77   C 228.76 305.81 218.62 304.67 213.61 298.39   Q 211.39 295.61 209.61 289.07   Q 201.07 257.82 192.72 226.51   Q 191.11 220.47 195.44 214.20   C 201.81 205.00 215.78 205.42 221.79 214.85   Q 223.39 217.37 224.85 223.46   Q 226.96 232.31 229.02 241.40   A 0.37 0.37 0.0 0 0 229.71 241.47   Q 235.43 229.24 241.40 216.91   Q 244.32 210.89 250.40 208.91   C 259.91 205.80 267.58 211.25 271.05 220.21   Q 273.09 225.49 280.65 241.46   Q 280.99 242.17 281.23 241.42   Q 284.35 231.56 287.29 221.86   Q 289.12 215.81 291.26 213.21   C 300.75 201.71 319.38 207.76 320.31 222.48   Q 320.56 226.46 318.34 233.78   Q 310.05 260.98 301.82 288.19   Q 299.68 295.25 297.33 298.07   C 291.89 304.60 280.56 305.45 274.20 299.37   Q 271.90 297.18 269.26 291.46   Q 262.65 277.17 256.16 262.80   A 0.46 0.45 -44.8 0 0 255.33 262.80   Z"/>
                        <path d="   M 415.33 262.80   Q 408.46 277.73 400.92 292.54   Q 397.88 298.51 395.06 300.77   C 388.76 305.81 378.62 304.67 373.61 298.39   Q 371.39 295.61 369.61 289.07   Q 361.07 257.82 352.72 226.51   Q 351.13 220.58 355.34 214.34   C 361.63 205.01 375.76 205.36 381.80 214.87   Q 383.39 217.37 384.84 223.44   Q 386.96 232.30 389.03 241.40   A 0.37 0.37 0.0 0 0 389.72 241.47   Q 394.57 231.01 399.72 220.45   Q 401.65 216.49 403.81 213.77   C 409.64 206.42 421.11 206.39 427.19 212.61   Q 430.01 215.50 434.02 224.73   Q 437.59 232.96 441.27 241.07   A 0.34 0.34 0.0 0 0 441.91 241.02   Q 444.90 230.56 448.28 220.11   C 455.53 197.70 485.87 207.80 479.77 228.38   Q 470.91 258.28 461.84 288.11   Q 459.64 295.31 457.26 298.15   C 451.83 304.61 440.53 305.41 434.20 299.37   Q 431.90 297.18 429.26 291.46   Q 422.65 277.17 416.16 262.80   A 0.46 0.45 -44.8 0 0 415.33 262.80   Z"/>
                        <path d="   M 197.95 438.99   A 0.45 0.45 0.0 0 0 198.25 438.33   Q 177.74 401.32 169.60 359.96   Q 168.14 352.56 168.59 349.34   C 170.02 339.12 181.43 332.85 190.97 337.10   Q 199.21 340.77 201.21 351.06   Q 207.34 382.64 219.76 410.20   C 225.13 422.11 233.87 436.55 245.37 444.22   C 270.56 461.03 291.73 412.75 297.59 396.39   Q 305.47 374.39 310.05 351.47   C 311.72 343.16 315.67 337.16 324.29 335.82   C 332.48 334.56 341.26 340.58 342.59 349.03   Q 343.09 352.25 341.81 358.89   Q 333.67 401.08 312.88 438.43   A 0.52 0.52 0.0 0 0 313.50 439.18   Q 387.48 414.32 424.63 347.10   Q 427.55 341.81 429.99 339.76   C 441.23 330.29 458.49 340.10 455.80 354.66   Q 455.15 358.15 451.67 364.34   C 386.70 480.00 238.46 514.49 129.12 440.06   C 98.79 419.42 73.45 390.64 57.04 358.47   C 52.21 349.00 59.76 337.20 69.82 336.05   C 77.71 335.15 83.01 339.47 86.74 346.30   Q 123.72 413.96 197.35 439.00   Q 197.50 439.05 197.66 439.03   Q 197.87 439.01 197.95 438.99   Z"/>
                    </svg>
                    Visit
                </button>
                <button class="btn-edit" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" version="1.1" viewBox="0.00 0.00 512.00 512.00" class="svg-icon">
                        <path d="   M 512.00 84.83   L 512.00 88.31   Q 510.77 102.18 501.01 112.01   Q 475.57 137.62 450.06 163.05   A 0.45 0.45 0.0 0 1 449.42 163.05   L 346.04 59.66   A 0.73 0.72 44.7 0 1 346.03 58.64   Q 362.88 41.62 379.90 24.79   Q 392.57 12.25 394.29 10.92   C 409.09 -0.60 430.59 -1.91 446.35 7.89   Q 451.31 10.98 461.37 21.01   Q 481.74 41.33 502.05 61.70   Q 511.05 70.73 512.00 84.83   Z"/>
                        <rect x="-73.63" y="-186.41" transform="translate(238.63,270.13) rotate(45.0)" width="147.26" height="372.82" rx="0.43"/>
                        <path d="   M 0.00 500.14   L 0.00 497.69   L 26.46 378.71   A 0.30 0.30 0.0 0 1 26.96 378.56   L 130.19 481.82   A 0.39 0.39 0.0 0 1 130.01 482.47   Q 74.73 495.87 19.47 509.24   Q 12.20 511.00 8.90 510.26   Q 1.98 508.69 0.00 500.14   Z"/>
                    </svg>
                    Edit
                </button>
                <button class="btn-remove" title="Remove">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" version="1.1" viewBox="0.00 0.00 512.00 512.00" class="svg-icon">
                        <path d="   M 197.31 0.00   L 314.80 0.00   Q 319.66 1.16 319.70 5.56   Q 319.80 15.14 319.68 25.69   A 0.79 0.78 0.4 0 0 320.47 26.48   Q 374.08 26.51 428.08 26.50   C 441.68 26.50 446.70 33.42 446.74 46.33   Q 446.80 69.55 446.73 92.77   Q 446.73 93.25 446.24 93.25   L 65.76 93.25   Q 65.27 93.25 65.27 92.76   Q 65.22 70.21 65.24 47.76   Q 65.25 39.44 66.75 35.94   C 69.76 28.96 75.78 26.51 83.39 26.51   Q 137.34 26.49 191.57 26.50   A 0.69 0.69 0.0 0 0 192.26 25.81   Q 192.22 16.34 192.26 6.50   Q 192.29 1.06 197.31 0.00   Z"/>
                        <path d="   M 376.94 512.00   L 134.91 512.00   Q 111.01 508.90 109.84 484.18   Q 101.35 304.77 92.85 125.43   Q 92.82 124.75 93.49 124.75   L 418.75 124.75   A 0.41 0.41 0.0 0 1 419.16 125.18   Q 410.71 303.90 402.26 482.75   C 401.50 498.89 394.38 510.37 376.94 512.00   Z   M 201.50 215.10   A 10.84 10.84 0.0 0 0 190.66 204.26   L 174.84 204.26   A 10.84 10.84 0.0 0 0 164.00 215.10   L 164.00 421.60   A 10.84 10.84 0.0 0 0 174.84 432.44   L 190.66 432.44   A 10.84 10.84 0.0 0 0 201.50 421.60   L 201.50 215.10   Z   M 274.75 215.08   A 10.82 10.82 0.0 0 0 263.93 204.26   L 248.07 204.26   A 10.82 10.82 0.0 0 0 237.25 215.08   L 237.25 421.62   A 10.82 10.82 0.0 0 0 248.07 432.44   L 263.93 432.44   A 10.82 10.82 0.0 0 0 274.75 421.62   L 274.75 215.08   Z   M 348.00 215.14   A 10.88 10.88 0.0 0 0 337.12 204.26   L 321.38 204.26   A 10.88 10.88 0.0 0 0 310.50 215.14   L 310.50 421.58   A 10.88 10.88 0.0 0 0 321.38 432.46   L 337.12 432.46   A 10.88 10.88 0.0 0 0 348.00 421.58   L 348.00 215.14   Z"/>
                    </svg>
                    Remove
                </button>
            </div>
        `;
        fav.insertBefore(newFavItem, add);

        fetch('/get_favicon?url=' + encodeURIComponent(url.value))
            .then(response => response.text())
            .then(faviconUrl => {
                newFavItem.querySelector('img').src = faviconUrl;
            });

        newFavItem.addEventListener('dragstart', handleDragStart);
        newFavItem.addEventListener('dragover', handleDragOver);
        newFavItem.addEventListener('drop', handleDrop);

        close();
        popup(`Added '${title.value}' to favorites`);

        if (fav.scrollWidth != 588) {
            fav.style.justifyContent = 'left';
        }

        fav.scrollLeft = fav.scrollWidth;
    }

    newFav.querySelector('.btn-add').addEventListener('click', addFav);

    newFav.querySelectorAll('input').forEach(textInput => {
        textInput.addEventListener('keyup', e => {
            if (e.key == 'Enter') addFav();
        });
    });
});

favorites.forEach((item, index) => {
    const newFavItem = document.createElement('div');
    newFavItem.classList.add('item');
    newFavItem.title = item.title;
    newFavItem.draggable = true;
    newFavItem.dataset.index = index;
    newFavItem.innerHTML = `
        <a href="${item.url}">
            <img src="" alt="">
            <center>
                <div>${item.title}</div>
            </center>
        </a>
        <button class="btn-options" title="More options">...</button>
        <div class="options">
            <button class="btn-visit" title="Visit">
                <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" version="1.1" viewBox="0.00 0.00 512.00 512.00" class="svg-icon">
                    <path d="   M 198.22 73.11   Q 124.50 97.31 87.13 165.30   Q 84.25 170.54 81.86 172.43   C 68.11 183.30 49.55 167.89 58.09 151.83   C 122.74 30.22 280.61 -5.46 390.96 77.80   Q 427.91 105.69 451.19 146.56   C 453.67 150.91 456.30 155.10 456.26 159.93   C 456.14 173.50 440.38 181.12 430.15 172.16   Q 427.60 169.93 423.98 163.51   Q 386.75 97.45 313.85 73.14   A 0.44 0.43 -5.2 0 0 313.33 73.76   Q 335.25 113.26 343.14 158.07   C 343.74 161.50 342.86 165.55 340.91 168.59   C 333.04 180.89 314.57 177.27 311.46 163.15   C 305.85 137.66 298.74 112.44 285.93 89.82   C 280.15 79.62 266.84 62.05 253.59 64.18   C 245.25 65.53 236.68 74.27 231.99 81.01   C 216.31 103.55 207.79 131.15 202.43 157.73   Q 200.75 166.04 198.94 168.90   C 191.55 180.53 173.21 177.83 169.58 164.15   Q 168.61 160.51 169.99 153.38   Q 178.11 111.30 198.89 73.92   Q 199.59 72.66 198.22 73.11   Z"/>
                    <path d="   M 95.33 262.80   Q 88.40 277.84 80.81 292.77   Q 77.97 298.35 75.22 300.57   C 68.37 306.10 56.68 304.75 51.67 297.24   Q 50.00 294.74 47.85 286.79   Q 40.56 259.91 33.32 233.02   Q 31.17 225.02 31.70 221.30   C 33.72 207.36 52.91 202.41 61.16 213.96   Q 63.24 216.87 64.99 224.12   Q 67.06 232.64 69.01 241.39   A 0.37 0.37 0.0 0 0 69.71 241.47   Q 75.43 229.24 81.40 216.91   Q 84.32 210.89 90.40 208.91   C 99.91 205.80 107.58 211.25 111.05 220.21   Q 113.09 225.49 120.65 241.46   Q 120.99 242.17 121.23 241.42   Q 124.35 231.56 127.29 221.85   Q 129.11 215.82 131.26 213.22   C 140.76 201.71 159.38 207.75 160.31 222.49   Q 160.56 226.47 158.34 233.78   Q 150.05 260.98 141.82 288.19   Q 139.68 295.25 137.33 298.07   C 131.89 304.60 120.56 305.45 114.20 299.37   Q 111.90 297.18 109.26 291.46   Q 102.65 277.17 96.16 262.80   A 0.46 0.45 -44.8 0 0 95.33 262.80   Z"/>
                    <path d="   M 255.33 262.80   Q 248.46 277.73 240.92 292.54   Q 237.88 298.51 235.06 300.77   C 228.76 305.81 218.62 304.67 213.61 298.39   Q 211.39 295.61 209.61 289.07   Q 201.07 257.82 192.72 226.51   Q 191.11 220.47 195.44 214.20   C 201.81 205.00 215.78 205.42 221.79 214.85   Q 223.39 217.37 224.85 223.46   Q 226.96 232.31 229.02 241.40   A 0.37 0.37 0.0 0 0 229.71 241.47   Q 235.43 229.24 241.40 216.91   Q 244.32 210.89 250.40 208.91   C 259.91 205.80 267.58 211.25 271.05 220.21   Q 273.09 225.49 280.65 241.46   Q 280.99 242.17 281.23 241.42   Q 284.35 231.56 287.29 221.86   Q 289.12 215.81 291.26 213.21   C 300.75 201.71 319.38 207.76 320.31 222.48   Q 320.56 226.46 318.34 233.78   Q 310.05 260.98 301.82 288.19   Q 299.68 295.25 297.33 298.07   C 291.89 304.60 280.56 305.45 274.20 299.37   Q 271.90 297.18 269.26 291.46   Q 262.65 277.17 256.16 262.80   A 0.46 0.45 -44.8 0 0 255.33 262.80   Z"/>
                    <path d="   M 415.33 262.80   Q 408.46 277.73 400.92 292.54   Q 397.88 298.51 395.06 300.77   C 388.76 305.81 378.62 304.67 373.61 298.39   Q 371.39 295.61 369.61 289.07   Q 361.07 257.82 352.72 226.51   Q 351.13 220.58 355.34 214.34   C 361.63 205.01 375.76 205.36 381.80 214.87   Q 383.39 217.37 384.84 223.44   Q 386.96 232.30 389.03 241.40   A 0.37 0.37 0.0 0 0 389.72 241.47   Q 394.57 231.01 399.72 220.45   Q 401.65 216.49 403.81 213.77   C 409.64 206.42 421.11 206.39 427.19 212.61   Q 430.01 215.50 434.02 224.73   Q 437.59 232.96 441.27 241.07   A 0.34 0.34 0.0 0 0 441.91 241.02   Q 444.90 230.56 448.28 220.11   C 455.53 197.70 485.87 207.80 479.77 228.38   Q 470.91 258.28 461.84 288.11   Q 459.64 295.31 457.26 298.15   C 451.83 304.61 440.53 305.41 434.20 299.37   Q 431.90 297.18 429.26 291.46   Q 422.65 277.17 416.16 262.80   A 0.46 0.45 -44.8 0 0 415.33 262.80   Z"/>
                    <path d="   M 197.95 438.99   A 0.45 0.45 0.0 0 0 198.25 438.33   Q 177.74 401.32 169.60 359.96   Q 168.14 352.56 168.59 349.34   C 170.02 339.12 181.43 332.85 190.97 337.10   Q 199.21 340.77 201.21 351.06   Q 207.34 382.64 219.76 410.20   C 225.13 422.11 233.87 436.55 245.37 444.22   C 270.56 461.03 291.73 412.75 297.59 396.39   Q 305.47 374.39 310.05 351.47   C 311.72 343.16 315.67 337.16 324.29 335.82   C 332.48 334.56 341.26 340.58 342.59 349.03   Q 343.09 352.25 341.81 358.89   Q 333.67 401.08 312.88 438.43   A 0.52 0.52 0.0 0 0 313.50 439.18   Q 387.48 414.32 424.63 347.10   Q 427.55 341.81 429.99 339.76   C 441.23 330.29 458.49 340.10 455.80 354.66   Q 455.15 358.15 451.67 364.34   C 386.70 480.00 238.46 514.49 129.12 440.06   C 98.79 419.42 73.45 390.64 57.04 358.47   C 52.21 349.00 59.76 337.20 69.82 336.05   C 77.71 335.15 83.01 339.47 86.74 346.30   Q 123.72 413.96 197.35 439.00   Q 197.50 439.05 197.66 439.03   Q 197.87 439.01 197.95 438.99   Z"/>
                </svg>
                Visit
            </button>
            <button class="btn-edit" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" version="1.1" viewBox="0.00 0.00 512.00 512.00" class="svg-icon">
                    <path d="   M 512.00 84.83   L 512.00 88.31   Q 510.77 102.18 501.01 112.01   Q 475.57 137.62 450.06 163.05   A 0.45 0.45 0.0 0 1 449.42 163.05   L 346.04 59.66   A 0.73 0.72 44.7 0 1 346.03 58.64   Q 362.88 41.62 379.90 24.79   Q 392.57 12.25 394.29 10.92   C 409.09 -0.60 430.59 -1.91 446.35 7.89   Q 451.31 10.98 461.37 21.01   Q 481.74 41.33 502.05 61.70   Q 511.05 70.73 512.00 84.83   Z"/>
                    <rect x="-73.63" y="-186.41" transform="translate(238.63,270.13) rotate(45.0)" width="147.26" height="372.82" rx="0.43"/>
                    <path d="   M 0.00 500.14   L 0.00 497.69   L 26.46 378.71   A 0.30 0.30 0.0 0 1 26.96 378.56   L 130.19 481.82   A 0.39 0.39 0.0 0 1 130.01 482.47   Q 74.73 495.87 19.47 509.24   Q 12.20 511.00 8.90 510.26   Q 1.98 508.69 0.00 500.14   Z"/>
                </svg>
                Edit
            </button>
            <button class="btn-remove" title="Remove">
                <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" version="1.1" viewBox="0.00 0.00 512.00 512.00" class="svg-icon">
                    <path d="   M 197.31 0.00   L 314.80 0.00   Q 319.66 1.16 319.70 5.56   Q 319.80 15.14 319.68 25.69   A 0.79 0.78 0.4 0 0 320.47 26.48   Q 374.08 26.51 428.08 26.50   C 441.68 26.50 446.70 33.42 446.74 46.33   Q 446.80 69.55 446.73 92.77   Q 446.73 93.25 446.24 93.25   L 65.76 93.25   Q 65.27 93.25 65.27 92.76   Q 65.22 70.21 65.24 47.76   Q 65.25 39.44 66.75 35.94   C 69.76 28.96 75.78 26.51 83.39 26.51   Q 137.34 26.49 191.57 26.50   A 0.69 0.69 0.0 0 0 192.26 25.81   Q 192.22 16.34 192.26 6.50   Q 192.29 1.06 197.31 0.00   Z"/>
                    <path d="   M 376.94 512.00   L 134.91 512.00   Q 111.01 508.90 109.84 484.18   Q 101.35 304.77 92.85 125.43   Q 92.82 124.75 93.49 124.75   L 418.75 124.75   A 0.41 0.41 0.0 0 1 419.16 125.18   Q 410.71 303.90 402.26 482.75   C 401.50 498.89 394.38 510.37 376.94 512.00   Z   M 201.50 215.10   A 10.84 10.84 0.0 0 0 190.66 204.26   L 174.84 204.26   A 10.84 10.84 0.0 0 0 164.00 215.10   L 164.00 421.60   A 10.84 10.84 0.0 0 0 174.84 432.44   L 190.66 432.44   A 10.84 10.84 0.0 0 0 201.50 421.60   L 201.50 215.10   Z   M 274.75 215.08   A 10.82 10.82 0.0 0 0 263.93 204.26   L 248.07 204.26   A 10.82 10.82 0.0 0 0 237.25 215.08   L 237.25 421.62   A 10.82 10.82 0.0 0 0 248.07 432.44   L 263.93 432.44   A 10.82 10.82 0.0 0 0 274.75 421.62   L 274.75 215.08   Z   M 348.00 215.14   A 10.88 10.88 0.0 0 0 337.12 204.26   L 321.38 204.26   A 10.88 10.88 0.0 0 0 310.50 215.14   L 310.50 421.58   A 10.88 10.88 0.0 0 0 321.38 432.46   L 337.12 432.46   A 10.88 10.88 0.0 0 0 348.00 421.58   L 348.00 215.14   Z"/>
                </svg>
                Remove
            </button>
        </div>
    `;
    fav.insertBefore(newFavItem, add);

    fetch('/get_favicon?url=' + encodeURIComponent(item.url))
        .then(response => response.text())
        .then(faviconUrl => {
            newFavItem.querySelector('img').src = faviconUrl;
        });

    newFavItem.addEventListener('dragstart', handleDragStart);
    newFavItem.addEventListener('dragover', handleDragOver);
    newFavItem.addEventListener('drop', handleDrop);

    if (fav.scrollWidth != 588) {
        fav.style.justifyContent = 'left';
    }
});

let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const oldIndex = parseInt(draggedItem.dataset.index);
    const newIndex = parseInt(this.dataset.index);

    fav.insertBefore(draggedItem, newIndex > oldIndex ? this.nextSibling : this);

    const item = favorites.splice(oldIndex, 1)[0];
    favorites.splice(newIndex, 0, item);
    localStorage.setItem('fav', JSON.stringify(favorites));

    Array.from(fav.children).forEach((child, index) => {
        child.dataset.index = index;
    });
}

document.addEventListener('click', e => {
    const moreButton = e.target.closest('.btn-options');
    if (moreButton) {
        const itemContent = moreButton.parentNode;
        const optionsMenu = itemContent.querySelector('.options');
        optionsMenu.classList.toggle('show');
    }
});

document.addEventListener('click', e => {
    const visitButton = e.target.closest('.btn-visit');
    if (visitButton) {
        const item = visitButton.closest('.item');
        const url = item.querySelector('a').getAttribute('href');

        const visitWindow = document.createElement('div');
        visitWindow.classList.add('visit-window');
        let isDragging = false;
        let offsetX, offsetY;

        fetch(`/visitor?url=${encodeURIComponent(url)}`)
            .then(res => res.text())
            .then(data => {
                let newWinSVG = `
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                `;

                visitWindow.innerHTML = `
                <div class="window-header">
                    <img src="${item.querySelector('img').src}" draggable="false" class="window-icon">
                    <div class="window-title">${item.title}</div>
                    <div class="window-action_buttons">
                        <div class="window-new_tab" title="Open in a new tab (Alt+N)">
                            ${newWinSVG}
                        </div>
                        <div class="window-close" title="Close (Alt+Q)">🗙︎</div>
                    </div>
                </div>
                <div class="window-content">
                    ${data}
                </div>
                `;

                const windowContent = visitWindow.querySelector('.window-content');
                const scripts = visitWindow.getElementsByTagName('script');
                let loadedScripts = [];

                for (let i = 0; i < scripts.length; i++) {
                    let script = document.createElement('script');
                    script.defer = true;
                    if (scripts[i].src) {
                        script.src = scripts[i].src;
                    } else {
                        script.text = scripts[i].innerText;
                    }
                    document.head.appendChild(script);
                    loadedScripts.push(script);
                }

                const header = visitWindow.querySelector('.window-header');

                header.addEventListener('mousedown', e => {
                    if (e.target == visitWindow.querySelector('.window-header')) {
                        isDragging = true;
                        const rect = visitWindow.getBoundingClientRect();
                        offsetX = e.clientX - rect.left;
                        offsetY = e.clientY - rect.top;
                    }
                });

                document.addEventListener('mousemove', e => {
                    if (isDragging) {
                        const newX = e.clientX - offsetX;
                        const newY = e.clientY - offsetY;

                        const maxXPos = window.innerWidth - visitWindow.offsetWidth;
                        const maxYPos = window.innerHeight - visitWindow.offsetHeight;

                        const constrainedX = Math.min(Math.max(newX, 0), maxXPos);
                        const constrainedY = Math.min(Math.max(newY, 0), maxYPos);

                        visitWindow.style.left = constrainedX + 'px';
                        visitWindow.style.top = constrainedY + 'px';
                    }
                });

                document.addEventListener('mouseup', () => {
                    isDragging = false;
                });

                const icon = visitWindow.querySelector('.window-icon');
                let isContextMenu = false;

                icon.addEventListener('click', () => {
                    isContextMenu = !isContextMenu;

                    if (isContextMenu) {
                        const menu = document.createElement('div');
                        menu.innerHTML = `
                        <div class="window-option" data-action="newWindow">
                            ${newWinSVG}
                            New window
                        </div>
                        <div class="window-option" data-action="copyURL">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" version="1.1" viewBox="0.00 0.00 512.00 512.00" class="svg-icon">
                                <path d="   M 83.87 348.77   C 77.27 367.06 51.01 367.07 44.11 348.78   Q 42.76 345.20 42.76 338.41   Q 42.74 204.98 42.75 71.56   Q 42.75 58.19 44.28 52.58   C 48.28 37.87 60.70 26.07 75.42 22.56   Q 80.82 21.27 95.31 21.26   Q 202.40 21.24 309.48 21.25   Q 322.92 21.25 327.35 22.81   C 346.40 29.51 345.42 56.21 326.77 62.69   Q 323.01 64.00 316.45 64.00   Q 215.35 64.02 114.25 63.97   Q 103.80 63.97 99.40 65.48   C 86.53 69.90 85.24 80.61 85.25 93.64   Q 85.25 215.60 85.25 337.56   Q 85.25 344.96 83.87 348.77   Z"/>
                                <path d="   M 172.50 490.92   C 152.40 490.94 134.24 478.02 129.34 458.39   Q 128.00 453.03 128.00 438.50   Q 128.00 298.50 128.00 158.49   Q 128.00 144.32 129.44 138.62   C 133.15 124.01 145.11 112.02 159.84 108.11   Q 164.93 106.76 174.91 106.76   Q 286.35 106.74 397.79 106.75   Q 410.94 106.75 416.59 108.26   C 430.97 112.11 442.75 124.01 446.54 138.49   Q 447.99 144.01 447.99 157.26   Q 448.01 302.25 447.95 447.25   C 447.94 466.82 434.98 484.62 415.83 489.33   Q 410.13 490.72 395.94 490.73   Q 284.22 490.79 172.50 490.92   Z   M 405.25 170.73   A 21.47 21.47 0.0 0 0 383.78 149.26   L 192.22 149.26   A 21.47 21.47 0.0 0 0 170.75 170.73   L 170.75 426.53   A 21.47 21.47 0.0 0 0 192.22 448.00   L 383.78 448.00   A 21.47 21.47 0.0 0 0 405.25 426.53   L 405.25 170.73   Z"/>
                            </svg>
                            Copy URL
                        </div>
                        <div class="window-option" data-action="summarize">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1rem" height="1rem" version="1.1" class="svg-icon">
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                            </svg>
                            Summarize
                        </div>
                        <div class="window-option" data-action="closeWindow">🗙︎ Close</div>
                        `;
                        menu.classList.add('window-context_menu');
                        menu.style.left = `${icon.offsetLeft}px`;
                        menu.style.top = `${icon.offsetTop + (icon.offsetHeight + 6)}px`;
                        header.appendChild(menu);

                        menu.lastElementChild.addEventListener('click', close);
                        menu.querySelectorAll('.window-option').forEach(option => {
                            option.addEventListener('click', () => {
                                switch (option.getAttribute('data-action')) {
                                    case 'newWindow':
                                        window.open(url);
                                        break;
                                    case 'copyURL':
                                        navigator.clipboard.writeText(url);
                                        popup(`The URL has been copied to your clipboard`);
                                        break;
                                    case 'summarize':
                                        summarizePage(windowContent.textContent).then(summary => {
                                            let dimentions = {
                                                width: 400,
                                                height: 500
                                            }
                                            let size = {
                                                left: screen.width / 2 - dimentions.width / 2,
                                                top: screen.height / 2 - dimentions.height / 2
                                            }
                                            const newWindow = window.open('', 'newWindow', `left=${size.left},top=${size.top},width=${dimentions.width},height=${dimentions.height}`);
                                            newWindow.document.write(`
                                            <!DOCTYPE html>
                                            <html lang="en">
                                            <head>
                                                <meta charset="UTF-8">
                                                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                                <title>Summary</title>
                                                <style>
                                                    html {
                                                        color-scheme: dark;
                                                    }

                                                    body {
                                                        font-family: system-ui;
                                                        background-color: #222;
                                                        color: #fff;
                                                        margin: 0;
                                                    }

                                                    .toolbar {
                                                        background-color: #333;
                                                        width: 100%;
                                                        display: flex;
                                                        flex-wrap: wrap;
                                                    }

                                                    .tool {
                                                        padding: 4px;
                                                        cursor: default;
                                                        transition: background 200ms;
                                                    }

                                                    .tool:hover {
                                                        background-color: #444;
                                                    }

                                                    .tool.active {
                                                        background-color: #8c53df;
                                                    }

                                                    .summary {
                                                        padding: 8px;
                                                    }
                                                </style>
                                            </head>
                                            <body>
                                                <div class="toolbar">
                                                    <div class="tool" id="copy">Copy</div>
                                                    <div class="tool" id="read-aloud">Read Aloud</div>
                                                </div>
                                                <div class="summary">${summary}</div>
                                                <script>
                                                    const copy = document.querySelector('#copy');
                                                    const readAloud = document.querySelector('#read-aloud');
                                                    const text = document.querySelector('.summary');

                                                    copy.addEventListener('click', () => {
                                                        navigator.clipboard.writeText(text.textContent);
                                                        message('Summary has been copied to clipboard');
                                                    });

                                                    readAloud.addEventListener('click', () => {
                                                        readAloud.classList.toggle('active');
                                                        const msg = new SpeechSynthesisUtterance(text.textContent);
                                                        msg.lang = 'en-US';

                                                        if (readAloud.classList.contains('active')) {
                                                            speechSynthesis.speak(msg);
                                                        } else {
                                                            speechSynthesis.cancel();
                                                        }

                                                        msg.onend = () => {
                                                            readAloud.classList.remove('active');
                                                        };
                                                    });

                                                    function message(msg) {
                                                        const toolbar = document.querySelector('.toolbar');

                                                        const message = document.createElement('div');
                                                        message.textContent = msg;
                                                        message.classList.add('tool');
                                                        message.id = 'Message';
                                                        message.style.width = '100%';
                                                        message.style.textAlign = 'center';
                                                        toolbar.appendChild(message);

                                                        setTimeout(() => {
                                                            message.remove();
                                                        }, 3000);
                                                    }
                                                </script>
                                            </body>
                                            `);
                                        });
                                        popup('Summarizing is in progress, this may take a while');
                                        break;
                                    case 'closeWindow':
                                        close();
                                        break;
                                }

                                isContextMenu = false;
                                menu.remove();
                            });
                        });
                    } else {
                        header.querySelector('.window-context_menu').remove();
                    }
                });

                visitWindow.querySelector('.window-close').addEventListener('click', close);
                visitWindow.querySelector('.window-new_tab').addEventListener('click', () => window.open(url));

                document.addEventListener('keyup', e => {
                    if (e.altKey && e.key == 'n') {
                        window.open(url);
                    }
                    if (e.altKey && e.key == 'q') {
                        close();
                    }
                });

                function close() {
                    visitWindow.style.opacity = 0;
                    visitWindow.style.transform = 'scale(.8)';
                    setTimeout(() => visitWindow.remove(), 200);

                    for (let script of loadedScripts) {
                        document.head.removeChild(script);
                    }
                }
            });
        document.body.appendChild(visitWindow);

        setTimeout(() => {
            visitWindow.style.transform = 'scale(1)';
            visitWindow.style.opacity = 1;
        });
    }
});

document.addEventListener('click', e => {
    const removeButton = e.target.closest('.btn-remove');
    if (removeButton) {
        const item = removeButton.closest('.item');
        const title = item.title;
        const url = item.querySelector('a').getAttribute('href');

        favorites = favorites.filter(favorite => favorite.url != url);
        localStorage.setItem('fav', JSON.stringify(favorites));

        item.remove();
        popup(`Removed '${title}' from favorites`);

        if (fav.scrollWidth <= 588) {
            fav.style.removeProperty('justify-content');
        }
    }
});

document.addEventListener('click', async e => {
    const editButton = e.target.closest('.btn-edit');
    if (editButton) {
        const item = editButton.closest('.item');
        const title = item.title;
        const url = item.querySelector('a').getAttribute('href');

        const newTitle = await userInput('Enter a new title:', title);
        if (newTitle != null) {
            item.title = newTitle;
            item.querySelector('div').textContent = newTitle;

            const index = favorites.findIndex(favorite => favorite.url == url);
            if (index != -1) {
                favorites[index].title = newTitle;
                localStorage.setItem('fav', JSON.stringify(favorites));
            }
        }
    }
});

settingsBtn.addEventListener('click', () => {
    const settings = document.createElement('div');
    settings.classList.add('settings');
    settings.innerHTML = `
        <div class="section">Search Engine</div>
        <select id="search-engine" class="sets">
            <option value="bing">Bing (Default)</option>
            <option value="google">Google</option>
            <option value="yahoo">Yahoo</option>
            <option value="duckduckgo">DuckDuckGo</option>
            <option value="ask">Ask</option>
            <option value="aol">AOL</option>
            <option value="ecosia">Ecosia</option>
            <option value="startpage">Startpage</option>
        </select>
        <div class="section">Theme</div>
        <select id="theme" class="sets">
            <option value="system">System</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
        </select>
        <div class="set-btns">
            <button class="btn-cancel" title="Cancel all changes made during this session.">Cancel</button>
            <button class="btn-reset" title="Resetting Process Overview:\n\n1. Restore default settings.\n2. Clear favorited websites.\n3. Remove saved cookies.">Reset</button>
            <button class="btn-save" title="Save all changes made during this session.">Save</button>
        </div>
    `;
    document.body.appendChild(settings);

    setTimeout(() => {
        settings.style.boxShadow = `0 0 0 ${screen.width * 2}px rgba(0, 0, 0, .5)`;
    });

    document.body.style.pointerEvents = 'none';
    settings.style.pointerEvents = 'all';

    const searchEngine = settings.querySelector('#search-engine');
    searchEngine.value = localStorage.getItem('searchEngine') || 'bing';

    const theme = settings.querySelector('#theme');
    theme.value = localStorage.getItem('theme') || 'system';

    settings.querySelector('.btn-reset').addEventListener('click', () => {
        localStorage.clear();
        close();

        var cookies = document.cookie.split(";");

        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i];
            var eqPos = cookie.indexOf("=");
            var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }

        popup('Settings Reset Successfully');

        setTimeout(() => location.reload(), 200);
    });

    function close() {
        settings.style.boxShadow = 'none';
        settings.style.animation = 'close 200ms forwards';

        setTimeout(() => {
            settings.remove();
            document.body.style.removeProperty('pointer-events');
        }, 200);
    }

    settings.querySelector('.btn-cancel').addEventListener('click', close);

    settings.querySelector('.btn-save').addEventListener('click', () => {
        const newSearchEngine = searchEngine.value;
        updateSearchEngineURL(getSearchEngineURL(newSearchEngine));
        localStorage.setItem('searchEngine', newSearchEngine);

        const newTheme = theme.value;
        localStorage.setItem('theme', newTheme);

        close();
        setTheme();
        popup('Settings Saved');
    });
});

function detectTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    } else {
        return 'light';
    }
}

function setTheme() {
    const theme = localStorage.getItem('theme');
    const osTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    if (theme == 'system') {
        document.documentElement.setAttribute('data-theme', osTheme);
        updateCSSVariables(osTheme);
    } else if (theme == 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        updateCSSVariables('light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateCSSVariables('dark');
    }
}

function updateCSSVariables(theme) {
    const root = document.documentElement;

    if (theme == 'dark') {
        root.style.setProperty('--default-color', '#333');
        root.style.setProperty('--default-hover', '#3e3e3e');
        root.style.setProperty('--default-panel', '#222');
        root.style.setProperty('--default-dark', '#1e1e1e');
        root.style.setProperty('--unique-white', '#eee');
        root.style.setProperty('--text-color', '#fff');
    } else if (theme == 'light') {
        root.style.setProperty('--default-color', '#eee');
        root.style.setProperty('--default-hover', '#ddd');
        root.style.setProperty('--default-panel', '#fff');
        root.style.setProperty('--default-dark', '#dedede');
        root.style.setProperty('--unique-white', '#333');
        root.style.setProperty('--text-color', '#000');
    }
}

if (localStorage.getItem('theme')) {
    setTheme();
} else {
    localStorage.setItem('theme', detectTheme());
    setTheme();
}

function getSearchEngineURL(engine) {
    switch (engine) {
        case 'google':
            return 'https://www.google.com/search?q=';
        case 'yahoo':
            return 'https://search.yahoo.com/search?p=';
        case 'duckduckgo':
            return 'https://duckduckgo.com/?q=';
        case 'ask':
            return 'https://www.ask.com/web?q=';
        case 'aol':
            return 'https://search.aol.com/aol/search?q=';
        case 'ecosia':
            return 'https://www.ecosia.org/search?q=';
        case 'startpage':
            return 'https://www.startpage.com/do/dsearch?query=';
        case 'bing':
        default:
            return 'https://www.bing.com/search?q=';
    }
}

function updateSearchEngineURL(url) {
    const searchBtn = document.getElementById('btn-search');
    searchBtn.setAttribute('href', url);
}

let alertInProgress = false;

function popup(msg) {
    if (alertInProgress) {
        setTimeout(() => popup(msg), 100);
        return;
    }

    alertInProgress = true;
    const alertMsg = document.createElement('div');
    alertMsg.classList.add('alert-msg');
    alertMsg.textContent = msg;
    document.body.insertBefore(alertMsg, document.getElementById('search-zone'));

    setTimeout(() => {
        alertMsg.style.opacity = 1;
        alertMsg.style.transform = 'translateX(-50%) scale(1)';
    });

    setTimeout(() => {
        alertMsg.style.opacity = 0;
        alertMsg.style.transform = 'translateX(-50%) scale(.8)';

        setTimeout(() => {
            alertMsg.remove();
            alertInProgress = false;
        }, 200);
    }, 2000);
}

function userInput(msg, value) {
    return new Promise((resolve, reject) => {
        const inputMsg = document.createElement('div')
        inputMsg.classList.add('settings');
        inputMsg.innerHTML = `
        <div class="section">${msg}</div>
        <input value="${value == undefined ? '' : value}" placeholder="">
        <div class="set-button">
            <button class="btn-cancel">Cancel</button>
            <button class="btn-add">OK</button>
        </div>
        `;
        document.body.appendChild(inputMsg);

        const inputField = inputMsg.querySelector('input');
        inputField.focus();
        inputField.select();

        setTimeout(() => {
            inputMsg.style.boxShadow = `0 0 0 ${screen.width * 2}px rgba(0, 0, 0, .5)`;
        });

        document.body.style.pointerEvents = 'none';
        inputMsg.style.pointerEvents = 'all';

        const cancel = inputMsg.querySelector('.btn-cancel');
        const ok = inputMsg.querySelector('.btn-add');

        cancel.addEventListener('click', () => {
            close();
            reject(null);
        });

        ok.addEventListener('click', () => {
            close();
            resolve(inputField.value);
        });

        document.addEventListener('keyup', e => {
            if (e.key == 'Enter') ok.click();
            if (e.key == 'Escape') cancel.click();
        });

        function close() {
            inputMsg.style.boxShadow = 'none';
            inputMsg.style.animation = 'close 200ms forwards';

            setTimeout(() => {
                inputMsg.remove();
                document.body.style.removeProperty('pointer-events');
            }, 200);
        }
    });
}

async function predictTitle(url) {
    try {
        const response = await fetch('/predict_title', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'url': url
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.text();

        const version = +data.split('$@$v=v')[1].split('$@$')[0];
        const sources = JSON.parse(data.match(/Sources:(.+)\)/)[0].replace('Sources:', '').trim().replace(/\[(.*?)\]\((.*?)\)\s\((.*?)\)/g, (match, source, link, num) => `{ "source": "${source}", "link": "${link}", "num": ${num} }`).replace(/\}(?=(.*\}.*))/g, '},').replace(/(^.)/, '[$1').replace(/(.$)/, '$1]'));
        const result = data.match(/\)[^)]*$/)[0].replace(')', '').trim();

        let final = {
            version: version,
            sources: sources,
            result: result
        }

        return final;
    } catch (error) {
        popup(`An error occured: ${error.message}`);
    }
}

async function summarizePage(content) {
    try {
        const response = await fetch('/summarize_page', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'content': content
            })
        });
        const data = await response.text();
        return data.match(/\$@\$v=(.*?)\$@\$(.*)$/)?.[2] || 'An error occured. Please try again later.';
    } catch (error) {
        popup(`An error occured: ${error.message}`);
    }
}