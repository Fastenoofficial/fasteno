@echo off
REM Fasteno Deployment Script via GitHub

echo ========================================
echo Fasteno E-Commerce - GitHub Deployment
echo ========================================
echo.

echo Step 1: Pushing code to GitHub...
echo.
echo You need to authenticate. Choose one option:
echo.
echo Option A: GitHub Desktop (Easiest)
echo   1. Open GitHub Desktop
echo   2. Select this repository
echo   3. Click "Push origin"
echo   4. Done!
echo.
echo Option B: Personal Access Token
echo   1. Go to: https://github.com/settings/tokens
echo   2. Generate new token (classic)
echo   3. Select 'repo' scope
echo   4. Copy the token
echo   5. Run: git push https://YOUR_TOKEN@github.com/shreeshyamai35-arch/fasteno-shyama.git main
echo.
echo Option C: Install GitHub CLI
echo   1. Download from: https://cli.github.com/
echo   2. Run: gh auth login
echo   3. Run: git push
echo.

pause

echo.
echo Step 2: After pushing, Vercel will auto-deploy!
echo.
echo Check deployment status at:
echo https://vercel.com/fasteno/fasteno-shyama/deployments
echo.
echo Your store will be updated in 2-3 minutes.
echo.

pause

echo.
echo ========================================
echo All commits ready to deploy:
echo ========================================
git log origin/main..HEAD --oneline

echo.
echo These changes include:
echo - Search autocomplete with suggestions
echo - Logo in navbar and footer
echo - Dynamic hero banners (admin controlled)
echo - Category display control (admin controlled)
echo.

pause
