@echo off
echo Pushing changes to GitHub...
git push origin main --force-with-lease
if %errorlevel% equ 0 (
    echo Push successful! Vercel will now deploy to fasteno.in
    pause
) else (
    echo Push failed. Please check your GitHub credentials.
    pause
)
