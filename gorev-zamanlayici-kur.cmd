@echo off
:: Windows Gorev Zamanlayici — Daire Ops
:: Yonetici olarak calistirin (sag tik → Yonetici olarak calistir)

echo === Daire Ops Gorev Zamanlayici Kurulumu ===
echo.

echo [1/4] iCal Sync - Her 30 dakika...
schtasks /create /tn "DaireOps-iCalSync" ^
  /tr "curl.exe -s http://127.0.0.1:3000/api/cron/sync" ^
  /sc minute /mo 30 /f

echo [2/4] Sabah Raporu - Her gun 08:00...
schtasks /create /tn "DaireOps-SabahRaporu" ^
  /tr "curl.exe -s http://127.0.0.1:3000/api/cron/morning" ^
  /sc daily /st 08:00 /f

echo [3/4] Temizlik Kontrolu - Her 30 dakika...
schtasks /create /tn "DaireOps-TemizlikKontrol" ^
  /tr "curl.exe -s http://127.0.0.1:3000/api/cron/cleaning" ^
  /sc minute /mo 30 /f

echo [4/4] AI Check-in Mesaji - Her gun 09:00...
schtasks /create /tn "DaireOps-AICheckin" ^
  /tr "curl.exe -s http://127.0.0.1:3000/api/cron/checkin-ai" ^
  /sc daily /st 09:00 /f

echo.
echo === Kurulum Tamamlandi ===
echo   DaireOps-iCalSync        : Her 30 dakika
echo   DaireOps-SabahRaporu     : Her gun 08:00
echo   DaireOps-TemizlikKontrol : Her 30 dakika
echo   DaireOps-AICheckin       : Her gun 09:00
echo.
echo NOT: Bu gorevler SADECE bilgisayar acikken ve
echo      baslat.cmd calisiyor olduğunda tetiklenir.
pause
