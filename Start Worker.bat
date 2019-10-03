@echo off
cls
cd ../Modular-Web-Server
:1
npm start ../Osmosis worker 0.0.0.0 password
pause
goto 1