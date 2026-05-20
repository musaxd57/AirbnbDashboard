"""
Airbnb Dashboard - Airtable Kurulum Scripti
Bu script tüm tabloları doğru alan tipleriyle oluşturur.
Çalıştırmadan önce AIRTABLE_TOKEN değerini girin.
"""

import requests
import time
import sys

# ============================================================
# BURAYA KENDİ DEĞERLERINI YAZ
AIRTABLE_TOKEN = "patxMXbPsO0oCqc9h"
BASE_ID        = "appc7SZojZt50Hv7v"
# ============================================================

HEADERS = {
    "Authorization": f"Bearer {AIRTABLE_TOKEN}",
    "Content-Type": "application/json"
}
META_URL = f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables"


def get_tables():
    r = requests.get(META_URL, headers=HEADERS)
    r.raise_for_status()
    return {t["name"]: t["id"] for t in r.json().get("tables", [])}


def delete_all_records(table_id):
    url = f"https://api.airtable.com/v0/{BASE_ID}/{table_id}"
    all_ids = []
    offset = None
    while True:
        params = {"pageSize": 100}
        if offset:
            params["offset"] = offset
        data = requests.get(url, headers=HEADERS, params=params).json()
        all_ids += [r["id"] for r in data.get("records", [])]
        offset = data.get("offset")
        if not offset:
            break
    for i in range(0, len(all_ids), 10):
        batch = all_ids[i:i+10]
        q = "&".join([f"records[]={rid}" for rid in batch])
        requests.delete(f"{url}?{q}", headers=HEADERS)
        time.sleep(0.2)
    print(f"  {len(all_ids)} kayıt silindi.")


def create_table(name, fields):
    payload = {"name": name, "fields": fields}
    r = requests.post(META_URL, headers=HEADERS, json=payload)
    if r.status_code in (200, 201):
        table_id = r.json()["id"]
        print(f"  ✓ '{name}' tablosu oluşturuldu: {table_id}")
        return table_id
    else:
        print(f"  ✗ Hata: {r.text}")
        return None


def update_field_type(table_id, field_id, name, field_type, options=None):
    url = f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables/{table_id}/fields/{field_id}"
    payload = {"name": name, "type": field_type}
    if options:
        payload["options"] = options
    r = requests.patch(url, headers=HEADERS, json=payload)
    return r.status_code in (200, 201)


def add_field(table_id, name, field_type, options=None):
    url = f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables/{table_id}/fields"
    payload = {"name": name, "type": field_type}
    if options:
        payload["options"] = options
    r = requests.post(url, headers=HEADERS, json=payload)
    if r.status_code in (200, 201):
        print(f"    + Alan eklendi: {name} ({field_type})")
        return r.json()["id"]
    else:
        print(f"    ! Alan eklenemedi: {name} - {r.text[:100]}")
        return None


def setup_reservations_table(tables):
    print("\n[2] Reservations tablosu kuruluyor...")

    if "Reservations" in tables:
        print("  Mevcut tablo temizleniyor...")
        delete_all_records(tables["Reservations"])
        table_id = tables["Reservations"]

        # Mevcut alanları al
        r = requests.get(META_URL, headers=HEADERS)
        for t in r.json()["tables"]:
            if t["id"] == table_id:
                existing_fields = {f["name"]: f for f in t["fields"]}
                break

        # Primary field adını güncelle
        primary_id = list(existing_fields.values())[0]["id"]
        update_field_type(table_id, primary_id, "Rezervasyon_Kodu", "singleLineText")
        print("  Primary field -> Rezervasyon_Kodu")
    else:
        table_id = create_table("Reservations", [
            {"name": "Rezervasyon_Kodu", "type": "singleLineText"}
        ])
        if not table_id:
            return
        existing_fields = {"Rezervasyon_Kodu": {}}

    # Gerekli alanları ekle
    needed = [
        ("Apartment",   "singleLineText", None),
        ("Guest_Name",  "singleLineText", None),
        ("Check_In",    "singleLineText", None),
        ("Check_Out",   "singleLineText", None),
        ("Source",      "singleLineText", None),
        ("Synced_At",   "singleLineText", None),
        ("Status", "formula", {
            "formula": "IF(IS_BEFORE(TODAY(), DATETIME_PARSE({Check_In})), \"Upcoming\", IF(IS_BEFORE(TODAY(), DATETIME_PARSE({Check_Out})), \"Active\", \"Completed\"))"
        }),
        ("Nights", "formula", {
            "formula": "IF(AND({Check_In} != \"\", {Check_Out} != \"\"), DATETIME_DIFF(DATETIME_PARSE({Check_Out}), DATETIME_PARSE({Check_In}), 'days'), 0)"
        }),
    ]

    for field_name, field_type, options in needed:
        if field_name not in existing_fields:
            add_field(table_id, field_name, field_type, options)
            time.sleep(0.3)

    print("  ✓ Reservations tablosu hazır.")
    return table_id


def setup_cleaning_tasks_table(tables):
    print("\n[3] Cleaning_Tasks tablosu kuruluyor...")

    if "Cleaning_Tasks" in tables:
        print("  Mevcut tablo temizleniyor...")
        delete_all_records(tables["Cleaning_Tasks"])
        table_id = tables["Cleaning_Tasks"]
    else:
        table_id = create_table("Cleaning_Tasks", [
            {"name": "Task_ID", "type": "singleLineText"}
        ])
        if not table_id:
            return

    fields_to_add = [
        ("Apartment",        "singleLineText", None),
        ("Checkout_Date",    "singleLineText", None),
        ("Rezervasyon_Kodu", "singleLineText", None),
        ("Status", "singleSelect", {
            "choices": [
                {"name": "Bekliyor",    "color": "redLight2"},
                {"name": "Devam Ediyor","color": "yellowLight2"},
                {"name": "Tamamlandı", "color": "greenLight2"},
            ]
        }),
        ("Notes", "multilineText", None),
        ("Completed_At", "singleLineText", None),
    ]

    r = requests.get(META_URL, headers=HEADERS)
    existing = {}
    for t in r.json()["tables"]:
        if t["id"] == table_id:
            existing = {f["name"] for f in t["fields"]}
            break

    for field_name, field_type, options in fields_to_add:
        if field_name not in existing:
            add_field(table_id, field_name, field_type, options)
            time.sleep(0.3)

    print("  ✓ Cleaning_Tasks tablosu hazır.")
    return table_id


def setup_apartments_table(tables):
    print("\n[1] Apartments tablosu kuruluyor...")

    if "Apartments" not in tables:
        table_id = create_table("Apartments", [
            {"name": "Apartment", "type": "singleLineText"}
        ])
        if not table_id:
            return False
        existing_fields = {"Apartment": {}}
    else:
        table_id = tables["Apartments"]
        r = requests.get(META_URL, headers=HEADERS)
        existing_fields = {}
        for t in r.json()["tables"]:
            if t["id"] == table_id:
                existing_fields = {f["name"] for f in t["fields"]}
                break

    ai_fields = [
        ("Calendar Name",   "url",             None),
        ("Address",         "singleLineText",  None),
        ("Door_Code",       "singleLineText",  None),
        ("WiFi_Name",       "singleLineText",  None),
        ("WiFi_Password",   "singleLineText",  None),
        ("CheckIn_Time",    "singleLineText",  None),
        ("CheckOut_Time",   "singleLineText",  None),
        ("Parking",         "singleLineText",  None),
        ("Nearby",          "multilineText",   None),
        ("Notes",           "multilineText",   None),
    ]

    for field_name, field_type, options in ai_fields:
        if field_name not in existing_fields:
            add_field(table_id, field_name, field_type, options)
            time.sleep(0.3)

    print("  ✓ Apartments tablosu hazır.")
    return True


def main():
    print("=" * 50)
    print("  Airbnb Dashboard - Airtable Kurulumu")
    print("=" * 50)

    if AIRTABLE_TOKEN == "patXXXXXXXXXXXXXX":
        print("\n⛔ AIRTABLE_TOKEN değerini girin!")
        sys.exit(1)

    print("\nTablelar kontrol ediliyor...")
    tables = get_tables()
    print(f"Mevcut tablolar: {list(tables.keys())}")

    setup_apartments_table(tables)
    setup_reservations_table(tables)
    setup_cleaning_tasks_table(tables)

    print("\n" + "=" * 50)
    print("✅ Kurulum tamamlandı!")
    print("\nSonraki adımlar:")
    print("  1. Apartments tablosuna dairelerinizi ekleyin")
    print("     (iCal URL, adres, WiFi, kapı kodu vb.)")
    print("  2. n8n_workflows/ klasöründeki 4 JSON'u n8n'e import edin")
    print("  3. n8n'de Airtable ve Telegram credential'larını bağlayın")
    print("  4. Workflow 4 için ANTHROPIC_API_KEY'i n8n'e ekleyin")
    print("=" * 50)


if __name__ == "__main__":
    main()
