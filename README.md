# Automação de Mockups no Photoshop

Automação em JavaScript/ExtendScript para gerar imagens de quadros decorativos em lote no Adobe Photoshop. O projeto aplica artes a mockups de **quadros individuais, duplas e trios**, substitui objetos inteligentes vinculados e exporta os resultados em JPG.

Desenvolvido a partir de uma necessidade real de uma empresa de quadros, o projeto transforma uma sequência de trocas e salvamentos manuais em um fluxo configurável, organizado por produto e modelo de mockup. Esta versão pública foi adaptada para portfólio e não contém imagens, mockups, dados de clientes ou outros ativos proprietários da empresa.

## O problema

Um catálogo de quadros pode combinar centenas de artes com diferentes molduras, acabamentos e apresentações. Repetir manualmente a inserção das imagens e a exportação de cada variação exige muitas operações e atenção constante.

No processo que originou este projeto, os mockups eram abertos em grupos para respeitar a capacidade do computador. Cada novo conjunto de artes exigia atualizar os objetos vinculados e salvar novamente as variações. Isso tornava o fluxo de trabalho extremamente ineficiente. 

A automação foi criada para executar essas etapas em sequência, mantendo a organização dos arquivos e preservando os modelos originais.

## A solução

O usuário escolhe o tipo de produto, indica as pastas e inicia o processamento. O script percorre os produtos e os mockups selecionados, prepara as artes nas dimensões de cada objeto vinculado e exporta uma imagem por combinação.

Por exemplo, **20 conjuntos aplicados a 21 mockups correspondem a 420 JPGs gerados em poucos minutos**. O que antes a equipe não conseguia completar em 1 dia agora é feito em 30 minutos.

## Funcionalidades

- Um único script para produtos individuais, duplas e trios.
- Interface para seleção do tipo de produto, pastas e enquadramento.
- Preenchimento automático dos caminhos a partir da pasta do projeto.
- Processamento de vários produtos, organizados em subpastas.
- Modo de teste com o primeiro produto no primeiro mockup.
- Substituição de objetos inteligentes vinculados, com verificação da geometria.
- Três modos de enquadramento: esticar, preencher com corte central ou manter a arte inteira com bordas brancas.
- Exportação em JPG, qualidade 10/12, perfil sRGB e dimensões do mockup.
- Retomada de resultados concluídos quando as entradas e opções permanecem iguais.
- Proteção contra sobrescrita de resultados existentes incompatíveis com a execução atual.
- Progresso na tela, solicitação de parada e resumo ao finalizar.
- Abertura de um mockup por vez, com fechamento dos documentos auxiliares ao longo do processamento.

Os PSDs/PSBs e as imagens de entrada são fechados sem salvar alterações. As substituições usam arquivos temporários.

## Tecnologias

| Tecnologia | Aplicação |
|---|---|
| JavaScript / ExtendScript, sintaxe ES3 | Lógica da automação em arquivo `.jsx` |
| Photoshop DOM e Action Manager | Manipulação de documentos, camadas e vínculos |
| ScriptUI | Interface de configuração e acompanhamento |
| Sistema de arquivos local | Organização de entradas, saídas e controle de conclusão |

A execução acontece no Photoshop instalado no computador. O script não depende de Node.js, servidor web ou serviço de processamento em nuvem.

## Requisitos

- Adobe Photoshop desktop com suporte a scripts ExtendScript (`.jsx`).
- Mockups PSD ou PSB preparados com os objetos inteligentes **vinculados** correspondentes ao tipo de produto.
- Arquivos vinculados originais, com dimensões e resolução compatíveis com os objetos presentes nos mockups.
- Imagens de entrada em JPG, JPEG, PNG, TIF ou TIFF.
- Permissão de leitura e gravação nas pastas utilizadas e espaço para arquivos temporários e resultados.

O desenvolvimento partiu de um fluxo no Photoshop 24.6.0. A compatibilidade com outras versões deve ser conferida com o modo de teste; não há uma matriz de versões certificadas.

## Organização das pastas

Mantenha `Aut_Mockups.jsx` na pasta principal, junto com uma pasta chamad 'arquivos'. Mantenha a estrutura de pastas recomendada abaixo.

| Caminho relativo | Conteúdo |
|---|---|
| `Aut_Mockups.jsx` | Script principal |
| `README.md` | Apresentação e instruções |
| `arquivos/imagens/` | Artes dos produtos |
| `arquivos/mockups/` | Modelos PSD/PSB |
| `arquivos/objetos_vinculados/` | Arquivos de referência dos objetos vinculados |
| `arquivos/Resultados/` | JPGs e controle de conclusão gerados pelo script |

Para trabalhar com os três tipos, recomenda-se separar as entradas:

| Tipo | Pasta de imagens | Pasta de mockups |
|---|---|---|
| Individual | `arquivos/imagens/individuais/` | `arquivos/mockups/individuais/` |
| Dupla | `arquivos/imagens/duplas/` | `arquivos/mockups/duplas/` |
| Trio | `arquivos/imagens/trios/` | `arquivos/mockups/trios/` |

Ao selecionar um tipo, o script usa essas subpastas se elas existirem. Caso contrário, utiliza diretamente `imagens` e `mockups`. Cada execução processa um tipo: mantenha apenas os modelos correspondentes na pasta selecionada.

## Nomes das imagens e mapeamento

| Tipo | Imagem de entrada | Objeto vinculado |
|---|---|---|
| Individual | `u.jpg` ou `1.jpg` — apenas um deles | `UNICO.psb` |
| Dupla — esquerda | `e.jpg` | `DUPLA1.psb` |
| Dupla — direita | `d.jpg` | `DUPLA2.psb` |
| Trio — esquerda | `e.jpg` | `IMAGEM3.psb` |
| Trio — meio | `m.jpg` | `IMAGEM 2.psb` |
| Trio — direita | `d.jpg` | `IMAGEM1.psb` |

As extensões podem ser substituídas pelos demais formatos aceitos. Maiúsculas e minúsculas são aceitas. Use somente a letra no nome: `e.jpg`, por exemplo, e não `e(esquerda).jpg`.

O mapeamento dos trios preserva a convenção dos mockups originais. Os nomes dos arquivos de mockup são livres; seus objetos vinculados devem seguir o mapeamento acima. O script não é um substituidor genérico para qualquer PSD.

## Vários produtos no mesmo lote

Crie uma subpasta para cada produto dentro da pasta de imagens do tipo escolhido. Exemplo com duas duplas:

```text
arquivos/imagens/duplas/Flores/e.jpg
arquivos/imagens/duplas/Flores/d.jpg
arquivos/imagens/duplas/Montanhas/e.jpg
arquivos/imagens/duplas/Montanhas/d.jpg
```

O script aplica cada dupla a todos os mockups da pasta selecionada. Também aceita um único conjunto de imagens diretamente nessa pasta.

A leitura considera a pasta de imagens selecionada e suas subpastas imediatas. Os arquivos de mockup devem ficar diretamente na pasta de mockups selecionada.

## Como executar

1. Baixe o código do repositório e descompacte os arquivos.
2. Organize as pastas locais e adicione suas artes, mockups e objetos vinculados.
3. Salve e feche os documentos abertos no Photoshop.
4. Acesse **Arquivo → Scripts → Procurar** e selecione `Aut_Mockups.jsx`.
5. Escolha **Individual**, **Dupla** ou **Trio** e confira as pastas preenchidas.
6. Selecione o enquadramento. O padrão é **Esticar para preencher**, centralizado e sem corte.
7. Execute primeiro o modo **Teste** e confira o JPG gerado.
8. Para processar todas as combinações, execute novamente e selecione **Lote completo**.

Escolha o tipo antes de alterar pastas manualmente: a troca de tipo reaplica os caminhos automáticos de imagens e mockups.

O modo padrão permite deformar a arte internamente para preencher o objeto, conforme a preparação dos mockups deste projeto. Essa escolha não serve necessariamente para todo modelo. A transformação aplicada no mockup é verificada durante a substituição.

## Resultados e retomada

Os JPGs são organizados por tipo, produto e nome do mockup:

```text
arquivos/Resultados/duplas/Flores/Moldura_Branca.jpg
arquivos/Resultados/duplas/Flores/Moldura_Preta.jpg
arquivos/Resultados/duplas/Montanhas/Moldura_Branca.jpg
arquivos/Resultados/duplas/Montanhas/Moldura_Preta.jpg
```

A pasta `Resultados/_controle` contém pequenos comprovantes usados para reconhecer combinações concluídas. Preserve-a para aproveitar a retomada.

Se um JPG já existir e não corresponder ao controle da execução atual, o script informa o conflito. Para gerar uma nova versão, escolha outra pasta de saída ou retire o resultado correspondente.

Não são gerados relatórios de execução em arquivo. O resumo e os detalhes de erros aparecem na tela ao finalizar.

## Escopo e validação

O fluxo anterior de trios foi utilizado com sucesso em um lote de 20 mockups. Na versão 2.0.0, foram adicionados os modos Individual e Dupla, os caminhos automáticos e o resumo sem relatório em arquivo.

A versão 2.0.0 passou por verificações locais de sintaxe e lógica, além da inspeção dos vínculos e dimensões dos modelos fornecidos. Essas verificações não equivalem a um teste completo de renderização no Photoshop; o modo Teste permite validar cada conjunto de modelos antes do lote.

Limitações atuais:

- PDF não é aceito como imagem de entrada nesta versão.
- Cada posição exige uma única camada correspondente de objeto inteligente vinculado.
- Modelos com dimensões ou resolução incompatíveis com os arquivos vinculados selecionados precisam ser processados separadamente com suas referências corretas.
- O desempenho depende do computador, das dimensões das artes e da complexidade dos mockups. Não há benchmark publicado.

## Sobre este projeto

Este projeto demonstra a aplicação de programação a uma rotina de produção visual: levantamento de requisitos reais, padronização de entradas, processamento em lote, tratamento de erros e preservação de arquivos originais.

O repositório apresenta o código e a documentação. Os mockups comerciais, objetos vinculados, coleções de artes e resultados de produção permanecem fora do repositório e devem ser fornecidos localmente para executar a automação.

Referência: [Adobe — Scripting in Photoshop](https://helpx.adobe.com/photoshop/using/scripting.html).
