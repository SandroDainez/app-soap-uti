// ============================================================================
// TESTES AUTOMATIZADOS — SOAP ENGINE
// Valida as correções implementadas
// ============================================================================

import { processEvolution, formatSoapFinal } from './soap-engine';

interface TestCase {
  name: string;
  textoBase: string;
  exameAtual: string;
  expectedResults: {
    sinaisVitaisAtual?: boolean;
    examesComData?: boolean;
    semDuplicacaoCreatinina?: boolean;
    semDuplicacaoDiurese?: boolean;
    culturaPositiva?: boolean;
    diagnosticosPresentes?: boolean;
  };
}

const testCases: TestCase[] = [
  {
    name: 'Teste 1: Sinais Vitais Atualizados',
    textoBase: `
Paciente: João Silva
Leito: 302
SV: PA 100/50 mmHg, FC 80 bpm
`,
    exameAtual: `
PA: 150/70 mmHg
FC: 75 bpm
`,
    expectedResults: {
      sinaisVitaisAtual: true,
    },
  },
  {
    name: 'Teste 2: Exames com Datas',
    textoBase: `
Exames Laboratoriais (25/01/2024):
Hemoglobina: 8.5 g/dL
Creatinina: 2.1 mg/dL

Exames Laboratoriais (28/01/2024):
Hemoglobina: 9.2 g/dL
Creatinina: 1.8 mg/dL
`,
    exameAtual: `
Hemoglobina: 10.5 g/dL (30/01/2024)
Creatinina: 1.4 mg/dL (30/01/2024)
`,
    expectedResults: {
      examesComData: true,
    },
  },
  {
    name: 'Teste 3: Sem Duplicação de Creatinina',
    textoBase: `
Creatinina: 2.1 mg/dL
Creatinina: 1.8 mg/dL
`,
    exameAtual: `
Creatinina: 1.4 mg/dL (30/01/2024)
`,
    expectedResults: {
      semDuplicacaoCreatinina: true,
    },
  },
  {
    name: 'Teste 4: Cultura Positiva Classificada Corretamente',
    textoBase: `
Hemocultura: KPC positiva (25/01/2024)
`,
    exameAtual: ``,
    expectedResults: {
      culturaPositiva: true,
    },
  },
  {
    name: 'Teste 5: Diagnósticos Presentes',
    textoBase: `
DX: Infecção do trato urinário (N39.0)
DX: Septicemia (A41.9)
`,
    exameAtual: ``,
    expectedResults: {
      diagnosticosPresentes: true,
    },
  },
];

function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TESTES AUTOMATIZADOS — SOAP ENGINE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    console.log(`\n${test.name}`);
    console.log('─────────────────────────────────────────────────────────────');

    try {
      const result = processEvolution(test.textoBase, test.exameAtual);
      const soapFinal = formatSoapFinal(result.data);

      // Verificar resultados esperados
      let testPassed = true;

      if (test.expectedResults.sinaisVitaisAtual) {
        const hasAtualSV = /PA: 150\/70|FC: 75/i.test(soapFinal);
        const hasBaseSV = /PA: 100\/50|FC: 80/i.test(soapFinal);
        if (hasAtualSV && !hasBaseSV) {
          console.log('  ✅ Sinais vitais atualizados corretamente');
        } else {
          console.log('  ❌ Sinais vitais NÃO atualizados');
          testPassed = false;
        }
      }

      if (test.expectedResults.examesComData) {
        const examesComData = result.data.objetivo.examesLaboratoriais.filter(e => e.data);
        if (examesComData.length > 0) {
          console.log(`  ✅ ${examesComData.length} exames com data`);
        } else {
          console.log('  ❌ Exames SEM data');
          testPassed = false;
        }
      }

      if (test.expectedResults.semDuplicacaoCreatinina) {
        const creatininas = result.data.objetivo.examesLaboratoriais.filter(e => /creatinina/i.test(e.nome));
        if (creatininas.length === 1) {
          console.log('  ✅ Sem duplicação de creatinina');
        } else {
          console.log(`  ❌ ${creatininas.length} creatininas (deveria ser 1)`);
          testPassed = false;
        }
      }

      if (test.expectedResults.culturaPositiva) {
        const cultura = result.data.objetivo.microbiologia.find(c => /kpc/i.test(c.material));
        if (cultura && cultura.situacao === 'positiva') {
          console.log('  ✅ Cultura KPC classificada como positiva');
        } else {
          console.log('  ❌ Cultura KPC NÃO classificada como positiva');
          testPassed = false;
        }
      }

      if (test.expectedResults.diagnosticosPresentes) {
        if (result.data.avaliacao.diagnosticos.length > 0) {
          console.log(`  ✅ ${result.data.avaliacao.diagnosticos.length} diagnósticos presentes`);
        } else {
          console.log('  ❌ Diagnósticos AUSENTES');
          testPassed = false;
        }
      }

      if (testPassed) {
        passed++;
        console.log('  ✅ TESTE APROVADO');
      } else {
        failed++;
        console.log('  ❌ TESTE REPROVADO');
      }
    } catch (error) {
      console.log(`  ❌ ERRO: ${error}`);
      failed++;
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log(`RESULTADO FINAL: ${passed} aprovados, ${failed} reprovados`);
  console.log('═══════════════════════════════════════════════════════════════');

  return { passed, failed };
}

// Executar testes
runTests();

export { runTests, testCases };
