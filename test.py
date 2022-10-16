import requests
import json

url = 'https://api.scryfall.com/cards/collection'
data = {
  "identifiers": [
    {
      "name": "Ancient Tomb"
    },
    {
      "name": "Liliana of the veil"
    }
  ]
}
r = requests.post(url, json=data)
filename = 'collections.json'

# url = 'https://api.scryfall.com/cards/oracle/23467047-6dba-4498-b783-1ebc4f74b8c2'
# r = requests.get(url)
# filename = 'cards_oracle.json'






print(r.status_code)
txt = json.dumps(json.loads(r.text), indent=4)
print(txt)
with open(filename, 'w+', encoding='utf-8') as f:
    f.write(txt)
