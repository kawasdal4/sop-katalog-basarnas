@echo off
set PATH=%PATH%;C:\Users\foeta\.cargo\bin
npx concurrently "npx next dev -p 3005" "npx wait-on http://localhost:3005 && npx tauri dev --config ./desktop/src-tauri/tauri.conf.json"
