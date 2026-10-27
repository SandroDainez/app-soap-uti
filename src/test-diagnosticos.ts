// Teste simples para verificar extração de diagnósticos
import { processEvolution } from './utils/soap-engine';

const textoBase = `
Paciente: Maria Santos
Leito: 405
Convênio: Bradesco Saúde

DX: Infecção do trato urinário complicada (N39.0)
DX: Septicemia por KPC (A41.9)

SV: PA 100/50 mmHg
`;

const exameAtual = `
PA: 150/70 mmHg
`;

console.log('=== TESTE DE EXTRAÇÃO DE DIAGNÓSTICOS ===\n');

const result = processEvolution(textoBase, exameAtual);

console.log('Diagnósticos extraídos:', result.data.avaliacao.diagnosticos.length);
result.data.avaliacao.diagnosticos.forEach((dx, i) => {
  console.log(`  ${i + 1}. ${dx.texto} ${dx.cid ? `(${dx.cid})` : '(SEM CID)'}`);
});

console.log('\nSíntese:', result.data.avaliacao.sintese.length > 0 ? result.data.avaliacao.sintese[0].value : 'VAZIA');
