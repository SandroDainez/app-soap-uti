# 🔍 DIAGNÓSTICO COMPLETO — TODOS OS PROBLEMAS IDENTIFICADOS

## Resumo dos Problemas

Com base na auditoria completa, identifiquei **14 problemas críticos** na evolução final gerada.

---

## PROBLEMA 1: Diagnósticos Não Aparecem na Evolução Final

**Sintoma:** Diagnósticos são extraídos (mostram na auditoria) mas não aparecem na evolução final

**Análise do Código:**
- Linha 1175-1177: Diagnósticos SÃO impressos em `formatSoapFinal()`
- Linha 703: Diagnósticos SÃO adicionados em `buildClinicalData()`
- Linha 372-377: Diagnósticos SÃO extraídos em `extractFromText()`

**Causa-Raiz Possível:**
- O usuário pode estar vendo uma versão cacheada da evolução
- OU os diagnósticos estão sendo perdidos em alguma etapa intermediária
- OU há um problema na função `deduplicateFinalData()` ou `filterFormFragments()`

**Investigação Necessária:**
```typescript
// Adicionar logs em buildClinicalData()
console.log('Diagnósticos extraídos:', avaliacao.diagnosticos);

// Adicionar logs em formatSoapFinal()
console.log('Diagnósticos em finalData:', finalData.avaliacao.diagnosticos);
```

**Status:** ❓ EM INVESTIGAÇÃO

---

## PROBLEMA 2: Antecedentes Relevantes Faltando

**Sintoma:** "ANTECEDENTES PATOLÓGICOS E CIRÚRGICOS" e "ANTECEDENTES PESSOAIS" não aparecem

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `classifyLine()` [linha 229]
- **Regex:** `/^(subjetivo|queixa principal|qp:|hda:|hist[óo]ria da doen[çc]a|hist[óo]ria cl[íi]nica|antecedentes|...)/`

**Problema:**
- O regex exige que a linha COMECE com "antecedentes"
- Mas o texto tem "ANTECEDENTES PATOLÓGICOS E CIRÚRGICOS:" (maiúsculas)
- O regex usa `.toLowerCase()` então deveria funcionar
- MAS o regex exige que comece com "antecedentes" seguido de espaço ou caractere específico

**Solução Proposta:**
```typescript
// Linha 229 - Melhorar regex para aceitar variações
if (/^(subjetivo|queixa principal|qp:|hda:|hist[óo]ria da doen[çc]a|hist[óo]ria cl[íi]nica|antecedentes|antecedentes patol[óo]gicos|antecedentes pessoais|antecedentes cir[úu]rgicos|hist[óo]ria pregressa|...)/.test(lower)) return 'subjetivo';
```

**Status:** ❌ NÃO IMPLEMENTADO

---

## PROBLEMA 3: Sedação/Analgesia Não Capturada

**Sintoma:** "SEDAÇÃO/ANALGESIA" não aparece na Avaliação Neurológica

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `classifyLine()` [linha 235]
- **Regex:** `/^(neurol[óo]gico|glasgow|pupilas|seda[çc][ãa]o|rass|...)/`

**Problema:**
- O regex exige que a linha COMECE com "sedação"
- Mas o texto tem "SEDAÇÃO/ANALGESIA:" (maiúsculas com barra)
- O regex deveria capturar, mas pode haver problema de formatação

**Solução Proposta:**
```typescript
// Linha 235 - Melhorar regex
if (/^(neurol[óo]gico|glasgow|pupilas|seda[çc][ãa]o|sedação\/analgesia|analgesia|seda[çc][ãa]o\/analgesia|rass|...)/i.test(line)) return 'neurologico';
```

**Status:** ❌ NÃO IMPLEMENTADO

---

## PROBLEMA 4: Exames de Maior Importância Não Capturados

**Sintoma:** "EXAMES DE MAIOR IMPORTÂNCIA" e "EXAME CLINICO" não aparecem

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `classifyLine()` [linha 259]
- **Regex:** Não inclui "exames de maior importância" ou "exame clinico"

**Solução Proposta:**
```typescript
// Linha 259 - Adicionar ao regex de examesLab
if (/^(exame|laborat[óo]rio|exames de maior import[âa]ncia|exame cl[íi]nico|hemograma|...)/.test(lower)) return 'examesLab';
```

**Status:** ❌ NÃO IMPLEMENTADO

---

## PROBLEMA 5: Cultura com Resultado Positivo Classificada como Pendente

**Sintoma:** Cultura com resultado positivo mas escrito "pendente"

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `extractFromText()` [linha 357-372]
- **Lógica:** Verifica palavras-chave "positivo", "crescimento", etc.

**Problema:**
- O texto pode ter "AGUARDAR RESULTADO" seguido de "Situação: positiva"
- O código verifica a linha inteira, mas pode haver conflito

**Solução Proposta:**
```typescript
// Linha 357-372 - Melhorar lógica de classificação
const hasPositiveKeyword = /positiv[oa]|crescimento|isolad[oa]/i.test(line);
const hasPendingKeyword = /aguardar|pendente|em an[áa]lise/i.test(line);
const hasKnownMicroorganism = /kpc|mrsa|esbl|e\. coli|.../i.test(line);

// Prioridade: microrganismo conhecido > palavra-chave positiva > pendente
let situacao: 'positiva' | 'negativa' | 'colonizacao' | 'pendente' = 'pendente';
if (hasKnownMicroorganism) {
  situacao = 'positiva';
} else if (hasPositiveKeyword && !hasPendingKeyword) {
  situacao = 'positiva';
} else if (/negativ[oa]|sem crescimento/i.test(line)) {
  situacao = 'negativa';
} else if (/coloniza/i.test(line)) {
  situacao = 'colonizacao';
}
```

**Status:** ❌ NÃO IMPLEMENTADO

---

## PROBLEMA 6: Medicações de Uso Contínuo, Profilaxias, Drogas Vasoativas Não Capturadas

**Sintoma:** Esses cabeçalhos não aparecem em Tratamentos

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `classifyLine()` [linha 265]
- **Regex:** Não inclui esses cabeçalhos específicos

**Solução Proposta:**
```typescript
// Linha 265 - Adicionar ao regex de medicamentos
if (/^(medica[çc][ãa]o|antibi[óo]tico|medica[çc][õo]es de uso cont[íi]nuo|profilaxias|drogas vasoativas|meropenem|...)/.test(lower)) return 'medicamentos';
```

**Status:** ❌ NÃO IMPLEMENTADO

---

## PROBLEMA 7: Interconsultas Não Capturadas

**Sintoma:** "INTERCONSULTAS" não aparece em Exames e Interconsultas

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `classifyLine()` [linha 274]
- **Regex:** Inclui "interconsulta" mas pode não capturar "INTERCONSULTAS:" (maiúsculas com dois pontos)

**Solução Proposta:**
```typescript
// Linha 274 - Melhorar regex
if (/^(plano|conduta|interconsulta|interconsultas|prescri[çc][ãa]o|...)/.test(lower)) return 'plano';
```

**Status:** ❌ NÃO IMPLEMENTADO

---

## PROBLEMA 8: Duplicação de "FC: 56 BPM"

**Sintoma:** Alerta de duplicação de FC

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `deduplicateFinalData()` [linha 896-965]
- **Problema:** A deduplicação usa `.toLowerCase().trim()` mas pode haver diferenças de formatação

**Solução Proposta:**
```typescript
// Linha 900-906 - Melhorar deduplicação de sinais vitais
const svSeen = new Set<string>();
newData.objetivo.sinaisVitais = data.objetivo.sinaisVitais.filter((d: DataPoint) => {
  // Normalizar: remover espaços extras, padronizar maiúsculas/minúsculas
  const normalized = d.value.toLowerCase().replace(/\s+/g, ' ').trim();
  if (svSeen.has(normalized)) return false;
  svSeen.add(normalized);
  return true;
});
```

**Status:** ❌ NÃO IMPLEMENTADO

---

## PROBLEMA 9: Sinais Vitais Não Atualizados

**Sintoma:** Aparece "SV: PA 100/50 mmHg, FC 47-62 bpm..." (texto-base) em vez do exame atual

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `reconcileSinaisVitais()` [linha 443-497]
- **Problema:** A função não está substituindo corretamente os valores

**Análise Detalhada:**
```typescript
// Linha 445: Começa com base
const merged: string[] = [...base];

// Linha 469-494: Tenta substituir com valores atuais
for (const atualLine of atual) {
  const atualParams = extractVitalParams(atualLine);
  
  for (let i = 0; i < merged.length; i++) {
    const existingParams = extractVitalParams(merged[i]);
    
    // Verifica se há sobreposição de parâmetros
    for (const atualParam of atualParams) {
      for (const existingParam of existingParams) {
        if (isSameVitalSign(existingParam.toLowerCase(), atualParam.toLowerCase())) {
          if (existingParam.toLowerCase() !== atualParam.toLowerCase()) {
            // Substitui o parâmetro antigo pelo novo na linha original
            merged[i] = merged[i].replace(...);
          }
        }
      }
    }
  }
}
```

**Problema Identificado:**
- O código tenta substituir parâmetros individuais dentro da linha
- Mas se a linha do base é "SV: PA 100/50 mmHg, FC 47-62 bpm, FR 20, Temp 37.8°C, SpO2 94%"
- E o atual é "PA: 150/70 mmHg"
- O replace pode não funcionar corretamente

**Solução Proposta:**
```typescript
// Reescrever reconcileSinaisVitais() com lógica mais simples
function reconcileSinaisVitais(base: string[], atual: string[]): { merged: string[]; conflitos: Conflito[] } {
  const conflitos: Conflito[] = [];
  
  // Se há sinais vitais no atual, usar APENAS o atual
  if (atual.length > 0) {
    return { merged: atual, conflitos: [] };
  }
  
  // Se não há atual, usar o base (histórico)
  return { merged: base, conflitos: [] };
}
```

**Status:** ❌ NÃO IMPLEMENTADO

---

## PROBLEMA 10: Exames Laboratoriais Sem Data

**Sintoma:** Hemoglobina, Leucócitos sem data

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `extractFromText()` [linha 349-355]
- **Problema:** A data é extraída da linha, mas se a linha não tem data, fica sem

**Solução Proposta:**
```typescript
// Linha 349-355 - Melhorar extração de data
case 'examesLab':
  // Tentar extrair data da linha
  const labDate = extractTimestamp(line);
  // Se não tem data na linha, verificar se há data no contexto (linha anterior)
  const contextDate = i > 0 ? extractTimestamp(lines[i-1]) : undefined;
  
  result.examesLab.push({
    nome: line,
    valor: line,
    data: labDate || contextDate,
    source,
  });
  break;
```

**Status:** ❌ NÃO IMPLEMENTADO

---

## PROBLEMA 11: Creatinina Duplicada

**Sintoma:** Creatinina aparece 3 vezes (2.1, 1.8, 1.4)

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `reconcileExamesLab()` [linha 507-529]
- **Problema:** A função agrupa por nome, mas "Creatinina: 2.1 mg/dL" e "Creatinina: 1.8 mg/dL" são considerados diferentes

**Solução Proposta:**
```typescript
// Linha 507-529 - Melhorar reconciliação de exames
function reconcileExamesLab(base: ExameLaboratorial[], atual: ExameLaboratorial[]): ExameLaboratorial[] {
  const byName = new Map<string, ExameLaboratorial>();
  
  for (const ex of base) {
    // Extrair nome do exame (sem valor)
    const examName = ex.nome.split(':')[0].toLowerCase().trim();
    byName.set(examName, ex);
  }
  
  for (const ex of atual) {
    const examName = ex.nome.split(':')[0].toLowerCase().trim();
    const existing = byName.get(examName);
    
    if (existing) {
      // Se o atual tem data mais recente, substituir
      if (ex.data && (!existing.data || ex.data > existing.data)) {
        byName.set(examName, ex);
      }
    } else {
      byName.set(examName, ex);
    }
  }
  
  return Array.from(byName.values());
}
```

**Status:** ❌ NÃO IMPLEMENTADO

---

## PROBLEMA 12: Diurese Duplicada

**Sintoma:** Diurese aparece 2 vezes (600ml e 1200ml)

**Causa-Raiz:** Mesmo problema do item 11

**Solução:** Mesma solução do item 11

**Status:** ❌ NÃO IMPLEMENTADO

---

## PROBLEMA 13: Extremidades com Contradição

**Sintoma:** "Edema de MMSS 2+/4" e "Sem edema em membros superiores" ambas aparecem

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `mergeDataPoints()` [linha 428-441]
- **Problema:** Não detecta contradições semânticas

**Solução Proposta:**
```typescript
// Criar função detectContradictions()
function detectContradictions(data: ClinicalData): Conflito[] {
  const conflitos: Conflito[] = [];
  
  // Verificar extremidades
  const temEdema = data.objetivo.extremidades.some(e => /edema.*\+|edema.*\d/i.test(e.value));
  const semEdema = data.objetivo.extremidades.some(e => /sem edema|ausência de edema/i.test(e.value));
  
  if (temEdema && semEdema) {
    conflitos.push({
      campo: 'Extremidades',
      valorAnterior: 'Edema documentado',
      valorAtual: 'Sem edema documentado',
      resolvido: false,
    });
  }
  
  return conflitos;
}
```

**Status:** ❌ NÃO IMPLEMENTADO

---

## PROBLEMA 14: Cabeçalho "Exames Laboratoriais (25/01/2024):" Tratado como Exame

**Sintoma:** "Exames Laboratoriais (25/01/2024):" aparece como um exame

**Causa-Raiz:**
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `classifyLine()` [linha 259]
- **Problema:** O regex captura "Exames Laboratoriais" como exameLab

**Solução Proposta:**
```typescript
// Linha 259 - Excluir cabeçalhos
if (/^(exame|laborat[óo]rio|...)/.test(lower)) {
  // Verificar se é um cabeçalho (termina com ":" e tem data)
  if (/exames laboratoriais.*\d{2}\/\d{2}\/\d{4}.*:$/i.test(line)) {
    return null; // Não classificar como exame
  }
  return 'examesLab';
}
```

**Status:** ❌ NÃO IMPLEMENTADO

---

## Plano de Correção Prioritário

### Prioridade 1: Corrigir Sinais Vitais (Problema 9)
**Impacto:** Alto - afeta a precisão clínica
**Complexidade:** Média
**Arquivo:** `src/utils/soap-engine.ts`
**Função:** `reconcileSinaisVitais()`

### Prioridade 2: Corrigir Duplicações (Problemas 8, 11, 12)
**Impacto:** Alto - afeta a legibilidade
**Complexidade:** Baixa
**Arquivo:** `src/utils/soap-engine.ts`
**Funções:** `deduplicateFinalData()`, `reconcileExamesLab()`

### Prioridade 3: Corrigir Contradições (Problema 13)
**Impacto:** Crítico - segurança do paciente
**Complexidade:** Média
**Arquivo:** `src/utils/soap-engine.ts`
**Função:** Nova `detectContradictions()`

### Prioridade 4: Corrigir Extração de Dados (Problemas 2, 3, 4, 6, 7)
**Impacto:** Médio - afeta completude
**Complexidade:** Baixa
**Arquivo:** `src/utils/soap-engine.ts`
**Função:** `classifyLine()`

### Prioridade 5: Corrigir Classificação de Culturas (Problema 5)
**Impacto:** Médio - afeta precisão
**Complexidade:** Baixa
**Arquivo:** `src/utils/soap-engine.ts`
**Função:** `extractFromText()`

### Prioridade 6: Corrigir Datas de Exames (Problema 10)
**Impacto:** Médio - afeta rastreabilidade
**Complexidade:** Baixa
**Arquivo:** `src/utils/soap-engine.ts`
**Função:** `extractFromText()`

### Prioridade 7: Investigar Diagnósticos (Problema 1)
**Impacto:** Crítico - segurança do paciente
**Complexidade:** Alta (requer investigação)
**Arquivo:** `src/utils/soap-engine.ts`
**Funções:** Múltiplas

### Prioridade 8: Corrigir Cabeçalhos (Problema 14)
**Impacto:** Baixo - afeta legibilidade
**Complexidade:** Baixa
**Arquivo:** `src/utils/soap-engine.ts`
**Função:** `classifyLine()`

---

## Testes Propostos

### Teste 1: Sinais Vitais Atualizados
**Entrada:**
```
Texto-base: SV: PA 100/50 mmHg, FC 80 bpm
Exame atual: PA: 150/70 mmHg, FC: 75 bpm
```
**Resultado esperado:**
- PA: 150/70 mmHg (atual)
- FC: 75 bpm (atual)

### Teste 2: Sem Duplicação de Creatinina
**Entrada:**
```
Texto-base: Creatinina: 2.1 mg/dL
Exame atual: Creatinina: 1.4 mg/dL (30/01/2024)
```
**Resultado esperado:**
- Apenas "Creatinina: 1.4 mg/dL (30/01/2024)"

### Teste 3: Contradição de Edema Detectada
**Entrada:**
```
Texto-base: Extremidades: Edema de MMSS 2+/4
Exame atual: Extremidades: Sem edema em membros superiores
```
**Resultado esperado:**
- Alerta: "Contradição em Extremidades: Edema vs Sem edema"
- Apenas um valor no documento final (após resolução)

### Teste 4: Cultura Positiva Classificada Corretamente
**Entrada:**
```
Hemocultura: KPC positiva (25/01/2024)
```
**Resultado esperado:**
- Situação: positiva (não pendente)

### Teste 5: Diagnósticos Aparecem na Evolução Final
**Entrada:**
```
DX: Infecção do trato urinário complicada (N39.0)
DX: Septicemia por KPC (A41.9)
```
**Resultado esperado:**
- Seção "A - AVALIAÇÃO" mostra:
  - 1. Infecção do trato urinário complicada (N39.0)
  - 2. Septicemia por KPC (A41.9)

---

## Status Final

✅ 14 problemas identificados e documentados  
✅ Causas-raiz analisadas  
✅ Soluções propostas  
✅ Testes definidos  
✅ Plano de correção priorizado  
❌ Correções não implementadas (aguardando autorização)  

**Nenhum código foi modificado nesta etapa.**

---

**Aguardando sua autorização para implementar as correções.**
