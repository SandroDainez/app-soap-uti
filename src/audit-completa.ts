// ============================================================================
// AUDITORIA COMPLETA - CASO CLÍNICO SINTÉTICO
// Execução do fluxo completo com rastreamento de dados em cada etapa
// ============================================================================

import { processEvolution, formatSoapFinal } from './utils/soap-engine';

// CASO CLÍNICO SINTÉTICO OBRIGATÓRIO
const textoBase = `
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
`;

const exameAtual = `
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
`;

console.log('═══════════════════════════════════════════════════════════════');
console.log('AUDITORIA COMPLETA - CASO CLÍNICO SINTÉTICO');
console.log('═══════════════════════════════════════════════════════════════\n');

// ETAPA 1: ENTRADA
console.log('ETAPA 1: DADOS DE ENTRADA');
console.log('─────────────────────────────────────────────────────────────');
console.log('Texto-base:');
console.log(textoBase);
console.log('\nExame atual:');
console.log(exameAtual);

// ETAPA 2: PROCESSAMENTO
console.log('\n\nETAPA 2: PROCESSAMENTO');
console.log('─────────────────────────────────────────────────────────────');
const result = processEvolution(textoBase, exameAtual);

// ETAPA 3: DADOS EXTRAÍDOS
console.log('\n\nETAPA 3: DADOS EXTRAÍDOS E ESTRUTURADOS');
console.log('─────────────────────────────────────────────────────────────');

console.log('\n3.1 IDENTIFICAÇÃO:');
console.log(`  Nome: ${result.data.identificacao.nome?.value || '❌ NÃO EXTRAÍDO'}`);
console.log(`  Leito: ${result.data.identificacao.leito?.value || '❌ NÃO EXTRAÍDO'}`);
console.log(`  Convênio: ${result.data.identificacao.convenio?.value || '❌ NÃO EXTRAÍDO'}`);
console.log(`  Dia UTI: ${result.data.identificacao.diaUTI?.value || '❌ NÃO EXTRAÍDO'}`);

console.log('\n3.2 DIAGNÓSTICOS:');
if (result.data.avaliacao.diagnosticos.length > 0) {
  result.data.avaliacao.diagnosticos.forEach((dx, i) => {
    console.log(`  ${i + 1}. ${dx.texto} ${dx.cid ? `(${dx.cid})` : '❌ SEM CID'}`);
  });
} else {
  console.log('  ❌ NENHUM DIAGNÓSTICO EXTRAÍDO');
}

console.log('\n3.3 SINAIS VITAIS:');
console.log(`  Total: ${result.data.objetivo.sinaisVitais.length} itens`);
result.data.objetivo.sinaisVitais.forEach((sv, i) => {
  console.log(`  ${i + 1}. ${sv.value} [${sv.source}]`);
});

console.log('\n3.4 AUSCULTA CARDÍACA:');
console.log(`  Total: ${result.data.objetivo.cardiovascular.length} itens`);
result.data.objetivo.cardiovascular.forEach((cv, i) => {
  console.log(`  ${i + 1}. ${cv.value} [${cv.source}]`);
});

console.log('\n3.5 AUSCULTA PULMONAR:');
console.log(`  Total: ${result.data.objetivo.respiratorio.length} itens`);
result.data.objetivo.respiratorio.forEach((resp, i) => {
  console.log(`  ${i + 1}. ${resp.value} [${resp.source}]`);
});

console.log('\n3.6 EXTREMIDADES (EDEMA):');
console.log(`  Total: ${result.data.objetivo.extremidades.length} itens`);
result.data.objetivo.extremidades.forEach((ext, i) => {
  console.log(`  ${i + 1}. ${ext.value} [${ext.source}]`);
});

console.log('\n3.7 GASTROINTESTINAL (DIETA):');
console.log(`  Total: ${result.data.objetivo.gastrointestinal.length} itens`);
result.data.objetivo.gastrointestinal.forEach((gi, i) => {
  console.log(`  ${i + 1}. ${gi.value} [${gi.source}]`);
});

console.log('\n3.8 EXAMES LABORATORIAIS:');
console.log(`  Total: ${result.data.objetivo.examesLaboratoriais.length} itens`);
result.data.objetivo.examesLaboratoriais.forEach((ex, i) => {
  console.log(`  ${i + 1}. ${ex.nome} | Data: ${ex.data || '❌ SEM DATA'} | Valor: ${ex.valor} [${ex.source}]`);
});

console.log('\n3.9 MICROBIOLOGIA:');
console.log(`  Total: ${result.data.objetivo.microbiologia.length} itens`);
result.data.objetivo.microbiologia.forEach((micro, i) => {
  console.log(`  ${i + 1}. ${micro.material} | Situação: ${micro.situacao} | Data: ${micro.dataColeta || '❌ SEM DATA'} [${micro.source}]`);
});

console.log('\n3.10 MEDICAMENTOS:');
console.log(`  Total: ${result.data.objetivo.tratamentos.length} itens`);
result.data.objetivo.tratamentos.forEach((med, i) => {
  console.log(`  ${i + 1}. ${med.nome} | Categoria: ${med.categoria} [${med.source}]`);
});

console.log('\n3.11 AVALIAÇÃO:');
console.log(`  Síntese: ${result.data.avaliacao.sintese.length} itens`);
result.data.avaliacao.sintese.forEach((s, i) => {
  console.log(`  ${i + 1}. ${s.value}`);
});

// ETAPA 4: CONFLITOS DETECTADOS
console.log('\n\nETAPA 4: CONFLITOS DETECTADOS');
console.log('─────────────────────────────────────────────────────────────');
if (result.conflitos.length > 0) {
  result.conflitos.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.campo}: "${c.valorAnterior}" vs "${c.valorAtual}"`);
  });
} else {
  console.log('  ❌ NENHUM CONFLITO DETECTADO (DEVERIA DETECTAR!)');
}

// ETAPA 5: ALERTAS GERADOS
console.log('\n\nETAPA 5: ALERTAS GERADOS');
console.log('─────────────────────────────────────────────────────────────');
if (result.alertas.length > 0) {
  result.alertas.forEach((a, i) => {
    console.log(`  ${i + 1}. [${a.severidade}] ${a.mensagem}`);
  });
} else {
  console.log('  ❌ NENHUM ALERTA GERADO');
}

// ETAPA 6: VALIDAÇÃO FINAL
console.log('\n\nETAPA 6: VALIDAÇÃO FINAL');
console.log('─────────────────────────────────────────────────────────────');
console.log(`  Passou: ${result.validacaoFinal.passou ? '✅ SIM' : '❌ NÃO'}`);
if (result.validacaoFinal.erros.length > 0) {
  console.log('  Erros:');
  result.validacaoFinal.erros.forEach(e => console.log(`    - ${e}`));
}
if (result.validacaoFinal.avisos.length > 0) {
  console.log('  Avisos:');
  result.validacaoFinal.avisos.forEach(a => console.log(`    - ${a}`));
}

// ETAPA 7: EVOLUÇÃO FINAL
console.log('\n\nETAPA 7: EVOLUÇÃO FINAL GERADA');
console.log('─────────────────────────────────────────────────────────────');
const soapFinal = formatSoapFinal(result.data);
console.log(soapFinal);

// ETAPA 8: ANÁLISE DE PROBLEMAS
console.log('\n\nETAPA 8: ANÁLISE DE PROBLEMAS DETECTADOS');
console.log('─────────────────────────────────────────────────────────────');

console.log('\n❌ PROBLEMA 1: DIAGNÓSTICOS SEM CID');
const dxSemCID = result.data.avaliacao.diagnosticos.filter(dx => !dx.cid);
if (dxSemCID.length > 0) {
  console.log(`  ${dxSemCID.length} diagnóstico(s) sem CID:`);
  dxSemCID.forEach(dx => console.log(`    - ${dx.texto}`));
} else {
  console.log('  ✅ Todos os diagnósticos têm CID');
}

console.log('\n❌ PROBLEMA 2: CONTRADIÇÕES NÃO DETECTADAS');
console.log('  Verificando contradições esperadas:');

// Verificar contradição de dieta
const dietas = result.data.objetivo.gastrointestinal.filter(g => /dieta.*ml\/h/i.test(g.value));
if (dietas.length > 1) {
  console.log(`  ❌ Dieta: ${dietas.length} valores diferentes (40 mL/h e 30 mL/h)`);
  dietas.forEach(d => console.log(`     - ${d.value}`));
} else {
  console.log('  ✅ Dieta: apenas um valor');
}

// Verificar contradição de edema
const edamas = result.data.objetivo.extremidades.filter(e => /edama/i.test(e.value));
if (edamas.length > 1) {
  console.log(`  ❌ Edema: ${edamas.length} valores contraditórios`);
  edamas.forEach(e => console.log(`     - ${e.value}`));
} else {
  console.log('  ✅ Edema: apenas um valor ou nenhum');
}

// Verificar contradição de FC
const fcs = result.data.objetivo.sinaisVitais.filter(sv => /fc|frequ[êe]ncia card/i.test(sv.value));
if (fcs.length > 1) {
  console.log(`  ❌ FC: ${fcs.length} valores diferentes (47-62 bpm e 56 bpm)`);
  fcs.forEach(fc => console.log(`     - ${fc.value}`));
} else {
  console.log('  ✅ FC: apenas um valor');
}

// Verificar contradição de PA
const pas = result.data.objetivo.sinaisVitais.filter(sv => /pa:|ta:/i.test(sv.value));
if (pas.length > 1) {
  console.log(`  ❌ PA: ${pas.length} valores diferentes (100/50 e 150/70)`);
  pas.forEach(pa => console.log(`     - ${pa.value}`));
} else {
  console.log('  ✅ PA: apenas um valor');
}

console.log('\n❌ PROBLEMA 3: EXAMES LABORATORIAIS DE DATAS DIFERENTES');
const examesPorData = new Map<string, number>();
result.data.objetivo.examesLaboratoriais.forEach(ex => {
  const data = ex.data || 'sem-data';
  examesPorData.set(data, (examesPorData.get(data) || 0) + 1);
});
console.log(`  Exames por data:`);
examesPorData.forEach((count, data) => {
  console.log(`    ${data}: ${count} exame(s)`);
});

console.log('\n❌ PROBLEMA 4: CULTURAS CLASSIFICADAS INCORRETAMENTE');
const culturasPendentes = result.data.objetivo.microbiologia.filter(c => c.situacao === 'pendente');
if (culturasPendentes.length > 0) {
  console.log(`  ❌ ${culturasPendentes.length} cultura(s) classificada(s) como "pendente":`);
  culturasPendentes.forEach(c => console.log(`     - ${c.material}`));
} else {
  console.log('  ✅ Nenhuma cultura classificada como pendente');
}

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('FIM DA AUDITORIA');
console.log('═══════════════════════════════════════════════════════════════');
