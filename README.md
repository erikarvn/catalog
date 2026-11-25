# Río Rosa — Catálogo digital

Por agora o site é uma página estática. A coleção, os textos, os preços em reais e o WhatsApp estão no próprio site. Não há página de administração. O passo a passo do painel, mais abaixo, fica guardado para quando quisermos ativá-lo.

Catálogo visual de sabonetes artesanais. Quem recebe o link vê as fotografias, os nomes, as descrições e os preços em reais.

Não é uma loja: não tem carrinho, pagamento, cadastro de clientes nem pedidos.

Os sabonetes vivem no Supabase. Incluir ou mudar um produto não exige publicar o site de novo.

## Ver no computador

Na pasta `catalog`:

```bash
python3 -m http.server 4173
```

Abra [http://localhost:4173](http://localhost:4173).

Até conectar o Supabase, aparece uma coleção de amostra. O painel fica em [http://localhost:4173/admin/](http://localhost:4173/admin/).

## Conectar o Supabase

1. Entre em [supabase.com](https://supabase.com) e crie um projeto grátis.
2. Vá em **Project Settings → API**.
3. Copie a **Project URL** e a chave **anon** ou **publishable**.
4. Abra `config/supabase.js` e troque estes dois valores:

```javascript
supabaseUrl: "https://SEU-PROJETO.supabase.co",
supabaseAnonKey: "SUA_CHAVE_ANON"
```

5. No Supabase, abra o **SQL Editor**, cole o arquivo `supabase/schema.sql` inteiro e execute.
6. Vá em **Authentication → Users → Add user**.
   - Escreva seu e-mail e uma senha.
   - Marque o usuário como confirmado (**Auto Confirm User**).
   - Em **Authentication → Providers → Email**, desligue o cadastro público se essa opção aparecer. Assim só entra a conta que você criou.
7. Volte ao **SQL Editor** e execute isto com o seu e-mail:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'seu-email@exemplo.com';
```

8. Atualize `/admin/` e entre.

Se o projeto grátis do Supabase ficar parado por várias semanas, o Supabase pode pausá-lo. No painel do Supabase, restaure o projeto e o catálogo volta a carregar. Não precisa publicar a página de novo.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie o conteúdo desta pasta para a raiz do repositório. O `index.html` precisa ficar na raiz, não dentro de outra pasta `catalog`.
3. No repositório: **Settings → Pages → Branch: main → / (root)**.
4. O endereço público fica parecido com `https://seu-usuario.github.io/nome-do-repo/`.
5. O painel fica em `https://seu-usuario.github.io/nome-do-repo/admin/`.

Publique de novo só se mudar o visual, os textos fixos do código ou as chaves de `config/supabase.js`. Sabonetes, fotos, preços e textos da capa se atualizam sozinhos pelo painel.

## Usar o painel

Em `/admin/` você pode:

- mudar o título, o texto, a capa, o Instagram, o WhatsApp e a nota do rodapé;
- mostrar ou esconder os preços, e escolher o símbolo da moeda;
- incluir um sabonete com nome, descrição, preço em reais, fotografia e estado;
- editar, ocultar, reordenar ou excluir produtos.

A fotografia se escolhe no computador ou no celular. Antes de subir, o navegador reduz a imagem (lado máximo de 1600 px, em WebP ou JPG) para ocupar menos espaço.

Se uma foto do celular não abrir, escolha um JPG ou PNG. Alguns telefones guardam HEIC e o navegador nem sempre consegue ler.

Um sabonete **oculto** não aparece no catálogo público. O preço é opcional: se ficar vazio, aquele cartão não mostra preço. Se desmarcar “Mostrar preços”, todos somem.

## Segurança

A chave em `config/supabase.js` é pública. O Supabase funciona assim: qualquer pessoa pode ler o catálogo.

Não cole ali a chave **service_role** nem uma chave **secret**. O arquivo recusa essas chaves e não abre a conexão.

Quem pode fazer cada coisa está nas regras do arquivo SQL:

- qualquer visitante vê a configuração e os sabonetes publicados;
- só o usuário da tabela `admins` pode criar, editar ou excluir produtos;
- só esse usuário pode enviar, trocar ou apagar fotografias;
- só esse usuário pode mudar a apresentação e os preços.

As fotografias ficam num espaço público para o catálogo poder mostrá-las. Um sabonete oculto não entra na lista pública.

## Estrutura

```text
index.html          Catálogo público
styles.css
app.js
admin/index.html    Painel privado
admin/admin.css
admin/admin.js
assets/             Ilustração, favicon e amostra visual
config/supabase.js  URL e chave pública
supabase/schema.sql Tabelas, regras e espaço das fotos
```

No computador a coleção aparece em 4 colunas. No tablet, em 2. No celular, em 2, e em telas muito estreitas passa para 1, para a fotografia continuar em destaque.

## Limites do plano grátis

O Supabase Free inclui um banco pequeno, armazenamento limitado e uma cota mensal de transferência. Por isso as fotos encolhem antes de subir. Para um catálogo de sabonetes, o plano grátis basta.
