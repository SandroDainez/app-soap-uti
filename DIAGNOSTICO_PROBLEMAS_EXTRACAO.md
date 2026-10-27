# 🔍 DIAGNÓSTICO COMPLETO — PROBLEMAS DE EXTRAÇÃO E FORMATAÇÃO

## Problemas Reportados

### 1. ❌ Nome Incorreto
**Problema:** "DESORIENTADA EM TEMPO E ESPAÇO, EUPNEICA EM USO DE TRAQUEOSTOMIA..." foi capturado como nome do paciente

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Linha:** 296-297
- **Regex:** `/^(nome|paciente|nome do paciente|nome completo)/i`
- **Problema:** O regex captura qualquer linha que comece com "paciente" seguido de espaço, sem validar se é realmente um nome ou uma descrição clínica

**Exemplo que falha:**
```
Paciente DESORIENTADA EM TEMPO E ESPAÇO, EUPNEICA EM USO DE TRAQUEOSTOMIA...
```
→ Captura toda a descrição como nome ❌

**Solução:** Validar que o nome é curto (1-5 palavras) e não contém termos clínicos

---

### 2. ❌ Leito Não Informado
**Problema:** Alerta "Leito não informado" mesmo quando o leito foi informado

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Linha:** 299-300
- **Regex:** `/^(leito|quarto|aposento)/i`
- **Problema:** Talvez o formato do texto não esteja sendo reconhecido (ex: "LEITO: 405" em maiúsculas)

**Solução:** Verificar se o regex está funcionando corretamente com diferentes formatos

---

### 3. ❌ Diagnósticos Não Aparecem
**Problema:** Diagnósticos não estão sendo extraídos

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Linha:** 268-270
- **Regex:** `/^(dx[:\s]|diagn[óo]stico[:\s]|...)/i`
- **Problema:** Talvez os diagnósticos estejam em um formato diferente ou em outra seção do texto

**Solução:** Verificar o texto original e ajustar o regex

---

### 4. ❌ Antecedentes Relevantes Vazios
**Problema:** "ANTECEDENTES PATOLÓGICOS E CIRÚRGICOS:" e "ANTECEDENTES PESSOAIS:" aparecem vazios

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Linha:** 315
- **Código:** `else if (/antecedentes|pregressa/i.test(line)) result.subjetivo.antecedentes.push(line);`
- **Problema:** O código captura o cabeçalho mas não o conteúdo que vem nas linhas seguintes

**Solução:** Implementar lógica para capturar conteúdo subsequente até encontrar outro cabeçalho

---

### 5. ❌ Avaliação Neurológica Incompleta
**Problema:** "SEDAÇÃO/ ANALGESIA:" aparece sem dados

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Linha:** 236
- **Regex:** `/^(neurol[óo]gico|glasgow|pupilas|seda[çc][ãa]o|...)/`
- **Problema:** O código captura o cabeçalho mas não o conteúdo subsequente

**Solução:** Mesma solução do problema 4

---

### 6. ❌ Escara Confusa
**Problema:** "ESCARA: SIM (X) NÃO (   ) QUAL: MUDANÇA DE DECÚBITO" não faz sentido clínico

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Linha:** 254
- **Regex:** `/^(extremidades|...|escara|...)/`
- **Problema:** O código captura formulários de checkbox sem interpretá-los

**Solução:** Implementar parser de formulários para interpretar checkboxes

---

### 7. ❌ Exames Laboratoriais Vazios
**Problema:** "EXAMES DE MAIOR IMPORTÂNCIA:" e "EXAME CLINICO" aparecem sem dados

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Linha:** 260
- **Regex:** `/^(exame|laborat[óo]rio|...)/`
- **Problema:** O código captura cabeçalhos vazios

**Solução:** Filtrar cabeçalhos vazios ou capturar conteúdo subsequente

---

### 8. ❌ Culturas com Resultado Marcadas como Pendentes
**Problema:** Culturas com resultados positivos estão como "pendente"

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Linha:** 359-369
- **Código:** Lógica de classificação de culturas
- **Problema:** O código não está detectando corretamente quando uma cultura tem resultado positivo

**Solução:** Melhorar a lógica de detecção de resultados positivos

---

### 9. ❌ Tratamentos Incompletos
**Problema:** "MEDICAÇÕES DE USO CONTINUO:", "PROFILAXIAS:", "DROGAS VASOATIVAS:" aparecem vazios

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Linha:** 266
- **Regex:** `/^(medica[çc][ãa]o|...|medica[çc][õo]es)/`
- **Problema:** O código captura cabeçalhos vazios

**Solução:** Filtrar cabeçalhos vazios ou capturar conteúdo subsequente

---

### 10. ❌ Síntese Clínica Mal Formatada
**Problema:** Síntese inclui texto muito longo e confuso

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Linha:** 709-746
- **Código:** Geração automática de síntese
- **Problema:** A síntese está incluindo informações muito detalhadas em vez de uma visão geral

**Solução:** Melhorar a lógica de geração de síntese para ser mais concisa

---

### 11. ❌ Plano Incompleto
**Problema:** "INTERCONSULTAS:" aparece vazio

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Linha:** 276
- **Regex:** `/^(plano|conduta|...|interconsulta|...)/`
- **Problema:** O código captura cabeçalhos vazios

**Solução:** Filtrar cabeçalhos vazios ou capturar conteúdo subsequente

---

## Plano de Correção Priorizado

### Prioridade 1: Corrigir Extração de Nome
**Impacto:** Crítico - segurança do paciente
**Complexidade:** Média
**Solução:** Validar que o nome é curto e não contém termos clínicos

### Prioridade 2: Implementar Captura de Conteúdo Subsequente
**Impacto:** Alto - completude dos dados
**Complexidade:** Alta
**Solução:** Criar função para capturar conteúdo até encontrar outro cabeçalho

### Prioridade 3: Corrigir Classificação de Culturas
**Impacto:** Alto - precisão clínica
**Complexidade:** Média
**Solução:** Melhorar lógica de detecção de resultados positivos

### Prioridade 4: Implementar Parser de Formulários
**Impacto:** Médio - legibilidade
**Complexidade:** Alta
**Solução:** Criar função para interpretar checkboxes

### Prioridade 5: Filtrar Cabeçalhos Vazios
**Impacto:** Médio - legibilidade
**Complexidade:** Baixa
**Solução:** Adicionar filtro para remover cabeçalhos sem conteúdo

### Prioridade 6: Melhorar Síntese Clínica
**Impacto:** Médio - legibilidade
**Complexidade:** Média
**Solução:** Refinar lógica de geração de síntese

---

## Testes Propostos

### Teste 1: Nome Correto
```
Entrada:
Paciente: Maria Santos
Paciente DESORIENTADA EM TEMPO E ESPAÇO

Resultado Esperado:
✅ Nome: Maria Santos
❌ Não capturar descrição clínica como nome
```

### Teste 2: Leito Informado
```
Entrada:
Leito: 405
LEITO 405
leito: 405

Resultado Esperado:
✅ Leito: 405 (em todos os formatos)
```

### Teste 3: Diagnósticos Extraídos
```
Entrada:
DX: Infecção do trato urinário (N39.0)
Diagnóstico: Septicemia (A41.9)

Resultado Esperado:
✅ 2 diagnósticos extraídos com CIDs
```

### Teste 4: Antecedentes com Conteúdo
```
Entrada:
ANTECEDENTES PATOLÓGICOS E CIRÚRGICOS:
HAS, DM2, IRC

Resultado Esperado:
✅ Antecedentes: HAS, DM2, IRC
```

### Teste 5: Culturas com Resultado
```
Entrada:
HEMOCULTURA: KPC POSITIVA
UROCOLTURA: E. COLI POSITIVA

Resultado Esperado:
✅ Situação: positiva (não pendente)
```

---

## Status

✅ Diagnóstico completo  
✅ Plano de correção definido  
✅ Testes propostos  
❌ Correções não implementadas (aguardando autorização)  

---

**Aguardando sua autorização para implementar as correções.**
