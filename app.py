from flask import Flask, render_template, request, Response
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_favicon')
def get_favicon():
    url = request.args.get('url', '')
    if url:
        favicon_url = get_favicon_url_requests(url)
        if favicon_url:
            return f'/proxy_image?url={favicon_url}'
        else:
            favicon_url = get_favicon_url_bs4(url)
            if favicon_url:
                return f'/proxy_image?url={favicon_url}'

    return '/static/images/Invalid.png'

def get_favicon_url_bs4(url):
    response = requests.get(url)
    if response.status_code == 200:
        soup = BeautifulSoup(response.content, 'html.parser')
        favicon_link = soup.find('link', rel=['shortcut icon'])
        if favicon_link and 'href' in favicon_link.attrs:
            favicon_url = urljoin(url, favicon_link['href'])
            return favicon_url
    return ''

def get_favicon_url_requests(url):
    favicon_url = urljoin(url, 'favicon.ico')
    response = requests.get(favicon_url)
    if response.status_code == 200:
        return favicon_url
    return ''
    
@app.route('/get_title')
def get_title():
    url = request.args.get('url')
    
    if not url:
        return 'URL parameter is missing', 400
    
    try:
        response = requests.get(url, timeout=5)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        title_tag = soup.find('title')
        
        if title_tag:
            return title_tag.text
        else:
            return 'Title not found'
    except requests.exceptions.RequestException as e:
        return f'An error occurred: {str(e)}', 500

blackbox_url = 'https://www.blackbox.ai/api/chat'
headers = {
    "Host": "www.blackbox.ai",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip",
    "Referer": "https://www.blackbox.ai/chat/DWQtabN",
    "Content-Type": "application/json",
    "Content-Length": "1969",
    "Origin": "https://www.blackbox.ai",
    "DNT": "1",
    "Sec-GPC": "1",
    "Connection": "keep-alive",
    "Cookie": "sessionId=7163db7e-dfb1-415d-83cd-ccdfce59a5ab; __Host-authjs.csrf-token=591cc9545045712e414b088b207e48cdd64deaccb3fe5c72534bc487ccb9510e%7Cfd03891a9abea6549197b22edaf681a4b9905126f651bb40e8cd4c8afe6c682f; __Secure-authjs.callback-url=https%3A%2F%2Fwww.blackbox.ai%2F; g_state={\"i_p\":1740866641484,\"i_l\":2}; intercom-id-x55eda6t=682dc694-a1e2-404a-8b45-29db36ce8423; intercom-session-x55eda6t=; intercom-device-id-x55eda6t=6eb35a6f-731c-4a08-a2a9-94a1def125f5; render_app_version_affinity=dep-cv12asjqf0us73d0f96g",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Priority": "u=0",
    "TE": "trailers"
}

@app.route('/suggestions')
def suggestions():
    q = request.args.get('q')

    if q == None:
        return 'Query parameter is missing', 400
    
    try:
        response = requests.get(f'https://duckduckgo.com/ac/?q={q}&kl=wt-wt')
        return response.json()
    except requests.exceptions.RequestException as e:
        return f'An error occurred: {str(e)}', 500

@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

@app.route('/generate_image', methods=['POST'])
def generate_image():
    data = {
        "messages": [
            {
                "id": "AY3DYDPs6-WBRIt3fBX8z",
                "content": request.json.get('prompt'),
                "role": "user"
            }
        ],
        "id": "AY3DYDPs6-WBRIt3fBX8z",
        "previewToken": None,
        "userId": None,
        "codeModelMode": True,
        "agentMode": {
            "mode": True,
            "id": "ImageGenerationLV45LJp",
            "name": "Image Generation"
        },
        "trendingAgentMode": {},
        "isMicMode": False,
        "maxTokens": 1024,
        "playgroundTopP": None,
        "playgroundTemperature": None,
        "isChromeExt": False,
        "githubToken": "",
        "clickedAnswer2": False,
        "clickedAnswer3": False,
        "clickedForceWebSearch": False,
        "visitFromDelta": False,
        "mobileClient": False,
        "userSelectedModel": None,
        "validated": "00f37b34-a166-4efb-bce5-1312d87f2f94"
    }

    response = requests.post(blackbox_url, json=data, headers=headers)
    return response.text

@app.route('/proxy_image', methods=['GET'])
def proxy_image():
    image_url = request.args.get('url')
    if not image_url:
        return 'URL parameter is missing', 400
        
    try:
        response = requests.get(image_url, stream=True, timeout=5)
        if response.status_code == 200:
            return Response(
                response.iter_content(chunk_size=8192),
                content_type=response.headers.get('Content-Type', 'image/x-icon')
            )
        else:
            return f'Failed to fetch favicon: {response.status_code}', response.status_code
    except requests.exceptions.RequestException as e:
        return f'An error occurred: {str(e)}', 500

@app.route('/message_ai', methods=['POST'])
def message_ai():
    try:
        request_data = request.get_json()

        data = {
            "messages": request_data.get('messages'),
            "agentMode": {"mode": True, "id": "deepseek-reasoner", "name": "DeepSeek-R1"},
            "id": "DWQtabN",
            "previewToken": None,
            "userId": None,
            "codeModelMode": True,
            "trendingAgentMode": {},
            "isMicMode": False,
            "userSystemPrompt": None,
            "maxTokens": 1024,
            "playgroundTopP": None,
            "playgroundTemperature": None,
            "isChromeExt": False,
            "githubToken": "",
            "clickedAnswer2": False,
            "clickedAnswer3": False,
            "clickedForceWebSearch": False,
            "visitFromDelta": False,
            "isMemoryEnabled": False,
            "mobileClient": False,
            "userSelectedModel": "DeepSeek-R1",
            "validated": "00f37b34-a166-4efb-bce5-1312d87f2f94",
            "imageGenerationMode": False,
            "webSearchModePrompt": False,
            "deepSearchMode": False,
            "domains": None,
            "vscodeClient": False,
            "codeInterpreterMode": False,
            "customProfile": {
                "name": "",
                "occupation": "",
                "traits": [],
                "additionalInfo": "",
                "enableNewChats": False
            },
            "session": None,
            "isPremium": True,
            "subscriptionCache": None,
            "beastMode": True
        }

        response = requests.post(blackbox_url, headers=headers, json=data)
        return response.text
    except:
        return 'An error occured while processing your response', 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')