import requests
from bs4 import BeautifulSoup

def get_page_content(boss_name):
    url = f"https://maplen.gg/boss/{boss_name}"
    try:
        response = requests.get(url)
        response.raise_for_status()  # 如果請求不成功，則引發 HTTPError
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None

def parse_items(html_content, boss_name):
    if not html_content:
        return []

    soup = BeautifulSoup(html_content, 'html.parser')
    items = []
    # 尋找所有符合條件的 <a> 標籤
    # 根據提供的 HTML 範例，我們尋找 class 包含 "flex", "h-10", "w-10", "items-center", "justify-center", "rounded", "border", "bg-gray-200", "dark:bg-gray-800" 的 <a> 標籤
    # 並且有 title 屬性
    item_elements = soup.find_all('a', class_=lambda x: x and 'flex' in x and 'h-10' in x and 'w-10' in x and 'items-center' in x and 'justify-center' in x and 'rounded' in x and 'border' in x and 'bg-gray-200' in x and 'dark:bg-gray-800' in x, title=True)

    for item_element in item_elements:
        item_name = item_element.get('title')
        img_tag = item_element.find('img')
        item_image_url = img_tag.get('src') if img_tag else None
        
        if item_name and item_image_url:
            items.append({'boss_name': boss_name, 'item_name': item_name, 'image_url': item_image_url})
    return items

import csv

def save_to_csv(data, filename="boss_items.csv", mode='w'):
    if not data:
        print("No data to save.")
        return

    keys = data[0].keys()
    with open(filename, mode, newline='', encoding='utf-8') as output_file:
        dict_writer = csv.DictWriter(output_file, fieldnames=keys)
        if mode == 'w':  # 只有在寫入模式下才寫入標頭
            dict_writer.writeheader()
        dict_writer.writerows(data)
    print(f"Data saved to {filename} in {mode} mode.")

if __name__ == "__main__":
    boss_list = [
        "zakum-chaos",
        "hilla-hard",
        "pierre-chaos",
        "vonbon-chaos",
        "crimsonqueen-chaos",
        "vellum-chaos",
        "magnus-hard",
        "pinkbean-chaos",
        "cygnus-easy",
        "cygnus-normal",
        "papulatus-chaos",
        "lotus-normal",
        "damien-normal"
    ]
    
    neso_items = [
        {'item_name': 'neso (big)', 'image_url': 'https://msu.io/marketplace/images/neso.png'},
        {'item_name': 'neso (small)', 'image_url': 'https://msu.io/marketplace/images/neso.png'}
    ]

    all_boss_items = []
    for boss_name in boss_list:
        print(f"Fetching data for {boss_name}...")
        html_content = get_page_content(boss_name)
        if html_content:
            items = parse_items(html_content, boss_name)
            
            # 添加 Neso 道具
            for neso_item in neso_items:
                items.append({'boss_name': boss_name, 'item_name': neso_item['item_name'], 'image_url': neso_item['image_url']})
            
            all_boss_items.extend(items)
    
    if all_boss_items:
        save_to_csv(all_boss_items, mode='w') # 第一次寫入時使用 'w' 模式
    else:
        print("No data collected for any boss.")