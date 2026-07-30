@echo off
rem Build and deploy portfolio-hub to GitHub Pages (gh-pages branch).
rem Bundles the Daybreak download zip if one exists on the Desktop.
setlocal
cd /d "%~dp0"

call npm run build || exit /b 1

rem Writes a real index.html at every route so GitHub Pages returns 200 instead
rem of falling through to 404.html, and gives each page its own title and
rem description. Also writes 404.html itself, for genuinely unknown paths.
call node scripts/prerender.js || exit /b 1

type nul > dist\.nojekyll

if exist "%USERPROFILE%\Desktop\Daybreak.zip" (
    copy /y "%USERPROFILE%\Desktop\Daybreak.zip" dist\Daybreak.zip >nul
    echo Bundled Daybreak.zip
) else (
    echo WARNING: no Daybreak.zip on Desktop - the site's download link will 404.
)

cd dist
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "Deploy portfolio-hub"
git push -q -f https://github.com/Ragnr99/portfolio-hub.git gh-pages
cd ..
rmdir /s /q dist\.git
echo Deployed to https://ragnr99.github.io/portfolio-hub/
