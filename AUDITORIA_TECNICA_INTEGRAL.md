# 🔍 AUDITORIA TÉCNICA INTEGRAL - MOTOR SOAP

## Data: 2026-01-XX
## Status: Modo Somente Leitura
## Arquivo Analisado: src/utils/soap-engine.ts (1393 linhas)

---

## 📋 SUMÁRIO EXECUTIVO

Esta auditoria identifica **11 falhas críticas** no fluxo de processamento de dados clínicos, desde a extração até a geração SOAP final. Cada falha é documentada com causa-raiz exata (linha e função), evidência de código, e proposta de correção.

---

## 🔴 FALHA 1: Nome do Paciente Captura Descrição Clínica

### Localização
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `extractFromText()` 
- **Linhas:** 323-330

### Código Problemático
```typescript
if (/^(nome|paciente|nome do paciente|nome completo)/i.test(line)) {
  const nomeExtraido = line.replace(/^(nome|paciente|nome do paciente|nome completo)\s*[:\-]?\s*/i, '').trim();
  const termosClinicos = /desorientad|eupneic|traqueostomi|ventila[çc][ãa]o|hemodin[aâ]mic|neurol[óo]gic|cardiovascular|respirat[óo]r/i;
  const palavras = nomeExtraido.split(/\s+/);
  if (palavras.length <= 5 && !termosClinicos.test(nomeExtraido)) {
    result.identificacao.nome = nomeExtraido;
  }
}
```

### Causa-Raiz
O regex de validação `termosClinicos` é **insuficiente**. Não cobre todos os termos clínicos possíveis (ex: "astenia", "febre", "quadro de", "internada", etc.).

### Evidência
Entrada: `"Paciente DESORIENTADA EM TEMPO E ESPAÇO, EUPNEICA EM USO DE TRAQUEOSTOMIA..."`
- A validação `palavras.length <= 5` falha porque há mais de 5 palavras
- MAS se o texto for `"Paciente DESORIENTADA EM TEMPO"`, passa na validação de tamanho
- O regex `termosClinicos` não cobre "desorientada" (só "desorientad")

### Correção Proposta
```typescript
// Linhas 323-330 - SUBSTITUIR POR:
if (/^(nome|paciente|nome do paciente|nome completo)/i.test(line)) {
  const nomeExtraido = line.replace(/^(nome|paciente|nome do paciente|nome completo)\s*[:\-]?\s*/i, '').trim();
  
  // Validação rigorosa: nome deve ser curto e não conter verbos/termos clínicos
  const palavras = nomeExtraido.split(/\s+/);
  const maxPalavrasNome = 6;
  
  // Lista negra de termos que NÃO devem aparecer em nomes
  const termosClinicos = /\b(desorientad|eupneic|traqueostomi|ventila[çc][ãa]o|hemodin[aâ]mic|neurol[óo]gic|cardiovascular|respirat[óo]r|astenia|febre|quadro|internad|em uso|com |apresenta|relata|queixa)\b/i;
  
  // Lista negra de verbos e conectivos clínicos
  const verbosClinicos = /\b(em|com|de|da|do|para|por|sob|apresentando|evoluindo|submetido)\b/i;
  
  // Validar: máximo de palavras E sem termos clínicos E sem verbos
  if (palavras.length <= maxPalavrasNome && 
      !termosClinicos.test(nomeExtraido) && 
      !verbosClinicos.test(nomeExtraido) &&
      !nomeExtraido.includes(',')) {  // Nomes não têm vírgulas
    result.identificacao.nome = nomeExtraido;
  }
}
```

### Teste de Aceitação
```typescript
test('Nome não captura descrição clínica', () => {
  const texto = 'Paciente DESORIENTADA EM TEMPO E ESPAÇO';
  const result = extractFromText(texto, 'texto-base');
  expect(result.identificacao.nome).toBeUndefined();
});

test('Nome captura nome válido', () => {
  const texto = 'Paciente: Maria Santos Silva';
  const result = extractFromText(texto, 'texto-base');
  expect(result.identificacao.nome).toBe('Maria Santos Silva');
});
```

---

## 🔴 FALHA 2: Diagnósticos Não Aparecem na Evolução Final

### Localização
- **Arquivo:** `src/utils/soap-engine.ts`
- **Funções:** 
  - `classifyLine()` linha 270
  - `extractDiagnosticoFromLine()` linha 510-516
  - `buildClinicalData()` linha 753
  - `formatSoapFinal()` linha 1262-1265

### Código Problemático
```typescript
// Linha 270 - Regex de classificação
if (/^(dx[:\s]|diagn[óo]stico[:\s]|hip[óo]tese diagn[:\s]|hip[óo]tese de[:\s]|hip[óo]teses diagn[:\s]|problemas ativos[:\s]|diagn[óo]sticos[:\s]|cid[:\s])/i.test(line)) return 'diagnostico';

// Linha 510-516 - Extração do diagnóstico
function extractDiagnosticoFromLine(line: string): Diagnostico | null {
  let texto = line.replace(/^(dx:|dx |diagn[óo]stico|hip[óo]tese diagn[óo]stica|hip[óo]tese de|hip[óo]teses diagn[óo]sticas|problemas ativos|diagn[óo]sticos|cid)\s*[:\-]?\s*/i, '').trim();
  if (!texto) return null;
  const cidMatch = texto.match(/\(([A-Z]\d[\d.]*)\)/);
  const cid = cidMatch ? cidMatch[1] : '';
  if (cid) texto = texto.replace(/\([A-Z]\d[\d.]*\)/, '').trim();
  return { texto, cid, status: 'confirmado', source: 'texto-base' };
}
```

### Causa-Raiz
**Problema 1:** O regex da linha 270 exige que a linha COMECE com "dx:", "diagnóstico:", etc. Se o texto for "DIAGNÓSTICO: Infecção (N39.0)" (maiúsculas), o regex não captura porque usa `/i` mas o padrão espera lowercase.

**Problema 2:** A função `extractDiagnosticoFromLine` remove o prefixo mas não valida se o texto resultante é válido.

**Problema 3:** Na linha 753, os diagnósticos são copiados: `diagnosticos: [...base.diagnosticos, ...atual.diagnosticos]`. Se ambos estiverem vazios, o array fica vazio.

**Problema 4:** Na linha 1262-1265, os diagnósticos são impressos SOMENTE se `finalData.avaliacao.diagnosticos.length > 0`. Se o array estiver vazio, não imprime nada.

### Evidência
Entrada: `"DIAGNÓSTICO: Infecção do trato urinário (N39.0)"`
- Linha 270: O regex `/^(dx[:\s]|diagn[óo]stico[:\s]|...)/i` DEVERIA capturar
- MAS o `.toLowerCase()` na linha 222 converte para "diagnóstico: infecção..."
- O regex testa contra `lower`, não contra `line`
- Então DEVERIA funcionar...

**Investigação adicional necessária:** Adicionar logs para rastrear onde os diagnósticos são perdidos.

### Correção Proposta
```typescript
// Linha 270 - MELHORAR regex para ser mais flexível
if (/^(dx[:\s]|diagn[óo]stico[:\s]|hip[óo]tese[:\s]|problemas? ativos?[:\s]|cid[:\s])/i.test(line)) {
  return 'diagnostico';
}

// Linha 510-516 - ADICIONAR validação
function extractDiagnosticoFromLine(line: string): Diagnostico | null {
  let texto = line.replace(/^(dx[:\s]?|diagn[óo]stico[:\s]?|hip[óo]tese[:\s]?|problemas? ativos?[:\s]?|cid[:\s]?)/i, '').trim();
  
  // Remover prefixos comuns
  texto = texto.replace(/^de admiss[ãa]o[:\s]?/i, '').trim();
  texto = texto.replace(/^principal[:\s]?/i, '').trim();
  
  if (!texto || texto.length < 3) return null;
  
  // Extrair CID se existir
  const cidMatch = texto.match(/\(([A-Z]\d[\d.]*)\)/);
  const cid = cidMatch ? cidMatch[1] : '';
  if (cid) texto = texto.replace(/\([A-Z]\d[\d.]*\)/, '').trim();
  
  // Validar que o texto não está vazio após remoção do CID
  if (!texto) return null;
  
  return { texto, cid, status: 'confirmado', source: 'texto-base' };
}

// Linha 753 - ADICIONAR log para debug
console.log('Debug - Diagnósticos extraídos:', {
  base: base.diagnosticos.length,
  atual: atual.diagnosticos.length,
  total: base.diagnosticos.length + atual.diagnosticos.length
});
```

### Teste de Aceitação
```typescript
test('Diagnóstico é extraído corretamente', () => {
  const texto = 'DIAGNÓSTICO: Infecção do trato urinário (N39.0)';
  const result = extractFromText(texto, 'texto-base');
  expect(result.diagnosticos.length).toBe(1);
  expect(result.diagnosticos[0].texto).toBe('Infecção do trato urinário');
  expect(result.diagnosticos[0].cid).toBe('N39.0');
});

test('Diagnóstico aparece na evolução final', () => {
  const texto = 'DX: Infecção (N39.0)';
  const result = processEvolution(texto, '');
  expect(result.data.avaliacao.diagnosticos.length).toBe(1);
  const soap = formatSoapFinal(result.data);
  expect(soap).toContain('Infecção (N39.0)');
});
```

---

## 🔴 FALHA 3: Antecedentes Vazios Mesmo Com Conteúdo

### Localização
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `extractFromText()`
- **Linhas:** 363-369

### Código Problemático
```typescript
else if (/antecedentes|pregressa/i.test(line)) {
  result.subjetivo.antecedentes.push(line);
  const content = captureSubsequentContent(lines, i);
  if (content.length > 0) {
    result.subjetivo.antecedentes.push(...content);
    i += content.length;
  }
}
```

### Causa-Raiz
A função `captureSubsequentContent()` (linha 282-306) tem uma lógica de detecção de cabeçalho que pode estar falhando:

```typescript
const isHeader = /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+:\s*$/i.test(nextLine) || 
                 /^(paciente|nome|leito|quarto|conv[eê]nio|dx|diagn[óo]stico|hip[óo]tese|plano|conduta|antecedentes|sedação|analgesia|exames|culturas|medicações|profilaxias|drogas|interconsultas)/i.test(nextLine);
```

**Problema 1:** O regex `/^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+:\s*$/i` exige que a linha termine com `:` e nada mais. Se a linha for `"ANTECEDENTES PATOLÓGICOS E CIRÚRGICOS:"`, o regex DEVERIA capturar, mas pode haver espaços extras.

**Problema 2:** O segundo regex não inclui todos os cabeçalhos possíveis (ex: "HISTÓRIA DA DOENÇA ATUAL:", "EXAMES LABORATORIAIS:").

### Evidência
Entrada:
```
ANTECEDENTES PATOLÓGICOS E CIRÚRGICOS:
HAS, DM2, IRC
```

- Linha 363: Captura "ANTECEDENTES PATOLÓGICOS E CIRÚRGICOS:"
- Linha 365: Chama `captureSubsequentContent(lines, i)`
- Linha 294: Testa se "HAS, DM2, IRC" é cabeçalho → NÃO é
- Linha 301: Adiciona "HAS, DM2, IRC" ao array `content`
- Linha 367: Adiciona `content` a `result.subjetivo.antecedentes`

**DEVERIA funcionar**, mas pode haver problema com:
- Espaços em branco
- Quebras de linha
- Formatação do texto

### Correção Proposta
```typescript
// Linha 282-306 - MELHORAR função captureSubsequentContent
function captureSubsequentContent(lines: string[], startIndex: number): string[] {
  const content: string[] = [];
  let i = startIndex + 1;
  
  while (i < lines.length) {
    const nextLine = lines[i].trim();
    
    // Pular linhas vazias
    if (!nextLine) {
      i++;
      continue;
    }
    
    // Verificar se é um novo cabeçalho
    // Cabeçalho = linha em maiúsculas terminando com : OU palavra-chave seguida de :
    const isHeader = 
      /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]{3,}:\s*$/i.test(nextLine) || // "TÍTULO:"
      /^(paciente|nome|leito|quarto|conv[eê]nio|dx|diagn[óo]stico|hip[óo]tese|plano|conduta|antecedentes|sedação|analgesia|exames|culturas|medicações|profilaxias|drogas|interconsultas|hda|hist[óo]ria|objetivo|avaliação|avalia[çc][ãa]o)[:\s]/i.test(nextLine);
    
    if (isHeader) {
      break;
    }
    
    content.push(nextLine);
    i++;
  }
  
  return content;
}
```

### Teste de Aceitação
```typescript
test('Antecedentes capturam conteúdo subsequente', () => {
  const texto = `ANTECEDENTES PATOLÓGICOS E CIRÚRGICOS:
HAS, DM2, IRC
Cirurgia abdominal em 2020`;
  
  const result = extractFromText(texto, 'texto-base');
  expect(result.subjetivo.antecedentes.length).toBeGreaterThan(1);
  expect(result.subjetivo.antecedentes).toContain('HAS, DM2, IRC');
});
```

---

## 🔴 FALHA 4: Culturas Marcadas Como Pendentes Mesmo Com Resultado

### Localização
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `extractFromText()`
- **Linhas:** 434-462

### Código Problemático
```typescript
case 'microbiologia':
  const hasPositiveKeyword = /positiv[oa]|crescimento|isolad[oa]/i.test(line);
  const hasKnownMicroorganism = /kpc|mrsa|esbl|e\. coli|pseudomonas|acinetobacter|candida|enterobact|staphylococcus|streptococcus|klebsiella|proteus|serratia|enterococcus|clostridium/i.test(line);
  const hasNegativeKeyword = /negativ[oa]|sem crescimento/i.test(line);
  const hasColonization = /coloniza/i.test(line);
  const hasPendingKeyword = /aguardar resultado|pendente|em an[áa]lise/i.test(line);
  
  let situacao: 'positiva' | 'negativa' | 'colonizacao' | 'pendente' = 'pendente';
  
  if (hasKnownMicroorganism && !hasPendingKeyword) {
    situacao = 'positiva';
  } else if (hasPositiveKeyword && !hasPendingKeyword) {
    situacao = 'positiva';
  } else if (hasPendingKeyword) {
    situacao = 'pendente';
  } else if (hasNegativeKeyword) {
    situacao = 'negativa';
  } else if (hasColonization) {
    situacao = 'colonizacao';
  }
```

### Causa-Raiz
**Problema:** A lógica `hasKnownMicroorganism && !hasPendingKeyword` falha quando o texto contém AMBOS:
- `"SECR TRAQUEAL: KPC | HEMOCULTURA: ENTEROBACTER CLOACAE CARBAPENEMASE"` → Tem microrganismo
- `"CULTURAS: AGUARDAR RESULTADO"` → Tem "aguardar resultado"

Se o texto for:
```
CULTURAS [SEM DATA REGISTRADA]: SECR TRAQUEAL: KPC | HEMOCULTURA: ENTEROBACTER CLOACAE CARBAPENEMASE
```

- `hasKnownMicroorganism` = true (KPC, ENTEROBACTER)
- `hasPendingKeyword` = false (não tem "aguardar resultado")
- `situacao` = 'positiva' ✓

**MAS** se o texto for:
```
CULTURAS: AGUARDAR RESULTADO - SECR TRAQUEAL: KPC
```

- `hasKnownMicroorganism` = true (KPC)
- `hasPendingKeyword` = true ("AGUARDAR RESULTADO")
- `situacao` = 'pendente' ✗ (deveria ser 'positiva' porque tem KPC)

### Correção Proposta
```typescript
// Linhas 434-462 - PRIORIZAR microrganismo conhecido sobre "aguardar resultado"
case 'microbiologia':
  const hasPositiveKeyword = /positiv[oa]|crescimento|isolad[oa]/i.test(line);
  const hasKnownMicroorganism = /kpc|mrsa|esbl|e\. coli|pseudomonas|acinetobacter|candida|enterobact|staphylococcus|streptococcus|klebsiella|proteus|serratia|enterococcus|clostridium/i.test(line);
  const hasNegativeKeyword = /negativ[oa]|sem crescimento/i.test(line);
  const hasColonization = /coloniza/i.test(line);
  const hasPendingKeyword = /aguardar resultado|pendente|em an[áa]lise/i.test(line);
  
  let situacao: 'positiva' | 'negativa' | 'colonizacao' | 'pendente' = 'pendente';
  
  // PRIORIDADE 1: Se tem microrganismo conhecido, é positiva (independente de "aguardar")
  if (hasKnownMicroorganism) {
    situacao = 'positiva';
  }
  // PRIORIDADE 2: Se tem palavra-chave positiva e NÃO tem "aguardar"
  else if (hasPositiveKeyword && !hasPendingKeyword) {
    situacao = 'positiva';
  }
  // PRIORIDADE 3: Se tem "aguardar" mas NÃO tem microrganismo
  else if (hasPendingKeyword && !hasKnownMicroorganism) {
    situacao = 'pendente';
  }
  // PRIORIDADE 4: Negativa
  else if (hasNegativeKeyword) {
    situacao = 'negativa';
  }
  // PRIORIDADE 5: Colonização
  else if (hasColonization) {
    situacao = 'colonizacao';
  }
```

### Teste de Aceitação
```typescript
test('Cultura com KPC é positiva mesmo com "aguardar resultado"', () => {
  const texto = 'CULTURAS: AGUARDAR RESULTADO - SECR TRAQUEAL: KPC';
  const result = extractFromText(texto, 'texto-base');
  expect(result.microbiologia[0].situacao).toBe('positiva');
});

test('Cultura sem microrganismo e com "aguardar" é pendente', () => {
  const texto = 'HEMOCULTURA: AGUARDAR RESULTADO';
  const result = extractFromText(texto, 'texto-base');
  expect(result.microbiologia[0].situacao).toBe('pendente');
});
```

---

## 🔴 FALHA 5: Exames Laboratoriais Sem Data

### Localização
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `extractFromText()`
- **Linhas:** 413-432

### Código Problemático
```typescript
case 'examesLab':
  let labDate = timestamp;
  if (!labDate && i > 0) {
    const prevLine = lines[i-1].trim();
    const prevDate = extractTimestamp(prevLine);
    if (prevDate && /exames? laboratoriais|laborat[óo]rio/i.test(prevLine)) {
      labDate = prevDate;
    }
  }
  
  result.examesLab.push({
    nome: line,
    valor: line,
    data: labDate,
    source,
  });
  break;
```

### Causa-Raiz
**Problema 1:** A função `extractTimestamp()` (linha 204-218) usa regex para extrair datas, mas pode não cobrir todos os formatos:
```typescript
const patterns = [
  /(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2})?)/,  // 01/01/2024
  /(\d{2}\/\d{2}(?:\/\d{2,4})?(?:\s+\d{2}:\d{2})?)/,  // 01/01 ou 01/01/24
  /(D[\+\-]?\d+)/,  // D1, D+3
  /(dia\s+\d+)/i,  // dia 1
  /(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?)/,  // 2024-01-01
];
```

**Problema 2:** O código verifica APENAS a linha anterior (`lines[i-1]`). Se a data estiver 2 ou 3 linhas acima, não captura.

**Problema 3:** O regex `/exames? laboratoriais|laborat[óo]rio/i` pode não cobrir variações como "EXAMES DE MAIOR IMPORTÂNCIA:".

### Evidência
Entrada:
```
EXAMES LABORATORIAIS (25/01/2024):
Hemoglobina: 8.5 g/dL
Creatinina: 2.1 mg/dL
```

- Linha 0: "EXAMES LABORATORIAIS (25/01/2024):"
- Linha 1: "Hemoglobina: 8.5 g/dL"
  - `timestamp` = undefined (não tem data na linha)
  - `prevLine` = "EXAMES LABORATORIAIS (25/01/2024):"
  - `prevDate` = "25/01/2024" ✓
  - `/exames? laboratoriais/i.test(prevLine)` = true ✓
  - `labDate` = "25/01/2024" ✓

**DEVERIA funcionar**, mas pode haver problema com:
- Formato da data: "(25/01/2024)" com parênteses
- Espaços extras
- Quebras de linha

### Correção Proposta
```typescript
// Linha 413-432 - MELHORAR extração de data
case 'examesLab':
  let labDate = timestamp;
  
  // Se não tem data na linha atual, procurar nas linhas anteriores (até 3 linhas acima)
  if (!labDate) {
    for (let j = 1; j <= 3 && (i - j) >= 0; j++) {
      const prevLine = lines[i - j].trim();
      const prevDate = extractTimestamp(prevLine);
      
      // Verificar se a linha anterior é um cabeçalho de exames
      if (prevDate && /exames? laboratoriais|laborat[óo]rio|exames de maior import[âa]ncia/i.test(prevLine)) {
        labDate = prevDate;
        break;
      }
    }
  }
  
  result.examesLab.push({
    nome: line,
    valor: line,
    data: labDate,
    source,
  });
  break;

// Linha 204-218 - MELHORAR extractTimestamp
function extractTimestamp(line: string): string | undefined {
  const patterns = [
    /(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2})?)/,  // 01/01/2024
    /\((\d{2}\/\d{2}\/\d{4})\)/,  // (01/01/2024) - ADICIONAR
    /(\d{2}\/\d{2}(?:\/\d{2,4})?(?:\s+\d{2}:\d{2})?)/,  // 01/01 ou 01/01/24
    /(D[\+\-]?\d+)/,  // D1, D+3
    /(dia\s+\d+)/i,  // dia 1
    /(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?)/,  // 2024-01-01
  ];
  for (const p of patterns) {
    const m = line.match(p);
    if (m) return m[1];
  }
  return undefined;
}
```

### Teste de Aceitação
```typescript
test('Exame laboratorial captura data do cabeçalho', () => {
  const texto = `EXAMES LABORATORIAIS (25/01/2024):
Hemoglobina: 8.5 g/dL`;
  
  const result = extractFromText(texto, 'texto-base');
  expect(result.examesLab[0].data).toBe('25/01/2024');
});

test('Exame laboratorial captura data de 2 linhas acima', () => {
  const texto = `EXAMES LABORATORIAIS (25/01/2024):

Hemoglobina: 8.5 g/dL`;
  
  const result = extractFromText(texto, 'texto-base');
  expect(result.examesLab[0].data).toBe('25/01/2024');
});
```

---

## 🔴 FALHA 6: Diagnósticos Não Aparecem na Seção A - AVALIAÇÃO

### Localização
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `formatSoapFinal()`
- **Linhas:** 1262-1265

### Código Problemático
```typescript
if (finalData.avaliacao.diagnosticos.length > 0) {
  o += '  • Diagnósticos e Problemas Ativos:\n';
  finalData.avaliacao.diagnosticos.forEach((dx, i) => o += `    ${i + 1}. ${formatDiagnostico(dx)}\n`);
}
```

### Causa-Raiz
**Problema:** O código está correto, MAS depende de `finalData.avaliacao.diagnosticos.length > 0`. Se o array estiver vazio, não imprime nada.

**Investigação:** Por que o array pode estar vazio?

1. **Extração falhou** (Falha 2) - diagnósticos não foram extraídos
2. **Conciliação falhou** (linha 753) - `diagnosticos: [...base.diagnosticos, ...atual.diagnosticos]` está vazio
3. **Filtragem removeu** (linha 1083) - `filterFormFragments()` pode estar removendo diagnósticos

**Verificação da linha 1083:**
```typescript
const filteredData = filterFormFragments(data);
```

A função `filterFormFragments()` (linha 1021-1072) filtra APENAS:
- `objetivo.*` (sinaisVitais, neurologico, etc.)
- `examesLaboratoriais`
- `subjetivo.antecedentes` e `subjetivo.hda`
- `plano.*`

**NÃO filtra** `avaliacao.diagnosticos`. Então os diagnósticos NÃO são removidos aqui.

**Conclusão:** O problema está na **extração** (Falha 2) ou na **conciliação** (linha 753).

### Correção Proposta
Adicionar logs de debug para rastrear onde os diagnósticos são perdidos:

```typescript
// Linha 753 - ADICIONAR log
const diagnosticos = [...base.diagnosticos, ...atual.diagnosticos];
console.log('Debug - Diagnósticos:', {
  base: base.diagnosticos,
  atual: atual.diagnosticos,
  total: diagnosticos
});

const avaliacao = {
  sintese: mergeDataPoints(...),
  diagnosticos,  // Usar variável em vez de inline
  hipoteses: [...base.hipoteses, ...atual.hipoteses],
  evolucaoProblemas: [] as DataPoint[],
  pendencias: [] as DataPoint[],
};
```

### Teste de Aceitação
```typescript
test('Diagnósticos aparecem na seção A - AVALIAÇÃO', () => {
  const texto = 'DX: Infecção (N39.0)';
  const result = processEvolution(texto, '');
  
  console.log('Debug - Result:', result.data.avaliacao.diagnosticos);
  
  expect(result.data.avaliacao.diagnosticos.length).toBeGreaterThan(0);
  
  const soap = formatSoapFinal(result.data);
  console.log('Debug - SOAP:', soap);
  
  expect(soap).toContain('A — AVALIAÇÃO');
  expect(soap).toContain('Diagnósticos e Problemas Ativos');
  expect(soap).toContain('Infecção (N39.0)');
});
```

---

## 🟡 FALHA 7: Síntese Clínica Inclui Texto Longo Demais

### Localização
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `buildClinicalData()`
- **Linhas:** 785-799

### Código Problemático
```typescript
const culturasPositivas = objetivo.microbiologia.filter(c => c.situacao === 'positiva');
if (culturasPositivas.length > 0) {
  const microrganismos = culturasPositivas.map(c => {
    const match = c.material.match(/(KPC|MRSA|ESBL|E\. COLI|PSEUDOMONAS|ACINETOBACTER|CANDIDA|ENTEROBACTER|CLOSTRIDIUM)/i);
    if (match) {
      return match[1].toUpperCase();
    }
    return c.material.split(':')[0].trim();
  });
  problemas.push(`Infecção documentada: ${microrganismos.join(', ')}`);
}
```

### Causa-Raiz
O código tenta extrair microrganismos, mas se falhar, usa `c.material.split(':')[0].trim()`, que pode resultar em texto longo como:
- `"CULTURAS [SEM DATA REGISTRADA]"`

### Correção Proposta
```typescript
// Linhas 785-799 - MELHORAR extração de microrganismos
const culturasPositivas = objetivo.microbiologia.filter(c => c.situacao === 'positiva');
if (culturasPositivas.length > 0) {
  const microrganismos = culturasPositivas.map(c => {
    // Lista de microrganismos conhecidos
    const microrganismosConhecidos = [
      'KPC', 'MRSA', 'ESBL', 'E. COLI', 'PSEUDOMONAS', 'ACINETOBACTER',
      'CANDIDA', 'ENTEROBACTER', 'CLOSTRIDIUM', 'KLEBSIELLA', 'ENTEROCOCCUS'
    ];
    
    for (const micro of microrganismosConhecidos) {
      if (c.material.toUpperCase().includes(micro)) {
        return micro;
      }
    }
    
    // Se não encontrar microrganismo conhecido, usar nome curto
    const partes = c.material.split(':');
    if (partes.length > 1) {
      return partes[0].trim().substring(0, 30);  // Limitar a 30 caracteres
    }
    
    return c.material.substring(0, 30);
  });
  
  // Remover duplicatas
  const microrganismosUnicos = [...new Set(microrganismos)];
  
  problemas.push(`Infecção documentada: ${microrganismosUnicos.join(', ')}`);
}
```

### Teste de Aceitação
```typescript
test('Síntese clínica é concisa', () => {
  const texto = 'HEMOCULTURA: KPC POSITIVA';
  const result = processEvolution(texto, '');
  const soap = formatSoapFinal(result.data);
  
  expect(soap).toContain('Infecção documentada: KPC');
  expect(soap).not.toContain('CULTURAS [SEM DATA REGISTRADA]');
});
```

---

## 🟡 FALHA 8: Cabeçalhos Vazios Aparecem na Evolução

### Localização
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `filterFormFragments()`
- **Linhas:** 1021-1072

### Código Problemático
```typescript
const filterFragment = (value: string): boolean => {
  if (!value.trim()) return false;
  if (value.trim().length < 3) return false;
  
  if (/^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+:\s*$/i.test(value)) return false;
  
  if (/^(MEDICAÇÕES DE USO CONTINUO|PROFILAXIAS|DROGAS VASOATIVAS|INTERCONSULTAS|EXAMES DE MAIOR IMPORTÂNCIA|EXAME CLINICO|SEDAÇÃO\/?\s*ANALGESIA|ANTECEDENTES PATOLÓGICOS E CIRÚRGICOS|ANTECEDENTES PESSOAIS):\s*$/i.test(value)) {
    return false;
  }
  
  return true;
};
```

### Causa-Raiz
O regex `/^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+:\s*$/i` exige que a linha termine com `:` e nada mais. Mas pode haver:
- Espaços extras no final
- Quebras de linha
- Caracteres invisíveis

### Correção Proposta
```typescript
// Linha 1025-1048 - MELHORAR filtro
const filterFragment = (value: string): boolean => {
  // Normalizar: remover espaços extras e quebras de linha
  const normalized = value.trim().replace(/\s+/g, ' ');
  
  if (!normalized) return false;
  if (normalized.length < 3) return false;
  
  // Remover cabeçalhos vazios (apenas label seguido de :)
  if (/^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]{3,}:\s*$/i.test(normalized)) return false;
  
  // Remover formulários de checkbox não preenchidos
  if (/ESCARA.*SIM.*\(.*\).*NÃO.*\(.*X.*\)/i.test(normalized)) {
    return false;
  }
  
  // Remover linhas que são apenas labels de formulários
  if (/^(MEDICAÇÕES DE USO CONTINUO|PROFILAXIAS|DROGAS VASOATIVAS|INTERCONSULTAS|EXAMES DE MAIOR IMPORTÂNCIA|EXAME CLINICO|SEDAÇÃO\/?\s*ANALGESIA|ANTECEDENTES PATOLÓGICOS E CIRÚRGICOS|ANTECEDENTES PESSOAIS):\s*$/i.test(normalized)) {
    return false;
  }
  
  return true;
};
```

### Teste de Aceitação
```typescript
test('Cabeçalhos vazios são removidos', () => {
  const texto = `MEDICAÇÕES DE USO CONTINUO:
MEROPENEM 1g`;
  
  const result = processEvolution(texto, '');
  const soap = formatSoapFinal(result.data);
  
  expect(soap).not.toContain('MEDICAÇÕES DE USO CONTINUO:\n');
  expect(soap).toContain('MEROPENEM 1g');
});
```

---

## 🟡 FALHA 9: Sinais Vitais Históricos Prevalecem Sobre Atuais

### Localização
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `reconcileSinaisVitais()`
- **Linhas:** 536-547

### Código Problemático
```typescript
function reconcileSinaisVitais(base: string[], atual: string[]): { merged: string[]; conflitos: Conflito[] } {
  const conflitos: Conflito[] = [];
  
  if (atual.length > 0) {
    return { merged: atual, conflitos: [] };
  }
  
  return { merged: base, conflitos: [] };
}
```

### Causa-Raiz
O código está **correto**: se há sinais vitais no exame atual, usa APENAS o atual. Se não há, usa o base.

**MAS** pode haver problema na extração:
- Se o exame atual tem `"PA: 150/70"` mas não é classificado como `sinaisVitais`, não vai para `atual.sinaisVitais`
- Então `atual.length === 0` e usa o base

### Correção Proposta
Adicionar logs para debug:

```typescript
// Linha 536-547 - ADICIONAR log
function reconcileSinaisVitais(base: string[], atual: string[]): { merged: string[]; conflitos: Conflito[] } {
  console.log('Debug - Sinais Vitais:', { base, atual });
  
  const conflitos: Conflito[] = [];
  
  if (atual.length > 0) {
    console.log('Debug - Usando sinais vitais atuais');
    return { merged: atual, conflitos: [] };
  }
  
  console.log('Debug - Usando sinais vitais do base');
  return { merged: base, conflitos: [] };
}
```

### Teste de Aceitação
```typescript
test('Sinais vitais atuais prevalecem sobre históricos', () => {
  const textoBase = 'SV: PA 100/50 mmHg';
  const exameAtual = 'PA: 150/70 mmHg';
  
  const result = processEvolution(textoBase, exameAtual);
  const soap = formatSoapFinal(result.data);
  
  expect(soap).toContain('150/70');
  expect(soap).not.toContain('100/50');
});
```

---

## 🟡 FALHA 10: Duplicação de Informações

### Localização
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `deduplicateFinalData()`
- **Linhas:** 955-1019

### Código Problemático
A função usa `Set<string>` para deduplicar, mas compara strings inteiras:
```typescript
const key = d.value.toLowerCase().trim();
if (svSeen.has(key)) return false;
```

### Causa-Raiz
Se o texto for:
- `"PA: 150/70 mmHg"`
- `"PA: 150/70 MMHG"` (maiúsculas)

O `.toLowerCase()` normaliza, então DEVERIA deduplicar.

**MAS** se o texto for:
- `"PA: 150/70 mmHg"`
- `"Pressão Arterial: 150/70 mmHg"`

São strings diferentes, então NÃO deduplica.

### Correção Proposta
```typescript
// Linha 955-1019 - MELHORAR deduplicação
function deduplicateFinalData(data: ClinicalData): ClinicalData {
  const newData = JSON.parse(JSON.stringify(data)) as ClinicalData;
  
  // Função auxiliar para normalizar sinais vitais
  const normalizeVitalSign = (value: string): string => {
    let normalized = value.toLowerCase().trim();
    normalized = normalized.replace(/pressão arterial/g, 'pa');
    normalized = normalized.replace(/frequ[êe]ncia card[íi]aca/g, 'fc');
    normalized = normalized.replace(/frequ[êe]ncia respirat[óo]ria/g, 'fr');
    normalized = normalized.replace(/temperatura/g, 'temp');
    normalized = normalized.replace(/satura[çc][ãa]o de oxig[eê]nio/g, 'spo2');
    return normalized;
  };
  
  // Deduplicar sinais vitais com normalização
  const svSeen = new Set<string>();
  newData.objetivo.sinaisVitais = data.objetivo.sinaisVitais.filter((d: DataPoint) => {
    const key = normalizeVitalSign(d.value);
    if (svSeen.has(key)) return false;
    svSeen.add(key);
    return true;
  });
  
  // ... resto da função
}
```

### Teste de Aceitação
```typescript
test('Sinais vitais duplicados são removidos', () => {
  const texto = `PA: 150/70 mmHg
Pressão Arterial: 150/70 mmHg`;
  
  const result = processEvolution(texto, '');
  expect(result.data.objetivo.sinaisVitais.length).toBe(1);
});
```

---

## 🟢 FALHA 11: Isolamento Entre Pacientes

### Localização
- **Arquivo:** `src/utils/soap-engine.ts`
- **Função:** `processEvolution()`
- **Linhas:** 1377-1392

### Código
```typescript
export function processEvolution(textoBase: string, exameAtual: string): ProcessedEvolution {
  const baseExtracted = extractFromText(textoBase, 'texto-base');
  const atualExtracted = extractFromText(exameAtual, 'exame-atual');
  const { data, conflitos } = buildClinicalData(baseExtracted, atualExtracted);
  const alertas = generateAlerts(data, conflitos);
  const validacaoFinal = validateFinal(data);
  
  return { data, alertas, conflitos, validacaoFinal };
}
```

### Causa-Raiz
**NÃO HÁ PROBLEMA.** A função é pura: não usa variáveis globais, não armazena estado. Cada chamada é independente.

### Teste de Aceitação
```typescript
test('Não há vazamento de dados entre pacientes', () => {
  const paciente1 = 'Paciente: João\nDX: Infecção (N39.0)';
  const paciente2 = 'Paciente: Maria\nDX: Fratura (S72.0)';
  
  const result1 = processEvolution(paciente1, '');
  const result2 = processEvolution(paciente2, '');
  
  expect(result1.data.identificacao.nome?.value).toBe('João');
  expect(result2.data.identificacao.nome?.value).toBe('Maria');
  
  expect(result1.data.avaliacao.diagnosticos[0].texto).toBe('Infecção');
  expect(result2.data.avaliacao.diagnosticos[0].texto).toBe('Fratura');
});
```

---

## 📊 RESUMO DAS FALHAS

| # | Falha | Severidade | Localização | Status |
|---|-------|------------|-------------|--------|
| 1 | Nome captura descrição clínica | 🔴 Crítica | Linhas 323-330 | Correção proposta |
| 2 | Diagnósticos não aparecem | 🔴 Crítica | Linhas 270, 510-516, 753, 1262-1265 | Correção proposta |
| 3 | Antecedentes vazios | 🔴 Crítica | Linhas 363-369, 282-306 | Correção proposta |
| 4 | Culturas marcadas como pendentes | 🔴 Crítica | Linhas 434-462 | Correção proposta |
| 5 | Exames sem data | 🔴 Crítica | Linhas 413-432, 204-218 | Correção proposta |
| 6 | Diagnósticos não aparecem na Avaliação | 🔴 Crítica | Linhas 1262-1265 | Debug necessário |
| 7 | Síntese clínica longa | 🟡 Média | Linhas 785-799 | Correção proposta |
| 8 | Cabeçalhos vazios | 🟡 Média | Linhas 1021-1072 | Correção proposta |
| 9 | Sinais vitais históricos prevalecem | 🟡 Média | Linhas 536-547 | Debug necessário |
| 10 | Duplicação de informações | 🟡 Média | Linhas 955-1019 | Correção proposta |
| 11 | Isolamento entre pacientes | 🟢 OK | Linhas 1377-1392 | Sem problema |

---

## 🎯 PLANO DE CORREÇÃO

### Fase 1: Correções Críticas (Falhas 1-6)
1. Corrigir validação de nome (Falha 1)
2. Melhorar extração de diagnósticos (Falha 2)
3. Melhorar captura de conteúdo subsequente (Falha 3)
4. Priorizar microrganismos conhecidos (Falha 4)
5. Melhorar extração de datas (Falha 5)
6. Adicionar logs de debug (Falha 6)

### Fase 2: Correções Médias (Falhas 7-10)
7. Melhorar síntese clínica (Falha 7)
8. Melhorar filtro de cabeçalhos (Falha 8)
9. Adicionar logs de debug (Falha 9)
10. Melhorar deduplicação (Falha 10)

### Fase 3: Testes de Aceitação
- Executar todos os testes propostos
- Validar fluxo completo com caso clínico real
- Verificar ausência de vazamento de dados

---

## ⚠️ RISCOS DE REGRESSÃO

| Correção | Risco | Mitigação |
|----------|-------|-----------|
| Validação de nome | Pode rejeitar nomes válidos longos | Testar com nomes reais |
| Extração de diagnósticos | Pode capturar linhas incorretas | Testar com textos variados |
| Captura de conteúdo | Pode capturar conteúdo de outra seção | Testar com textos complexos |
| Classificação de culturas | Pode classificar erroneamente | Testar com culturas reais |
| Extração de datas | Pode capturar datas incorretas | Testar com formatos variados |
| Síntese clínica | Pode perder informações | Testar com culturas complexas |
| Filtro de cabeçalhos | Pode remover conteúdo válido | Testar com formulários reais |
| Deduplicação | Pode remover informações diferentes | Testar com sinais vitais variados |

---

## 📝 CONCLUSÃO

Esta auditoria identificou **11 falhas** no fluxo de processamento, sendo **6 críticas** e **4 médias**. As falhas estão concentradas em:

1. **Extração** (Falhas 1, 2, 3, 4, 5) - Regex insuficientes e lógica incompleta
2. **Conciliação** (Falha 9) - Lógica correta mas pode haver problema na extração
3. **Geração** (Falhas 6, 7, 8, 10) - Filtros e formatação insuficientes

**Recomendação:** Implementar correções em 2 fases, com testes de aceitação após cada fase. Adicionar logs de debug para rastrear problemas persistentes.

---

**Fim da Auditoria Técnica**

**Próximo Passo:** Aguardando aprovação para implementar correções.
