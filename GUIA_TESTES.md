# 🧭 GUIA DE TESTES — UTI EVOLUÇÕES

## Como Testar as Correções Implementadas

---

## 📋 Caso Clínico Sintético para Testes

### Texto-Base (Campo Esquerdo)
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

### Exame Atual (Campo Direito)
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

## 🧪 Teste 1: Auditoria Completa

### Objetivo
Verificar se as correções foram aplicadas corretamente

### Passos
1. **Abra o preview do aplicativo**
2. **Clique no botão "🔬 Auditoria Completa"** (vermelho no header)
3. **Clique em "▶️ Executar Auditoria Completa"**

### O que verificar

#### ✅ ETAPA 3: DADOS EXTRAÍDOS
- **Identificação:** Nome, Leito, Convênio devem estar preenchidos
- **Diagnósticos:** Devem aparecer 2 diagnósticos com CID
- **Sinais Vitais:** Devem aparecer PA e FC
- **Exames Laboratoriais:** Devem aparecer 7 exames de 3 datas diferentes
- **Microbiologia:** Devem aparecer 2 culturas (Hemocultura e Urocultura)

#### ✅ ETAPA 4: CONFLITOS DETECTADOS
- **PA:** Deve detectar conflito entre 100/50 e 150/70
- **FC:** Deve detectar conflito entre 47-62 bpm e 56 bpm
- **Dieta:** Deve detectar conflito entre 40 mL/h e 30 mL/h

#### ✅ ETAPA 5: ALERTAS GERADOS
- Devem aparecer alertas sobre conflitos detectados

#### ✅ ETAPA 7: EVOLUÇÃO FINAL
- **Culturas:** Devem estar classificadas como "positiva" (não "pendente")
- **Sinais Vitais:** Deve aparecer apenas PA 150/70 e FC 56 bpm (atuais)
- **Dieta:** Deve aparecer apenas "Dieta enteral 30 mL/h" (atual)
- **Neurológico:** Deve aparecer apenas uma vez (sem duplicação)

---

## 🧪 Teste 2: Teste de Diagnósticos

### Objetivo
Investigar por que diagnósticos não estão aparecendo na evolução final

### Passos
1. **Clique no botão "🧪 Teste Diagnósticos"** (azul no header)
2. **Clique em "▶️ Executar Teste"**

### O que verificar

#### ✅ Diagnósticos Extraídos
- **Total:** Deve ser 2
- **Diagnóstico 1:** "Infecção do trato urinário complicada" com CID "N39.0"
- **Diagnóstico 2:** "Septicemia por KPC" com CID "A41.9"

#### ✅ Síntese Gerada
- Deve aparecer: "Paciente com 2 diagnóstico(s) ativo(s): Infecção do trato urinário complicada, Septicemia por KPC."

### Se os diagnósticos NÃO aparecerem
- Reporte o resultado exato mostrado na tela
- Isso ajudará a identificar onde está o problema

---

## 🧪 Teste 3: Fluxo Completo

### Objetivo
Testar o fluxo completo do aplicativo

### Passos
1. **Volte para a tela inicial** (clique em "← Voltar" até voltar)
2. **Cole o caso clínico sintético** nos dois campos (Texto-Base e Exame Atual)
3. **Clique em "🔄 Organizar em Formato SOAP"**
4. **Revise os alertas** na tela de revisão
5. **Clique em "✅ Finalizar Evolução"**

### O que verificar na evolução final

#### ✅ IDENTIFICAÇÃO
- Nome: Maria Santos
- Leito: 405
- Convênio: Bradesco Saúde
- Dia de UTI: 7

#### ✅ DIAGNÓSTICOS (Seção A - AVALIAÇÃO)
- 1. Infecção do trato urinário complicada (N39.0)
- 2. Septicemia por KPC (A41.9)

#### ✅ SINAIS VITAIS (Seção O - OBJETIVO)
- PA: 150/70 mmHg (atual, não 100/50)
- FC: 56 bpm (atual, não 47-62 bpm)

#### ✅ DIETA (Seção O - OBJETIVO - Gastrointestinal)
- Dieta enteral 30 mL/h (atual, não 40 mL/h)

#### ✅ CULTURAS (Seção O - OBJETIVO - Microbiologia)
- Hemocultura: KPC positiva (25/01/2024) - Situação: positiva
- Urocultura: E. coli ESBL positiva (25/01/2024) - Situação: positiva

#### ✅ NEUROLÓGICO (Seção O - OBJETIVO)
- Apenas uma entrada (sem duplicação)

---

## 📊 Checklist de Verificação

### Correções Implementadas
- [ ] Culturas KPC e ESBL classificadas como "positiva"
- [ ] Apenas FC atual (56 bpm) aparece
- [ ] Apenas Dieta atual (30 mL/h) aparece
- [ ] Neurológico sem duplicação
- [ ] Conflitos de PA detectados
- [ ] Conflitos de FC detectados
- [ ] Conflitos de Dieta detectados

### Problemas Pendentes
- [ ] Diagnósticos aparecem na evolução final
- [ ] CIDs aparecem junto com diagnósticos

---

## 🐛 Reportando Problemas

Se encontrar algum problema, reporte:

1. **Qual teste estava executando** (Auditoria Completa, Teste Diagnósticos, Fluxo Completo)
2. **O que esperava ver** (ex: "Diagnósticos com CID na seção A")
3. **O que viu na verdade** (ex: "Nenhum diagnóstico apareceu")
4. **Screenshot ou texto exato** do resultado

---

## 📞 Suporte

Se os testes não funcionarem como esperado:
1. Execute o "Teste Diagnósticos" primeiro
2. Reporte os resultados exatos
3. Isso ajudará a identificar onde está o problema

---

**Última atualização:** 2024  
**Versão do app:** 1.2.0  
**Status:** Correções parciais implementadas
