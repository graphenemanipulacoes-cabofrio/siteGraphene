# Graphène — próximos passos

Lista de acompanhamento em linguagem simples. Atualizada em 2 de outubro de 2026.
As informações do site não equivalem a uma aprovação do Google nem confirmam, sozinhas, a situação atual de todos os documentos.

## Decisão de 10 de novembro de 2026

O proprietário decidiu não insistir no Google por enquanto. A divulgação passa a ser por influenciadoras e por anúncios no Meta (Instagram e Facebook). Por isso voltaram ao site as páginas de orçamento com receita, matérias-primas e profissionais de saúde, e os 10 produtos que tinham saído. Os textos de produto sem promessa de resultado continuam.

Com isso, o site deixou de estar preparado para o Google: os itens abaixo só voltam a valer se a farmácia retomar esse caminho. O Meta também exige autorização própria para anunciar medicamento com receita e farmácia on-line, então os anúncios devem levar para suplementos e cosméticos.

## Situação dos anúncios no Google (4 de novembro de 2026)

O Google reprovou os anúncios por "serviços de medicamentos", segundo o relato do proprietário. O site foi preparado: páginas de receita fora do ar, produtos de maior risco fora do site e textos sem promessa de tratamento. Isso não garante a aprovação. A política para o Brasil também exige a certificação abaixo, e não cita farmácia de manipulação.

Comparação com 5 farmácias que anunciam: todas têm conta verificada, licença sanitária, AFE e AE no site, conteúdo no próprio HTML e anúncios de produto no Shopping. A conta da Graphène também é verificada e teve anúncios exibidos até 3 de novembro, apontando para o site antigo. Os anúncios foram reprovados quando o destino mudou para o site novo, com loja. A hipótese principal é a falta da certificação de farmácia on-line, ainda não confirmada na conta.

Ainda faltam, fora do site:

- Print da reprovação e situação da certificação na conta do Google Ads (ou acesso à conta).
- Pedido da certificação, se ainda não existir.
- Números da licença sanitária e da AE, para incluir no site.
- Revisão da lista de produtos pelo responsável técnico, com composição e advertências de cada um.
- Regras reais de troca e devolução da loja.
- Conta no Google Merchant Center, com o feed `https://www.graphenemanipulacoes.com.br/feed.xml`.
- Revisão de anúncios e palavras-chave. Nenhum deles deve citar medicamento, receita, doença ou emagrecimento.

## Antes de ativar anúncios

- Pedir ao Rodrigo o alvará sanitário vigente da unidade. Depois de conferir, incluir no site o número, órgão emissor e validade.
- Confirmar a situação atual da AFE na Anvisa e do registro no CRF-RJ. O site identifica os documentos recebidos e suas datas, sem inventar uma validação.
- Conferir com o responsável técnico os requisitos aplicáveis ao atendimento pela internet, inclusive o cadastro do endereço do site na Anvisa, quando exigido.
- Solicitar a certificação de saúde/farmácia on-line no Google Ads, na conta que vai anunciar o domínio da Graphène. Essa aprovação é diferente do registro da farmácia na Anvisa.
- Revisar os produtos que serão anunciados: composição, classificação, nomes, imagens, rótulos, preços e descrições. Não anunciar medicamentos restritos nem promessas de cura, emagrecimento garantido ou resultados clínicos sem respaldo e permissão. O catálogo cadastrado não foi corrigido automaticamente.
- Revisar os textos e imagens dos anúncios, palavras-chave e páginas de destino com o responsável técnico. As regras podem atingir outros conteúdos e serviços vinculados à página anunciada.

## Completar informações para quem compra

- Confirmar o CEP da unidade e manter endereço, nome, telefone e horários iguais no site, documentos e Perfil da Empresa no Google. Verificar se os horários documentados precisam de atualização para refletir o atendimento confirmado pelo proprietário.
- Definir regiões atendidas, cálculo de frete, prazo de preparação e prazo de entrega. Exibir condições reais, sem prometer prazos que a loja não consegue cumprir.
- Detalhar como funcionam cancelamento, troca, devolução e reembolso, inclusive para pedidos individualizados, com revisão profissional. Não excluir os direitos do consumidor.
- Definir os termos de compra, canais de atendimento e procedimento para dúvidas/reclamações.
- Confirmar como a nota fiscal é emitida e enviada ao cliente.

## Pendências técnicas

- Revisar e migrar os anexos de prescrição antigos que ainda estão no armazenamento público, sem afetar as imagens públicas dos produtos. A atualização do Supabase e do site separa os novos anexos em armazenamento privado e restringe a leitura das solicitações ao administrador, com links temporários para os novos arquivos. Os anexos anteriores continuam acessíveis pelo fluxo legado e precisam de tratamento separado antes de aumentar o tráfego de receitas. Confirmar o fluxo completo de envio e abertura no admin com um documento fictício, nunca com dados reais de saúde em testes.
- Testar uma compra completa com autorização do responsável: criação do pedido, pagamento, confirmação pelo Mercado Pago, visualização no admin, cancelamento e eventual reembolso. Nenhuma cobrança real foi feita nesta publicação.
- Confirmar a propriedade do domínio no Google Search Console e enviar https://www.graphenemanipulacoes.com.br/sitemap.xml. Acompanhar erros e indexação; cadastrar não garante posicionamento.
- Revisar o Perfil da Empresa no Google e corrigir diferenças de informações, se houver.
- Antes de ativar Google Analytics, Google Ads ou pixels, configurar escolhas de privacidade para tecnologias opcionais e atualizar o aviso. Não usar dados de saúde ou documentos de prescrição para segmentar publicidade.
- Definir prazos de guarda e exclusão dos dados e um responsável pelo atendimento às solicitações de privacidade.
- Pós-venda: pedir revisão jurídica do uso do histórico de compras (LGPD) e criar o consentimento para ofertas antes de enviar promoções. O aviso de privacidade já descreve o pós-venda.
- Parcerias: informar em Admin › Resultado das parcerias › Custos o custo real dos produtos, a embalagem e o imposto. Até lá, o lucro ou prejuízo usa 35%, 3% e 8% como hipótese. Definir também percentuais, cupons, prazos de repasse e as regras de cada parceira.

## Referências oficiais

- Regras de saúde e medicamentos, incluindo o Brasil: https://support.google.com/adspolicy/answer/176031?hl=pt-BR
- Certificação de serviços de medicamentos/farmácias: https://support.google.com/adspolicy/answer/15598647?hl=pt-BR
- Consulta de empresas na Anvisa: https://consultas.anvisa.gov.br/
- Portal do CRF-RJ: https://portal.crf-rj.org.br/
- Código de Defesa do Consumidor: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm

Nem todos os itens têm o mesmo impacto: documentação, certificação exigida, produtos permitidos e proteção de dados podem impedir o início das campanhas. Medição e melhorias de SEO podem ser feitas depois, respeitando as regras.
