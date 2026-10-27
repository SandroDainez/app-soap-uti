// ============================================================================
// AUDITORIA REAL DO MOTOR SOAP
// Este arquivo executa testes com dados clínicos reais e mostra os resultados
// ============================================================================

import { processEvolution, formatSoapFinal } from './utils/soap-engine';

// Caso de Teste Realista
const textoBase = `
Paciente: João Silva
Leito: 302
Convênio: Unimed
Dia de UTI: 5

DX: Choque séptico de foco pulmonar (A41.9)

SV: PA 100/50 mmHg, FC 110 bpm, FR 24, Temp 38.5°C, SpO2 92%
Hemodinâmica: Noradrenalina 0.2 mcg/kg/min
Respiratório: VM PCV, PEEP 10, FiO2 60%
Neurológico: Glasgow 13, RASS -2
Renal: Diurese 400ml/24h, Cr 2.8 mg/dL
Hemoglobina: 7.2 g/dL
Creatinina: 2.8 mg/dL (25/01/2024)
PCR: 180 mg/L
Hemocultura: KPC positiva (25/01/2024)
Meropenem 1g EV 8/8h (início 25/01/2024)
Edema MMSS 2+/4
Precaução de contato para KPC

Avaliação: Paciente grave, em choque séptico, com disfunção renal
Plano: Manter meropenem, otimizar volume, reavaliar em 6h
`;

const exameAtual = `
PA: 150/70 mmHg
FC: 88 bpm
AC: RCR 2T, BNF, sem sopros
AP: MV+ bilateral, sem RA
Abdome: plano, flácido, RHA+, indolor
Neurológico: Glasgow 15, RASS 0, pupilas isocóricas reativas
Extremidades: perfusão preservada, sem edema em membros superiores
Diurese: 1200ml/24h
Hemoglobina: 10.2 g/dL (28/01/2024)
Creatinina: 1.5 mg/dL (28/01/2024)
PCR: 45 mg/L (28/01/2024)
Meropenem 1g EV 8/8h (D4)
Sem edema em MMSS
Precaução de contato para KPC

Plano: Suspender noradrenalina, manter meropenem, iniciar dieta oral
`;

console.log('═══════════════════════════════════════════════════════════════');
console.log('AUDITORIA REAL DO MOTOR SOAP');
console.log('═══════════════════════════════════════════════════════════════\n');

// Executa o processamento
const result = processEvolution(textoBase, exameAtual);

console.log('1. DADOS EXTRAÍDOS DO TEXTO-BASE:');
console.log('─────────────────────────────────────────────────────────────');
console.log('   Identificação:', result.data.identificacao.nome?.value || 'VAZIO');
console.log('   Leito:', result.data.identificacao.leito?.value || 'VAZIO');
console.log('   Dia UTI:', result.data.identificacao.diaUTI?.value || 'VAZIO');
console.log('   Diagnósticos:', result.data.avaliacao.diagnosticos.length);
console.log('   Sinais Vitais:', result.data.objetivo.sinaisVitais.length, 'itens');
console.log('   Cardiovascular:', result.data.objetivo.cardiovascular.length, 'itens');
console.log('   Respiratório:', result.data.objetivo.respiratorio.length, 'itens');
console.log('   Neurológico:', result.data.objetivo.neurologico.length, 'itens');
console.log('   Renal:', result.data.objetivo.renal.length, 'itens');
console.log('   Exames Lab:', result.data.objetivo.examesLaboratoriais.length, 'itens');
console.log('   Microbiologia:', result.data.objetivo.microbiologia.length, 'itens');
console.log('   Medicamentos:', result.data.objetivo.tratamentos.length, 'itens');
console.log('   Avaliação:', result.data.avaliacao.sintese.length, 'itens');
console.log('   Plano:', result.data.plano.condutasPorProblema.length + result.data.plano.antimicrobianos.length, 'itens');

console.log('\n2. DADOS EXTRAÍDOS DO EXAME ATUAL:');
console.log('─────────────────────────────────────────────────────────────');
console.log('   Sinais Vitais no exame atual:', exameAtual.match(/PA:|FC:|AC:|AP:/g)?.length || 0);
console.log('   Cardiovascular capturado:', result.data.objetivo.cardiovascular.filter(d => d.source === 'exame-atual').length);
console.log('   Respiratório capturado:', result.data.objetivo.respiratorio.filter(d => d.source === 'exame-atual').length);
console.log('   Exames Lab capturados:', result.data.objetivo.examesLaboratoriais.filter(e => e.source === 'exame-atual').length);

console.log('\n3. CONFLITOS DETECTADOS:');
console.log('─────────────────────────────────────────────────────────────');
if (result.conflitos.length === 0) {
  console.log('   ⚠️  NENHUM CONFLITO DETECTADO (deveria haver conflitos!)');
} else {
  result.conflitos.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.campo}: "${c.valorAnterior}" vs "${c.valorAtual}"`);
  });
}

console.log('\n4. CONTRADIÇÕES DETECTADAS:');
console.log('─────────────────────────────────────────────────────────────');
console.log('   ⚠️  Sistema NÃO detecta contradições semanticamente');
console.log('   Exemplo: "Edema MMSS 2+/4" vs "Sem edema em MMSS"');
console.log('   Ambas aparecem na evolução final sem alerta');

console.log('\n5. ALERTAS GERADOS:');
console.log('─────────────────────────────────────────────────────────────');
if (result.alertas.length === 0) {
  console.log('   ⚠️  NENHUM ALERTA GERADO');
} else {
  result.alertas.forEach((a, i) => {
    console.log(`   ${i + 1}. [${a.severidade}] ${a.mensagem}`);
  });
}

console.log('\n6. VALIDAÇÃO FINAL:');
console.log('─────────────────────────────────────────────────────────────');
console.log('   Passou:', result.validacaoFinal.passou ? 'SIM' : 'NÃO');
if (result.validacaoFinal.erros.length > 0) {
  console.log('   Erros:');
  result.validacaoFinal.erros.forEach(e => console.log(`     - ${e}`));
}
if (result.validacaoFinal.avisos.length > 0) {
  console.log('   Avisos:');
  result.validacaoFinal.avisos.forEach(a => console.log(`     - ${a}`));
}

console.log('\n7. EVOLUÇÃO FINAL GERADA:');
console.log('─────────────────────────────────────────────────────────────');
const soapFinal = formatSoapFinal(result.data);
console.log(soapFinal);

console.log('\n8. ANÁLISE DE FALHAS:');
console.log('─────────────────────────────────────────────────────────────');

// Verifica se AC foi capturado
const acCapturado = result.data.objetivo.cardiovascular.some(d => /AC:|RCR/i.test(d.value));
console.log(`   ❌ Ausculta Cardíaca (AC: RCR): ${acCapturado ? 'CAPTURADO ✓' : 'NÃO CAPTURADO ✗'}`);

// Verifica se AP foi capturado
const apCapturado = result.data.objetivo.respiratorio.some(d => /AP:|MV\+/i.test(d.value));
console.log(`   ❌ Ausculta Pulmonar (AP: MV+): ${apCapturado ? 'CAPTURADO ✓' : 'NÃO CAPTURADO ✗'}`);

// Verifica se Hemoglobina foi capturada
const hgbCapturada = result.data.objetivo.examesLaboratoriais.some(e => /Hemoglobina/i.test(e.nome));
console.log(`   ❌ Hemoglobina: ${hgbCapturada ? 'CAPTURADA ✓' : 'NÃO CAPTURADA ✗'}`);

// Verifica se Creatinina foi capturada
const crCapturada = result.data.objetivo.examesLaboratoriais.some(e => /Creatinina/i.test(e.nome));
console.log(`   ❌ Creatinina: ${crCapturada ? 'CAPTURADA ✓' : 'NÃO CAPTURADA ✗'}`);

// Verifica se avaliação foi gerada
const avaliacaoGerada = result.data.avaliacao.sintese.length > 0;
console.log(`   ❌ Avaliação Clínica: ${avaliacaoGerada ? 'GERADA ✓' : 'NÃO GERADA ✗'}`);

// Verifica se cultura foi classificada corretamente
const culturaPositiva = result.data.objetivo.microbiologia.find(c => /KPC/i.test(c.material));
console.log(`   ❌ Cultura KPC classificada como: ${culturaPositiva?.situacao || 'NÃO ENCONTRADA'} (deveria ser 'positiva')`);

// Verifica duplicações
const extremidadesComEdema = result.data.objetivo.extremidades.filter(d => /edema/i.test(d.value));
console.log(`   ❌ Extremidades com "edema": ${extremidadesComEdema.length} ocorrências (deveria detectar contradição)`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('FIM DA AUDITORIA');
console.log('═══════════════════════════════════════════════════════════════');
