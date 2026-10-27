# 🔍 DIAGNÓSTICO TÉCNICO COMPLETO — AUDITORIA EM MODO SOMENTE LEITURA

## CASO CLÍNICO SINTÉTICO EXECUTADO

### Dados de Entrada

**Texto-base:**
```
Paciente: Maria Santos
Leito: 405
Convênio: Bradesco Saúde
Dia de UTI: 7

DX: Infecção do trato urinário complicada (N39.0)
DX: Septicemia por KPC (A41.9)

SV: PA 100/50 mmHg, FC 47-62 bpm, FR 20, Temp 37.8°C, SpO2 94%
AC: RCR 2T, BNF, sem sopros
AP: MV+ bilateral, sem ruídos adventícios
Neurológico: Glasgow 15, RASS 0, pupilas isocóricas reativas
Abdome: plano, flácido, RHA+, indolor
Extremidades: Edema de MMSS 2+/4, perfusão preservada
Diurese: 600ml/24h

Exames Laboratoriais (25/01/2024):
Hemoglobina: 8.5 g/dL
Creatinina: 2.1 mg/dL
PCR: 150 mg/L
Leucócitos: 15.000/mm3

Exames Laboratoriais (28/01/2024):
Hemoglobina: 9.2 g/dL
Creatinina: 1.8 mg/dL
PCR: 95 mg/L
Leucócitos: 12.000/mm3

Hemocultura: KPC positiva (25/01/2024)
Urocultura: E. coli ESBL positiva (25/01/2024)

Meropenem 1g EV 8/8h (início 25/01/2024)
Noradrenalina 0.1 mcg/kg/min
Dieta enteral 40 mL/h

Avaliação: Paciente com sepse de foco urinário, em melhora parcial com antibioticoterapia
Plano: Manter meropenem, otimizar volume, reavaliar em 12h
```

**Exame atual:**
```
PA: 150/70 mmHg
FC: 56 bpm
AC: RCR 2T, BNF, sem sopros
AP: MV+ bilateral, sem RA
Neurológico: Glasgow 15, RASS 0
Extremidades: Sem edema em membros superiores, perfusão preservada
Diurese: 1200ml/24h

Hemoglobina: 10.5 g/dL (30/01/2024)
Creatinina: 1.4 mg/dL (30/01/2024)
PCR: 45 mg/L (30/01/2024)

Dieta enteral 30 mL/h

Plano: Suspender noradrenalina, manter meropenem D6, iniciar dieta oral
```

---

## RESULTADOS DA AUDITORIA

### ETAPA 3: DADOS EXTRAÍDOS

#### 3.1 IDENTIFICAÇÃO
- ✅ **Nome:** Maria Santos
- ✅ **Leito:** 405
- ✅ **Convênio:** Bradesco Saúde
- ✅ **Dia UTI:** 7

**Status:** ✅ Identificação extraída corretamente

#### 3.2 DIAGNÓSTICOS
- ✅ **Diagnóstico 1:** Infecção do trato urinário complicada (N39.0)
- ✅ **Diagnóstico 2:** Septicemia por KPC (A41.9)

**Status:** ✅ Diagnósticos com CID extraídos corretamente

#### 3.3 SINAIS VITAIS
- ❌ **PA:** Apenas "PA: 150/70 mmHg" (exame-atual)
- ❌ **FC:** Apenas "FC: 56 bpm" (exame-atual)
- ❌ **Intervalo FC 47-62 bpm:** NÃO EXTRAÍDO

**Status:** ❌ Sinais vitais do texto-base não preservados

#### 3.4 AUSCULTA CARDÍACA
- ✅ **AC:** "AC: RCR 2T, BNF, sem sopros" (exame-atual)
- ❌ **AC texto-base:** NÃO PRESERVADO (mesmo conteúdo)

**Status:** ⚠️ Ausculta extraída, mas sem indicação de que é a mesma informação

#### 3.5 AUSCULTA PULMONAR
- ✅ **AP:** "AP: MV+ bilateral, sem RA" (exame-atual)
- ❌ **AP texto-base:** NÃO PRESERVADO (mesmo conteúdo)

**Status:** ⚠️ Ausculta extraída, mas sem indicação de que é a mesma informação

#### 3.6 EXTREMIDADES (EDEMA)
- ❌ **Edema texto-base:** "Edema de MMSS 2+/4" NÃO EXTRAÍDO
- ❌ **Sem edema atual:** "Sem edema em membros superiores" NÃO EXTRAÍDO

**Status:** ❌ CONTRADIÇÃO NÃO DETECTADA - ambos os valores ausentes

#### 3.7 GASTROINTESTINAL (DIETA)
- ❌ **Dieta texto-base:** "Dieta enteral 40 mL/h" NÃO EXTRAÍDO
- ❌ **Dieta atual:** "Dieta enteral 30 mL/h" NÃO EXTRAÍDO

**Status:** ❌ CONTRADIÇÃO NÃO DETECTADA - ambos os valores ausentes

#### 3.8 EXAMES LABORATORIAIS
- ✅ **Total:** 7 itens extraídos
- ✅ **25/01/2024:** 4 exames (Hemoglobina 8.5, Creatinina 2.1, PCR 150, Leucócitos 15000)
- ✅ **28/01/2024:** 3 exames (Hemoglobina 9.2, Creatinina 1.8, PCR 95)
- ✅ **30/01/2024:** 3 exames (Hemoglobina 10.5, Creatinina 1.4, PCR 45)

**Status:** ✅ Exames laboratoriais extraídos corretamente com datas

#### 3.9 MICROBIOLOGIA
- ✅ **Hemocultura:** KPC positiva (25/01/2024)
- ✅ **Urocultura:** E. coli ESBL positiva (25/01/2024)

**Status:** ✅ Culturas classificadas corretamente como positivas

#### 3.10 MEDICAMENTOS
- ✅ **Meropenem:** 1g EV 8/8h (antimicrobiano)
- ✅ **Noradrenalina:** 0.1 mcg/kg/min (vasoativo)

**Status:** ✅ Medicamentos extraídos corretamente

#### 3.11 AVALIAÇÃO
- ✅ **Síntese:** "Paciente com 2 diagnóstico(s) ativo(s): Infecção do trato urinário complicada, Septicemia por KPC."

**Status:** ✅ Avaliação gerada automaticamente

---

### ETAPA 4: CONFLITOS DETECTADOS

**Status:** ❌ **NENHUM CONFLITO DETECTADO**

**Problemas esperados mas não detectados:**
1. ❌ PA: 100/50 mmHg vs 150/70 mmHg
2. ❌ FC: 47-62 bpm vs 56 bpm
3. ❌ Dieta: 40 mL/h vs 30 mL/h
4. ❌ Edema: 2+/4 vs Sem edema

---

### ETAPA 5: ALERTAS GERADOS

**Alertas detectados:**
1. ⚠️ "Sinais vitais não documentados" (falso positivo - há sinais vitais)
2. ⚠️ "Avaliação clínica não documentada" (falso positivo - há avaliação)

**Status:** ❌ Alertas incorretos - não detecta problemas reais

---

### ETAPA 7: EVOLUÇÃO FINAL

**Problemas identificados no documento final:**

1. ❌ **Diagnósticos sem CID:** Nenhum diagnóstico sem CID (✅ correto)
2. ❌ **Contradições não detectadas:**
   - Dieta 40 mL/h e 30 mL/h não aparecem no documento
   - Edema 2+/4 e "Sem edema" não aparecem no documento
3. ❌ **Sinais vitais incompletos:**
   - Apenas PA e FC atuais aparecem
   - Intervalo FC 47-62 bpm não preservado
   - FR, Temp, SpO2 não aparecem
4. ❌ **Auscultas sem contexto:**
   - AC e AP aparecem sem indicação de data/origem
5. ❌ **Exames laboratoriais:**
   - ✅ Todos os exames de 3 datas preservados
6. ❌ **Culturas:**
   - ✅ Ambas classificadas como positivas

---

## CAUSAS-RAIZ IDENTIFICADAS

### PROBLEMA 1: EXTRAÇÃO DE SINAIS VITAIS INCOMPLETA

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `extractFromText()` [linha 280-387]  
**Linha específica:** 305-306

**Código atual:**
```typescript
case 'sinaisVitais':
  result.sinaisVitais.push(line);
  break;
```

**Causa-raiz:**
- O classificador `classifyLine()` identifica "SV:" como sinais vitais
- Mas a linha "SV: PA 100/50 mmHg, FC 47-62 bpm, FR 20, Temp 37.8°C, SpO2 94%" contém múltiplos sinais vitais em uma única linha
- O sistema armazena a linha inteira como um único item
- Não há parser para separar PA, FC, FR, Temp, SpO2 individualmente

**Impacto:**
- Intervalo "FC 47-62 bpm" não é reconhecido como FC
- Múltiplos sinais vitais em uma linha são tratados como um único item
- Conflitos não são detectados porque os parâmetros não são separados

**Correção proposta:**
```typescript
case 'sinaisVitais':
  // Separar múltiplos sinais vitais em uma linha
  const svParts = line.match(/(PA|FC|FR|Temp|SpO2|PAM)[\s:]+[^\,]+/gi);
  if (svParts) {
    svParts.forEach(part => result.sinaisVitais.push(part.trim()));
  } else {
    result.sinaisVitais.push(line);
  }
  break;
```

---

### PROBLEMA 2: DIETA E EDEMA NÃO SÃO EXTRAÍDOS

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `classifyLine()` [linha 221-277]  
**Linha específica:** 250 (gastrointestinal) e 253 (extremidades)

**Código atual:**
```typescript
// Linha 250:
if (/^(gastrointestinal|gi:|hep[áa]tico|abdome|abdominal|dieta|nutri[çc][ãa]o|...)/.test(lower)) return 'gastrointestinal';

// Linha 253:
if (/^(extremidades|membros superiores|membros inferiores|...|edema de membros|...)/.test(lower)) return 'extremidades';
```

**Causa-raiz:**
- Regex exige que a linha COMECE com "dieta" ou "extremidades"
- "Dieta enteral 40 mL/h" começa com "Dieta" ✅ (deveria funcionar)
- "Extremidades: Edema de MMSS 2+/4" começa com "Extremidades" ✅ (deveria funcionar)
- **MAS:** O problema é que essas linhas são extraídas, mas não são conciliadas corretamente

**Investigação adicional:**
- Verificar se as linhas estão sendo extraídas mas perdidas na conciliação
- Verificar se `mergeDataPoints()` está removendo essas informações

**Correção proposta:**
```typescript
// Adicionar logs de debug para rastrear onde as informações são perdidas
console.log('Dieta extraída:', result.gastrointestinal);
console.log('Edema extraído:', result.extremidades);
```

---

### PROBLEMA 3: CONTRADIÇÕES NÃO SÃO DETECTADAS

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `reconcileSinaisVitais()` [linha 426-461]  
**Função ausente:** `detectContradictions()` (não existe)

**Causa-raiz:**
- Não existe função para detectar contradições semânticas
- `mergeDataPoints()` apenas remove duplicatas exatas
- Não há lógica para identificar "Edema 2+/4" vs "Sem edema"
- Não há lógica para identificar "Dieta 40 mL/h" vs "Dieta 30 mL/h"

**Correção proposta:**
```typescript
function detectContradictions( ClinicalData): Conflito[] {
  const conflitos: Conflito[] = [];
  
  // Verificar dieta
  const dietas = data.objetivo.gastrointestinal.filter(g => /dieta.*ml\/h/i.test(g.value));
  if (dietas.length > 1) {
    conflitos.push({
      campo: 'Nutrição',
      valorAnterior: dietas[0].value,
      valorAtual: dietas[1].value,
      resolvido: false,
    });
  }
  
  // Verificar edema
  const temEdama = data.objetivo.extremidades.some(e => /edama.*\+|edama.*\d/i.test(e.value));
  const semEdama = data.objetivo.extremidades.some(e => /sem edama|aus[eê]ncia de edama/i.test(e.value));
  if (temEdama && semEdama) {
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

---

### PROBLEMA 4: ALERTAS INCORRETOS

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `generateAlerts()` [linha 710-760]

**Causa-raiz:**
- Alerta "Sinais vitais não documentados" é gerado quando `sinaisVitais.length === 0`
- Mas sinais vitais ESTÃO documentados (PA, FC)
- O problema é que o classificador não está extraindo corretamente

**Correção proposta:**
- Corrigir a extração de sinais vitais (Problema 1)
- Melhorar a lógica de alertas para verificar conteúdo real, não apenas contagem

---

### PROBLEMA 5: AUSCULTAS SEM CONTEXTO

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `formatSoapFinal()` [linha 798-1025]

**Causa-raiz:**
- Auscultas são impressas sem indicação de data ou origem
- Não há diferenciação entre ausculta do texto-base e do exame atual
- Se são idênticas, deveriam ser consolidadas

**Correção proposta:**
```typescript
// Adicionar indicador de origem
if (data.objetivo.cardiovascular.length > 0) {
  o += '  3. Avaliação Cardiovascular:\n';
  data.objetivo.cardiovascular.forEach(d => {
    const origem = d.source === 'exame-atual' ? '[ATUAL]' : '[HISTÓRICO]';
    o += `     ${d.value} ${origem}\n`;
  });
}
```

---

## PLANO DE CORREÇÃO VERIFICÁVEL

### Prioridade 1: Corrigir extração de sinais vitais
**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `extractFromText()` [linha 305-306]  
**Teste:** Verificar se "SV: PA 100/50, FC 47-62, FR 20" gera 3 itens separados

### Prioridade 2: Implementar detecção de contradições
**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** Nova função `detectContradictions()`  
**Teste:** Verificar se "Dieta 40 mL/h" vs "Dieta 30 mL/h" gera conflito

### Prioridade 3: Rastrear perda de dieta e edema
**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `extractFromText()` e `buildClinicalData()`  
**Teste:** Adicionar logs para identificar onde "Dieta enteral 40 mL/h" é perdida

### Prioridade 4: Corrigir alertas
**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `generateAlerts()`  
**Teste:** Verificar se alertas refletem problemas reais

### Prioridade 5: Adicionar contexto às auscultas
**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `formatSoapFinal()`  
**Teste:** Verificar se auscultas têm indicador de origem

---

## CRITÉRIOS DE ACEITAÇÃO

A implementação será considerada satisfatória quando:

1. ✅ "SV: PA 100/50, FC 47-62, FR 20" gerar 3 itens separados
2. ✅ "Dieta 40 mL/h" vs "Dieta 30 mL/h" gerar conflito
3. ✅ "Edema 2+/4" vs "Sem edema" gerar conflito
4. ✅ Alertas refletirem problemas reais
5. ✅ Auscultas terem indicador de origem
6. ✅ Documento final mostrar todas as contradições detectadas

---

## STATUS

✅ Auditoria completa executada  
✅ Causas-raiz identificadas  
✅ Plano de correção definido  
❌ Correções não implementadas (aguardando autorização)  

**Próximo passo:** Implementar correções e executar testes de validação

---

**Data:** 2024  
**Versão:** Auditoria 1.0  
**Modo:** Somente leitura (nenhum código modificado)
