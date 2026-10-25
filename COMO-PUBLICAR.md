# Publicar o Rotom-Phone

## 1. Supabase

Crie um projeto **Free** chamado Rotom-Phone. Escolha São Paulo, se disponível, e guarde a senha do banco. A senha do banco é diferente da senha da conta Supabase.

No projeto, abra **Connect** e escolha a conexão **Session pooler**, em formato de URL. Ela é apropriada para nosso servidor e permite conexão IPv4. A URL costuma começar com `postgresql://postgres.REFERENCIA` e terminar com `:5432/postgres`. Substitua o marcador de senha pela senha real do banco. Caracteres especiais da senha precisam estar codificados para URL.

Coloque a URL no arquivo **backend/.env**, no campo `DATABASE_URL`, mantendo as aspas. `ADMIN_EMAIL` deve conter o e-mail da sua conta administradora local. Esse arquivo é privado, ignorado pelo Git e excluído do pacote de publicação. Não cole a conexão nos arquivos do GitHub.

Se o certificado do projeto precisar de uma autoridade própria, baixe o certificado público em configurações do banco e configure `PG_CA_CERT` no mesmo arquivo; a verificação de certificado permanece habilitada. Vamos conferir isso na primeira conexão, sem adivinhar nem desativar TLS.

Fonte: [conexão PostgreSQL do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

## 2. Migração, antes de publicar o site

Com backend/.env preenchido, avise no chat. A migração será executada do seu PC usando:

```text
node --env-file=backend/.env backend/migrate-online.mjs
```

Ela cria as tabelas privadas no schema `rotom`, transfere o catálogo, traduções, propostas, sua conta e campanhas existentes. Só entram fichas ativas e imagens ainda utilizadas; a ficha de teste arquivada e as sessões antigas não são transferidas. Sua senha da aplicação continua a mesma: transfere-se seu hash, não uma senha em texto.

O script verifica contagens, usa uma transação e não substitui um banco já preenchido por outra migração. Uma cópia privada dos dados de transferência fica em backend/.data/migrations no seu PC. Esses arquivos não vão ao GitHub.

Depois da publicação, o endereço online será a versão oficial para editar catálogo, campanhas e fichas. A cópia local continua útil para desenvolvimento, mas mudanças feitas no banco local não serão sincronizadas automaticamente com o Supabase.

Não precisa criar tabelas manualmente nem usar as chaves públicas de API do Supabase. O navegador conversa com o servidor, e somente o servidor possui a conexão do banco. O schema não fica liberado para a API pública do Supabase.

## 3. GitHub

Crie um repositório **privado**, por exemplo `rotom-phone`. Comece vazio, sem README automático. Extraia `rotom-phone.zip` e envie **o conteúdo** da pasta pelo GitHub, em Add file → Upload files.

Confira que **Dockerfile**, **render.yaml**, **package.json** e **pnpm-lock.yaml** ficaram na raiz, ao lado das pastas backend, prototipo e outputs. Não envie o ZIP como um arquivo único para o repositório e não envie node_modules, backend/.data ou backend/.env.

O pacote preparado contém somente arquivos selecionados do projeto; não contém histórico Git, contas, senhas, bancos SQLite, backups ou imagens pessoais.

## 4. Render

Abra **New → Blueprint**, selecione o repositório privado e use `render.yaml`. O serviço será `rotom-phone`, com runtime Docker e plano Free. Preencha:

| Campo | Valor |
|---|---|
| ADMIN_EMAIL | O mesmo e-mail administrador do arquivo local |
| DATABASE_URL | A mesma conexão Session pooler validada na migração |
| NODE_ENV | production, já definido no arquivo |

O certificado público do Supabase já foi incluído no pacote em backend/certs/supabase-root.crt. Não é preciso criar PG_CA_CERT no Render nesta instalação; essa variável continua disponível como substituição futura. Não crie um banco temporário do Render: o banco persistente já está no Supabase.

O Render fornece o endereço HTTPS em `onrender.com`; a aplicação usa `RENDER_EXTERNAL_URL` automaticamente. Se depois usar domínio próprio, configure `PUBLIC_ORIGIN` com o endereço HTTPS exato, sem caminho. A checagem de saúde é `/api/health`.

O Docker instala Node 24, Python padrão para o leitor Excel e somente as dependências de produção. O app não usa o disco temporário do Render para guardar fichas. Sem conexão com o PostgreSQL ou sem migração concluída, ele não inicia usando um SQLite vazio.

Fontes: [Blueprints do Render](https://render.com/docs/infrastructure-as-code), [variáveis de ambiente](https://render.com/docs/configure-environment-variables).

## 5. Ensaio antes da sessão zero

Abra o endereço HTTPS no computador e entre com sua conta já migrada. Confira catálogo e campanha. No celular, teste pelo Wi-Fi e pelos dados móveis. Use outra conta para aceitar um convite, criar uma ficha, vinculá-la e confirmar o salvamento após fechar e abrir o navegador. Confira edição pelo mestre e histórico.

Os convites criados no site usarão o endereço público. Convites antigos com localhost devem ser gerados de novo.

O plano gratuito do Render pode demorar para acordar depois de inatividade. Abra e confira o site antes da sessão. O Supabase gratuito também pode pausar projetos com pouca atividade prolongada: acompanhe o painel e os avisos do serviço.

## Verificação realizada nesta preparação

81 testes locais passaram, incluindo testes da implementação PostgreSQL em emulador, migração de dados e isolamento de acesso. Site e API no mesmo servidor foram conferidos no navegador local. A migração real para Supabase foi concluída: 3.979 registros, conta administradora e campanha, com contagens verificadas, RLS habilitada e acesso ao schema privado negado a anon/authenticated. A ficha arquivada e sessões antigas não foram transferidas. O Docker não foi construído nesta máquina, que não tem Docker instalado; o primeiro build do Render ainda precisa ser conferido.
