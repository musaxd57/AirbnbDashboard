@echo off
:: Windows Gorev Zamanlayici - Daire Ops Sabah Raporu
:: Yonetici olarak calistirin

echo Sabah raporu gorevi olusturuluyor...

schtasks /create /tn "DaireOps-SabahRaporu" ^
  /tr "curl.exe -s http://127.0.0.1:3000/api/cron/morning" ^
  /sc daily /st 08:00 /f

echo.
echo Temizlik kontrolu gorevi olusturuluyor...

schtasks /create /tn "DaireOps-TemizlikKontrol" ^
  /tr "curl.exe -s http://127.0.0.1:3000/api/cron/cleaning" ^
  /sc minute /mo 30 /f

echo.
echo Gorevler olusturuldu!
echo   DaireOps-SabahRaporu    : Her gun 08:00
echo   DaireOps-TemizlikKontrol: Her 30 dakika
pause
