@ECHO OFF
if not exist node_modules\ (
    echo Downloading dependencies. Please wait...
    CALL npm install --silent
)

CALL npm run start
pause
