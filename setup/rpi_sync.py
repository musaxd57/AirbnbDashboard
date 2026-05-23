#!/usr/bin/env python3
"""
Airbnb PMS — Raspberry Pi Inventory Monitor
============================================
Kurulum:
  pip install requests

Çalıştırma:
  python3 rpi_sync.py

Arka planda başlatmak için (cron):
  crontab -e
  */5 * * * * /usr/bin/python3 /home/pi/airbnb/rpi_sync.py --once >> /home/pi/pms.log 2>&1

Sürekli döngü için:
  python3 rpi_sync.py --loop
"""

import sys
import time
import logging
import argparse
import json
from datetime import datetime

try:
    import requests
except ImportError:
    print("requests kütüphanesi eksik. Kur: pip install requests")
    sys.exit(1)

# ── Ayarlar ──────────────────────────────────────────────────────
GAS_URL   = "BURAYA_GAS_URL_YAZ"   # Dashboard Ayarlar'dan kopyala
LOG_FILE  = "/home/pi/pms_inventory.log"
INTERVAL  = 300  # saniye (5 dakika)
MIN_WARN  = True  # kritik/az stok için terminal uyarısı göster

# ── Terminal renkleri ─────────────────────────────────────────────
R = '\033[91m'   # kırmızı
Y = '\033[93m'   # sarı
G = '\033[92m'   # yeşil
B = '\033[94m'   # mavi
D = '\033[2m'    # dim
BO= '\033[1m'    # bold
X = '\033[0m'    # reset

def c(color, text):
    return color + str(text) + X

def setup_logging():
    logging.basicConfig(
        filename=LOG_FILE,
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

def fetch_pms_data():
    if GAS_URL == "BURAYA_GAS_URL_YAZ":
        print(c(R, "\nHATA: GAS_URL ayarlanmamış!"))
        print(c(Y, "  rpi_sync.py dosyasını aç ve GAS_URL değişkenini güncelle."))
        print(c(D, "  URL'yi dashboard'dan: Ayarlar → GAS URL alanından kopyala.\n"))
        sys.exit(1)
    resp = requests.get(GAS_URL + '?api=1', timeout=20)
    resp.raise_for_status()
    return resp.json()

def update_stock_via_gas(item_name, new_val):
    """Dashboard üzerinden (GAS) stok güncelle."""
    import urllib.parse
    url = GAS_URL + '?action=update&item=' + urllib.parse.quote(item_name) + '&val=' + str(new_val)
    resp = requests.get(url, timeout=15)
    data = resp.json()
    return data.get('ok', False)

def normalize_inventory(raw_inv):
    """GAS'tan gelen veriyi normalize et (dict veya list)."""
    if isinstance(raw_inv, list):
        return raw_inv
    # Legacy dict format: {name: count}
    result = []
    for k, v in raw_inv.items():
        cat = 'Genel'
        if any(w in k for w in ['Çarşaf','Havlu','Nevresim']): cat = 'Çamaşır'
        elif any(w in k for w in ['Sabun','Şampuan','Tuvalet']): cat = 'Amenities'
        elif any(w in k for w in ['Deterjan','Yumuşatıcı','Çöp','WC']): cat = 'Temizlik'
        result.append({'name': k, 'cat': cat, 'cur': int(v) if v else 0, 'min': 3, 'unit': 'adet', 'apt': 'Genel'})
    return result

def print_inventory_report(items):
    now = datetime.now().strftime('%H:%M:%S')
    print(c(BO, f"\n{'─'*50}"))
    print(c(BO, f" Airbnb PMS — Envanter Raporu  [{now}]"))
    print(c(BO, f"{'─'*50}"))

    if not items:
        print(c(Y, "  Envanter verisi yok. GAS'ta setupEnvanter() çalıştır."))
        return [], []

    crit_items, low_items = [], []

    # Kategoriye göre grupla
    cats = {}
    for item in items:
        cat = item.get('cat', 'Genel')
        cats.setdefault(cat, []).append(item)

    for cat, cat_items in sorted(cats.items()):
        print(c(B, f"\n  {cat}:"))
        for item in cat_items:
            name    = item.get('name', '?')
            cur     = int(item.get('cur', 0))
            min_    = int(item.get('min', 0))
            unit    = item.get('unit', 'adet')
            apt     = item.get('apt', 'Genel')
            apt_str = f" ({apt})" if apt and apt != 'Genel' else ""

            pct = int(cur / min_ * 100) if min_ > 0 else 100
            bar_len = 12
            filled  = int(bar_len * min(pct, 100) / 100)
            bar     = '█' * filled + '░' * (bar_len - filled)

            if cur <= 0:
                status = c(R, "❌ STOK YOK")
                num    = c(R, f"{cur:>4}")
                crit_items.append(item)
            elif cur < min_:
                status = c(Y, "⚠  AZ — YENİLE")
                num    = c(Y, f"{cur:>4}")
                low_items.append(item)
            else:
                status = c(G, "✓  YETERLİ")
                num    = c(G, f"{cur:>4}")

            bar_col = R if cur <= 0 else Y if cur < min_ else G
            print(f"    {name:<28} {num} {unit:<6} {c(bar_col, bar)} {status}{apt_str}")

    print(c(BO, f"\n{'─'*50}"))
    print(f"  Özet: {c(R, str(len(crit_items))+' kritik')}  |  {c(Y, str(len(low_items))+' az stok')}  |  {c(G, str(len(items)-len(crit_items)-len(low_items))+' yeterli')}")
    print()

    return crit_items, low_items

def log_alerts(crit, low):
    if crit:
        for item in crit:
            msg = f"KRİTİK_STOK: {item['name']} = 0 {item.get('unit','adet')}"
            logging.warning(msg)
    if low:
        for item in low:
            msg = f"DÜŞÜK_STOK: {item['name']} = {item['cur']} {item.get('unit','adet')} (min: {item['min']})"
            logging.warning(msg)

def interactive_update(items):
    """Terminalden stok güncelleme (isteğe bağlı)."""
    print(c(BO, "\n  Stok güncelle? (ad/n ile çık)"))
    while True:
        inp = input(c(B, "  Malzeme adı (veya Enter ile çık): ")).strip()
        if not inp:
            break
        matches = [i for i in items if inp.lower() in i.get('name','').lower()]
        if not matches:
            print(c(R, "  Bulunamadı."))
            continue
        if len(matches) > 1:
            print(c(Y, "  Eşleşenler: " + ", ".join(m['name'] for m in matches)))
            continue
        item = matches[0]
        try:
            val = int(input(c(B, f"  {item['name']} — yeni değer ({item['cur']} → ): ")))
        except ValueError:
            print(c(R, "  Geçersiz sayı."))
            continue
        print(f"  Güncelleniyor: {item['name']} → {val} {item.get('unit','adet')} ...", end='', flush=True)
        ok = update_stock_via_gas(item['name'], val)
        if ok:
            item['cur'] = val
            print(c(G, " ✓ Kaydedildi"))
            logging.info(f"GÜNCELLEME: {item['name']} → {val}")
        else:
            print(c(R, " ✗ Kayıt başarısız — Sheets'i manuel kontrol et"))

def run_once(interactive=False):
    setup_logging()
    print(c(D, f"GAS bağlantısı kontrol ediliyor..."))
    try:
        data  = fetch_pms_data()
        items = normalize_inventory(data.get('inventory', []))
        crit, low = print_inventory_report(items)
        log_alerts(crit, low)
        if interactive and (crit or low):
            interactive_update(items)
    except requests.exceptions.ConnectionError:
        print(c(R, "\nHATA: İnternet bağlantısı yok veya GAS URL hatalı."))
        logging.error("Bağlantı hatası")
    except requests.exceptions.Timeout:
        print(c(R, "\nHATA: İstek zaman aşımına uğradı."))
        logging.error("Timeout")
    except Exception as e:
        print(c(R, f"\nHATA: {e}"))
        logging.error(f"Beklenmeyen hata: {e}")

def run_loop():
    setup_logging()
    print(c(BO, "🏠 Airbnb PMS — RPi Inventory Monitor (sürekli)"))
    print(c(D,  f"   Her {INTERVAL//60} dakikada güncellenir. Çıkmak için Ctrl+C\n"))
    while True:
        try:
            data  = fetch_pms_data()
            items = normalize_inventory(data.get('inventory', []))
            crit, low = print_inventory_report(items)
            log_alerts(crit, low)
        except Exception as e:
            print(c(R, f"[{datetime.now().strftime('%H:%M')}] HATA: {e}"))
            logging.error(str(e))
        print(c(D, f"  Sonraki güncelleme {INTERVAL//60} dakika sonra..."))
        time.sleep(INTERVAL)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Airbnb PMS RPi Inventory Sync')
    parser.add_argument('--loop',        action='store_true', help='5 dakikada bir güncelle (sonsuz döngü)')
    parser.add_argument('--once',        action='store_true', help='Bir kez çalış ve çık')
    parser.add_argument('--interactive', action='store_true', help='Terminalden stok güncelleme modunu etkinleştir')
    args = parser.parse_args()

    if args.loop:
        run_loop()
    else:
        run_once(interactive=args.interactive)
