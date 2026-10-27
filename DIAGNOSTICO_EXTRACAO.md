# 🔍 DIAGNÓSTICO DE PROBLEMAS DE EXTRAÇÃO

## Problemas Reportados

1. ❌ **Leito não informado** - mas está no texto colado
2. ❌ **Nome errado** - extração incorreta
3. ❌ **Convênio errado** - extração incorreta
4. ❌ **Diagnósticos não identificados** - mas estão no texto colado
5. ❌ **2 exames sem data** - datas não associadas

---

## Causas-Raiz Identificadas

### Problema 1: Identificação (Nome, Leito, Convênio)

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `classifyLine()` [linha 226]

**Regex Atual:**
```typescript
/^(paciente:|nome:|leito:|quarto:|conv[eê]nio:|prontu[áa]rio:|data:|hora:|dia de uti|d[úu]t[íi]:|admitido em|internado em)/
```

**Problema:**
- O regex exige **DOIS PONTOS** após as palavras-chave
- Se o texto tem "Paciente Maria Santos" (sem dois pontos), não captura
- Se o texto tem "Leito 405" (sem dois pontos), não captura
- Se o texto tem "Convênio Bradesco" (sem dois pontos), não captura

**Exemplo que falha:**
```
Paciente Maria Santos
Leito 405
Convênio Bradesco Saúde
```

**Exemplo que funciona:**
```
Paciente: Maria Santos
Leito: 405
Convênio: Bradesco Saúde
```

**Solução:**
Tornar os dois pontos opcionais no regex.

---

### Problema 2: Diagnósticos

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `classifyLine()` [linha 268]

**Regex Atual:**
```typescript
/^(dx:|dx |diagn[óo]stico|hip[óo]tese diagn|hip[óo]tese de|hip[óo]teses diagn|problemas ativos|diagn[óo]sticos|cid)/
```

**Problema:**
- O regex exige que comece com "dx:", "dx ", "diagnóstico", etc.
- Se o texto tem "DX:" (maiúsculo), o `.toLowerCase()` converte para "dx:", então deve funcionar
- Mas se o texto tem "Diagnóstico:" (com dois pontos), o regex não captura porque espera "diagnóstico" sem dois pontos

**Exemplo que pode falhar:**
```
Diagnóstico: Infecção do trato urinário (N39.0)
```

**Solução:**
Adicionar variações com dois pontos ao regex.

---

### Problema 3: Exames sem Data

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `extractFromText()` [linha 349-355]

**Código Atual:**
```typescript
case 'examesLab':
  result.examesLab.push({
    nome: line,
    valor: line,
     timestamp,
    source,
  });
  break;
```

**Problema:**
- A data é extraída da linha atual com `extractTimestamp(line)`
- Se a data está na linha anterior (ex: "Exames Laboratoriais (25/01/2024):"), não é associada
- A correção proposta anteriormente (verificar linha anterior) não foi implementada

**Exemplo que falha:**
```
Exames Laboratoriais (25/01/2024):
Hemoglobina: 8.5 g/dL
Creatinina: 2.1 mg/dL
```

Neste caso:
- Linha 1: "Exames Laboratoriais (25/01/2024):" → data = "25/01/2024"
- Linha 2: "Hemoglobina: 8.5 g/dL" → data = undefined (não tem data na linha)
- Linha 3: "Creatinina: 2.1 mg/dL" → data = undefined (não tem data na linha)

**Solução:**
Verificar se a linha anterior tem data e se é um cabeçalho de exames.

---

## Plano de Correção

### Correção 1: Identificação Flexível

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `classifyLine()` [linha 226]

**Mudança:**
```typescript
// ANTES:
if (/^(paciente:|nome:|leito:|quarto:|conv[eê]nio:|...)/.test(lower)) return 'identificacao';

// DEPOIS:
if (/^(paciente[:\s]|nome[:\s]|leito[:\s]|quarto[:\s]|conv[eê]nio[:\s]|...)/.test(lower)) return 'identificacao';
```

**Explicação:**
- `[:\s]` significa "dois pontos OU espaço"
- Agora captura "Paciente Maria" e "Paciente: Maria"

---

### Correção 2: Diagnósticos Flexíveis

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `classifyLine()` [linha 268]

**Mudança:**
```typescript
// ANTES:
if (/^(dx:|dx |diagn[óo]stico|...)/.test(lower)) return 'diagnostico';

// DEPOIS:
if (/^(dx[:\s]|diagn[óo]stico[:\s]|hip[óo]tese diagn[:\s]|...)/.test(lower)) return 'diagnostico';
```

---

### Correção 3: Exames com Data do Contexto

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `extractFromText()` [linha 349-355]

**Mudança:**
```typescript
case 'examesLab':
  // REGRA: Associar resultado com data
  let labDate = timestamp;
  if (!labDate && i > 0) {
    // Verificar se a linha anterior tem data
    const prevLine = lines[i-1].trim();
    const prevDate = extractTimestamp(prevLine);
    if (prevDate && /exames? laboratoriais|laborat[óo]rio/i.test(prevLine)) {
      labDate = prevDate;
    }
  }
  
  result.examesLab.push({
    nome: line,
    valor: line,
     labDate,
    source,
  });
  break;
```

---

## Testes Propostos

### Teste 1: Identificação sem Dois Pontos
```
Entrada:
Paciente Maria Santos
Leito 405
Convênio Bradesco Saúde

Resultado Esperado:
✅ Nome: Maria Santos
✅ Leito: 405
✅ Convênio: Bradesco Saúde
```

### Teste 2: Diagnósticos com Formatos Variados
```
Entrada:
DX: Infecção do trato urinário (N39.0)
Diagnóstico: Septicemia (A41.9)
dx Septicemia por KPC

Resultado Esperado:
✅ 3 diagnósticos extraídos
✅ CIDs extraídos corretamente
```

### Teste 3: Exames com Data do Contexto
```
Entrada:
Exames Laboratoriais (25/01/2024):
Hemoglobina: 8.5 g/dL
Creatinina: 2.1 mg/dL

Resultado Esperado:
✅ Hemoglobina com data 25/01/2024
✅ Creatinina com data 25/01/2024
```

---

## Status

✅ Causas-raiz identificadas  
✅ Plano de correção definido  
✅ Testes propostos  
❌ Correções não implementadas (aguardando autorização)  

---

**Aguardando sua autorização para implementar as 3 correções.**
