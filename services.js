// Сервисы деплоя. Каждый — CLI-команда, запускаемая в папке проекта.
// {dir} — папка со сборкой ("." по умолчанию).
// fields — поля профиля:
//   env — значение уйдёт в переменную окружения процесса деплоя
//   arg — значение добавится в команду как "--флаг значение"
//   secret — хранится зашифрованно и не показывается в интерфейсе

const services = [
  {
    id: 'vercel',
    name: 'Vercel',
    desc: 'Продакшн-деплой через Vercel CLI',
    cmd: 'npx',
    args: ['--yes', 'vercel', '--prod', '--yes'],
    fields: [
      { key: 'token', label: 'Token', secret: true, env: 'VERCEL_TOKEN',
        placeholder: 'vercel_…', hint: 'vercel.com/account/tokens → Create' },
      { key: 'orgId', label: 'Team / Org ID', env: 'VERCEL_ORG_ID',
        placeholder: 'team_… или user ID', hint: 'Settings → General → Team ID' },
      { key: 'projectId', label: 'Project ID', env: 'VERCEL_PROJECT_ID',
        placeholder: 'prj_…', hint: 'Project → Settings → General → Project ID' },
    ],
  },
  {
    id: 'netlify',
    name: 'Netlify',
    desc: 'Деплой через Netlify CLI',
    cmd: 'npx',
    args: ['--yes', 'netlify-cli', 'deploy', '--prod', '--dir', '{dir}'],
    fields: [
      { key: 'token', label: 'Auth token', secret: true, env: 'NETLIFY_AUTH_TOKEN',
        placeholder: 'nfp_…', hint: 'User settings → Applications → Personal access tokens' },
      { key: 'siteId', label: 'Site ID', env: 'NETLIFY_SITE_ID',
        placeholder: 'xxxxxxxx-xxxx-…', hint: 'Site configuration → Site ID' },
    ],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Pages',
    desc: 'Деплой через Wrangler',
    cmd: 'npx',
    args: ['--yes', 'wrangler', 'pages', 'deploy', '{dir}'],
    fields: [
      { key: 'token', label: 'API token', secret: true, env: 'CLOUDFLARE_API_TOKEN',
        placeholder: 'токен с правом Pages: Edit', hint: 'My Profile → API Tokens' },
      { key: 'accountId', label: 'Account ID', env: 'CLOUDFLARE_ACCOUNT_ID',
        placeholder: '32 символа', hint: 'Dashboard → Workers & Pages → Account ID' },
      { key: 'projectName', label: 'Имя проекта', arg: '--project-name',
        placeholder: 'my-site', hint: 'Название Pages-проекта' },
    ],
  },
  {
    id: 'firebase',
    name: 'Firebase Hosting',
    desc: 'Деплой хостинга Firebase',
    cmd: 'npx',
    args: ['--yes', 'firebase-tools', 'deploy', '--only', 'hosting'],
    fields: [
      { key: 'token', label: 'CI token', secret: true, env: 'FIREBASE_TOKEN',
        placeholder: '1//…', hint: 'Получить: npx firebase-tools login:ci' },
      { key: 'projectId', label: 'Project ID', arg: '--project',
        placeholder: 'my-project-123', hint: 'Project settings → Project ID' },
    ],
  },
  {
    id: 'ghpages',
    name: 'GitHub Pages',
    desc: 'Публикация папки в ветку gh-pages',
    cmd: 'npx',
    args: ['--yes', 'gh-pages', '-d', '{dir}'],
    fields: [
      { key: 'repo', label: 'Репозиторий (URL)', arg: '--repo',
        placeholder: 'https://github.com/user/repo.git', hint: 'Пусто — берётся из текущей папки' },
      { key: 'branch', label: 'Ветка', arg: '-b',
        placeholder: 'gh-pages', hint: 'Ветка для публикации' },
    ],
  },
  {
    id: 'surge',
    name: 'Surge',
    desc: 'Быстрый статический хостинг',
    cmd: 'npx',
    args: ['--yes', 'surge', '{dir}'],
    fields: [
      { key: 'email', label: 'Email', env: 'SURGE_LOGIN', placeholder: 'you@mail.com' },
      { key: 'token', label: 'Token', secret: true, env: 'SURGE_TOKEN',
        placeholder: 'токен', hint: 'Получить: npx surge token' },
      { key: 'domain', label: 'Домен', arg: '--domain',
        placeholder: 'my-site.surge.sh', hint: 'Адрес сайта' },
    ],
  },
  {
    id: 'railway',
    name: 'Railway',
    desc: 'Деплой через Railway CLI',
    cmd: 'railway',
    args: ['up'],
    fields: [
      { key: 'token', label: 'Project token', secret: true, env: 'RAILWAY_TOKEN',
        placeholder: 'токен проекта', hint: 'Project → Settings → Tokens' },
      { key: 'service', label: 'Service name / ID', arg: '--service',
        placeholder: 'web', hint: 'Сервис внутри проекта' },
    ],
  },
  {
    id: 'fly',
    name: 'Fly.io',
    desc: 'Деплой через flyctl',
    cmd: 'fly',
    args: ['deploy'],
    fields: [
      { key: 'token', label: 'API token', secret: true, env: 'FLY_API_TOKEN',
        placeholder: 'FlyV1 …', hint: 'Получить: fly tokens create deploy' },
      { key: 'app', label: 'App name', arg: '--app',
        placeholder: 'my-app', hint: 'Название приложения на Fly' },
    ],
  },
];

module.exports = { services };
