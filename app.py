from flask import Flask, render_template, request, jsonify
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import re

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
            return favicon_url
        else:
            favicon_url = get_favicon_url_bs4(url)
            if favicon_url:
                return favicon_url

    return 'static/images/Invalid.png'

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

@app.route('/get_bing_background')
def get_bing_background():
    response = requests.get('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US')
    if response.status_code == 200:
        data = response.json()
        if 'images' in data and len(data['images']) > 0:
            image_url = 'https://www.bing.com' + data['images'][0]['url']
            return jsonify({'image_url': image_url})
    return jsonify({'image_url': ''})

def process_style_attribute(tag, base_url):
    style = tag.get('style')

    if style:
        url_pattern = re.compile(r'url\((.*?)\)')
        def replacer(match):
            url = match.group(1)

            if not url.startswith(('http://', 'https://', '//')):
                return 'url({})'.format(urljoin(base_url, url))
            return match.group(0)

        new_style = url_pattern.sub(replacer, style)
        tag['style'] = new_style

@app.route('/visitor')
def get_page_content():
    url = request.args.get('url')

    if not url:
        return 'URL parameter is missing', 400

    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        base_url = response.url
        
        tags_to_process = ['a', 'img', 'video', 'audio', 'iframe', 'frame', 'link', 'script', 'source']

        for tag_name in tags_to_process:
            for tag in soup.find_all(tag_name, href=True):
                tag['href'] = urljoin(base_url, tag['href'])
            for tag in soup.find_all(tag_name, src=True):
                tag['src'] = urljoin(base_url, tag['src'])

        for tag in soup.find_all(style=True):
            process_style_attribute(tag, base_url)

        page = str(soup.find('html'))
        
        return page
    except requests.exceptions.RequestException as e:
        return f'An error occurred: {str(e)}', 500
    
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
    "content-length": "328",
    "sec-ch-ua": '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"',
    "sec-ch-ua-platform": "Windows",
    "dnt": "1",
    "sec-ch-ua-mobile": "?0",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
    "content-type": "application/json",
    "accept": "*/*",
    "origin": "https://www.blackbox.ai",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    "referer": "https://www.blackbox.ai/",
    "accept-encoding": "gzip",
    "accept-language": "en-US,en;q=0.9",
    "cookie": "sessionId=036d1b06-57f1-48f6-94cd-e4dcbe7b16d9; intercom-id-jlmqxicb=521c61bf-622b-414c-b306-91448a958fd3; intercom-session-jlmqxicb=; intercom-device-id-jlmqxicb=41d3bcdb-6984-454d-ac53-0b4ffec17d0d",
    "priority": "u=1, i"
}

def use_blackbox_api(text):
    return {
        "messages": [{"id": "2wlAo5V", "content": text, "role": "user"}],
        "id": "2wlAo5V",
        "previewToken": None,
        "userId": "618dc8aa-5c9d-4282-9e8d-5520da5f7ea0",
        "codeModelMode": True,
        "agentMode": {},
        "trendingAgentMode": {},
        "isMicMode": False,
        "isChromeExt": False,
        "githubToken": None,
        "clickedAnswer2": False,
        "clickedAnswer3": False,
        "visitFromURL": None
    }

@app.route('/predict_title', methods=['POST'])
def predict_title():
    data = use_blackbox_api(f"Predict this website's name: {request.json.get('url')} (You are not allowed to respond with more than the website's name)")
    response = requests.post(blackbox_url, json=data, headers=headers)
    if response.status_code == 200:
        data = response.text
        return data
    else:
        return 'An error occured while trying to predict the title', 500
    
@app.route('/summarize_page', methods=['POST'])
def summarize_page():
    data = use_blackbox_api(f"Summarize the following page in 1 very short paragraph, I'm lazy to read lots of stuff:\n\n{request.json.get('content')}")

    response = requests.post(blackbox_url, json=data, headers=headers)
    if response.status_code == 200:
        data = response.text
        return data
    else:
        return 'An error occured while trying to summarize the page', 500

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

@app.route('/message_ai', methods=['POST'])
def message_ai():
    data = {
        "messages": request.json.get('messages'),
        "id": "SigaVZ3",
        "previewToken": None,
        "userId": None,
        "codeModelMode": True,
        "agentMode": {},
        "trendingAgentMode": {},
        "isMicMode": False,
        "userSystemPrompt": None,
        "maxTokens": 1024,
        "playgroundTopP": 0.9,
        "playgroundTemperature": 0.5,
        "isChromeExt": False,
        "githubToken": "",
        "clickedAnswer2": False,
        "clickedAnswer3": False,
        "clickedForceWebSearch": False,
        "visitFromDelta": False,
        "mobileClient": False,
        "userSelectedModel": "gpt-4o",
        "validated": "00f37b34-a166-4efb-bce5-1312d87f2f94"
    }

    response = requests.post(blackbox_url, json=data, headers=headers)
    return response.text

if __name__ == '__main__':
    app.run(debug=True)
