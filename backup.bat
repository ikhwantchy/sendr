@echo off
cd /d "C:\Users\ikhwa\Documents\Ikhwan\Vibe Project\WA Automation Platform"

git add .
git commit -m "Manual backup %date% %time%"
git push origin main

pause
