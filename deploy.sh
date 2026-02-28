#!/bin/bash
# Script de deploy para VPS Hostinger
# 1. Conecte o projeto ao GitHub (Settings -> GitHub)
# 2. Clone o repo na VPS e rode este script

echo "📦 Instalando dependências..."
npm install

echo "🔨 Gerando build de produção..."
npm run build

echo "📂 Copiando arquivos para o servidor..."
# Ajuste o caminho conforme sua VPS
DEPLOY_DIR="/var/www/higtecpro.site"

sudo mkdir -p $DEPLOY_DIR
sudo cp -r dist/* $DEPLOY_DIR/
sudo cp dist/.htaccess $DEPLOY_DIR/ 2>/dev/null

echo "✅ Deploy concluído!"
echo ""
echo "⚙️  Próximos passos:"
echo "  - Se usar Nginx: copie nginx.conf para /etc/nginx/sites-available/"
echo "  - Se usar Apache: o .htaccess já está no lugar"
echo "  - Configure SSL: sudo certbot --nginx -d higtecpro.site -d www.higtecpro.site"
