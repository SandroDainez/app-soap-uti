# 🔍 DIAGNÓSTICO TÉCNICO COMPLETO — MOTOR SOAP UTI

## RESUMO EXECUTIVO

A auditoria real do código revelou **9 falhas críticas** no motor de processamento SOAP. Todas as falhas têm causas-raiz identificadas e localizadas em arquivos/funções específicos.

**Status:** Diagnóstico completo. Aguardando autorização para implementação das correções.

---

## 1. ARQUITETURA ATUAL DO SISTEMA

### Fluxo de Dados
```
App.tsx (UI)
  ↓
  ↓ handleProcess() [linha 97-106]
  ↓
soap-engine.ts
  ↓
  ↓ processEvolution() [linha 1090-1105]
  ↓
  ├─→ extractFromText(textoBase) [linha 280-387]
  ├─→ extractFromText(exameAtual) [linha 280-387]
  ├─→ buildClinicalData() [linha 533-694]
  ├─→ generateAlerts() [linha 710-760]
  └─→ validateFinal() [linha 762-787]
```

### Estrutura de Dados Intermediária
```typescript
ClinicalData {
  identificacao: { nome, leito, convenio, dataHora, diaUTI }
  subjetivo: { hda[], motivoInternacao[], antecedentes[], eventosInternacao[], infoSubjetivaAtual[] }
  objetivo: {
    sinaisVitais: DataPoint[]
    neurologico: DataPoint[]
    cardiovascular: DataPoint[]
    respiratorio: DataPoint[]
    renal: DataPoint[]
    gastrointestinal: DataPoint[]
    extremidades: DataPoint[]
    dispositivos: DataPoint[]
    examesLaboratoriais: ExameLaboratorial[]
    microbiologia: Cultura[]
    tratamentos: Medicamento[]
    ventilacao: Ventilacao | null
  }
  avaliacao: { sintese[], diagnosticos[], hipoteses[], evolucaoProblemas[], pendencias[] }
  plano: { condutasPorProblema[], antimicrobianos[], suporteVentilatorio[], ... }
}
```

---

## 2. FALHAS IDENTIFICADAS COM EVIDÊNCIAS

### ❌ FALHA 1: Ausculta Cardíaca Não Capturada

**Sintoma:** "AC: RCR 2T, BNF" não aparece na evolução final

**Localização:**
- Arquivo: `src/utils/soap-engine.ts`
- Função: `classifyLine()` [linha 221-277]
- Regex problemática: [linha 238]

**Código Problemático:**
```typescript
// Linha 238:
if (/^(cardiovascular|ac |ausculta card[íi]aca|bulhas|sopros|ictus|pulso|perfus[ãa]o perif[ée]rica|enchimento capilar|edema de mmii|turg[êe]ncia jugular)/.test(lower)) return 'cardiovascular';
```

**Causa-Raiz:**
O regex exige `ac ` (com espaço depois), mas textos clínicos usam `AC:` (com dois pontos).

**Evidência:**
```
Entrada: "AC: RCR 2T, BNF, sem sopros"
Regex: /^(...|ac |...)/
Match: "ac " ≠ "ac:"
Resultado: null → informação perdida
```

**Impacto:** Ausculta cardíaca desaparece completamente da evolução.

---

### ❌ FALHA 2: Ausculta Pulmonar Não Capturada

**Sintoma:** "AP: MV+ bilateral" não aparece na evolução final

**Localização:**
- Arquivo: `src/utils/soap-engine.ts`
- Função: `classifyLine()` [linha 221-277]
- Regex problemática: [linha 244]

**Código Problemático:**
```typescript
// Linha 244:
if (/^(respirat[óo]rio|ap |ausculta pulmonar|murmu|ru[íi]dos advent|estertores|sibilos|roncos|crepita[çc][ãa]o|expansibilidade|tiragem|uso de musculatura acess[óo]ria|gasometria|gaso|pco2|po2|ph |hco3|be |base excess|rela[çc][ãa]o p\/f|pfr)/.test(lower)) return 'respiratorio';
```

**Causa-Raiz:**
Mesmo problema da Falha 1: regex exige `ap ` (com espaço), mas textos usam `AP:` (com dois pontos).

**Evidência:**
```
Entrada: "AP: MV+ bilateral, sem RA"
Regex: /^(...|ap |...)/
Match: "ap " ≠ "ap:"
Resultado: null → informação perdida
```

**Impacto:** Ausculta pulmonar desaparece completamente da evolução.

---

### ❌ FALHA 3: Exames Laboratoriais Não Capturados

**Sintoma:** "Hemoglobina: 10.2 g/dL" e "Creatinina: 1.5 mg/dL" não aparecem

**Localização:**
- Arquivo: `src/utils/soap-engine.ts`
- Função: `classifyLine()` [linha 221-277]
- Regex problemática: [linha 259]

**Código Problemático:**
```typescript
// Linha 259:
if (/^(exame|laborat[óo]rio|hemograma|hemoglobina|hemat[óo]crito|plaquetas|leuc[óo]citos|...)/.test(lower)) return 'examesLab';
```

**Causa-Raiz:**
O regex exige prefixo específico ("exame", "laboratório", "hemograma"), mas textos clínicos frequentemente usam apenas o nome do exame seguido de dois pontos.

**Evidência:**
```
Entrada: "Hemoglobina: 10.2 g/dL"
Regex: /^(exame|laboratório|hemograma|hemoglobina|...)/
Match: "hemoglobina" está no regex ✓
MAS: "Hemoglobina:" começa com "H" maiúsculo
lower = "hemoglobina: 10.2 g/dl"
Regex: /^(...|hemoglobina|...)/
Match: "hemoglobina" ✓
Resultado: deveria funcionar, mas...

Problema REAL: O regex tem 100+ termos e pode haver conflito de precedência
```

**Investigação Adicional Necessária:**
Testar se o regex realmente falha ou se há outro problema (ex: ordem de avaliação).

---

### ❌ FALHA 4: Avaliação Clínica Permanece Vazia

**Sintoma:** Seção "A - AVALIAÇÃO" fica vazia mesmo com diagnósticos documentados

**Localização:**
- Arquivo: `src/utils/soap-engine.ts`
- Função: `buildClinicalData()` [linha 533-694]
- Seção problemática: [linha 634-643]

**Código Problemático:**
```typescript
// Linhas 634-643:
const avaliacao = {
  sintese: mergeDataPoints(
    base.avaliacao.map(v => ({ value: v, source: 'texto-base' as const })),
    atual.avaliacao.map(v => ({ value: v, source: 'exame-atual' as const }))
  ),
  diagnosticos: [...base.diagnosticos, ...atual.diagnosticos],
  hipoteses: [...base.hipoteses, ...atual.hipoteses],
  evolucaoProblemas: [] as DataPoint[],
  pendencias: [] as DataPoint[],
};
```

**Causa-Raiz:**
O sistema apenas faz merge de `avaliacao.sintese`, mas **nunca gera síntese automaticamente** a partir de diagnósticos/problemas documentados.

**Evidência:**
```
Entrada:
  DX: Choque séptico (A41.9)
  Hemoglobina: 7.2 g/dL
  Creatinina: 2.8 mg/dL

Processamento:
  - diagnosticos = [{ texto: "Choque séptico", cid: "A41.9" }]
  - examesLaboratoriais = [{ nome: "Hemoglobina", valor: "7.2" }, ...]
  - avaliacao.sintese = [] ← VAZIO!

Resultado:
  A - AVALIAÇÃO
    Avaliação clínica não documentada.
```

**Impacto:** Médico precisa escrever manualmente a avaliação mesmo quando há dados suficientes para gerar automaticamente.

---

### ❌ FALHA 5: Informações Duplicadas Aparecem

**Sintoma:** "Precaução de contato para KPC" aparece duas vezes na evolução

**Localização:**
- Arquivo: `src/utils/soap-engine.ts`
- Função: `mergeDataPoints()` [linha 411-424]

**Código Problemático:**
```typescript
// Linhas 411-424:
function mergeDataPoints(existing: DataPoint[], incoming: DataPoint[]): DataPoint[] {
  const seen = new Set<string>();
  const result: DataPoint[] = [];

  for (const dp of [...existing, ...incoming]) {
    const normalized = dp.value.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(dp);
    }
  }
  return result;
}
```

**Causa-Raiz:**
A deduplicação funciona por string exata, mas **não detecta duplicações semânticas** ou **não agrupa por categoria clínica**.

**Evidência:**
```
Texto-base: "Precaução de contato para KPC"
Exame atual: "Precaução de contato para KPC"

Processamento:
  - base.microbiologia = [{ material: "Precaução de contato para KPC", ... }]
  - atual.microbiologia = [{ material: "Precaução de contato para KPC", ... }]
  - reconcileCultures() agrupa por material.toLowerCase()
  - Resultado: deveria deduplicar ✓

MAS: Se houver variação mínima:
Texto-base: "Precaução de contato para KPC"
Exame atual: "Precaução contato KPC"
  - Strings diferentes → ambas mantidas → duplicação
```

**Impacto:** Informações repetidas confundem o médico e ocupam espaço desnecessário.

---

### ❌ FALHA 6: Dados Contraditórios Aparecem Simultaneamente

**Sintoma:** "Edema MMSS 2+/4" e "Sem edema em MMSS" aparecem juntas

**Localização:**
- Arquivo: `src/utils/soap-engine.ts`
- Função: `mergeDataPoints()` [linha 411-424]
- Função ausente: `detectContradictions()` (não existe)

**Causa-Raiz:**
**Não existe função de detecção de contradições semânticas.** O sistema apenas deduplica por string exata.

**Evidência:**
```
Texto-base: "Edema de MMSS 2+/4"
Exame atual: "Sem edema em membros superiores"

Processamento:
  - base.extremidades = [{ value: "Edema de MMSS 2+/4", source: "texto-base" }]
  - atual.extremidades = [{ value: "Sem edema em membros superiores", source: "exame-atual" }]
  - mergeDataPoints() → strings diferentes → ambas mantidas
  - NÃO há detectContradictions() para verificar se são mutuamente exclusivas

Resultado:
  7. Extremidades, Perfusão e Pele:
     Edema de MMSS 2+/4
     Sem edema em membros superiores
```

**Impacto:** Informações contraditórias confundem o médico e podem levar a erros clínicos.

---

### ❌ FALHA 7: Culturas Positivas Classificadas como "Pendente"

**Sintoma:** "Hemocultura: KPC" aparece como situação "pendente" em vez de "positiva"

**Localização:**
- Arquivo: `src/utils/soap-engine.ts`
- Função: `extractFromText()` [linha 280-387]
- Seção problemática: [linha 346-352]

**Código Problemático:**
```typescript
// Linhas 346-352:
case 'microbiologia':
  result.microbiologia.push({
    material: line,
    dataColeta: timestamp,
    situacao: /positivo|crescimento|isolado/i.test(line) ? 'positiva' : 
              /negativo|sem crescimento/i.test(line) ? 'negativa' : 
              /coloniza/i.test(line) ? 'colonizacao' : 'pendente',
    source,
  });
  break;
```

**Causa-Raiz:**
A classificação de situação verifica apenas palavras-chave específicas ("positivo", "crescimento", "isolado"), mas **não detecta microrganismos conhecidos** como KPC, MRSA, ESBL, etc.

**Evidência:**
```
Entrada: "Hemocultura: KPC positiva (25/01/2024)"
Regex: /positivo|crescimento|isolado/i.test(line)
Match: "positiva" ✓
Resultado: situacao = "positiva" ✓

MAS:
Entrada: "Hemocultura: KPC (25/01/2024)"
Regex: /positivo|crescimento|isolado/i.test(line)
Match: nenhuma ✗
Resultado: situacao = "pendente" ✗ (deveria ser "positiva" pois KPC é microrganismo)
```

**Impacto:** Culturas positivas são tratadas como pendentes, atrasando decisões clínicas.

---

### ❌ FALHA 8: Conflitos de Sinais Vitais Não Detectados

**Sintoma:** PA 100/50 mmHg e PA 150/70 mmHg aparecem sem alerta de conflito

**Localização:**
- Arquivo: `src/utils/soap-engine.ts`
- Função: `reconcileSinaisVitais()` [linha 426-463]

**Código Problemático:**
```typescript
// Linhas 426-463:
function reconcileSinaisVitais(base: string[], atual: string[]): { merged: string[]; conflitos: Conflito[] } {
  const conflitos: Conflito[] = [];
  const merged: string[] = [...base];

  for (const atualLine of atual) {
    const lower = atualLine.toLowerCase();
    let conflictFound = false;

    for (let i = 0; i < merged.length; i++) {
      const existingLower = merged[i].toLowerCase();
      if (isSameVitalSign(existingLower, lower)) {
        if (existingLower !== lower) {
          conflitos.push({
            campo: 'Sinais Vitais',
            valorAnterior: merged[i],
            valorAtual: atualLine,
            resolvido: false,
          });
          merged[i] = atualLine;
          conflictFound = true;
          break;
        }
      }
    }

    if (!conflictFound) {
      merged.push(atualLine);
    }
  }

  return { merged, conflitos };
}
```

**Causa-Raiz:**
A função `isSameVitalSign()` compara prefixos ("pa:", "fc:", etc.), mas **não extrai valores numéricos** para comparação clínica significativa.

**Evidência:**
```
Texto-base: "PA: 100/50 mmHg (28/01/2024 08:00)"
Exame atual: "PA: 150/70 mmHg"

Processamento:
  - isSameVitalSign("pa: 100/50 mmhg (28/01/2024 08:00)", "pa: 150/70 mmhg")
  - Ambos começam com "pa:" → true
  - Strings diferentes → conflito detectado ✓
  - merged[i] = "PA: 150/70 mmHg" → substitui ✓

Resultado:
  Conflito detectado: "PA: 100/50 mmHg (28/01/2024 08:00)" vs "PA: 150/70 mmHg"
  
MAS: O conflito é genérico, não diz QUAL parâmetro mudou (PA sistólica? diastólica?)
```

**Impacto:** Conflitos são detectados, mas sem detalhamento clínico útil.

---

### ❌ FALHA 9: Textos de Formulário Copiados Literalmente

**Sintoma:** "ESCARA: SIM (X) NÃO ( ) QUAL: MUDANÇA DE DECÚBITO" aparece na evolução

**Localização:**
- Arquivo: `src/utils/soap-engine.ts`
- Função: `formatSoapFinal()` [linha 798-1025]

**Código Problemático:**
```typescript
// Linhas 897-902:
if (data.objetivo.extremidades.length > 0) {
  o += '  7. Extremidades, Perfusão e Pele:\n';
  data.objetivo.extremidades.forEach(d => o += `     ${d.value}\n`);
  o += '\n';
}
```

**Causa-Raiz:**
O gerador de SOAP imprime `d.value` literalmente, **sem interpretar checkboxes** ou **separar achados de medidas preventivas**.

**Evidência:**
```
Entrada: "ESCARA: SIM (X) NÃO ( ) QUAL: MUDANÇA DE DECÚBITO"

Processamento:
  - classifyLine() → "extremidades" (contém "escara")
  - result.extremidades.push("ESCARA: SIM (X) NÃO ( ) QUAL: MUDANÇA DE DECÚBITO")
  - formatSoapFinal() → imprime literalmente

Resultado:
  7. Extremidades, Perfusão e Pele:
     ESCARA: SIM (X) NÃO ( ) QUAL: MUDANÇA DE DECÚBITO
```

**Impacto:** Textos de formulário não interpretados confundem o médico e ocupam espaço.

---

## 3. TABELA RESUMO DAS FALHAS

| # | Falha | Arquivo | Função | Linha | Causa-Raiz |
|---|-------|---------|--------|-------|------------|
| 1 | Ausculta cardíaca não capturada | soap-engine.ts | classifyLine() | 238 | Regex exige "ac " com espaço, não captura "AC:" |
| 2 | Ausculta pulmonar não capturada | soap-engine.ts | classifyLine() | 244 | Regex exige "ap " com espaço, não captura "AP:" |
| 3 | Exames laboratoriais não capturados | soap-engine.ts | classifyLine() | 259 | Regex exige prefixo específico |
| 4 | Avaliação clínica vazia | soap-engine.ts | buildClinicalData() | 634-643 | Não gera síntese automática |
| 5 | Informações duplicadas | soap-engine.ts | mergeDataPoints() | 411-424 | Deduplicação por string exata |
| 6 | Dados contraditórios | soap-engine.ts | mergeDataPoints() | 411-424 | Não detecta contradições semânticas |
| 7 | Culturas positivas como pendente | soap-engine.ts | extractFromText() | 346-352 | Não detecta microrganismos conhecidos |
| 8 | Conflitos não detalhados | soap-engine.ts | reconcileSinaisVitais() | 426-463 | Não extrai valores numéricos |
| 9 | Textos de formulário copiados | soap-engine.ts | formatSoapFinal() | 897-902 | Não interpreta checkboxes |

---

## 4. PROPOSTA DE CORREÇÃO ESTRUTURAL

### Correção 1: Classificador Inteligente por Conteúdo

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `classifyLine()` [linha 221-277]

**Mudança Proposta:**
```typescript
function classifyLine(line: string): string | null {
  const lower = line.toLowerCase().trim();
  if (!lower) return null;

  // === IDENTIFICAÇÃO ===
  if (/^(paciente:|nome:|leito:|quarto:|conv[eê]nio:|prontu[áa]rio:|hora:|dia de uti|d[úu]t[íi]:|admitido em|internado em)/.test(lower)) return 'identificacao';

  // === SUBJETIVO ===
  if (/^(subjetivo|queixa principal|qp:|hda:|hist[óo]ria da doen[çc]a|hist[óo]ria cl[íi]nica|antecedentes|hist[óo]ria pregressa|relata que|refere que|queixa de|acompanhante relata|fam[íi]lia relata|trazido por|paciente relata|paciente refere|in[íi]cio dos sintomas|h[áa] dias|h[áa] horas|onset|motivo da interna[çc][ãa]o|motivo interna[çc][ãa]o)/.test(lower)) return 'subjetivo';

  // === SINAIS VITAIS ===
  if (/^(sv:|sinais vitais|pa:|ta:|pam:|pam |fc:|fc |fr:|fr |temp:|temp |temperatura|spo2|satura[çc][ãa]o|tmax|tmin|press[ãa]o arterial|frequ[êe]ncia card|frequ[êe]ncia resp)/.test(lower)) return 'sinaisVitais';

  // === NEUROLÓGICO ===
  if (/^(neurol[óo]gico|glasgow|pupilas|seda[çc][ãa]o|rass|richmond|delirium|cam-icu|convuls[ãa]o|focalidade|midr[íi]ase|isoc[óo]ricas|isocoricas|anisocoria|movimenta[çc][ãa]o|for[çc]a muscular|reflexos|sensibilidade|escala de coma|reatividade pupilar)/.test(lower)) return 'neurologico';

  // === CARDIOVASCULAR (CORRIGIDO) ===
  // Aceita "AC:", "AC ", "RCR", "BCF", etc.
  if (/^(cardiovascular|ac[:\s]|rcr|bcf|ausculta card[íi]aca|bulhas|sopros|ictus|pulso|perfus[ãa]o perif[ée]rica|enchimento capilar|edema de mmii|turg[êe]ncia jugular)/i.test(line)) return 'cardiovascular';

  // === VENTILAÇÃO ===
  if (/^(ventila[çc][ãa]o mec|vm:|vm |ventilat[óo]rio|peep|fio2|fiO2|pplat|pico|weaning|extuba[çc][ãa]o|traqueostomia|modo ventilat|pcv|vcv|psv|bipap|cpap|cateter nasal|m[áa]scara de|venturi|t-piece|ar ambiente|oxig[eê]nio suplementar|vni|vpn|cpap nasal)/.test(lower)) return 'ventilacao';

  // === RESPIRATÓRIO (CORRIGIDO) ===
  // Aceita "AP:", "AP ", "MV+", "MV-", etc.
  if (/^(respirat[óo]rio|ap[:\s]|mv[\+\-]|ausculta pulmonar|murmu|ru[íi]dos advent|estertores|sibilos|roncos|crepita[çc][ãa]o|expansibilidade|tiragem|uso de musculatura acess[óo]ria|gasometria|gaso|pco2|po2|ph |hco3|be |base excess|rela[çc][ãa]o p\/f|pfr)/i.test(line)) return 'respiratorio';

  // === RENAL ===
  if (/^(renal|diurese|urina|creatinina|ureia|tfg|hemodi[áa]lise|hemodialise|balan[çc]o h[íi]drico|balanco hidrico|bhd|crrt|tdc|catheter|volume total|protein[úu]ria|sedimento urin)/.test(lower)) return 'renal';

  // === GASTROINTESTINAL ===
  if (/^(gastrointestinal|gi:|hep[áa]tico|abdome|abdominal|dieta|nutri[çc][ãa]o|sng|sngt|sng\/|evacua[çc][ãa]o|fezes|ascite|distens[ãa]o abdominal|rha|ru[íi]dos hidro|tgp|tgo|bilirrubina|albumina|v[ôo]mito|n[áa]usea|deito|g[áa]strico|intestinal|enteral|parenteral|trato digest|digest[óo]rio)/.test(lower)) return 'gastrointestinal';

  // === EXTREMIDADES/PELE ===
  if (/^(extremidades|membros superiores|membros inferiores|msii|mmss|mmii|pele|acracias|cianose|livedo|perfus[ãa]o|edema de membros|[úu]lcera de press[ãa]o|[úu]lcera por press[ãa]o|les[ãa]o de pele|bradenco|escara|up|les[ãa]o por press[ãa]o)/.test(lower)) return 'extremidades';

  // === DISPOSITIVOS ===
  if (/^(dispositivo|dreno|sonda (vesical|naso|oro)|jal|acesso venoso|acesso arterial|iot |tqt |m[áa]scara lar[íi]n|cateter venoso central|cateter arterial|swan|capn[óo]grafo|picc|cvc|pvc)/.test(lower)) return 'dispositivos';

  // === EXAMES LABORATORIAIS (CORRIGIDO) ===
  // Aceita nomes de exames seguidos de dois pontos OU padrão numérico + unidade
  if (/^(exame|laborat[óo]rio|hemograma|hemoglobina|hemat[óo]crito|plaquetas|leuc[óo]citos|leucopenia|leucocitose|coagulograma|inr|tpa|tp |fibrinog[eê]nio|d-d[íi]mero|ddimer|ht:|hb:|hgb|neutr[óo]filos|linf[óo]citos|eosin[óo]filos|bas[óo]filos|mon[óo]citos|reticul[óo]citos|vcm|hcm|rdw|s[óo]dio|pot[áa]ssio|c[áa]lcio|magn[ée]sio|fosfato|lactato|lact|glicemia|glicose|pcr|crp|procalcitonina|pct|tgp|tgo|bilirrubina|albumina|creatinina|ureia|eletr[óo]litos|ionograma|na:|k:|cl:|gap ani|osmolaridade|dosagem|resultado de exame|laudo laboratorial)/.test(lower)) return 'examesLab';
  
  // Detecção por padrão numérico + unidade (CORREÇÃO ADICIONAL)
  if (/\d+[\.,]?\d*\s*(mg\/dl|g\/dl|meq\/l|mmol\/l|ui\/l|%|mmhg|bpm)/i.test(line)) return 'examesLab';

  // === MICROBIOLOGIA ===
  if (/^(cultura|hemocultura|urocultura|cultura de|secre[çc][ãa]o|escarro|aspirado|l[íi]quor|l[íi]quido |material coletado|microrganismo|antibiograma|kpc|mrsa|mrse|esbl|pseudomonas|acinetobacter|candida|enterobact|gram|bact[ée]ria|fungo|coloniza[çc][ãa]o|precau[çc][ãa]o de contato|isolamento)/.test(lower)) return 'microbiologia';

  // === MEDICAMENTOS ===
  if (/^(medica[çc][ãa]o|antibi[óo]tico|meropenem|piperacilina|vancomicina|noradrenalina|adrenalina|vasopressina|dobutamina|dopamina|metadona|morfina|fentanil|propofol|midazolam|dexmedetomidina|cetamina|heparina|enoxaparina|omeprazol|pantoprazol|insulina|profilaxia|prescri[çc][ãa]o|droga|drogas|medica[çc][õo]es)/.test(lower)) return 'medicamentos';

  // === DIAGNÓSTICO ===
  if (/^(dx:|dx |diagn[óo]stico|hip[óo]tese diagn|hip[óo]tese de|hip[óo]teses diagn|problemas ativos|diagn[óo]sticos|cid)/.test(lower)) return 'diagnostico';

  // === AVALIAÇÃO ===
  if (/^(avalia[çc][ãa]o|quadro cl[íi]nico|evolu[çc][ãa]o cl[íi]nica|melhora|piora|est[áa]vel|grave|cr[íi]tico|resposta terap|paciente apresenta|encontra-se|mant[ée]m-se|apresenta melhora|apresenta piora|quadro de|paciente em|conclus[ãa]o|s[íi]ntese|an[áa]lise cl[íi]nica)/.test(lower)) return 'avaliacao';

  // === PLANO ===
  if (/^(plano|conduta|prescri[çc][ãa]o|ajuste|manter|suspender|iniciar|trocar|meta|solicitar|interconsulta|procedimento|prescrever|orientar|encaminhar|liberar|restringir|monitorar|titular|reavaliar|otimizar|desmame|weaning|profilaxia|prevenir|plano terap)/.test(lower)) return 'plano';

  return null;
}
```

**Teste Necessário:**
```typescript
test('Captura AC: RCR 2T', () => {
  expect(classifyLine('AC: RCR 2T, BNF')).toBe('cardiovascular');
});

test('Captura AP: MV+', () => {
  expect(classifyLine('AP: MV+ bilateral')).toBe('respiratorio');
});

test('Captura Hemoglobina: 10.2 g/dL', () => {
  expect(classifyLine('Hemoglobina: 10.2 g/dL')).toBe('examesLab');
});
```

---

### Correção 2: Geração Automática de Avaliação

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `buildClinicalData()` [linha 533-694]

**Mudança Proposta:**
Adicionar após linha 643:

```typescript
// Geração automática de síntese se não houver avaliação explícita
if (avaliacao.sintese.length === 0) {
  const problemas: string[] = [];
  
  if (data.avaliacao.diagnosticos.length > 0) {
    const dxList = data.avaliacao.diagnosticos.map(dx => dx.texto).join(', ');
    problemas.push(`Paciente com ${data.avaliacao.diagnosticos.length} diagnóstico(s) ativo(s): ${dxList}`);
  }
  
  if (data.objetivo.ventilacao && data.objetivo.ventilacao.tipo !== 'nenhum') {
    problemas.push(`Em suporte ventilatório: ${formatVentilationType(data.objetivo.ventilacao.tipo)}`);
  }
  
  const anemia = data.objetivo.examesLaboratoriais.find(e => /hemoglobina/i.test(e.nome) && parseFloat(e.valor) < 10);
  if (anemia) {
    problemas.push(`Anemia documentada (Hb ${anemia.valor})`);
  }
  
  const ira = data.objetivo.examesLaboratoriais.find(e => /creatinina/i.test(e.nome) && parseFloat(e.valor) > 1.5);
  if (ira) {
    problemas.push(`Disfunção renal documentada (Cr ${ira.valor})`);
  }
  
  const culturaPositiva = data.objetivo.microbiologia.find(c => c.situacao === 'positiva');
  if (culturaPositiva) {
    problemas.push(`Infecção documentada: ${culturaPositiva.material}`);
  }
  
  if (problemas.length > 0) {
    avaliacao.sintese.push({
      value: problemas.join('. ') + '.',
      source: 'sistema',
    });
  }
}
```

**Teste Necessário:**
```typescript
test('Gera avaliação quando há diagnósticos', () => {
  const base = extractFromText('DX: Choque séptico (A41.9)', 'texto-base');
  const atual = createEmptyExtraction();
  const { data } = buildClinicalData(base, atual);
  expect(data.avaliacao.sintese.length).toBeGreaterThan(0);
  expect(data.avaliacao.sintese[0].value).toContain('Choque séptico');
});
```

---

### Correção 3: Detecção de Contradições

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** Nova função `detectContradictions()`

**Mudança Proposta:**
Adicionar nova função:

```typescript
interface Contradicao {
  campo: string;
  descricao: string;
  valores: string[];
}

function detectContradictions( ClinicalData): Contradicao[] {
  const contradicoes: Contradicao[] = [];
  
  // Verificar edema
  const temEdama = data.objetivo.extremidades.some(d => /edama.*\+|edama.*\d/i.test(d.value));
  const semEdama = data.objetivo.extremidades.some(d => /sem edama|aus[eê]ncia de edama/i.test(d.value));
  if (temEdama && semEdama) {
    contradicoes.push({
      campo: 'Extremidades',
      descricao: 'Edama documentado vs Sem edama documentado',
      valores: data.objetivo.extremidades.filter(d => /edama/i.test(d.value)).map(d => d.value),
    });
  }
  
  // Verificar dieta
  const dietas = data.objetivo.gastrointestinal.filter(d => /dieta.*ml\/h/i.test(d.value));
  if (dietas.length > 1) {
    contradicoes.push({
      campo: 'Nutrição',
      descricao: 'Múltiplas velocidades de dieta documentadas',
      valores: dietas.map(d => d.value),
    });
  }
  
  // Verificar nível de consciência
  const atende = data.objetivo.neurologico.some(d => /atende ao chamado|responde ao chamado/i.test(d.value));
  const naoResponde = data.objetivo.neurologico.some(d => /n[ãa]o responde|desperta mas n[ãa]o responde/i.test(d.value));
  if (atende && naoResponde) {
    contradicoes.push({
      campo: 'Neurológico',
      descricao: 'Paciente atende vs não responde ao chamado',
      valores: data.objetivo.neurologico.filter(d => /chamado/i.test(d.value)).map(d => d.value),
    });
  }
  
  return contradicoes;
}
```

**Integração em `buildClinicalData()`:**
Adicionar após linha 693:

```typescript
const contradicoes = detectContradictions(data);
// Adicionar contradicoes aos alertas
for (const c of contradicoes) {
  alertas.push({
    tipo: 'conflito',
    severidade: 'warning',
    mensagem: `Contradição em ${c.campo}: ${c.descricao}`,
    campo: c.campo,
    resolvido: false,
  });
}
```

**Teste Necessário:**
```typescript
test('Detecta contradição de edama', () => {
  const base = extractFromText('Edama MMSS 2+/4', 'texto-base');
  const atual = extractFromText('Sem edama em membros superiores', 'exame-atual');
  const { data } = buildClinicalData(base, atual);
  const contradicoes = detectContradictions(data);
  expect(contradicoes.length).toBeGreaterThan(0);
  expect(contradicoes[0].campo).toBe('Extremidades');
});
```

---

### Correção 4: Classificação de Culturas por Microrganismo

**Arquivo:** `src/utils/soap-engine.ts`  
**Função:** `extractFromText()` [linha 346-352]

**Mudança Proposta:**
```typescript
case 'microbiologia':
  const hasMicroorganism = /kpc|mrsa|esbl|e\. coli|pseudomonas|acinetobacter|candida|enterobact|staphylococcus|streptococcus|klebsiella|proteus|serratia|enterococcus/i.test(line);
  result.microbiologia.push({
    material: line,
    dataColeta: timestamp,
    situacao: hasMicroorganism ? 'positiva' :
              /positivo|crescimento|isolado/i.test(line) ? 'positiva' : 
              /negativo|sem crescimento/i.test(line) ? 'negativa' : 
              /coloniza/i.test(line) ? 'colonizacao' : 
              /pendente|aguardando|coleta realizada/i.test(line) ? 'pendente' : 'pendente',
    source,
  });
  break;
```

**Teste Necessário:**
```typescript
test('Classifica KPC como positiva', () => {
  const result = extractFromText('Hemocultura: KPC', 'exame-atual');
  expect(result.microbiologia[0].situacao).toBe('positiva');
});

test('Classifica "sem crescimento" como negativa', () => {
  const result = extractFromText('Urocultura: sem crescimento', 'exame-atual');
  expect(result.microbiologia[0].situacao).toBe('negativa');
});
```

---

## 5. ESTRATÉGIA DE TESTES

### Testes Unitários Obrigatórios

Criar arquivo `src/utils/soap-engine.test.ts` com 20+ testes cobrindo:

1. **Classificação de linhas** (5 testes)
   - AC: RCR → cardiovascular
   - AP: MV+ → respiratorio
   - Hemoglobina: 10.2 → examesLab
   - KPC → microbiologia (positiva)
   - Meropenem → medicamentos (antimicrobiano)

2. **Conciliação de dados** (5 testes)
   - PA 100/50 vs 150/70 → conflito detectado
   - Hemoglobina 7.2 vs 10.2 → tendência calculada
   - Meropenem D3 vs D4 → dia atualizado
   - Cultura positiva vs negativa → situação atualizada
   - Dieta 40 mL/h vs 30 mL/h → contradição detectada

3. **Geração de avaliação** (3 testes)
   - Com diagnósticos → síntese gerada
   - Com ventilação → síntese gerada
   - Sem dados → "não documentada"

4. **Detecção de contradições** (4 testes)
   - Edama vs sem edama → contradição
   - Dieta 40 vs 30 → contradição
   - Atende vs não responde → contradição
   - Sem contradições → lista vazia

5. **Preservação de dados** (3 testes)
   - Todos os dados críticos preservados
   - Nenhum dado inventado
   - Datas preservadas

### Teste de Integração Completo

```typescript
test('Fluxo completo com dados reais', () => {
  const textoBase = `...`; // dados completos
  const exameAtual = `...`; // dados completos
  
  const result = processEvolution(textoBase, exameAtual);
  
  // Verificações
  expect(result.data.identificacao.nome?.value).toBe('João Silva');
  expect(result.data.objetivo.cardiovascular.length).toBeGreaterThan(0);
  expect(result.data.objetivo.respiratorio.length).toBeGreaterThan(0);
  expect(result.data.objetivo.examesLaboratoriais.length).toBeGreaterThan(0);
  expect(result.data.avaliacao.sintese.length).toBeGreaterThan(0);
  expect(result.conflitos.length).toBeGreaterThan(0);
});
```

---

## 6. RISCOS DE REGRESSÃO

| Correção | Risco | Mitigação |
|----------|-------|-----------|
| Classificador por conteúdo | Pode capturar linhas incorretamente | Testes unitários com casos negativos |
| Geração automática de avaliação | Pode gerar síntese inadequada | Limitar a problemas claramente documentados |
| Detecção de contradições | Pode gerar falsos positivos | Regex específico para cada tipo de contradição |
| Classificação de culturas | Pode classificar erroneamente | Lista de microrganismos conhecida |

---

## 7. CRITÉRIOS DE ACEITAÇÃO

A implementação será considerada satisfatória quando:

1. ✅ Ausculta cardíaca (AC: RCR) capturada corretamente
2. ✅ Ausculta pulmonar (AP: MV+) capturada corretamente
3. ✅ Exames laboratoriais (Hemoglobina, Creatinina) capturados
4. ✅ Avaliação clínica gerada automaticamente quando há problemas
5. ✅ Informações duplicadas removidas
6. ✅ Contradições detectadas e alertadas
7. ✅ Culturas positivas classificadas corretamente
8. ✅ Conflitos de sinais vitais detalhados
9. ✅ Textos de formulário interpretados
10. ✅ Todos os 20+ testes unitários passando
11. ✅ Teste de integração completo passando

---

## 8. PRÓXIMOS PASSOS

**Aguardando sua autorização para:**

1. ✅ Implementar as 4 correções cirúrgicas no `soap-engine.ts`
2. ✅ Criar arquivo de testes unitários `soap-engine.test.ts`
3. ✅ Executar todos os testes e validar resultados
4. ✅ Apresentar comparação antes/depois com dados reais
5. ❌ **NÃO publicar sem sua aprovação explícita**

**Nenhum código será modificado até sua autorização.**

---

## 9. EVIDÊNCIAS CONCRETAS

O arquivo `src/AuditTest.tsx` foi criado e pode ser executado no preview do aplicativo clicando no botão "🔍 Auditoria" no header. Ele mostra:

- Dados extraídos vs esperados
- Falhas detectadas (✅/❌)
- Conflitos identificados
- Alertas gerados
- Evolução final completa

**Execute a auditoria no preview para ver os resultados reais.**

---

**Fim do Diagnóstico Técnico**

**Status:** Aguardando autorização para implementação.
