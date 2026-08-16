# Instruções de Inicialização e Contexto
Sempre que você iniciar uma nova interação ou sessão neste projeto, você **deve rotineiramente ler os arquivos a seguir** para carregar as regras atualizadas de arquitetura e conhecimento da equipe registrados no Vault do Obsidian:
- Leia `C:\Users\thale\OneDrive\Documentos\Obsidian Vault\contexto-geral.md`
- Leia `C:\Users\thale\OneDrive\Documentos\Obsidian Vault\padroes\codigo.md`
- Leia `C:\Users\thale\OneDrive\Documentos\Obsidian Vault\projetos\Graphène\contexto.md`

# Stack do Projeto (Graphène Manipulações)
- **Frontend Core:** React manipulado via Vite. Extensão `.jsx` padrão.
- **Backend Enxuto:** Supabase (abrangendo Authenticação, chamadas a banco Postgres para armazenar pedidos/solicitações e public Storage para as fotos das receitas enviadas).
- **Estilização Elegante:** Vanilla CSS Modular. Sem dependências pesadas como TailwindCSS; nosso fluxo baseia-se pesadamente em design tokens nativos gerenciados via `global.css` e utilitários em `glassmorphism.css`.
- **Deploy:** Vercel.

# Padrões e Convenções Fundamentais (Reforço Limitado)
- **Linguagem Visual Ultra-Premium:** Todos os componentes novos e interações produzidas precisam emanar alto padrão. Use profusamente as constantes `var(...)` disponíveis em nosso global CSS (ex: esmeraldas e dark gradients) combinadas com nossa caixa customizada `glass-card` - interfaces cruas ou secas serão rejeitadas.
- **Prevenção de Fugas de Memória (Leaks):** O app lida com envios de receita dos usuários através do form. Instâncias geradas por `URL.createObjectURL` DEVEM ser mortas explicitamente através de block cleanups em `useEffect` com `URL.revokeObjectURL(...)` ao desmontar blocos React para evitar gargalo de heap no mobile.
- **Design de Componentes:** Mantenha os componentes em `PascalCase` limpos e de fácil digestibilidade. Qualquer requisição envolvendo `supabaseClient` deve estritamente envolver o tratamento `try...catch`, logando silenciosamente o debug do problema e gerando avisos refinados sem quebrar a tela do usuário.

# Scripts e Terminal
- Em caso de subir ambiente localmente em sua sessão, use `npm run dev`.
